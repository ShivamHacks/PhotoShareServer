var express = require('express');
var router = express.Router();
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');
var ObjectId = require('mongodb').ObjectID;

var cloudinary = require('cloudinary');
cloudinary.config(config.cloudinary);

var request = require('request');
var _ = require('underscore');
var e = require('../helpers/error');

router.post('/upload', function(req, res, next) {
	var base = 'data:image/png;base64,';
	cloudinary.v2.uploader.upload(base + req.body.image, function(err, result) {
		if (err) { console.log(err); res.send(e.new(500, 'Error uploading photo')); }
		else {
			dbPhotos.put({
				capturedBy: req.body.userID,
				url: result.secure_url,
				capturedAt: req.body.capturedAt,
				group: req.body.groupID
			}, function(success, doc) {
				if (success) { 
					res.send(JSON.stringify({
						success: true
					})); 
				}
				else { res.send(e.new(500, 'Error saving photo')); }
			});
		}
	});
});

router.get('/get', function(req, res, next) {
	dbPhotos.get({ _id: ObjectId(photoID) }, function(success, result) {
		if (success) {
			var url = result.url;
			request(url).pipe(res);
		} else { res.send(e.new('Error retrieving image')); }
	});
});

router.get('/getAll', function(req, res, next) {
	var userID = req.headers.userid;
	var groupID = req.headers.groupid;
	dbPhotos.getMany({ group: groupID }, function(success, docs) {
		if (success && docs.length != 0) {
			res.send(JSON.stringify({
				success: true,
				photoURLS: _.pluck(docs, 'url')
			}));
		} else { res.send(e.new(500, 'Error getting all photos')); }
	});
});

module.exports = router;