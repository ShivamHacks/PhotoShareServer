var express = require('express');
var router = express.Router();
var config = require('../config');

var countries = require('country-data').countries;

var unverifiedUsersDB = require('../helpers/dbInterface')('unverifiedUsers');
var dbUsers = require('../helpers/dbInterface')('users');
var ObjectId = require('mongodb').ObjectID;

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var verificationGen = require('randomstring');
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
					verificationCode: verificationGen.generate({ length: 6, charset: 'numeric' })
				}, function(success, doc) {
					if (success) {
						sendText(internationalPhoneNumber, doc.verificationCode, function(sent) {
							if (sent) {
								r.success({ 
									success: true,
									userID: doc._id 
								});
							} else { r.error(500, 'Error sending verification text', null, req.url); }
						});
					} else { r.error(500, 'Something went wrong', null, req.url); }
				});
			} else { r.error(400, 'Incorrect password', null, req.url); }
		} else { r.error(400, 'Account does not exist', null, req.url); }
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
		verificationCode: verificationGen.generate({ length: 6, charset: 'numeric' }),
	}, function(success, doc) {
		if (success) {
			sendText(internationalPhoneNumber, doc.verificationCode, function(sent) {
				if (sent) r.success({ userID: doc._id });
				else r.error(500, 'Error sending verification text', null, req.url);
			});
		} else { r.error(500, 'Something went wrong', null, req.url); }
	});

});

router.post('/verify', function(req, res, next) {

	var r = request.new(req, res);

	var userID = r.body.userID;
	var verificationCode = r.body.verificationCode;

	unverifiedUsersDB.get({ _id: ObjectId(userID) }, function (success, doc) {
		if (success && !(_.isEmpty(doc))) {
			if (verificationCode == doc.verificationCode) {
				delete doc.verificationCode;
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
					} else { r.error(500, 'Error verifying account', null, req.url); }
				});
			} else { r.error(400, 'Incorrect verification code', null, req.url); }
		} else { r.error(500, 'Error verifying account', null, req.url); }
	});

});

// TODO: make official Twilio account, can't use trial
function sendText(phoneNumber, verificationCode, callback) {
	twilio.messages.create({
		to: phoneNumber,
		from: nativeNumber,
		body: 'PictureUs verification Code: ' + verificationCode,
	}, function (err, message) {
		if (err) { callback(false); }
		else { callback(true); }
	});
}

module.exports = router;
