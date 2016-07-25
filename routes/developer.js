// these are the protected routes where I can see all of the errors
// and the status of the server so I can ping db and such

var express = require('express');
var router = express.Router();
var config = require('../config');

// SUPER IMPORTANT:
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com');
var verficationGen = require('randomstring');
var numKey = verficationGen.generate({ length: 6, charset: 'numeric' });
var alphaKey = verficationGen.generate({ length: 6, charset: 'alphabetic' });

var MongoClient = require('mongodb').MongoClient;
var url = config.mongoURL;
var dbErrors = require('../helpers/dbInterface')('errors');

var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);

// Deploy on heroku 24 hrs

function canAccess(req) {
	var body;
	if (req.method == 'POST') body = req.body;
	else if (req.method == 'GET') body = req.headers;
	if (typeof body != 'undefined') {
		if (body.key1 == numKey && body.key2 == alphaKey) return true;
		else return false;
	} else { return false; }
}

router.get('/requestDevAccess', function(req, res, next) {
	numKey = verficationGen.generate({ length: 6, charset: 'numeric' });
	alphaKey = verficationGen.generate({ length: 6, charset: 'alphabetic' });

	twilio.messages.create({
		to: config.adminNumber,
		from: config.nativeNumber,
		body: 'NumKey: ' + numKey + '\nAlphaKey: ' + alphaKey,
	}, function (err, message) {
		if (err) { console.log(err); res.send('Error'); }
		else { res.send('Sent'); }
	});
});

router.get('/dbStatus', function(req, res, next) {
	if (canAccess(req)) {
		MongoClient.connect(url, function(err, db) {
			if (err) {
				res.send(JSON.stringify({
					success: false,
					error: err
				}));
			}
			else {
				res.send(JSON.stringify({
					success: true,
					message: 'MongoDB is online!'
				}));
			}
			db.close();
		});
	} else { res.send('Not Authorized'); }
});

router.post('/dbShutdown', function(req, res, next) {
	if (canAccess(req)) {
		MongoClient.connect(url, function(err, db) {
			if (err) {
				res.send(JSON.stringify({
					success: false,
					error: err
				}));
			}
			else {
			//db.command({ shutdown: 1 }); TODO
			res.send(JSON.stringify({
				success: true,
				message: 'Shutting Down Mongo Server'
			}))
		}
		db.close();
	});
	} else { res.send('Not Authorized'); }
});

router.get('/dbErrors', function(req, res, next) {
	if (canAccess(req)) {
		var skip = req.body.skip == undefined ? 0 : parseInt(req.body.skip);
		MongoClient.connect(url, function(err, db) {
			db.collection('errors').find({}).limit(10).skip(skip).toArray(function(err, docs) {
				if (err) {
					res.send(JSON.stringify({
						success: false,
						error: err
					}));
				}
				else {
					res.send(JSON.stringify({
						success: true,
						docs: docs
					}));
				}
				db.close();
			});
		});
	} else { res.send('Not Authorized'); }
});

router.post('/dbClearErrors', function(req, res, next) {
	if (canAccess(req)) {
		MongoClient.connect(url, function(err, db) {
			if (err) {
				res.send(JSON.stringify({
					success: false,
					error: err
				}));
			}
			else {
				db.collection('errors').remove({});
				res.send(JSON.stringify({
					success: true,
					message: 'Cleared Errors'
				}))
			}
			db.close();
		});
	} else { res.send('Not Authorized'); }
});

module.exports = router;