'use strict';

const Moment = require('moment-timezone');
const FacturacionModerna = require('./lib/FacturacionModerna');

// Datos de conexion al web service
const WSDL_URL = "https://t1demo.facturacionmoderna.com/timbrado/wsdl";
const credenciales = {
	user: "UsuarioPruebasWS",
	password: "b9ec2afa3361a59af4b4d102d3f704eabdf097d4"
};
const rfcEmisor = "TCM970625MB1";
const fecha = Moment().tz('America/Mexico_City').format('YYYY-MM-DDThh:mm:ss')

const client = new FacturacionModerna(WSDL_URL, credenciales);

// Opciones a generar
client.generarPDF(true);
client.generarCBB(false);
client.generarTXT(false);

//Indicar si se escribiran los archivos al finalizar el timbrado y especificar la ruta
client.escribirArchivos(true);
client.establecerDirectorio('./comprobantes/');

// generar layout
let cfdi = generarLayout(fecha, rfcEmisor);

// Timbrar el layout
client.timbrar(cfdi, rfcEmisor)
	.then(function (respuesta) {
		console.log("El uuid del comproante es: " , respuesta.uuid);
	})
	.catch(function (err) {
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



function  generarLayout (fecha, rfcEmisor) {
	return `[ComprobanteFiscalDigital]
;Version=3.3
Serie=A
Folio=asignarFolio
Fecha=${fecha}
FormaPago=99
NoCertificado=20001000000300022762
CondicionesDePago=CONTADO
SubTotal=100.00
Descuento=00.00
Moneda=MXN
;TipoCambio=
Total=100.00
TipoDeComprobante=I
MetodoPago=PUE
LugarExpedicion=68050
[DatosAdicionales]
tipoDocumento=FACTURA
[Emisor]
Rfc=${rfcEmisor}
Nombre=FACTURACION MODERNA SA DE CV
RegimenFiscal=601
[Receptor]
Rfc=XAXX010101000
Nombre=LUIS HERNANDEZ FELIX
UsoCFDI=G01
[Concepto#1]
ClaveProdServ=01010101
NoIdentificacion=
Cantidad=10
ClaveUnidad=KGM
Unidad=Kilogramos
Descripcion=AZUCAR
ValorUnitario=10.00
Importe=100.00
Descuento=00.00
Impuestos.Traslados.Base=[100.00]
Impuestos.Traslados.Impuesto=[002]
Impuestos.Traslados.TipoFactor=[Tasa]
Impuestos.Traslados.TasaOCuota=[0.160000]
Impuestos.Traslados.Importe=[16.00]
Impuestos.Retenciones.Base=[100.00]
Impuestos.Retenciones.Impuesto=[001]
Impuestos.Retenciones.TipoFactor=[Tasa]
Impuestos.Retenciones.TasaOCuota=[0.35]
Impuestos.Retenciones.Importe=[35.00]
[Traslado#1]
Impuesto = 002
TipoFactor = Tasa
TasaOCuota = 0.160000
Importe = 16.00
[Retencion#1]
Impuesto=001
Importe=15.99
`;

};
