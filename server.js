var forever = require('forever-monitor');

var child = new (forever.Monitor)('app.js', {
	max: 3,
});

child.on('exit', function () {
	console.log('APP HAS EXITED AFTER 3 ATTEMPTS');
});

child.start();