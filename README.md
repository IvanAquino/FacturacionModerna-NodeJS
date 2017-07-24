# Cliente de Timbrado y Cancelación de CFDI

Clase Genérica para realizar el timbrado y cancelación de un CFDI con [Facturación Moderna][1], utilizando NodeJS.

__Este ejemplo de conexión no es mantenido por FacturacionModerna, es un ejemplo independiente__

# Carácteristicas
* Soporte para el timbrado de diversos [tipos de documento (Factura, Nota de Crédito, Recibo de Nómina)][2]
* Clase genérica lista para ser implementada en tu proyecto.
* Timbrado de XML CFDI versión 3.2
* Timbrado de XML CFDI versión 3.3
* Timbrado de un archivo de texto simple
* Ejemplo de generación del sello digital


#Instalación

El siguiente ejemplo de conexión se realizo en ambientes Mac y Linux con la version de node __v6.9.1 LTS__, favor de contar con esta versión o una superior.

1. Clonar el repositorio
2. Instalar las dependencias mediante el comando: ``npm install``
3. Ejecutar el ejemplo: ``node ejemploTimbrarLayout.js ``

### Requisitos adicionales
Asegurese de asignar permisos de escritura a las carpetas __comprobantes__ y __tmp__

Para generar la cadena original y sellarla (solo para ejemplos con xml) se hará uso de los siguientes complementos asegurese de tenerlos instalados

* xsltproc
* openssl

## Uso de la libreria para el timbrado.

```

const credenciales = {
	user: "Su usuario",
	password: "Su contraseña",
};
const rfcEmisor = "RFC emisor";

const FacturacionModerna = require('./lib/FacturacionModerna');
const cliente = new FacturacionModerna(url, credenciales);

// Timbrar un comprobante
// La llamada a esta funcion se puede resolver mediante Callback o Promesa de las siguientes maneras.


// Callback
cliente.timbrar(cfdi, rfcEmisor, function (error, respuesta) {
	// resolver
});

// Promesa
cliente.timbrar(cfdi, rfcEmisor).then(function (respuesta) {
	// resolver
}).catch(function (error) {
	// resolver
});
```

#### Respuesta
| Propiedad | Descripción |
| ------------------------ | ---------- |
| respuesta.xml | Comprobante xml en formato base64 |
| respuesta.uuid | Folio fiscal del comprobante, solo cuando se habilita la opcion ___cliente.escribirArchivos(true)___ |
| respuesta.pdf | Comprobante pdf en formato base64, solo cuando se habilita la opcion ___cliente.generarPDF(true)___ |
| respuesta.png | Comprobante pdf en formato base64, solo cuando se habilita la opcion ___cliente.generarCBB(true)___ |
| respuesta.txt | Comprobante pdf en formato base64, solo cuando se habilita la opcion ___cliente.generarTXT(true)___ |

### Opciones del cliente

| Opción | Descripción |
| ------------------------ | ---------- |
| cliente.generarPDF(true) | Indica si se generará el archivo pdf |
| cliente.generarCBB(true) | Indica si se generará el codigo de barras bidimensional|
| cliente.generarTXT(true) | Indica si se generará el nodo tfd:TimbreFiscalDigital en formato TXT|
| cliente.escribirArchivos(true)     | Indica si se escribirá el archivo una vez realizado el timbrado |
| cliente.establecerDirectorio(path) | Indica el directorio en donde se almacenarán los archivos (se deberá contar con permisos de escritura). La ruta completa del archivo será: path + uuid del comprobante + . + la extension del archivo (xml, pdf, txt, png) |


[1]: http://www.facturacionmoderna.com
[2]: https://github.com/facturacionmoderna/Comprobantes