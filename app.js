
/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	async = require('async');
	
var db = require('dirty')('db/data.db');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//app.get('/', routes.index);

// app.get('/', function(req, res) {
// 	res.render('index', {
// 				title: 'Why do I need this?'
// 			});
// });

app.get('/', function(req, res) {
	async.waterfall([
		function(callback) {			
			getFeed('/server/jenkins', 'jenkins', callback);
		}
	],
	
	function(err, data) {
		console.log('Got error - '+err);
		
		if(data != undefined) {
			res.render('index', {
				title: 'Jenkins result',
				jobs: data
			});
		} else {
			res.send(err);
		}
	});
});

app.get('/edit', function(req, res){
	async.waterfall([
		function(callback) {			
			getFeed('/server/jenkins', 'jenkins', callback);
		}
	],
	
	function(err, data) {
		console.log('Got error - '+err);
		
		if(data != undefined) {
			res.render('edit', {
				title: 'Jobs to monitor',
				jobs: data
			});
		} else {
			res.send(err);
		}
	});
});

function getFeed(path, server, callback) {
	var options = { host: 'localhost', port: '3001', path: path };
	http.get(options, function(res) {
	    var contentString = '';
		res.on('data', function(chunk){
		    contentString += chunk;
		});

		res.on('end', function(){
			callback(null, JSON.parse(contentString).jobs);
		});	
		
	}).on('error', function(e) {
		var errorMsg = 'Error retrieving feed from ' + server + ': ' + e.message;
		console.log(errorMsg);
		callback(errorMsg);
	});
}

// db.on('load', function() {
// 	
// 	preload_sample(db);
// 	
// 	db.forEach(function(key, val) {
// 	    console.log('Found key: %s, val: %j', key, val);
// 	  });
// 	console.log('Monitored jobs loaded.');
// });

// db.on('drain', function() {
// 	console.log('Data saved to disk');
// });

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

function preload_sample(db) {
	db.set('ust', 'ust');
	db.set('jasmine', 'jasmine');
	db.set('hub', 'hub');
	db.set('bluepool', 'bluepool');
}
