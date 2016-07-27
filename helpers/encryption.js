var crypto = require('crypto');
var config = require('../app.json');
var cryptoKey = config.cryptoKey;

module.exports = {

	encrypt: function(str) {
		var cipher = crypto.createCipher('aes-256-cbc', cryptoKey);
		cipher.update(str, 'utf8', 'base64');
		var encrypted = cipher.final('base64');
		return encrypted;
	},

	decrypt: function(str) {
		var decipher = crypto.createDecipher('aes-256-cbc', cryptoKey);
		decipher.update(str, 'base64', 'utf8');
		var decrypted = decipher.final('utf8');
		return decrypted;
	}
	
};