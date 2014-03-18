/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	https = require('https'),
	url = require('url'),
	path = require('path'),
	async = require('async'),
    moment = require('moment');	

//require('./redirectConsole.js');

/**
 * Server setup
 */

var app = express();

app.configure(function() {
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

app.configure('development', function() {
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

var db = nStore.new(__dirname + '/db/data.db', function() {
    console.log('Data DB loaded.');
}), reminderDb = nStore.new(__dirname + '/db/reminderData.db', function() {
	console.log('Reminder DB loaded.');
}), jiraDb = nStore.new(__dirname + '/db/jira.db', function() {
	console.log('Done');
});

//Prune 
jiraDb.filterFn = function(doc, meta) {
	return doc.created > Date.now() - 180000;
	//return doc.lastAccess > Date.now() - 6000;
};

//jiraDb.compactDatabase(true);

/**
 * Server startup
 */
 
http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
});	

/**
 * Constant Variables
 */
var serverMap = {};
/*
serverMap['jenkins'] = {name: 'jenkins', path: '/server/jenkins', host: 'localhost', port: '3001', type: 'jenkins'};
serverMap['virgon'] = {name: 'virgon', path: '/server/virgon', host: 'localhost', port: '3001', type: 'jenkins'};
*/
serverMap['jenkins'] = { name: 'jenkins', path: '/api/json', host: 'jenkins.dev.wds.co', type: 'jenkins', auth: 'sgdev:ZZEtFVP7', useHeader: true};
serverMap['virgon'] = { name: 'virgon', path: '/api/json', host: 'virgon', port:'7070', type: 'jenkins' };
serverMap['leonis'] = { name: 'leonis', path: '/api/json', host: 'leonis', port: '5050', type: 'jenkins' };

var serverMapKeys = Object.keys(serverMap);
var serverInfoList = [];
var feedCacheMap = {};
var jenkinsFailureType = ['red', 'yellow', 'aborted'];
var jenkinsBuildingType = ['blue_anime', 'yellow_anime', 'red_anime', 'aborted_anime'];
var customTimeout = 10000;
var failedFeedIndicator = 'FF';

/**
 * Reminders 
 */

var reminderComparison = {};
reminderComparison['default'] = 'DD/MM/YYYY';
reminderComparison['time'] = 'HH:mm';
reminderComparison['Annually'] = 'DD/MM';
reminderComparison['Monthly'] = 'DD';
reminderComparison['Weekly'] = 'ddd';
reminderComparison['Daily'] = '';

/**
 * JIRA
 */

var jiraMappings = {}; //Fields API - https://wdsglobal.atlassian.net/rest/api/2/field
jiraMappings['dbJobList'] = 'jiraSupportList';
jiraMappings['server'] = { host: 'wdsglobal.atlassian.net', path: '/rest/api/latest/filter/10059', auth: 'sg.development:eastc0ast' };
jiraMappings['queueOrder'] = { id: 'customfield_10035', name: 'Queue Order' };


/**
 * Redirecting
 */
/*
app.get('/test', function(req, res) {
    var server = serverMap['jenkins'];
	var options = { host: server.host, port: server.port, path: path, auth: server.auth };
    
	var protocol = http;
	if (server.auth != undefined && server.useHeader == undefined) {
        protocol = https;
    } else if (server.useHeader) {
        options.headers = { 'Authorization': 'Basic ' + new Buffer(server.auth).toString('base64') };
    }
    console.log(options);
    
    var options = { path: '/api/json', host: 'jenkins.dev.wds.co', auth: 'sgdev:ZZEtFVP7',
    headers: {
      'Authorization': 'Basic ' + new Buffer('sgdev:ZZEtFVP7').toString('base64')
    }};
    console.log(options);
    
    
    var options = { path: '/rest/api/latest/filter/10059', host: 'wdsglobal.atlassian.net', auth: 'sg.development:eastc0ast',
    headers: {
      'Authorization': 'Basic ' + new Buffer('sg.development:eastc0ast').toString('base64')
    }};
    
    //options.agent = new https.Agent(options);
    //options.agent.maxSockets  = 10;
    
    /*
    https.get(options, function(res1) {
        var contentString = '';
        res1.on('data', function(chunk) {
            contentString += chunk;
        });
        
        res1.on('end', function() {
            var cont = JSON.parse(contentString);
            console.log(cont.issues);
            res.send(200);
        });	
    }).on('error', function(e) {
        console.error(e);
        res.send(404);
    });
    
    var req = protocol.request(options, function(res1) {
      //  console.log("statusCode: ", res1.statusCode);
       // console.log("headers: ", res1.headers);
        var contentString = '';
        res1.on('data', function(chunk) {
            contentString += chunk;
        });
    });
    
    req.on('error', function(e) {
        console.error(e);
        res.send(404);
    });
    
    req.on('socket', function (socket) {
        socket.setTimeout(customTimeout);  
        socket.on('timeout', function(e) {
            req.abort();
        });
    });
    
    req.end();
});

*/ 

//app.get('/', routes.index);

app.get('/', function(req, res) {
	res.redirect('/index');
});


/**
 * Jobs
 */

app.get('/index', function(req, res) {
	res.render('index', {
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

app.get('/add', function(req, res) {
	res.render('monitor/add', {
		title: 'Choose jobs to monitor:',
        availableServers: serverMapKeys,
		jobs: []
	});
});

app.get('/save', function(req, res) {
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

app.get('/listBuilds', function(req, res) {
	async.auto({
		getAllFeed: function(callback)	{
			async.map(serverMapKeys, getFeed, function(err, allFeed) {
				if(err) { callback(err); }
				callback(null, allFeed);
			});
		},
		getAllDBJobs: function(callback) {
			async.map(serverMapKeys, retrieveDBJobs, function(err, allDBJobs) {
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
						if(dbJob.indexOf(feedJob.name) > -1) {					
							if(jenkinsFailureType.indexOf(feedJob.color) != -1 || jenkinsBuildingType.indexOf(feedJob.color) != -1) {
								jobsToList.push({ serverName: feed.name, jobName: feedJob.name });
							}
						}
					}
				}
			}
			callback(null, jobsToList);
		}],
		createListJobs: ['flagJobs', function(callback, results) {
			async.map(results.flagJobs, createFailedJob, function(err, listedJobs) {
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

app.get('/get/:serverName', function(req, res) {
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
			getDBJobs: function(callback) {
				retrieveDBJobs(name, callback);
			},
			filterSavedJobs: ['getFeed', 'getDBJobs', function(callback, results) {
				var feed = results.getFeed.jobs.slice(0);
				var dbJob = results.getDBJobs;

				for (var i = 0; i < feed.length; i++) {
					var feedJob = feed[i];
					if(dbJob.indexOf(feedJob.name) > -1) {
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

app.get('/delete/:jobName', function(req, res) {
	db.get(req.params.jobName, function(err, doc, key) {
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


/**
 * Reminders
 */

app.get('/reminder/list', function(req, res) {
	reminderDb.all(function(err, results) {
	    res.render('reminder/main', {
	        title: 'Reminder List',
			reminders: results
	    });		
	});
});

app.get('/reminder/delete/:rid', function(req, res) {
	reminderDb.get(req.params.rid, function(err, doc, key) {
		if(err) { throw err; }
		
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
 * JIRA
 */

app.get('/jira', function(req, res) {
	res.render('jira/main', {
        title: 'JIRA Support List',
		jiraList: []
    });
});

app.get('/jiraSupport', function(req, res) {
	async.auto({
		getSupportUrl: function(callback) {	
			var options = jiraMappings.server;
			var req1 = https.request(options, function(res1) {
				var contentString = '';
				res1.on('data', function(chunk) {
					contentString += chunk;
				});

				res1.on('end', function() {
					var cont = JSON.parse(contentString);
					callback(null, cont.searchUrl);
				});	
				
			});
			
			req1.on('socket', function (socket) {
				socket.setTimeout(customTimeout);  
				socket.on('timeout', function() {
					req1.abort();
				});
			});
			
			req1.on('error', function(e) {
				console.log('Error retrieving JIRA support URL : ' + e.message);
				callback(null, '');
			});
			
			req1.end();
		},
		getSupportContent: ['getSupportUrl', function(callback, results) {
			if (results.getSupportUrl == '') {
				callback('Unable to retrieve JIRA support URL.');
			} else {
				var supportDashUrl = url.parse(results.getSupportUrl);
				var options = { hostname: supportDashUrl.hostname, path: supportDashUrl.path, auth: jiraMappings.server.auth };
			
				https.get(options, function(res1) {
					var contentString = '';
					res1.on('data', function(chunk) {
						contentString += chunk;
					});
				
					res1.on('end', function() {
						var cont = JSON.parse(contentString);
						callback(null, cont.issues);
					});	
				});
			}
		}],
		getDBSupportList: function(callback) {
			jiraDb.get(jiraMappings['dbJobList'], function(err, doc, key) {
				if (err) { doc = {}; }
				callback(null, doc);
			})	
		},
		flagNewSupport: ['getDBSupportList', 'getSupportContent', function(callback, results) {
			var newSupportContentList = results.getSupportContent;
			var oldSupportContentMap = results.getDBSupportList;
			var processedFormat = {}, flaggedSupports = [];
			
			for (var i = 0, len = newSupportContentList.length; i < len; i++) {
				var issue = newSupportContentList[i];
				
				if (issue.fields[jiraMappings['queueOrder'].id] == null) {
					flaggedSupports.unshift(createSupportIssue(issue, true));
				} else {
					var oldIssue = oldSupportContentMap[issue.key];
					if (oldIssue != undefined && oldIssue.fields.status.name != issue.fields.status.name) {
						flaggedSupports.unshift(createSupportIssue(issue, true));
					} else {
						flaggedSupports.push(createSupportIssue(issue));	
					}
				}
				processedFormat[issue.key] = issue;
			}

			jiraDb.save(jiraMappings['dbJobList'], processedFormat, function (err) {
				if (err) { 
					callback(err); 
				} else {
					callback(null, flaggedSupports);
				}
			}); 
		}]
	},
	function(err, results) {
		if(err) { 
			res.send(500, { error: err }); 
		} else {
			res.render('includes/jira_listing', {
				jiraList: results.flagNewSupport
			});
		} 
	});
});


/**
 * Util Functions
 */

function getFeed(serverName, callback) {
	var server = serverMap[serverName];
	var options = { host: server.host, port: server.port, path: server.path, auth: server.auth };
    
	var protocol = http;
	if (server.auth != undefined && server.useHeader == undefined) {
        protocol = https;
    } else if (server.useHeader) {
        options.headers = { 'Authorization': 'Basic ' + new Buffer(server.auth).toString('base64') };
    }
	
	var req = protocol.request(options, function(res) {
	    var contentString = '';
		res.on('data', function(chunk) {
		    contentString += chunk;
		});

		res.on('end', function() {
			var jobFeed = JSON.parse(contentString);
			jobFeed = jobFeed.jobs;
			
			callback(null, { name: serverName, type: server.type, jobs: jobFeed });
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
	
	var options = { host: server.host, port: server.port, path: path, auth: server.auth };

	var protocol = http;
	if (server.auth != undefined && server.useHeader == undefined) { 
        protocol = https;
    } else if (server.useHeader) {
        options.headers = { 'Authorization': 'Basic ' + new Buffer(server.auth).toString('base64') };
    }
	
	var req = protocol.request(options, function(res) {
	    var contentString = '';
		res.on('data', function(chunk) {
		    contentString += chunk;
		});

		res.on('end', function() {
			var jobFeed = JSON.parse(contentString);
			job['status'] = jobFeed.color;
            job['queueStatus'] = jobFeed.inQueue;
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
	
	jobs.forEach(function(job) {
		jobList.push({name: job, server: server});
	});
	
	return jobList;
}

function createFailedJob(fjob, callback) {
	var server = serverMap[fjob.serverName];
	var job = {};
	job['name'] = fjob.jobName;
	getFailedJobFeed(server, job, callback);
}

function createSupportIssue(issue, newSupport) {
	var support = {};
	support.id = issue.key
	support.name = issue.fields.summary;
	support.status = issue.fields.status.name;
	support.url = 'https://' + jiraMappings['server'].host + '/browse/' + issue.key;
	support.newSupport = newSupport;
	return support;
}
