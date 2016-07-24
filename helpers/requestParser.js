module.exports = function() {

	var exports = {};

	exports.parse = function(req, res) {
		return new Request(req, res);
	}

	return exports;

};

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