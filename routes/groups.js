var express = require('express');
var router = express.Router();

var Datastore = require('nedb');
var db = new Datastore('./groups.db');
db.loadDatabase();

router.get('/', function(req, res, next) {
	// photo stuff here
	// token = req.decoded
  	res.send('respond with a photo resource');
});

router.post('/new', function(req, res, next) {
	var name = req.body.name;
	var members = req.body.members;
	var createdBy = req.body.userID;
	if (name && members && createdBy) {
		dbPut
	}
});

// db functions to keep code indendent of db provider
function dbPut(obj, callback) {
	db.insert(obj, function(err, doc) {
		if (err) callback(err, null);
		else callback(null, doc);
	});
}
function dbGet(obj, callback) {
	db.findOne(obj, function(err, doc) {	
		if (err) callback(err, null);
		else callback(null, doc);
	});
}
function dbQuery(obj, callback) {
	db.find(obj, function(err, docs) {
		if (err) callback(err, null);
		else callback(null, docs);
	});
}
function dbUpdate(arr, callback) {
	db.update(arr[0], arr[1], {}, function(err, numReplaced) {
		if (err) callback(err, false);
		else callback(null, true);
	});
}

module.exports = router;