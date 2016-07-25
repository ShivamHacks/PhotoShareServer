var express = require('express');
var router = express.Router();
var config = require('../config');

var countries = require('country-data').countries;

var unverifiedUsersDB = require('../helpers/dbInterface')('unverifiedUsers');
var dbUsers = require('../helpers/dbInterface')('users');
var ObjectId = require('mongodb').ObjectID;

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var verficationGen = require('randomstring');
var encryption = require('../helpers/encryption');
var jwt = require('jsonwebtoken');

var jwtSecret = config.jwtSecret;
var nativeNumber = config.nativeNumber;

var _ = require('underscore');
var request = require('../helpers/request');

router.post('/login', function(req, res, next) {

	var r = request.new(req, res);
	
	var phoneNumber = r.body.phoneNumber;
	var countryISO = r.body.countryISO.toUpperCase();
	var password = r.body.password;

	var internationalPhoneNumber = countries[countryISO].countryCallingCodes[0] + phoneNumber;

	dbUsers.get({ 
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
							if (sent) {
								r.success({ 
									success: true,
									userID: doc._id 
								});
							} else { r.error(500, 'Error sending verification text'); }
						});
					} else { r.error(500, 'Something went wrong'); }
				});
			} else { r.error(400, 'Incorrect password'); }
		} else { r.error(500, 'Something went wrong'); }
	});

});

router.post('/signup', function(req, res, next) {

	var r = request.new(req, res);

	var phoneNumber = r.body.phoneNumber;
	var countryISO = r.body.countryISO.toUpperCase();
	var password = r.body.password;

	var internationalPhoneNumber = countries[countryISO].countryCallingCodes[0] + phoneNumber;

	unverifiedUsersDB.put({
		phoneNumber: encryption.encrypt(internationalPhoneNumber),
		password: encryption.encrypt(password),
		verficationCode: verficationGen.generate({ length: 6, charset: 'numeric' }),
	}, function(success, doc) {
		if (success) {
			sendText(internationalPhoneNumber, doc.verficationCode, function(sent) {
				if (sent) r.success({ userID: doc._id });
				else r.error(500, 'Error sending verification text');
			});
		} else { r.error(500, 'Something went wrong'); }
	});

});

router.post('/verify', function(req, res, next) {

	var r = request.new(req, res);

	var userID = r.body.userID;
	var verficationCode = r.body.verficationCode;

	unverifiedUsersDB.get({ _id: ObjectId(userID) }, function (success, doc) {
		if (success && !(_.isEmpty(doc))) {
			if (verficationCode == doc.verficationCode) {
				delete doc.verficationCode;
				doc.groups = [];
				dbUsers.put(doc, function (success, doc) {
					if (success) {
						unverifiedUsersDB.remove({ _id: ObjectId(userID) }, function(success) {});
						dbUsers.remove({ phoneNumber: doc.phoneNumber, _id: { 
							$ne: ObjectId(userID) } 
						}, function(success) {});
						r.success({
							token: jwt.sign({ 
								userID: doc._id, 
								phoneNumber: doc.phoneNumber 
							}, jwtSecret) 
						});
					} else { r.error(500, 'Error verifying account'); }
				});
			} else { r.error(400, 'Incorrect verification code'); }
		} else { r.error(500, 'Something went wrong'); }
	});

});

// TODO: make official Twilio account, can't use trial
function sendText(phoneNumber, verficationCode, callback) {
	twilio.messages.create({
		to: phoneNumber,
		from: nativeNumber,
		body: 'PictureUs verification Code: ' + verficationCode,
	}, function (err, message) {
		if (err) { callback(false); }
		else { callback(true); }
	});
}

module.exports = router;
