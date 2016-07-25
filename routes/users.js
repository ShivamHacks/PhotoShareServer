var express = require('express');
var router = express.Router();
var config = require('../config');

var countries = require('country-data').countries;

var unverifiedUsersDB = require('../helpers/dbInterface')('unverifiedUsers');
var db = require('../helpers/dbInterface')('users');
var ObjectId = require('mongodb').ObjectID;

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var verficationGen = require('randomstring');
var encryption = require('../helpers/encryption');
var jwt = require('jsonwebtoken');

var jwtSecret = config.jwtSecret;
var nativeNumber = config.nativeNumber;

var _ = require('underscore');
var e = require('../helpers/error');

// TODO: logout: Set verified to false

router.post('/login', function(req, res, next) {
	
	var phoneNumber = req.body.phoneNumber;
	var countryISO = req.body.countryISO.toUpperCase();
	var password = req.body.password;

	var internationalPhoneNumber = countries[countryISO].countryCallingCodes[0] + phoneNumber;

	db.get({ 
		phoneNumber: encryption.encrypt(internationalPhoneNumber)
	}, function(err, doc) {
		if (!(_.isEmpty(doc))) {
			if (doc.password == encryption.encrypt(password)) {

				unverifiedUsersDB.put({
					phoneNumber: encryption.encrypt(internationalPhoneNumber),
					password: encryption.encrypt(password),
					verficationCode: verficationGen.generate({ length: 6, charset: 'numeric' })
				}, function(success, doc) {
					if (success) {
						sendText(internationalPhoneNumber, doc.verficationCode, function(sent) {
							if (sent) res.send(JSON.stringify({ userID: doc._id }));
							else res.send(e.new(500, 'Error sending verification text'));
						});
					} else { res.send(e.new(500, 'Something went wrong')); }
				});
			} else { res.send(e.new(400, 'Incorrect password')); }
		} else { res.send(e.new(500, 'Something went wrong')); }
	});

});

router.post('/signup', function(req, res, next) {

	var phoneNumber = req.body.phoneNumber;
	var countryISO = req.body.countryISO.toUpperCase();
	var password = req.body.password;

	var internationalPhoneNumber = countries[countryISO].countryCallingCodes[0] + phoneNumber;

	unverifiedUsersDB.put({
		phoneNumber: encryption.encrypt(internationalPhoneNumber),
		password: encryption.encrypt(password),
		verficationCode: verficationGen.generate({ length: 6, charset: 'numeric' }),
	}, function(success, doc) {
		if (success) {
			sendText(internationalPhoneNumber, doc.verficationCode, function(sent) {
				if (sent) res.send(JSON.stringify({ userID: doc._id }));
				else res.send(e.new(500, 'Error sending verification text'));
			});
		} else { res.send(e.new(500, 'Something went wrong')); }
	});

});

router.post('/verify', function(req, res, next) {

	var userID = req.body.userID;
	var verficationCode = req.body.verficationCode;

	unverifiedUsersDB.get({ _id: ObjectId(userID) }, function (success, doc) {
		if (success && !(_.isEmpty(doc))) {
			if (verficationCode == doc.verficationCode) {
				delete doc.verficationCode;
				doc.groups = [];
				db.put(doc, function (success, doc) {
					if (success) {
						unverifiedUsersDB.remove({ _id: ObjectId(userID) }, function(success) {});
						db.remove({ phoneNumber: doc.phoneNumber, _id: { 
							$ne: ObjectId(userID) } 
						}, function(success) {});
						res.send(JSON.stringify({ 
							token: jwt.sign({ 
								userID: doc._id, 
								phoneNumber: doc.phoneNumber 
							}, jwtSecret) 
						}));
					} else { res.send(e.new(500, 'Error verifying account')); }
				});
			} else { res.send(e.new(400, 'Incorrect verification code')); }
		} else { res.send(e.new(500, 'Something went wrong')); }
	});

});

function sendText(phoneNumber, verficationCode, callback) {
	twilio.messages.create({
		to: phoneNumber,
		from: nativeNumber,
		body: 'PictureUs verification Code: ' + verficationCode,
	}, function (err, message) {
		if (err) { console.log(err); callback(false); }
		else { callback(true); }
	});
}

module.exports = router;
