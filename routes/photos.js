var express = require('express');
var router = express.Router();
var fs = require('fs');
var config = require('../config');

var dbPhotos = require('../helpers/dbInterface')('photos');
//dbPhotos.remove({}, function(success, result) {});
var ObjectId = require('mongodb').ObjectID;

//var cloudinary = require('cloudinary');
//cloudinary.config(config.cloudinary);
//var Clarifai = require('clarifai');
//Clarifai.initialize(config.clarifai);

var request = require('request');
var _ = require('underscore');

var shortid = require('shortid');

// TODO: switch from cloudinary to s3 b/c images are larger
// and s3 might be cheaper in the long term. Still need to do calculations
// but cloudinary does automatic facial recognition. Can it replace clarifai or kairos?
// if yes, then I might stick to cloudinary
// no it can't really replace clarifai/kairos for my needs

router.post('/upload', function(req, res, next) {
	dbPhotos.put({
		capturedBy: req.body.userID,
		url: "No url yet b/c no server",
		capturedAt: Date.now(),
		group: req.body.groupID
	}, function(success, doc) {
		if (success) {
			var buff = new Buffer(req.body.image, 'base64');
			fs.writeFile('uploads/' + doc._id + '.png', buff, function(err) { 
				if (err) res.send(err);
				else res.send("ALL GOOD");
			});
		}
		else res.send('Error putting image on DB');
	});
});

// do this so that end user doesn't see original storage url for image
router.get('/get', function(req, res, next) {
	// TODO: make this secure
	var photoID = req.query.photoid;
	var stream = fs.createReadStream('uploads/' + photoID + '.png');
	stream.pipe(res);
});

router.get('/getAll', function(req, res, next) {
	var userID = req.headers.userid;
	var groupID = req.headers.groupid;
	dbPhotos.getMany({ group: groupID }, function(success, docs) {
		if (success && docs.length != 0) {
			res.send(JSON.stringify({
				success: true,
				photoURLS: _.map(docs, function(doc) {
					return 'http://10.0.0.11:3000/api/photos/get?photoid=' + doc._id
				})
			}));
		} else { res.send('err'); }
	});
});

function Request(req, res) {
	this.body = returnBody(req);
	this.send = function(result) { res.send(result); }
}
function returnBody(req) {
	// REMEMBER -> in get requests, all body field keys are lowercase
	if (req.method == 'POST') return req.body;
	else if (req.method == 'GET') return req.headers;
	else return req; // no change
}

module.exports = router;