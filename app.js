
/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	async = require('async');	


/**
 * DB setup
 */

var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());

	
/**
 * Server setup
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
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

var db = nStore.new('db/data.db', function(){
	http.createServer(app).listen(app.get('port'), function(){
		console.log("Express server listening on port " + app.get('port'));
	});	
});


/**
 * Variables
 */
var serverMap = {};
/*
serverMap['jenkins'] = {path: '/server/jenkins', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['virgon'] = {path: '/server/virgon', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['winbob'] = {path: '/server/winbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
serverMap['linbob'] = {path: '/server/linbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
*/
serverMap['jenkins'] = {path: '/api/json', server: 'jenkins.wdstechnology.com', port: '80', type: 'jenkins'};
serverMap['virgon'] = {path: '/api/json', server: 'virgon', port:'7070', type: 'jenkins'};
serverMap['winbob'] = {path: '/cruisecontrol/json.jsp', server: 'winbob.wdstechnology.com', port: '7070', type: 'cruisecontrol'};
serverMap['linbob'] = {path: '/cruisecontrol/json.jsp', server: 'linbob.wdsglobal.com', port: '7070', type: 'cruisecontrol'};


var feedCacheMap = {};

/**
 * Routing
 */

//app.get('/', routes.index);

app.get('/', function(req, res) {
	async.parallel({
		jenkins: function(callback) {			
			getFeed('jenkins', callback);
		},
		virgon: function(callback) {			
			getFeed('virgon', callback);
		},
		winbob: function(callback) {			
			getFeed('winbob', callback);
		},
		linbob: function(callback) {
			getFeed('linbob', callback);
		}
		
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

app.get('/get/:serverName', function(req, res){
    var name = req.params.serverName
    
    if(feedCacheMap[name] != undefined) {
        res.status(200);
        res.render('includes/job_selections', {
            jobs: feedCacheMap[name]
        });
    } else {
        getFeed(name, function(err, data) {
            if(err) { res.send(500, { error: err }); } 
            
            feedCacheMap[name] = data;
            
            res.status(200);
            res.render('includes/job_selections', {
                jobs: data
            });
        });
    }
});

app.get('/edit', function(req, res){
	async.waterfall([
		function(callback) {			
			getFeed('jenkins', callback);
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

app.get('/clear/cache', function(req, res) {
    feedCacheMap = {};
    res.send(200);
});

app.get('/test', function(req, res) {
	findByServer('jenkins', null);
	res.send(200);
});


/**
 * Functions
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

			if(server.type == 'cruisecontrol') {
				jobFeed = jobFeed.projects;
			} else {
				jobFeed = jobFeed.jobs;
			}
			
			callback(null, jobFeed);
		});	
		
	}).on('error', function(e) {
		var errorMsg = 'Error retrieving feed from ' + server + ': ' + e.message;
		console.log(errorMsg);
		callback(errorMsg);
	});
}

function findByServer(serverName, callback) {
	db.find({server: serverName}, function(err, results) {
		if(err) { throw err; }

		for (var key in results) {
			console.log(key);
		}
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
