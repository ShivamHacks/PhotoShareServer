var express = require('express');
var router = express.Router();

var dbUsers = require('../helpers/dbInterface')('users');
var dbGroups = require('../helpers/dbInterface')('groups');
var ObjectId = require('mongodb').ObjectID;
var shortid = require('shortid');

var _ = require('underscore');
var encryption = require('../helpers/encryption');

// only creator can delete group

router.post('/newGroup', function(req, res, next) {
	var members = req.body.members;  // list of phone numbers

	getMembers(members, function(success, results) {
		if (success) {
			var group = { 
				name: req.body.groupName, 
				members: results.existingUsers, 
				createdBy: req.body.userID, 
				createdAt: Date.now(), 
				events: [] 
			};
			dbGroups.put(group, function(success, doc) {
				if (success) res.send(JSON.stringify(doc));
				else res.send('error adding group');
			});
		}
	});

	// TODO: push groupID to user's groups array

});

router.post('/addMembers', function(req, res, next) {
	var groupID = req.body.groupID;
	var members = req.body.members;
	getMembers(members, function(success, results) {
		if (success) {
			var params = { $push: { members: { $each: results.existingUsers } } };
			dbGroups.update({ _id: ObjectId(groupID) }, params, function(success, doc) {
				if (success) res.send(JSON.stringify(doc));
				else res.send('error updating group members');
			});
		}
	});
});

router.post('/createEvent', function(req, res, next) {
	var groupID = req.body.groupID;
	var params = { $push: { 
		events: { 
			name: req.body.eventName, 
			id: shortid.generate(), 
			createdAt: Date.now(),
			createdBy: req.body.userID
		} 
	} };
	dbGroups.update({ _id: ObjectId(groupID) }, params, function(success, doc) {
		if (success) res.send(JSON.stringify(doc));
		else res.send('error creating event');
	});
});

router.post('/deleteEvent', function(req, res, next) {
	var groupID = req.body.groupID;
	var eventID = req.body.eventID;
	dbGroups.get({ _id: ObjectId(groupID) }, function(success, group) {
		if (success) {
			if (_.isEmpty(group)) { res.send('No group with this id'); }
			else {
				if (req.body.userID == group.createdBy) {
					var params = { $pull: { events: { id: eventID } } };
					dbGroups.update({ _id: ObjectId(groupID) }, params, function(success, doc) {
						if (success) res.send(JSON.stringify(doc));
						else res.send('error deleting event');
					});
				} else { res.send('You are not authorized to delete event'); }
			}
		} else { res.send('Unknown error'); }
	});
});

router.post('/deleteGroup', function(req, res, next) {
	var groupID = req.body.groupID;
	dbGroups.get({ _id: ObjectId(groupID) }, function(success, group) {
		if (success) {
			if (_.isEmpty(group)) { res.send('No group with this id'); }
			else {
				if (req.body.userID == group.createdBy) {
					db.remove({ _id: ObjectId(groupID) }, function(success) {});
				} else { res.send('You are not authorized to delete event'); }
			}
		} else { res.send('Unknown error'); }
	});
});

// need to fix this a little
router.post('/editGroup', function(req, res, next) {
	var attributesToEdit = req.body.attributesToEdit;
	var groupID = req.body.groupID;
	var params = { $set: {} };
	_.each(attributesToEdit, function(val, key) { if (key != '_id') params.$set[key] = val; });
	console.log(params);

	dbGroups.update({ _id: ObjectId(groupID) }, params, function(success, result) {
		if (success) res.send(JSON.stringify(result));
		else res.send('err updating'); // result = err
	});
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

	// TODO: fix null vals in post reqs.

	// current system: only adds numbers that have users to group. other numbers are ignored (but group greater is notified of the numbers not added)

	// how to know that group doesn't exist - ignore that for now
	// TODO, notify users that they have been added to a group
	// TODO, allow users to leave a group

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

	 // object with update vals
	//var valuesToPut = req.body.valuesToPut; // array of object values