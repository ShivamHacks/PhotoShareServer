var express = require('express');
var path = require('path');

var bodyParser = require('body-parser');
var morgan = require('morgan');

var app = express();

app.listen(process.env.PORT || '3000', function () {
  console.log('Server started on port: ' + this.address().port);
});

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));


// TODO: handle url that is not defined

//app.set('jwtSecret', 'LOLOL'); // app.get('jwtSecret')
/*app.use('/api', require('./routes/authorize'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/photos', require('./routes/photos'));*/

//app.use('/api', require('./test/api'));
app.use('/api', require('./routes/authorize'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/photos', require('./routes/photos'));
app.use('/dev', require('./routes/developer')); // dev stuff

//var db = require('./helpers/dbInterface')('users');
//var ObjectId = require('mongodb').ObjectID;
/*db.put('users', {
  userID: "sadlkjasdaslk"
}, function(success, obj) {
  console.log(obj);
});*/

/*db.get({
  _id: ObjectId("57886297e46d0023751bc711")
}, function(lol, obj) {
  if (lol) console.log(obj);
});*/

/*db.update('users', 
  { userID: "sadlkjasdaslk" }, 
  { $set: { userID: 'LOLAads', test: 'lol'} }, 
  function(success, obj) {
  console.log(success);
  console.log(obj);
});*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

app.use(function(err, req, res, next) {
  //res.status(err.status || 500);
  res.send('error ' + err.message);
});


module.exports = app;

// cool git tricks: add gitignore command (do this in project folder): touch .gitignore 
// cool git tricks: to redo all git (in case you screwed up initial commit b/c didn't do gitignore properly) do : rm -rf .git/

// currently encrypting phone numbers, so need to decrypt anytime need to do anything.

// CURRENTLY ASSUMING that requests will only be coming from MY APP so I am not putting that much security into requests. Of course, they 
// need a valid token, but apart from that, there is not too much security. Will be added in the future tho.