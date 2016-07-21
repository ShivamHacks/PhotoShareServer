/*

	Here I will test all of the API functions in relation to the mobile app
	Instead of building the entire server, before finishing the mobile app,
	I will create this dummy API and send dummy data to make sure the mobile app is working.
	Then I will finish the server with the proper implementation of the API and use it for the app.

	I will not be interacting with the Database, nor will I store any data anywhere. All requests will be approved
	without validating the access token. However, when I implement the real API, all of the parameters and return
	value types will NOT change. The only thing that will change is the processing of the parameters and the values returned.

	ASSUMING NO PARAMETERS ARE NULL. ALL NULL/EMPTY VALUE CHECKING WILL BE DONE IN APP

*/

// BEFORE DOING ANYTHING ELSE IN APP, finish this so that actual app testing can begin

// Dependencies
var express = require('express');
var router = express.Router();
var config = require('../config');
var encryption = require('../helpers/encryption');
var verficationGen = require('randomstring');
var ObjectID = require('mongodb').ObjectID;
var jwt = require('jsonwebtoken');
var jwtSecret = config.jwtSecret;

// Users
router.post('/users/login', login);
router.post('/users/signup', signup);
router.post('/users/verify', verify);
router.post('/users/deleteAccount', deleteAccount);

// Groups and Events
router.post('/groups/createGroup', function(req, res, next) {});
router.post('/groups/createEvent', function(req, res, next) {});
router.get('/groups/getGroups', function(req, res, next) {});
router.get('/groups/getEvents', function(req, res, next) {});
router.post('/groups/editMembers', function(req, res, next) {});
router.post('/groups/leaveGroup', function(req, res, next) {});
router.post('/groups/deleteGroup', function(req, res, next) {});
router.post('/groups/deleteEvent', function(req, res, next) {});

// Photos
router.post('/photos/upload', function(req, res, next) {});
router.get('/photos/get', function(req, res, next) {});
router.get('/photos/getAll', function(req, res, next) {});
router.post('/photos/delete', function(req, res, next) {});

// Actual router functions
// All requests except for login/signup/verify will require a token which has the userID in it.

function login(req, res, next) {
	// parameters: phoneNumber, countryISO, and password
	// return userID and encrypted phone number
	var phoneNumber = req.body.phoneNumber;
	res.send(JSON.stringify({
		userID: new ObjectID(),
		phoneNumber: encryption.encrypt(phoneNumber)
	}));
}
function signup(req, res, next) {
	// parameters: phoneNumber, countryISO, and password
	// return userID and encrypted phone number
}
function verify(req, res, next) {
	// parameters: phoneNumber, verificationCode, and userID
	// return access token
}
function deleteAccount(req, res, next) {
	// parameters: userID
	// return success or not
	var userID = getUID(req.body.token);
}
function createGroup(req, res, next) {
	// parameters: userID, groupName, groupMembers
	// return groupID
}
function createEvent(req, res, next) {
	// parameters: groupID, eventName
	// return event info (name, id)
}
function getGroupInfo(req, res, next) {
	// parameters: groupID
	// return group info (members, name, createdAt, createdBy, etc)
}
function getGroups(req, res, next) {
	// parameters: userID
	// return list of groupsID's and groupNames
}
function getEvents(req, res, next) {
	// parameters: groupID
	// return list of eventID's and eventNames
}
function editMembers(req, res, next) {
	// parameters: membersToAdd, membersToRemove, groupID
	// return success or not and new group info
}
function leaveGroup(req, res, next) {
	// parameters: userID and groupID
	// return success or not
}

// Helper Functions
function getUID(token) {
	// no try/catch around decoding because assuming token is correct
	var decoded = jwt.verify(token, jwtSecret);
	return decoded.userID;
}

module.exports = router;