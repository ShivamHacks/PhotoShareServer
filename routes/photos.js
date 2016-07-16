var express = require('express');
var router = express.Router();
var fs = require('fs');
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');
var ObjectId = require('mongodb').ObjectID;
var cloudinary = require('cloudinary');
cloudinary.config(config.cloudinary);
var request = require('request');

var shortid = require('shortid');

// TODO: switch from cloudinary to s3 b/c images are larger
// and s3 might be cheaper in the long term. Still need to do calculations
// but cloudinary does automatic facial recognition. Can it replace clarifai or kairos?
// if yes, then I might stick to cloudinary
// no it can't really replace clarifai/kairos for my needs

router.post('/upload', function(req, res, next) {
	var base = 'data:image/png;base64,';
	cloudinary.v2.uploader.upload(base + req.body.image, function(err, result) {
		if (err) { res.send('Error uploading photo'); }
		else {
			dbPhotos.put({
				capturedBy: req.body.userID,
				eventID: req.body.eventID,
				url: result.secure_url,
				capturedAt: Date.now()
			}, function(success, doc) {
				if (success) res.send(JSON.stringify(doc));
				else res.send('Error putting image on DB');
			});
		}
	});
});

// do this so that end user doesn't see original storage url for image
router.get('/get', function(req, res, next) {
	var photoID = req.headers.photoid;
	// TODO: verfiy that user getting image is authorized to do so
	// But the likelihood of a user figuring out photoid is so low
	dbPhotos.get({ _id: ObjectId(photoID) }, function(success, result) {
		if (success) {
			var url = result.url;
			request(url).pipe(res);
		} else { res.send('Error retrieving image'); }
	});
});

router.get('/getAll', function(req, res, next) {
	var userID = req.body.userID;
	var eventID = req.body.eventID;
});

module.exports = router;