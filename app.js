/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	async = require('async');	


/**
 * Server & DB setup
 */

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
	app.use(errorHandler);
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

function errorHandler(err, req, res, next) {
  res.status(500);
  res.send('error', { error: err });
}


/**
 * Variables
 */
var serverMap = {};

serverMap['jenkins'] = {name: 'jenkins', path: '/server/jenkins', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['virgon'] = {name: 'virgon', path: '/server/virgon', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['winbob'] = {name: 'winbob', path: '/server/winbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
serverMap['linbob'] = {name: 'linbob', path: '/server/linbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
/*
serverMap['jenkins'] = {path: '/api/json', server: 'jenkins.wdstechnology.com', port: '80', type: 'jenkins'};
serverMap['virgon'] = {path: '/api/json', server: 'virgon', port:'7070', type: 'jenkins'};
serverMap['winbob'] = {path: '/cruisecontrol/json.jsp', server: 'winbob.wdstechnology.com', port: '7070', type: 'cruisecontrol'};
serverMap['linbob'] = {path: '/cruisecontrol/json.jsp', server: 'linbob.wdsglobal.com', port: '7070', type: 'cruisecontrol'};
*/

var serverMapKeys = Object.keys(serverMap);
var feedCacheMap = {};

/**
 * Routing
 */

//app.get('/', routes.index);

app.get('/', function(req, res) {
	res.redirect('/index');
});

app.get('/index', function(req, res) {
	async.auto({
		getAllFeed: function(callback)	{
			async.map(serverMapKeys, getFeed, function(err, allFeed){
				if(err) { callback(err); }
				callback(null, allFeed);
			});
		},
		getAllDBJobs: function(callback){
			async.map(serverMapKeys, retrieveDBJobs, function(err, allDBJobs){
				if(err) { callback(err); }
				callback(null, allDBJobs);
			});
		},
		flagFailureJobs: ['getAllFeed', 'getAllDBJobs', function(callback, results){
			var failureJobs = [];
			for (var i = 0, len = results.getAllFeed.length; i < len; i++) {
				var feed = results.getAllFeed[i];
				var dbJob = results.getAllDBJobs[i];
				
				for (var j = 0, jlen = feed.jobs.length; j < jlen; j++){
					var feedJob = feed.jobs[j];
					var feedType = feed.type;
					if(dbJob.indexOf(feedJob.name) > -1){
						if(feedType === 'jenkins'){
							if(feedJob.color === 'red'){
								failureJobs.push(feedJob);
							}
						} else if(feedType === 'cruisecontrol'){
							if(feedJob.result === 'failed'){
								failureJobs.push(feedJob);
							}
						}
					}
				}
			}
			callback(null, failureJobs);
		}]
	},
	function(err, results) {	
		if(err) { res.send(500, { error: err }); }

		res.render('index', {
			title: 'Monitoring Status',
			monitoredServers: serverMapKeys,
			failureJobs: results.flagFailureJobs
		});
	});
});

app.get('/list', function(req, res) {
	retrieveDBJobs(null, function(err, jobs) {
		if (err) { res.send(500, { error: err }); }
		
		res.render('list', {
			title: 'Monitored Jobs',
			jobs: jobs
		});
	});
});

app.get('/add', function(req, res){
	res.render('add', {
		title: 'Choose jobs to monitor:',
		jobs: []
	})
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
		delete feedCacheMap[server];
		res.redirect('/list');
	} else {
		res.redirect('/add');
	}	
});

app.get('/get/:serverName', function(req, res){
    var name = req.params.serverName

	if(feedCacheMap[name] != undefined) {
        res.status(200);
        res.render('includes/job_selections', {
            jobs: feedCacheMap[name]
        });
    } else {
		async.auto({
			getFeed: function(callback)	{
				getFeed(name, callback);
			},
			getDBJobs: function(callback){
				retrieveDBJobs(name, callback);
			},
			filterSavedJobs: ['getFeed', 'getDBJobs', function(callback, results){
				var feed = results.getFeed.jobs.slice(0);
				var dbJob = results.getDBJobs;

				for (var i = 0; i < feed.length; i++){
					var feedJob = feed[i];
					if(dbJob.indexOf(feedJob.name) > -1){
						feed.splice(i, 1);
						i--;
					}
				}
				callback(null, feed);
			}]
		},
		function(err, results) {
			if(err) { throw err; }

			feedCacheMap[name] = results.filterSavedJobs;
			
			res.render('includes/job_selections', {
				jobs: results.filterSavedJobs
			});
		});
	}
});

app.get('/delete/:jobName', function(req, res){
	db.get(req.params.jobName, function(err, doc, key){
		if(err) { throw err;}
		
		delete feedCacheMap[doc.server];
		db.remove(req.params.jobName, function(err) {
			if (err) { res.send(500, { error: err }); } 
			res.send(200);
		});
	});
});

app.get('/clear/cache', function(req, res) {
    feedCacheMap = {};
    res.send(200);
});


/**
 * Util Functions
 */

function getFeed(serverName, callback) {
	var server = serverMap[serverName];
	
	var options = { host: server.server, port: server.port, path: server.path };
	http.get(options, function(res) {
	    var contentString = '';
		res.on('data', function(chunk){
		    contentString += chunk;
		});

		res.on('end', function(){
			var jobFeed = JSON.parse(contentString);

			if(server.type === 'cruisecontrol') {
				jobFeed = jobFeed.projects;
			} else {
				jobFeed = jobFeed.jobs;
			}
			
			callback(null, { type: server.type, jobs: jobFeed});
		});	
		
	}).on('error', function(e) {
		var errorMsg = 'Error retrieving feed from ' + server.name + ': ' + e.message;
		console.log(errorMsg);
		callback(errorMsg);
	});
}

function retrieveDBJobs(serverName, callback) {
	var monitoredJobs = [];
	
	if(serverName != null) {
		db.find({server: serverName}, function(err, results) {
			if(err) { callback(err); }
			
			for (var key in results) {
				monitoredJobs.push(key);
			}
			callback(null, monitoredJobs);
		});		
	} else {
		db.all(function(err, results) {
			if(err) { callback(err); }

			for (var key in results) {
				monitoredJobs.push(key);
			 }
			callback(null, monitoredJobs);
		});
	}
}
