var express = require('express');
var path = require('path');

var bodyParser = require('body-parser');

var app = express();

app.listen(process.env.PORT || '3000', function () {
  console.log('Server started on port: ' + this.address().port);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));


//app.set('jwtSecret', 'LOLOL'); // app.get('jwtSecret')
app.use('/api', require('./routes/authorize'));
app.use('/api/users', require('./routes/users'));
app.use('/api/photos', require('./routes/photos'));


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

// cool tricks: add gitignore command (do this in project folder): touch .gitignore 