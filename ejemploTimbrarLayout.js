'use strict';

const Moment = require('moment-timezone');
const FacturacionModerna = require('./lib/FacturacionModerna');

// Datos de conexion al web service
const WSDL_URL = "https://t1demo.facturacionmoderna.com/timbrado/wsdl";
const credenciales = {
	user: "UsuarioPruebasWS",
	password: "b9ec2afa3361a59af4b4d102d3f704eabdf097d4"
};
const rfcEmisor = "ESI920427886";
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
	return `[Encabezado]
serie|
fecha|${fecha}
folio|
tipoDeComprobante|ingreso
formaDePago|PAGO EN UNA SOLA EXHIBICIÓN
metodoDePago|Transferencía Electrónica
condicionesDePago|Contado
NumCtaPago|No identificado
subTotal|10.00
descuento|0.00
total|11.60
Moneda|MXN
noCertificado|
LugarExpedicion|Nuevo León, México.

[Datos Adicionales]

tipoDocumento|Factura
observaciones|

[Emisor]

rfc|${rfcEmisor}
nombre|EMPRESA DE MUESTRA S.A de C.V.
RegimenFiscal|REGIMEN GENERAL DE LEY

[DomicilioFiscal]

calle|Calle 
noExterior|Número Ext.
noInterior|Número Int.
colonia|Colonia
localidad|Localidad
municipio|Municipio
estado|Nuevo León
pais|México
codigoPostal|66260

[ExpedidoEn]
calle|Calle sucursal
noExterior|
noInterior|
colonia|
localidad|
municipio|Nuevo León
estado|Nuevo León
pais|México
codigoPostal|77000

[Receptor]
rfc|XAXX010101000
nombre|PÚBLICO EN GENERAL

[Domicilio]
calle|Calle
noExterior|Num. Ext
noInterior|
colonia|Colonia
localidad|San Pedro Garza García
municipio|
estado|Nuevo León
pais|México
codigoPostal|66260

[DatosAdicionales]

noCliente|09871
email|edgar.duran@facturacionmoderna.com

[Concepto]

cantidad|1
unidad|No aplica
noIdentificacion|
descripcion|Servicio Profesional
valorUnitario|10.00
importe|10.00


[ImpuestoTrasladado]

impuesto|IVA
importe|1.60
tasa|16.00
`;

};
