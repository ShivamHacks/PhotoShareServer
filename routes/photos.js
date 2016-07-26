var express = require('express');
var router = express.Router();
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');

// Initialized DB w/ indexes and such
dbPhotos.dropAllIndexes();
dbPhotos.createIndex({ "group": 1, "capturedAt": -1 });

var ObjectId = require('mongodb').ObjectID;

var cloudinary = require('cloudinary');
cloudinary.config(config.cloudinary);

var requester = require('request');
var _ = require('underscore');
var request = require('../helpers/request');

router.post('/upload', function(req, res, next) {

	var r = request.new(req, res);

	var userID = r.body.userID;
	var base = 'data:image/png;base64,';

	cloudinary.v2.uploader.upload(base + r.body.image, function(err, result) {
		if (err) { r.error(500, 'Error uploading photo'); }
		else {
			dbPhotos.put({
				capturedBy: userID, // TODO: add easier user identification
				url: result.secure_url,
				capturedAt: r.body.capturedAt,
				group: r.body.groupID
			}, function(success, doc) {
				if (success) r.success({}); 
				else r.error(500, 'Error saving photo', userID, req.url);
			});
		}
	});
});

router.get('/get', function(req, res, next) {

	var photoID = req.query.photoid;

	dbPhotos.get({ _id: ObjectId(photoID) }, function(success, result) {
		if (success) {
			var url = result.url;
			requester(url).pipe(res);
		} else { r.error(500, 'Error retrieving image', null, req.url); }
	});
	// For now: if image does not exist, just send an image of no image
});

router.get('/getAll', function(req, res, next) {

	var r = request.new(req, res);

	var userID = r.body.userid;
	var groupID = r.body.groupid;
	var token = r.body.token;

	dbPhotos.getMany({ group: groupID }, function(success, docs) {
		if (success && docs.length != 0) {
			r.success({
				photoURLS: _.map(docs, function(doc) {
					return config.appRootURL + '/api/photos/get?photoid=' + doc._id + '&token=' + token
				})
			});
		} else if (docs.length == 0) {
			r.success({ photoURLS: [] });
		} else { r.error(500, 'Error getting all photos', userID, req.url); }
	});
});

module.exports = router;