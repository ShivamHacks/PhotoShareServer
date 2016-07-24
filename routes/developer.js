// these are the protected routes where I can see all of the errors
// and the status of the server so I can ping db and such

var express = require('express');
var router = express.Router();
var config = require('../config');

var MongoClient = require('mongodb').MongoClient;
var url = config.mongoURL;
var dbErrors = require('../helpers/dbInterface')('errors');

router.get('/dbStatus', function(req, res, next) {
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
});

router.post('/dbShutdown', function(req, res, next) {
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
});

router.get('/dbErrors', function(req, res, next) {
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
});

router.post('/dbClearErrors', function(req, res, next) {
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
});

module.exports = router;