
/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	async = require('async');
	
// var db = require('dirty')('db/data.db');

// var db = require('alfred');
// db.open('db', function(err, db) {
// 	if (err) { throw err; }
// 	
// 	db.ensure ('jobs', function(err, users_key_map) {
// 		if (err) { throw err; }
// 	});
// });

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

var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());

var db = nStore.new('db/data.db', function(){
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
	retrieveDBJobs(function(jobs) {
		res.render('list', {
			title: 'Monitored Jobs',
			jobs: jobs
		});
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
		if (err) { res.send(500, { error: err }); }	

		res.render('edit', {
			title: 'Add Jobs',
			jobs: data
		});
	});
});

app.get('/delete/:jobName', function(req, res){
	db.remove(req.params.jobName, function(err) {
		if (err) { res.send(500, { error: err }); } 
		res.send(200);
	});
});

app.get('/save', function(req, res){
	var jobs = req.param('jobs');
	var server = req.param('server');

	if(jobs != undefined) {
		// for (var i = 0, len = jobs.length; i < len; i++) {		
		// }
	
		jobs.forEach(function(job){
			db.save(job, {name: job, server: server}, function(err) {
				if(err) { throw err; }
			});
		});	
	
		res.redirect('/list');
	} else {
		res.redirect('/edit');
	}
	
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

function retrieveDBJobs(callback) {
	var monitoredJobs = [];
	db.all(function(err, results) {
		if(err) { throw err; }

		for (var key in results) {
			monitoredJobs.push(key);
		 }
		
		callback(monitoredJobs);
	});
}
