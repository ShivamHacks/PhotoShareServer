var express = require('express');
var router = express.Router();

var dbUsers = require('../helpers/dbInterface')('users');
var dbGroups = require('../helpers/dbInterface')('groups');
var ObjectId = require('mongodb').ObjectID;

var _ = require('underscore');
var encryption = require('../helpers/encryption');

router.get('/', function(req, res, next) {
	// photo stuff here
	// token = req.decoded
  	res.send('respond with a photo resource');
});

router.post('/new', function(req, res, next) {
	var name = req.body.name;
	var members = req.body.members;  // list of phone numbers
	var createdBy = req.body.userID;

	// how to know that group doesn't exist - ignore that for now
	// TODO, notify users that they have been added to a group
	// TODO, allow users to leave a group

	getMembers(members, function(success, results) {
		if (success) {
			var group = { name: name, members: results.existingUsers, createdBy: createdBy, createdAt: Date.now() };
			dbGroups.put(group, function(success, doc) {
				if (success) res.send(JSON.stringify(doc));
				else res.send('error adding group');
			});
		}
	});

	// For now, this function is done

	// need to process members: identify who is a user for our app, and who isn't (b/c its only by number, so people can put in number without knowing whether its a user or not)
	// people who aren't users can have access to photos online?
	// people who aren't users but become users must have access to group once they are created. How?
	/*if (name && members && createdBy) {
		dbPut({
			name: name,
			members: 
		})
	}*/
});

function getMembers(members, callback) {
	var encryptedNumbers = _.map(members, function(member) { return encryption.encrypt(member); });
	dbUsers.getMany({ phoneNumber: { $in: encryptedNumbers} }, function(success, results) {
		if (success) {
			var dbNumbers = _.pluck(results, 'phoneNumber');
			var categorize = _.groupBy(encryptedNumbers, function(number) { return _.contains(dbNumbers, number); });
			var existingUsers = _.pluck(_.filter(results, function(obj) { return _.contains(categorize.true, obj.phoneNumber); }), '_id');
			var notUsers = _.filter(encryptedNumbers, function(number) { return _.contains(categorize.true, number); });
			var toReturn = { existingUsers: existingUsers, notUsers: notUsers };
			callback(true, toReturn);
		} else callback(false, null);
	});
}

module.exports = router;