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
const rfcEmisor = "ESI920427886";
const fecha = Moment().tz('America/Mexico_City').format('YYYY-MM-DDThh:mm:ss');
const xslt_path = './utilerias/xslt32/cadenaoriginal_3_2.xslt';

const num_certificado = '20001000000200000192';
const archivo_cer = "./utilerias/certificados/20001000000200000192.cer";
const archivo_pem = "./utilerias/certificados/20001000000200000192.key.pem";
const xml_tmp = './tmp/'+ Moment().tz('America/Mexico_City').format('YYYYMMDDThhmmss'); +'_cfdi.xml';

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

		fs.writeFileSync(xml_tmp, cfdi);
		let sello = yield Promise.resolve(sellar(xslt_path, xml_tmp, archivo_pem));
		fs.unlinkSync(xml_tmp);

		let certificado = new Buffer(fs.readFileSync(archivo_cer)).toString('base64');

		let xml = cfdi.replace('sello=""', `sello="${sello}"`)
						.replace('noCertificado=""', `noCertificado="${num_certificado}"`)
						.replace('certificado=""', `certificado="${certificado}"`);

		return client.timbrar(xml, rfcEmisor)
	});

	return Promise.resolve(_timbrar()).asCallback(callback);
}

function sellar (xslt_path, xml_path, pem, callback) {

	let _transformar = co.wrap(function * () {

		let result = yield Promise.fromCallback(function (callback) {
			exec(`xsltproc ${xslt_path} ${xml_path} | openssl dgst -sha1 -sign ${pem} | openssl enc -base64 -A`, callback);
		});

		return result;
	});

	return Promise.resolve(_transformar()).asCallback(callback);
}


function generarXML (rfc, fecha) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:nomina12="http://www.sat.gob.mx/nomina12" xsi:schemaLocation="http://www.sat.gob.mx/cfd/3 http://www.sat.gob.mx/sitio_internet/cfd/3/cfdv32.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/informacion_fiscal/factura_electronica/Documents/Complementoscfdi/nomina12.xsd" version="3.2" serie="B" folio="124" fecha="${fecha}" formaDePago="En una sola exhibición" noCertificado="" certificado="" sello="" subTotal="3.00" descuento="3.00" Moneda="MXN" total="0.00" tipoDeComprobante="egreso" metodoDePago="NA" LugarExpedicion="68050">
  <cfdi:Emisor rfc="${rfc}" nombre="EMPRESA DE PRUEBA SAPI">
    <cfdi:RegimenFiscal Regimen="601"/>
  </cfdi:Emisor>
  <cfdi:Receptor rfc="CECF870320JP9" nombre="CERVANTES CALISTRO FLORENTINO"/>
  <cfdi:Conceptos>
    <cfdi:Concepto cantidad="1" unidad="ACT" descripcion="Pago de nómina" valorUnitario="3.00" importe="3.00"/>
  </cfdi:Conceptos>
  <cfdi:Impuestos/>
  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="O" FechaPago="2017-02-10" FechaInicialPago="2017-02-10" FechaFinalPago="2017-02-10" NumDiasPagados="7.000" TotalPercepciones="2.00" TotalDeducciones="3.00" TotalOtrosPagos="1.00">
      <nomina12:Emisor RegistroPatronal="D6819009103"/>
      <nomina12:Receptor Curp="CECF870320HOCRLL03" NumSeguridadSocial="78088711540" FechaInicioRelLaboral="2006-07-15" Antigüedad="P52W" TipoContrato="01" TipoRegimen="02" NumEmpleado="2" Puesto="AYUDANTE DE PARRILLA" RiesgoPuesto="2" PeriodicidadPago="01" Banco="072" SalarioBaseCotApor="80.79" SalarioDiarioIntegrado="85.00" ClaveEntFed="OAX"/>
      <nomina12:Percepciones TotalSueldos="2.00" TotalGravado="1.00" TotalExento="1.00">
        <nomina12:Percepcion TipoPercepcion="001" Clave="001" Concepto="SUELDO" ImporteGravado="1.00" ImporteExento="0.00"/>
        <nomina12:Percepcion TipoPercepcion="020" Clave="020" Concepto="PRIMA DOMINICAL" ImporteGravado="0.00" ImporteExento="1.00"/>
      </nomina12:Percepciones>
      <nomina12:Deducciones TotalOtrasDeducciones="3.00">
        <nomina12:Deduccion TipoDeduccion="001" Clave="204" Concepto="IMSS" Importe="1.00"/>
        <nomina12:Deduccion TipoDeduccion="003" Clave="003" Concepto="CENSATIA Y VEJEZ" Importe="1.00"/>
        <nomina12:Deduccion TipoDeduccion="010" Clave="010" Concepto="INFONAVIT" Importe="1.00"/>
      </nomina12:Deducciones>
      <nomina12:OtrosPagos>
        <nomina12:OtroPago TipoOtroPago="002" Clave="002" Concepto="SUBSIDIO AL EMPLEO" Importe="1.00">
          <nomina12:SubsidioAlEmpleo SubsidioCausado="1.00"/>
        </nomina12:OtroPago>
      </nomina12:OtrosPagos>
    </nomina12:Nomina>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

}