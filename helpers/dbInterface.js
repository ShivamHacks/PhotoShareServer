var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/test';

/*MongoClient.connect(url, function(err, db) {
	db.collection('users').remove({});
	db.close();
});*/

// USE THIS
function wrapper(execute) {
	MongoClient.connect(url, function(err, db) {
		if (err) return false;
		else execute(db);
	});
}

module.exports = function(collection) {
	var exports = {};

	exports.put = function(obj, callback) {
		MongoClient.connect(url, function(err, db) {
			db.collection(collection).insert(obj, function(err, result) {
				if (err) callback(false, null);
				else callback(true, obj);
				db.close();
			});
		});
	};

	// assumes only one object to update
	exports.get = function(obj, callback) {
		MongoClient.connect(url, function(err, db) {
			db.collection(collection).findOne(obj, function(err, document) {
				if (err) callback(false, err);
				else callback(true, document);
				db.close();
			});
		});
	};

	// assumes only one object to update
	// returns object value if object exists and was updates
	// object is null if no object was updated
	exports.update = function(query, params, callback) {
		MongoClient.connect(url, function(err, db) {
			db.collection(collection).findAndModify(query, [], params, { new: true }, function(err,doc) {
				if (err) callback(false, err);
				else callback(true, doc.value);
				db.close();
			});
		});
	};

	exports.remove = function(obj, callback) {
		MongoClient.connect(url, function(err, db) {
			db.collection(collection).remove(obj, function(err, results) {
				if (err) callback(false);
				else callback(true);
				db.close();
			});
		});
	}

	exports.getMany = function(params, callback) {
		MongoClient.connect(url, function(err, db) {
			db.collection(collection).find(params).toArray(function(err, docs) {
				if (err) callback(false, err);
				else callback(true, docs);
    			db.close();
			});
		});
	}

	/*exports.all = function() {
		MongoClient.connect(url, function(err, db) {
			var cursor = db.collection('users').find( );
			var i = 0;
   			cursor.each(function(err, doc) {
   				console.log(i++);
     			console.log(doc);
   			});
   			db.close();
		});
	}*/

	return exports;
}