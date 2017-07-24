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
const fecha = Moment().tz('America/Mexico_City').format('YYYY-MM-DDThh:mm:ss-06:00');
const xslt_path = './utilerias/xsltretenciones/retenciones.xslt';

const num_certificado = '20001000000200000192';
const archivo_cer = "./utilerias/certificados/20001000000200000192.cer";
const archivo_pem = "./utilerias/certificados/20001000000200000192.key.pem";
const xml_tmp = './tmp/'+ Moment().tz('America/Mexico_City').format('YYYYMMDDThhmmss') +'_cfdi.xml';

const client = new FacturacionModerna(WSDL_URL, credenciales);

// Opciones a generar
client.generarPDF(true);
client.generarCBB(false);
client.generarTXT(false);

//Indicar si se escribiran los archivos al finalizar el timbrado y especificar la ruta
client.escribirArchivos(true);
client.establecerDirectorio('./comprobantes/');

let cfdi = generarXML(rfcEmisor, fecha, num_certificado, archivo_cer);

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

		let xml = cfdi.replace('Sello=""', `Sello="${sello}"`);

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


function generarXML (rfc, fecha, num_certificado, archivo_cer) {
	let certificado = new Buffer(fs.readFileSync(archivo_cer)).toString('base64');

	return `<?xml version="1.0" encoding="UTF-8"?>
<retenciones:Retenciones xmlns:retenciones="http://www.sat.gob.mx/esquemas/retencionpago/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation=" http://www.sat.gob.mx/esquemas/retencionpago/1 http://www.sat.gob.mx/esquemas/retencionpago/1/retencionpagov1.xsd" Version="1.0" FolioInt="RetA" Sello="" NumCert="${num_certificado}" Cert="${certificado}" FechaExp="${fecha}" CveRetenc="05">
  <retenciones:Emisor RFCEmisor="${rfc}" NomDenRazSocE="Empresa retenedora ejemplo"/>
  <retenciones:Receptor Nacionalidad="Nacional">
    <retenciones:Nacional RFCRecep="XAXX010101000" NomDenRazSocR="Publico en GENERAL"/>
  </retenciones:Receptor>
  <retenciones:Periodo MesIni="1" MesFin="1" Ejerc="2014" />
  <retenciones:Totales montoTotOperacion="33783.75" montoTotGrav="35437.50" montoTotExent="0.00" montoTotRet="7323.75">
    <retenciones:ImpRetenidos BaseRet="35437.50" Impuesto="02" montoRet="3780.00" TipoPagoRet="Pago definitivo"/>
    <retenciones:ImpRetenidos BaseRet="35437.50" Impuesto="01" montoRet="3543.75" TipoPagoRet="Pago provisional"/>
  </retenciones:Totales>
  <retenciones:Complemento>
  </retenciones:Complemento>
</retenciones:Retenciones>`;

}