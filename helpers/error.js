var dbErrors = require('../helpers/dbInterface')('errors');

module.exports = {

	new: function(status, message) {
		var e = new Error(status, message);
		dbErrors.put(e, function(success, obj) {});
		return toString(e);
	}

};

function Error(status, message) {
	this.status = status;
	this.message = message;
}
function toString(err) {
	return JSON.stringify({
		success: false,
		status: err.status,
		message: err.message
	});	
}