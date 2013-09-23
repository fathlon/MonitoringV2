/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	async = require('async'),
    moment = require('moment');	

//require('./redirectConsole.js');

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
	app.use(errorHandler);
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

function errorHandler(err, req, res, next) {
  res.status(500);
  res.send('error', { error: err });
}

/**
 * DB setup
 */

var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());

var db = nStore.new(__dirname + '/db/data.db', function(){
    console.log('Data DB loaded.');
});

var reminderDb = nStore.new(__dirname + '/db/reminderData.db', function(){
	console.log('Reminder DB loaded.');
});

/**
 * Server startup
 */
 
http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});	

/**
 * Constant Variables
 */
var serverMap = {};
/*
serverMap['jenkins'] = {name: 'jenkins', path: '/server/jenkins', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['virgon'] = {name: 'virgon', path: '/server/virgon', server: 'localhost', port: '3001', type: 'jenkins'};
serverMap['winbob'] = {name: 'winbob', path: '/server/winbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
serverMap['linbob'] = {name: 'linbob', path: '/server/linbob', server: 'localhost', port: '3001', type: 'cruisecontrol'};
*/
serverMap['jenkins'] = {name: 'jenkins', path: '/api/json', server: 'jenkins.wdstechnology.com', port: '80', type: 'jenkins'};
serverMap['virgon'] = {name: 'virgon', path: '/api/json', server: 'virgon', port:'7070', type: 'jenkins'};
serverMap['leonis'] = {name: 'leonis', path: '/api/json', server: 'leonis', port: '5050', type: 'jenkins'};
serverMap['winbob'] = {name: 'winbob', path: '/cruisecontrol/json.jsp', server: 'winbob.wdstechnology.com', port: '7070', type: 'cruisecontrol'};
serverMap['linbob'] = {name: 'linbob', path: '/cruisecontrol/json.jsp', server: 'linbob.wdsglobal.com', port: '7070', type: 'cruisecontrol'};

var serverMapKeys = Object.keys(serverMap);
var serverInfoList = [];
var feedCacheMap = {};
var jenkinsFailureType = ['red', 'yellow', 'aborted'];
var jenkinsBuildingType = ['blue_anime', 'yellow_anime', 'red_anime', 'aborted_anime'];
var customTimeout = 10000;
var failedFeedIndicator = 'FF';

var reminderComparison = {};
reminderComparison['default'] = 'DD/MM/YYYY';
reminderComparison['time'] = 'HH:mm';
reminderComparison['Annually'] = 'DD/MM';
reminderComparison['Monthly'] = 'DD';
reminderComparison['Weekly'] = 'ddd';
reminderComparison['Daily'] = '';

/**
 * Routing
 */

//app.get('/', routes.index);

app.get('/', function(req, res) {
	res.redirect('/index');
});

app.get('/index', function(req, res) {
	res.render('monitor/index', {
        title: 'Monitoring Status',
        monitoredServers: [], //Clientside retrieval by async
        failureJobs: []	//Clientside retrieval by async
    });
});

app.get('/list', function(req, res) {
	retrieveDBJobs(null, function(err, jobs) {
		if (err) { res.send(500, { error: err }); }

		res.render('monitor/list', {
			title: 'Monitored Jobs',
			jobs: jobs
		});
	});
});

app.get('/add', function(req, res){
	res.render('monitor/add', {
		title: 'Choose jobs to monitor:',
        availableServers: serverMapKeys,
		jobs: []
	})
});

app.get('/save', function(req, res){
	var jobs = req.param('jobs');
	var server = req.param('server');
	var savedJobs = [];

	var toSaveJobs = constructToSaveJobs(jobs, server);
	
	async.map(toSaveJobs, saveDBJobs, function(err, results) {
		delete feedCacheMap[server];
		
		if(err) { res.send(err); }
		
		res.send(results);
	});
});

app.get('/serverstatus', function(req, res) {
	async.map(serverMapKeys, getFeed, function(err, allFeed){
		serverInfoList = [];

		for (var i = 0, len = allFeed.length; i < len; i++) {
			var feed = allFeed[i];
			var serverUrl = constructUrl(serverMap[feed.name]);			
			var status = 'down';
		
			if(feed.jobs != failedFeedIndicator) {
				status = 'green';				
			}
		
			serverInfoList.push({ name: feed.name, url: serverUrl, status: status });
		}
		
		res.render('includes/server_list', {
	        monitoredServers: serverInfoList
	    });
	});
});

app.get('/listBuilds', function(req, res){
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
		flagJobs: ['getAllFeed', 'getAllDBJobs', function(callback, results) {
			var jobsToList = [];
			for (var i = 0, len = results.getAllFeed.length; i < len; i++) {
				var feed = results.getAllFeed[i];
				var dbJob = results.getAllDBJobs[i];
				
				if(feed.jobs != failedFeedIndicator) {
					for (var j = 0, jlen = feed.jobs.length; j < jlen; j++) {
						var feedJob = feed.jobs[j];
						var feedType = feed.type;
						if(dbJob.indexOf(feedJob.name) > -1){					
							if(feedType === 'jenkins') {
								if(jenkinsFailureType.indexOf(feedJob.color) != -1 || jenkinsBuildingType.indexOf(feedJob.color) != -1) {
									jobsToList.push({ serverName: feed.name, jobName: feedJob.name });
								}
							} else if(feedType === 'cruisecontrol') {
								if(feedJob.result === 'failed') {
									jobsToList.push({ serverName: feed.name, jobName: feedJob.name });
								}
							}
						}
					}
				}
			}
			callback(null, jobsToList);
		}],
		createListJobs: ['flagJobs', function(callback, results) {
			async.map(results.flagJobs, createFailedJob, function(err, listedJobs){
				if(err) { callback(err); }
				callback(null, listedJobs);
			});
		}]
	},
	function(err, results) {	
		if(err) { res.send(500, { error: err }); }

		res.render('includes/job_failures', {
			failureJobs: results.createListJobs
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
		db.remove(key, function(err) {
			if (err) { res.send(500, { error: err }); } 
			res.send(200);
		});
	});
});

