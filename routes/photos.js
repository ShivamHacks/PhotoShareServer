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

// to pipe image: request(doc.url).pipe(res);

router.post('/upload', function(req, res, next) {
	// FIX THIS
	var buff = new Buffer(req.body.image, 'base64');
	var path = './uploads/' + shortid.generate();
	fs.writeFile(path, buff, function(err) { 
		if (err) { res.send('Error uploading photo' + err); }
		else {
			cloudinary.v2.uploader.upload(path, function(err, result) {
				if (err) { res.send('Error uploading photo'); }
				else {
					fs.unlink(path,function(err) {});  
					dbPhotos.put({
						capturedBy: req.body.userID,
						eventID: req.body.eventID,
						url: result.secure_url,
						capturedAt: Date.now()
					}, function(success, doc) {
						if (success) res.send(JSON.stringify(doc)); //res.send('Succesfully uploaded image');
						else res.send('Error putting image on DB');
					});
				}
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

module.exports = router;