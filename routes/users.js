var express = require('express');
var router = express.Router();
var config = require('../config');

var db = require('../helpers/dbInterface')('users');
var ObjectId = require('mongodb').ObjectID;

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var verficationGen = require('randomstring');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var cryptoKey = config.cryptoKey;
var jwtSecret = config.jwtSecret;
var nativeNumber = config.nativeNumber;

// TODO better user stuff. Currently, only by phone number, but what if phone number switches

// TODO, add area code - do on android

// Authentication: 2 way with phone number & password
// If number is recylced, no worries, b/c still have password, and later email verif.
// right now, no good (all messed up). need to do password stuff and need to check for phone SO MUCH TODO.

/*

Login System: A 2 way authentication system using phone number and password
Users can signup using a phone number and a password. The phone number is verified.
If a user signs up with a number that already exists in our database, and this user's number is verified,
then the other user with the same number is removed from the database, to maintain a 1 to 1 ratio between users and phone numbers.
Can also login using phone number and password.

*/

/*

TODO: add password reset using same system as verification. Use phone number, get text verification number, and input new password in twice
(like all services do) and input verification number. If verification number matches, password updated :)

*/

// TODO: logout: Set verified to false

router.post('/login', function(req, res, next) {
	var phoneNumber = req.body.phoneNumber;
	var password = req.body.password;
	if (phoneNumber && password) {
		db.get({ 
			phoneNumber: encrypt(phoneNumber)
		}, function(err, doc) {
			if (doc) {
				if (doc.password == encrypt(password)) {
					// user has correct credentials: phone number and password
					doc.verficationCode = verficationGen.generate({ length: 6, charset: 'numeric' });
					db.update({ phoneNumber: encrypt(phoneNumber) }, doc, function (err, numReplaced) {
						if (err) { res.send('Error something'); }
						else {
							sendText(phoneNumber, doc.verficationCode, function(sent) {
								if (sent) res.send(JSON.stringify(doc));
								else res.send('Error sending message');
							});
						}
					});
				} else { res.send('Incorrect password'); }
			} else if (err) { res.send('Unknown error'); }
			else { res.send('No account with this number exists');  }
		});
	} else { res.send('No phone number and/or password provided'); }
});

router.post('/signup', function(req, res, next) {
	var phoneNumber = req.body.phoneNumber;
	var password = req.body.password;
	if (typeof phoneNumber != 'undefined' && typeof password != 'undefined') {
		db.put({
			phoneNumber: encrypt(phoneNumber),
			password: encrypt(password),
			verficationCode: verficationGen.generate({ length: 6, charset: 'numeric' })
		}, function(success, doc) {
			if (success) {
				/*sendText(phoneNumber, doc.verficationCode, function(sent) {
					if (sent) res.send(JSON.stringify(doc));
					else res.send('Error sending message');
				});*/
				res.send(JSON.stringify(doc));
			} else { res.send('Unknown error'); }
		});
	} else { res.send('No phone number and/or password provided'); }
});

router.post('/verify', function(req, res, next) {
	// replace existing account if it exists
	var verficationCode = req.body.verficationCode;
	var phoneNumber = req.body.phoneNumber;
	var userID = req.body.userID;
	if (verficationCode && userID) {
		db.get({ _id: ObjectId(userID) }, function (success, doc) {
			if (success && doc) {
				if (verficationCode == doc.verficationCode) {
					delete doc.verficationCode;
					db.update({ _id: ObjectId(userID) }, doc, function (success, doc) {
						if (success) {
							// removes all user accounts with this phone number except for the one that was just verified
							// in the future, instead of being removed, they will be archived with email identification so people can recover their account
							db.remove({ phoneNumber: encrypt(phoneNumber), _id: { $ne: ObjectId(userID) } }, function(success) {});
							res.send(JSON.stringify({ token: jwt.sign({ userID: doc._id }, jwtSecret) }));
						} else { res.send('error updating'); }
					});
				} else { res.send('incorrect code'); }
			} else if (!success) { res.send('Unknown error'); }
			else { res.send('Account does not exist'); }
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
		body: 'Verification Code: ' + verficationCode + '. Ignore this if you are already verified (someone may be trying to hack your account).',
	}, function (err, message) {
		if (err) { console.log(err); callback(false); }
		else { callback(true); }
	});
}

module.exports = router;
