'use strict';

const FacturacionModerna = require('./lib/FacturacionModerna');
const WSDL_URL = "https://t1demo.facturacionmoderna.com/timbrado/wsdl";
const credenciales = {
	user: "UsuarioPruebasWS",
	password: "b9ec2afa3361a59af4b4d102d3f704eabdf097d4",
};
const rfc = "ESI920427886";
const archCer = "./utilerias/certificados/20001000000200000192.cer";
const archKey = "./utilerias/certificados/20001000000200000192.key";
const passKey = "12345678a";

const client = new FacturacionModerna(WSDL_URL, credenciales);

client.activarCancelacion( rfc, archCer, archKey, passKey )
	.then(function (resultado) {

		console.log(resultado);

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