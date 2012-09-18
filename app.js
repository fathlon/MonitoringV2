
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

db.on('load', function() {
	http.createServer(app).listen(app.get('port'), function(){
	  console.log("Express server listening on port " + app.get('port'));
	});
});

//app.get('/', routes.index);

app.get('/', function(req, res) {
	async.parallel({
		jenkins: function(callback) {			
			getFeed('/server/jenkins', 'jenkins', callback);
			// getFeed('/api/json', 'jenkins', callback);
		},
		virgon: function(callback) {			
			getFeed('/server/virgon', 'virgon', callback);
			// getFeed('/api/json', 'virgon', callback);
		}
		// ,
		// 		winbob: function(callback) {			
		// 			getFeed('/server/bobme', 'winbob', callback);
		// 			// getFeed('/api/json', 'virgon', callback);
		// 		}
		
	},
	function(err, results) {
		console.log('Got error - '+err);
		console.log('Results - '+results);
		
		if(err == null) {
			res.render('index', {
				title: 'Monitoring Results',
				servers: results
			});
		} else {
			res.send(err);
		}
	});
});

app.get('/list', function(req, res) {
	res.render('list', {
		title: 'Monitored Jobs',
		jobs: retrieveDBJobs()
	});
});

app.get('/edit', function(req, res){
	async.waterfall([
		function(callback) {			
			getFeed('/server/jenkins', 'jenkins', callback);
			// getFeed('/api/json', 'jenkins', callback);
		}
	],
	
	function(err, data) {
		console.log('Got error - '+err);
		
		if(data != undefined) {
			res.render('edit', {
				title: 'Add Jobs',
				jobs: data
			});
		} else {
			res.send(err);
		}
	});
});

app.get('/delete/:jobName', function(req, res){
	db.rm(req.params.jobName, null);
	
	db.on('drain', function(){
		res.redirect('/');
	});
});

app.get('/save', function(req, res){
	var jobs = req.param('jobs');
	// for (var i = 0, len = jobs.length; i < len; i++) {
	// 		db.set(jobs[i], jobs[i]);
	// 	}
	
	jobs.forEach(function(job){
		db.set(job, job);
	});
	
	db.on('drain', function(){
		res.redirect('/');
	});
});


function getFeed(path, server, callback) {
	var options = { host: 'localhost', port: '3001', path: path };
	// var options = { host: 'jenkins.wdstechnology.com', path: path };
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

function retrieveDBJobs() {
	var monitoredJobs = [];
	db.forEach(function(key, val) {
		if(val != undefined) {
			monitoredJobs.push(key);
		}
	});
	return monitoredJobs;
}
