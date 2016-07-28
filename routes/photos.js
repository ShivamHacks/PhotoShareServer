var express = require('express');
var router = express.Router();
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');

// Initialized DB w/ indexes and such
dbPhotos.dropAllIndexes();
dbPhotos.createIndex({ "group": 1 });

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
	var dbID = new ObjectId();

	cloudinary.v2.uploader.upload(base + r.body.image, { 
		public_id: dbID 
	}, function(error, result) {
		if (!error) {
			dbPhotos.put({
				_id: dbID,
				capturedBy: userID,
				capturedAt: r.body.capturedAt,
				group: r.body.groupID
			}, function(success, doc) {});
		}
	});

	r.success({});
});

/*router.get('/get', function(req, res, next) {
	var r = request.new(req, res);
	var photoID = req.query.photoid;
	requester(config.cloudinaryURL + photoID).pipe(res);
});*/

router.get('/getAll', function(req, res, next) {

	var r = request.new(req, res);

	var userID = r.body.userid;
	var groupID = r.body.groupid;
	var token = r.body.token;

	dbPhotos.getMany({ group: groupID }, function(success, docs) {
		if (success && docs.length != 0) {
			r.success({
				photoURLS: _.sortBy(_.map(docs, function(doc) {
					return config.cloudinaryURL + doc._id;
					/*return config.appRootURL 
					+ '/api/photos/get?photoid=' 
					+ doc._id + '&token=' + token*/
				}), function(photo) {
					return photo.capturedAt
				})
			});
		} else if (docs.length == 0) {
			r.success({ photoURLS: [] });
		} else { r.error(500, 'Error getting all photos', userID, req.url); }
	});
});

module.exports = router;