var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	// photo stuff here
	// token = req.decoded
  	res.send('respond with a photo resource');
});

module.exports = router;
