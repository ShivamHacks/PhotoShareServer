var express = require('express');
var router = express.Router();

// Router Index
router.post('/createGroup', createGroup);
router.get('/getAllGroups', getAllGroups);
router.get('/getGroupInfo', getGroupInfo);
router.post('/editGroup', editGroup);
router.post('/leaveGroup', leaveGroup);

// Dependencies
var dbUsers = require('../helpers/dbInterface')('users');
var dbGroups = require('../helpers/dbInterface')('groups');
var ObjectId = require('mongodb').ObjectID;
var shortid = require('shortid');

var _ = require('underscore');
var encryption = require('../helpers/encryption');

// Helper Functions
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
function Error(status, message) {
	this.status = status;
	this.message = message;
	this.toString = function() {
		return JSON.stringify({
			success: false,
			status: this.status,
			message: this.message
		});
	}
} 

// Router Functions

function createGroup(req, res, next) {
	var r = new Request(req, res);
	var members = r.body.members;
	var userID = r.body.userID;
	var phoneNumber = r.body.phoneNumber;
	// TODO: get phone number from userID, either by putting it in token, or something else
	getMembers(members, function(success, results) {
		if (success) {
			results.push({ userID: userID, phoneNumber: phoneNumber });
			var group = { 
				name: r.body.groupName, 
				members: results, 
				createdBy: r.body.userID, 
				createdAt: Date.now()
			};
			dbGroups.put(group, function(success, doc) {
				if (success) {
					updateMemberGroups(doc.members, doc._id);
					r.send(JSON.stringify({
						groupID: doc._id,
						groupName: doc.name
					}));
				}
				else { r.send(new Error(500, 'Error Creating Group').toString()); }
			});
		} else { r.send(new Error(500, 'Error Creating Group').toString()); }
	});
}

function getAllGroups(req, res, next) {
	var r = new Request(req, res);
	dbUsers.get({ _id: ObjectId(req.body.userID) }, function(success, doc) {
		if (success) {
			if (_.isEmpty(doc)) r.send(new Error(500, 'User does not exist').toString());
			else r.send(JSON.stringify({ groups: doc.groups }));
		} else { r.send(new Error(500, 'Error Getting Groups').toString()); }
	});
}

function getGroupInfo(req, res, next) {
	var r = new Request(req, res);
	dbGroups.get({ _id: ObjectId(r.body.groupid) }, function(success, doc) {
		if (success) {
			if (_.isEmpty(doc)) { r.send(new Error(404, 'Group Not Found').toString()); }
				else {
					var members = decryptMembers(_.pluck(doc.members, 'phoneNumber'));
					r.send(JSON.stringify({
						groupID: doc._id,
						groupName: doc.name,
						createdBy: doc.createdBy,
						createdAt: doc.createdAt,
						members: members
					}));
				}
		} // TODO: error handling
	});
}

function editGroup(req, res, next) {
	var r = new Request(req, res);
	var params = {};
	if (r.body.newName != null) params.$set = { name: r.body.newName };
	if (r.body.newMembers != null) {
		getMembers(r.body.newMembers, function(success, results) {
			if (success) {
				params.$push = { members: { $each: results } };
				dbGroups.update({ _id: ObjectId(r.body.groupID) }, params, function(success, doc) {
					res.send(doc);
				});
			}
		});
	} else { 
		if (_.isEmpty(params)) { ; } // nothing to update
		else { // only update name
			dbGroups.update({ _id: ObjectId(r.body.groupID) }, params, function(success, doc) {
				res.send(doc);
			});
		}
	}
	// TODO: error handling
}

function leaveGroup(req, res, next) {
	var r = new Request(req, res);
	var userID = r.body.userID;
	var groupID = r.body.groupID;
	var userParams = { $pull: { groups: ObjectId(groupID) } };
	var groupParams = { $pull: { members: { userID: userID } } };
	dbUsers.update({ _id: ObjectId(r.body.userID) }, userParams, function(success, doc) {});
	dbGroups.update({ _id: ObjectId(r.body.groupID) }, groupParams, function(success, doc) {
		if (success) {
			if (doc.members.length == 0) deleteGroup(groupID);
		}
	});
	r.send("YAY");
}


// Router Helper Functions
function updateMemberGroups(members, groupID) {
	var params = { $push: { groups: groupID } };
	for (var i = 0; i < members.length; i++) {
		dbUsers.update({ _id: ObjectId(members[i].userID) }, params, function(success, doc) {});
		// TODO: error handling for this
	}
}
function getMembers(members, callback) {
	// For now, ignoring phoneNumbers w/ no associated user
	var encryptedNumbers = _.map(members, function(member) { 
		return encryption.encrypt(member); 
	});
	dbUsers.getMany({ phoneNumber: { $in: encryptedNumbers} }, function(success, results) {
		if (success) {
			var dbNumbers = _.pluck(results, 'phoneNumber');
			var categorize = _.groupBy(encryptedNumbers, function(number) { return _.contains(dbNumbers, number);  });
			var existingUsers = _.map(_.filter(results, function(obj) { 
				return _.contains(categorize.true, obj.phoneNumber); 
			}), function(mem) {
				return { userID: mem._id, phoneNumber: mem.phoneNumber };
			});
			callback(true, existingUsers);
		} else callback(false, null);
	});
}
function deleteGroup(groupID) {
	dbGroups.get({ _id: ObjectId(groupID) }, function(success, group) {
		if (success) {
			if (!(_.isEmpty(group))) 
				dbGroups.remove({ _id: ObjectId(groupID) }, function(success) {});
		} else { res.send('Unknown error'); }
	});
}
function decryptMembers(members) {
	for (var i = 0; i < members.length; i++)
		members[i] = encryption.decrypt(members[i]);
	return members;
}

// only creator can delete group


// any time new group is added, the groupID and the date member was added is pushed the user array of groups
// then whenever user launches app, the app loads all the groups for the user. The thing to figure out is,
// when the user views a group/edits a group how should it appear on the top of the groups list. Would that be too much server syncing?
// for now, we will sync EVERY TIME anything is changed, just to get development faster.

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