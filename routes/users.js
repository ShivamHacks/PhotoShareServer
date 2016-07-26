var express = require('express');
var router = express.Router();
var config = require('../config');

var countries = require('country-data').countries;

var unverifiedUsersDB = require('../helpers/dbInterface')('unverifiedUsers');
unverifiedUsersDB.remove({}, function(success) {});

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
	var password = r.body.password;

	dbUsers.get({ 
		phoneNumber: encryption.encrypt(phoneNumber)
	}, function(err, doc) {
		if (!(_.isEmpty(doc))) {
			if (doc.password == encryption.encrypt(password)) {

				unverifiedUsersDB.put({
					phoneNumber: encryption.encrypt(phoneNumber),
					password: encryption.encrypt(password),
					verificationCode: verificationGen.generate({ length: 6, charset: 'numeric' })
				}, function(success, doc) {
					if (success) {
						console.log({ userID: doc._id, verificationCode: doc.verificationCode });
						//r.success({ userID: doc._id, verificationCode: doc.verificationCode });
						sendText(phoneNumber, doc.verificationCode, function(sent) {
							if (sent) r.success({  userID: doc._id  });
							else r.error(500, 'Error sending verification text', null, req.url);
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
	var password = r.body.password;

	unverifiedUsersDB.put({
		phoneNumber: encryption.encrypt(phoneNumber),
		password: encryption.encrypt(password),
		verificationCode: verificationGen.generate({ length: 6, charset: 'numeric' }),
	}, function(success, doc) {
		if (success) {
			console.log({ userID: doc._id, verificationCode: doc.verificationCode });
			//r.success({ userID: doc._id, verificationCode: doc.verificationCode });
			sendText(phoneNumber, doc.verificationCode, function(sent) {
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
	var intent = r.body.intent;
	var phoneNumber = r.body.phoneNumber;

	unverifiedUsersDB.get({ _id: ObjectId(userID) }, function (success, doc) {
		if (success && !(_.isEmpty(doc))) {
			if (verificationCode == doc.verificationCode) {
				delete doc.verificationCode;

				if (intent == 'signup') {

					doc.groups = [];
					dbUsers.put(doc, function (success, doc) {
						if (success) {
							// Clear unverified users DB
							unverifiedUsersDB.remove({ _id: ObjectId(userID) }, function(success) {});
							unverifiedUsersDB.remove({ 
								phoneNumber: encryption.encrypt(phoneNumber) 
							}, function(success) {});

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

				} else if (intent == 'login') {

					unverifiedUsersDB.remove({ _id: ObjectId(userID) }, function(success) {});
					dbUsers.get({ 
						phoneNumber: encryption.encrypt(phoneNumber)
					}, function(success, doc) {
						if (success) { 
							r.success({
								token: jwt.sign({ 
									userID: doc._id, 
									phoneNumber: doc.phoneNumber 
								}, jwtSecret) 
							});
						} else {  r.error(500, 'Error logging in', null, req.url); }
					});

				} else { r.error(400, 'Unknown login/signup intent', null, req.url); }

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
