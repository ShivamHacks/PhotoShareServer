var express = require('express');
var router = express.Router();
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');
var ObjectId = require('mongodb').ObjectID;
//dbPhotos.remove({}, function(success) {}); // TEMP

var cloudinary = require('cloudinary');
cloudinary.config(config.cloudinary);

var request = require('request');
var _ = require('underscore');
var request = require('../helpers/request');

router.post('/upload', function(req, res, next) {

	var r = request.new(req, res);

	var base = 'data:image/png;base64,';
	cloudinary.v2.uploader.upload(base + r.body.image, function(err, result) {
		if (err) { console.log(err); r.error(500, 'Error uploading photo'); }
		else {
			dbPhotos.put({
				capturedBy: r.body.userID,
				url: result.secure_url,
				capturedAt: r.body.capturedAt,
				group: r.body.groupID
			}, function(success, doc) {
				if (success) r.success({}); 
				else r.error(500, 'Error saving photo');
			});
		}
	});
});

router.get('/get', function(req, res, next) {
	var photoID = req.query.photoid;
	dbPhotos.get({ _id: ObjectId(photoID) }, function(success, result) {
		if (success) {
			var url = result.url;
			request(url).pipe(res);
		} else { res.send(e.new('Error retrieving image')); }
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
		} else { r.error(500, 'Error getting all photos'); }
	});
});

module.exports = router;