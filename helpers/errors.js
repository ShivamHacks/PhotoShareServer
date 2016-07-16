module.exports = {

	errorSendingMessage: function() { 
		return JSON.stringify({ status: 500, message: 'Error sending verification text'});  
	},
	emptyFields: function(empty) { 
		return JSON.stringify({ status: 400, message: 'Required fields are empty', emptyFields: empty });
	},
	unauthorizedGroupDeletion: function() {
		return JSON.stringify({ status: 401, message: 'You are unauthorized to delete this group' });
	}

}