app.get('/clear/cache', function(req, res) {
    feedCacheMap = {};
    res.send(200);
});

app.get('/reminder/list', function(req, res) {
	reminderDb.all(function(err, results) {
	    res.render('reminder/rList', {
	        title: 'Reminder List',
			reminders: results
	    });		
	});
});

app.get('/reminder/delete/:rid', function(req, res){
	reminderDb.get(req.params.rid, function(err, doc, key){
		if(err) { throw err;}
		
		reminderDb.remove(key, function(err) {
			if (err) { res.send(500, { error: err }); } 
			res.send(doc.rname);
		});
	});
});

app.post('/reminder/add', function(req, res) {
	var rmdata = req.body;
	
	reminderDb.save(null, rmdata, function(err, key) {
		if(err) { res.send(500, err); }
		res.send(rmdata.rname);
	});
});

app.get('/reminder/displayReminders', function(req, res) {
    var reminderList = [];
	var now = moment().format(reminderComparison['time']);
	var then = moment().subtract('minute', 10).format(reminderComparison['time']);
	
    var queryString = { 'time >=': then, 'time <=': now };
    
	reminderDb.find(queryString, function(err, results) {
        for(key in results) {
            var reminder = results[key];

			// To determine if result should be shouted out or purely display
			if(now == reminder.time) {
				reminder.echo = true;
			} else {
				reminder.echo = false;
			}

            if(reminder.recurring == 'Yes') {
                var comparisonType = reminderComparison[reminder.frequency];
                if(comparisonType != undefined) {
                    if(comparisonType != '') {
                        if(reminder.frequency == 'Weekly') {
                            if(moment().format(comparisonType) == reminder.dow) {
                                reminderList.push(reminder);
                            }
                        } else if(moment().format(comparisonType) == reminder.date) {
                            reminderList.push(reminder);
                        }
                    } else { /* Daily frequency does not need date comparison */
                        reminderList.push(reminder);
                    }
                }
            } else {
                if(moment().format(reminderComparison['default']) == reminder.date) {
                    reminderList.push(reminder);
                }
            }
        }
		res.render('includes/ticker', {
	        reminderList: reminderList
	    });
    });
});


/**
 * Util Functions
 */

function getFeed(serverName, callback) {
	var server = serverMap[serverName];
	
	var options = { host: server.server, port: server.port, path: server.path, method: 'get' };
	var req = http.request(options, function(res) {
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
			
			callback(null, { name: serverName, type: server.type, jobs: jobFeed});
		});	
		
	});
	
	req.on('socket', function (socket) {
        socket.setTimeout(customTimeout);  
        socket.on('timeout', function() {
            req.abort();
        });
    });
	
	req.on('error', function(e) {
		console.log('Error retrieving feed from ' + server.name + ': ' + e.message);
		callback(null, { name: serverName, type: server.type, jobs: failedFeedIndicator }); //Feed Failed
	});
	
	req.end();
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

function saveDBJobs(job, callback) {
	db.save(job.name, job, function(err) {
		if(err) { callback(err); }

		callback(null, job.name);
	});
}

function getFailedJobFeed(server, job, callback) {
	var path = '/job/' + encodeURIComponent(job['name']) + server.path;
	
	var options = { host: server.server, port: server.port, path: path, method: 'get' };
	var req = http.request(options, function(res) {
	    var contentString = '';
		res.on('data', function(chunk){
		    contentString += chunk;
		});

		res.on('end', function(){
			var jobFeed = JSON.parse(contentString);
			job['status'] = jobFeed.color;
			if (jenkinsFailureType.indexOf(jobFeed.color) != -1) {
				job['url'] = jobFeed.lastUnsuccessfulBuild.url;
			} else {
				job['url'] = jobFeed.lastBuild.url;
			}
			callback(null, job);
		});	
		
	});
	
	req.on('socket', function (socket) {
        socket.setTimeout(customTimeout);  
        socket.on('timeout', function() {
            req.abort();
        });
    });
	
	req.on('error', function(e) {
		console.log('Error retrieving job feed from ' + server.name + ' for ' + job['name'] + ': ' + e.message);
		job['status'] = 'red';
		job['url'] = '';
		callback(null, job);
	});
	
	req.end();
}

function constructToSaveJobs(jobs, server) {
	var jobList = [];
	
	jobs.forEach(function(job){
		jobList.push({name: job, server: server});
	});
	
	return jobList;
}

function createFailedJob(fjob, callback) {
	var server = serverMap[fjob.serverName];
	var job = {};
	job['name'] = fjob.jobName;
	if(server.type === 'jenkins') {
		getFailedJobFeed(server, job, callback);
	} else {
		//Cruisecontrol defaults to 'red'
		job['status'] = 'red';
		job['url'] = constructUrl(server) + '/buildresults/' + fjob.jobName;
		callback(null, job);
	}
}

function constructUrl(server) {
	var url = 'http://';
	url += server.server;
	url += ':';
	url += server.port;
	return url;
}

