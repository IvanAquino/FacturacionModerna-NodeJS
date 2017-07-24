'use strict';

const Soap = require('soap');
const Promise = require('bluebird');
const co = require('co');
const fs = require('fs');

const defaults = {
	user: 'UsuarioPruebasWS',
	password: 'b9ec2afa3361a59af4b4d102d3f704eabdf097d4',
	path: './comprobantes/'
};

const uuid_format = /[a-f0-9A-F]{8}-[a-f0-9A-F]{4}-[a-f0-9A-F]{4}-[a-f0-9A-F]{4}-[a-f0-9A-F]{12}/g;

class FacturacionModerna {

	/**
	 * Constructor de la clase
	 * @param {String} url
	 * @param {Object} credenciales
	 */
	constructor (url, credenciales) {
		this.url = url;
		this.credenciales = {
			user: credenciales.user || defaults.user,
			password: credenciales.password || defaults.password
		}

		this._generarCBB = false;
		this._generarPDF = false;
		this._generarTXT = false;
		this.path = defaults.path;
	}

	/**
	 * Timbrar un cfdi
	 * @param {String} cfdi
	 * @param {String} rfcEmisor
	 * @param {Function} callback Opcional // Esta funcion se puede resolver mediante callback o como Promesa (.then())
	 * @return {Promise} Promise
	 */
	timbrar (cfdi, rfcEmisor, callback) {
		let url = this.url;
		let opciones = {
			UserID: this.credenciales.user,
			UserPass: this.credenciales.password,
			emisorRFC: rfcEmisor,
			generarCBB: this._generarCBB,
			generarPDF: this._generarPDF,
			generarTXT: this._generarTXT,
			text2CFDI: new Buffer(cfdi).toString('base64')
		}
		
		let _timbrar = co.wrap(function * () {
			let uuid = "";
			let client = yield Promise.fromCallback(function (callback) {
				Soap.createClient(url, callback);
			})

			let response = yield Promise.fromCallback(function (callback) {
				client.requestTimbrarCFDI({parameter: opciones}, callback);
			});

			if (this._escribirArchivos) {
				let xml_str = new Buffer(response.return.xml.$value, 'base64').toString('utf8');
				uuid = uuid_format.exec(xml_str);
				uuid = uuid[0];
				this._writeFile(`${uuid}.xml`, response.return.xml.$value);

				/**
				 * Verificar tipos de archivos a escribir
				 */
				if (this._generarPDF)
					this._writeFile(`${uuid}.pdf`, response.return.pdf.$value);
				if (this._generarCBB)
					this._writeFile(`${uuid}.png`, response.return.png.$value);
				if (this._generarTXT)
					this._writeFile(`${uuid}.txt`, response.return.txt.$value);
			}

			let respuesta = {
				uuid: uuid,
				xml: response.return.xml.$value,
			};

			if (this._generarPDF)
				respuesta.pdf = response.return.pdf.$value;
			if (this._generarCBB)
				respuesta.png = response.return.png.$value;
			if (this._generarTXT)
				respuesta.txt = response.return.txt.$value;

			return respuesta;
		}.bind(this));

		return Promise.resolve( _timbrar() ).asCallback(callback);
	}

	/**
	 * Activar Cancelacion
	 * @param {String} pathCer
	 * @param {String} pathKey
	 * @param {String} password
	 */
	 activarCancelacion (rfc, pathCer, pathKey, password, callback) {
	 	let url = this.url;

	 	let opciones = {
	 		UserID: this.credenciales.user,
	 		UserPass: this.credenciales.password,
	 		emisorRFC: rfc,
	 		archivoKey: this._readFile(pathKey),
	 		archivoCer: this._readFile(pathCer),
	 		clave: password
	 	};

	 	let _activarCancelacion = co.wrap(function * () {

	 		let client = yield Promise.fromCallback(function (callback) {
	 			Soap.createClient(url, callback);
	 		})

	 		let response = yield Promise.fromCallback(function (callback) {
	 			client.activarCancelacion({parameter: opciones}, callback);
	 		});

	 		return response.return.mensaje.$value;
	 	}.bind(this));

	 	return Promise.resolve( _activarCancelacion() ).asCallback(callback);
	 }

	 /**
	  * Cancelar comprobante
	  * @param {String} rfcEmisor
	  * @param {String} uuid
	  */
	  cancelar (rfc, uuid, callback) {
	  	let url = this.url;
	  	let opciones = {
	  		UserID: this.credenciales.user,
	  		UserPass: this.credenciales.password,
	  		emisorRFC: rfc,
	  		uuid: uuid
	  	};

	  	let _cancelar = co.wrap(function * () {

	  		let client = yield Promise.fromCallback(function (callback) {
	  			Soap.createClient(url, callback);
	  		});

	  		let response = yield Promise.fromCallback(function (callback) {
	  			client.requestCancelarCFDI({parameter: opciones}, callback);
	  		});
	  		
	  		return {
	  			code: response.return.Code.$value,
	  			mensaje: response.return.Message.$value
	  		};
	  	});

	  	return Promise.resolve( _cancelar() ).asCallback(callback);
	  }

	/**
	 * Indicar el directorio en donde se almacenarán los archivos
	 * @param {String} path
	 * @return void
	 */
	establecerDirectorio (path) {
		this.path = path;
	}
	/**
	 * Indicar si se escribiran los archivos al finalizar el timbrado
	 * @param {Boolean} flag
	 * @return void
	 */
	escribirArchivos (flag) {
		this._escribirArchivos = flag;
	}
	/**
	 * Indicar si se guardara el archivo PDF
	 * @param {Boolean} flag
	 * @return void
	 */
	generarPDF (flag) {
		this._generarPDF = flag;
	}
	/**
	 * Indicar si se guardara el archivo CBB (png)
	 * @param {Boolean} flag
	 * @return void
	 */
	generarCBB (flag) {
		this._generarCBB = flag;
	}
	/**
	 * Indicar si se guardara el archivo TXT
	 * @param {Boolean} flag
	 * @return void
	 */
	generarTXT (flag) {
		this._generarTXT = flag;
	}

	/**
	 * Decodificar los errores del soap fault
	 * @param {String} body
	 * @return {Object}
	 */
	decodeErrors (body) {
		const fcode = /\<faultcode\>(.*)\<\/faultcode\>/g;
		const fstring = /\<faultstring\>(.*)\<\/faultstring\>/g;

		let match_code = fcode.exec(body);
		let match_string = fstring.exec(body);

		return {
			code: match_code[0].replace('<faultcode>','').replace('</faultcode>', ''),
			string: match_string[0].replace('<faultstring>','').replace('</faultstring>', '')
		}
	}

	/**
	 * Escribir archivos
	 * @param {String} filename
	 * @param {String} conent
	 * @return void
	 */
	_writeFile (filename, content) {
		if (!this._escribirArchivos)
			return false;

		fs.writeFile(this.path + filename, new Buffer(content, 'base64'), function (err) {
			if (err) {
				console.log(`Ocurrio un error al escribir el archivo ${filename}`);
			}
		});
	}

	/**
	 * Leer un archivo y convertirlo a base64
	 * @param {String} path
	 * @return {String}
	 */
	 _readFile (path) {
	 	return fs.readFileSync(path).toString('base64');
	 }


}

module.exports = FacturacionModerna;