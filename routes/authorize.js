var express = require('express');
var router = express.Router();
var config = require('../config');
// var errors = require('../errors'); // json document containing all errors

var jwt = require('jsonwebtoken');
var jwtSecret = config.jwtSecret;

router.use('/', function(req, res, next) {
	// authorize here
	if (req.url == '/users/verify/new' || req.url == '/users/verify/check') { next(); }
	else {
		var token = req.body.token || req.query.token || req.params.token || req.headers.token;
		if (token) {
			try {
				var decoded = jwt.verify(token, jwtSecret);
				//var userID = decoded.userID;
				//var accessToken = decoded.accessToken; // need to generate new access token after used once
				req.decoded = decoded;
				next();
			} catch(err) {
				res.send(JSON.stringify({
					success: false,
					message: 'Error verifying token'
				}));
			}
		} else {
			res.send(JSON.stringify({
				success: false,
				message: 'No token provided'
			}));
		}
	}
});

module.exports = router;
