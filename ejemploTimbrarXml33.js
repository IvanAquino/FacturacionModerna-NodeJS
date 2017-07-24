'use strict';

const fs = require('fs');
const exec = require('child_process').exec;
const Moment = require('moment-timezone');
const co = require('co');
const Promise = require('bluebird');
const FacturacionModerna = require('./lib/FacturacionModerna');

// Datos de conexion al web service
const WSDL_URL = "https://t1demo.facturacionmoderna.com/timbrado/wsdl";
const credenciales = {
	user: "UsuarioPruebasWS",
	password: "b9ec2afa3361a59af4b4d102d3f704eabdf097d4"
};
const rfcEmisor = "TCM970625MB1";
const fecha = Moment().tz('America/Mexico_City').format('YYYY-MM-DDThh:mm:ss');
const xslt_path = './utilerias/xslt33/cadenaoriginal_3_3.xslt';

const num_certificado = '20001000000300022762';
const archivo_cer = "./utilerias/certificados/20001000000300022762.cer";
const archivo_pem = "./utilerias/certificados/20001000000300022762.key.pem";
const xml_tmp = './tmp/'+ Moment().tz('America/Mexico_City').format('YYYYMMDDThhmmss') +'_cfdi.xml';

const client = new FacturacionModerna(WSDL_URL, credenciales);

// Opciones a generar
client.generarPDF(true);
client.generarCBB(false);
client.generarTXT(false);

//Indicar si se escribiran los archivos al finalizar el timbrado y especificar la ruta
client.escribirArchivos(true);
client.establecerDirectorio('./comprobantes/');

let cfdi = generarXML(rfcEmisor, fecha);


timbrar(cfdi).then(function (resultado) {
	console.log("El uuid del comproante es: " , resultado.uuid);
}).catch(function (err) {
	if (err.hasOwnProperty('cause'))
		if (err.cause.hasOwnProperty('body'))
		{
			let fault = client.decodeErrors(err.cause.body)
			console.log(fault);
		}
		else
			console.log(err.cause);
	else
		console.log(err);
});

function timbrar (cfdi, callback) {

	let _timbrar = co.wrap(function * () {

		let certificado = new Buffer(fs.readFileSync(archivo_cer)).toString('base64');
		cfdi = cfdi.replace('NoCertificado=""', `NoCertificado="${num_certificado}"`)
				.replace('Certificado=""', `Certificado="${certificado}"`);

		fs.writeFileSync(xml_tmp, cfdi);
		let sello = yield Promise.resolve(sellar(xslt_path, xml_tmp, archivo_pem));
		fs.unlinkSync(xml_tmp);

		let xml = cfdi.replace('Sello=""', `Sello="${sello}"`);

		return client.timbrar(xml, rfcEmisor)
	});

	return Promise.resolve(_timbrar()).asCallback(callback);
}

function sellar (xslt_path, xml_path, pem, callback) {

	let _transformar = co.wrap(function * () {

		let result = yield Promise.fromCallback(function (callback) {
			exec(`xsltproc ${xslt_path} ${xml_path} | openssl dgst -sha256 -sign ${pem} | openssl enc -base64 -A`, callback);
		});

		return result;
	});

	return Promise.resolve(_transformar()).asCallback(callback);
}


function generarXML (rfc, fecha) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/3 http://www.sat.gob.mx/sitio_internet/cfd/3/cfdv33.xsd" Version="3.3" Serie="A" Folio="01" Fecha="${fecha}" Sello="" FormaPago="03" NoCertificado="" Certificado="" CondicionesDePago="CONTADO" SubTotal="1850" Descuento="175.00" Moneda="MXN" Total="1943.00" TipoDeComprobante="I" MetodoPago="PUE" LugarExpedicion="68050">
  <cfdi:Emisor Rfc="${rfc}" Nombre="FACTURACION MODERNA SA DE CV" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="PUBLICO EN GENERAL" UsoCFDI="G01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="01010101" NoIdentificacion="AULOG001" Cantidad="5" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Aurriculares USB Logitech" ValorUnitario="350.00" Importe="1750.00" Descuento="175.00">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="1575.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="252.00"/>
      </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Concepto>
<cfdi:Concepto ClaveProdServ="43201800" NoIdentificacion="USB" Cantidad="1" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Memoria USB 32gb marca Kingston" ValorUnitario="100.00" Importe="100.00">
  <cfdi:Impuestos>
    <cfdi:Traslados>
      <cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
  </cfdi:Traslados>
</cfdi:Impuestos>
</cfdi:Concepto>
</cfdi:Conceptos>
<cfdi:Impuestos TotalImpuestosTrasladados="268.00">
    <cfdi:Traslados>
      <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="268.00"/>
  </cfdi:Traslados>
</cfdi:Impuestos>
</cfdi:Comprobante>`;

}