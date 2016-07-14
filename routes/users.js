var express = require('express');
var router = express.Router();
var config = require('../config');

var Datastore = require('nedb');
var db = new Datastore('./users.db');
db.loadDatabase();
db.ensureIndex({ fieldName: 'phoneNumber', unique: true }, function (err) {});
db.remove({}, { multi: true }, function (err, numRemoved) {}); // need to remove after development

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var verficationGen = require('randomstring');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var cryptoKey = config.cryptoKey;
var jwtSecret = config.jwtSecret;
var nativeNumber = config.nativeNumber;

// TODO, add area code - do on android

router.post('/verify/new', function(req, res, next) {
	var phoneNumber = req.body.phoneNumber;
	if (phoneNumber) {
		db.insert({
			phoneNumber: encrypt(phoneNumber),
			verficationCode: verficationGen.generate({ length: 6, charset: 'numeric' })
		}, function (err, doc) {
			if (err) {
				if (err.errorType == 'uniqueViolated') res.send('Phone number exists');
				else res.send('Unknown error');
			}
			else {
				sendText(phoneNumber, doc.verficationCode, function(sent) {
					if (sent) res.send(JSON.stringify(doc));
					else res.send('Error sending message');
				});
			}
		});
	} else { res.send('No phone number provided'); }
});

router.post('/verify/check', function(req, res, next) {
	var verficationCode = req.body.verficationCode;
	var userID = req.body.userID;
	if (verficationCode && userID) {
		db.findOne({ _id: userID }, function (err, doc) {
			if (err) res.send('Unknown error');
			else if (doc) {
				if (doc.verficationCode == verficationCode) {
					db.update({ _id: userID }, { verified: true }, {}, function (err, numReplaced) {
						if (err) res.send('Error verifying, but code is correct');
						else res.send(JSON.stringify({ token: jwt.sign({ userID: doc._id }, jwtSecret) }));
					});
				}
				else { res.send('incorrect code'); }
			} else { res.send('Number does not exist'); }
		});
	} else { res.send('Missing userID and/or verficationCode'); }
});

function encrypt(phoneNumber) {
	var cipher = crypto.createCipher('aes-256-cbc', cryptoKey);
	cipher.update(phoneNumber, 'utf8', 'base64');
	var encrypted = cipher.final('base64');
	return encrypted;
}
function decrypt(phoneNumber) {
	var decipher = crypto.createDecipher('aes-256-cbc', cryptoKey);
	decipher.update(phoneNumber, 'base64', 'utf8');
	var decrypted = decipher.final('utf8');
	return decrypted;
}
function sendText(phoneNumber, verficationCode, callback) {
	twilio.messages.create({
		to: phoneNumber,
		from: nativeNumber,
		body: 'Verification Code: ' + verficationCode,
	}, function (err, message) {
		if (err) { console.log(err); callback(false); }
		else { callback(true); }
	});
}

module.exports = router;
