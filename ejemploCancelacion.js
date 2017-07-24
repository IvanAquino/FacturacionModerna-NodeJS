'use strict';

const FacturacionModerna = require('./lib/FacturacionModerna');
const WSDL_URL = "https://t1demo.facturacionmoderna.com/timbrado/wsdl";
const credenciales = {
	user: "UsuarioPruebasWS",
	password: "b9ec2afa3361a59af4b4d102d3f704eabdf097d4",
};
const rfc = "ESI920427886";
const uuid = "89FDF825-5020-4D3A-9902-292EE5C5D87A";

const client = new FacturacionModerna(WSDL_URL, credenciales);

client.cancelar( rfc, uuid )
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