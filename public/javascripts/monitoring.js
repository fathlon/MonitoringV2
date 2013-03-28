$(function() {
	checkServers();
	loadBuilds();
    $('#js-news').ticker();
    //displayReminders();

	$('#addForm').submit(function(event) {
		/* Prevent form from submitting normally */
		event.preventDefault();
		
		var method = $('#addForm').attr('method');
		var action = $('#addForm').attr('action');
		
		var form = $(this);
		var checkedJobsInput = form.find('input:checkbox[name=jobsCb]:checked');
		var selectedServer = form.find('select[id=server] option:selected').val();
		var url = form.attr('action');
		
		if(checkedJobsInput.length == 0) {
			return;
		}
		
		var selectedJobs = [];
		for (var i = 0, len = checkedJobsInput.length; i < len; i++) {
			selectedJobs.push(checkedJobsInput[i].value);
		}
		
		$.ajax({
			type: method,
			url: action,
			data: { jobs: selectedJobs, server: selectedServer},
			error: function(err) {
				for (var i = 0, len = err.length; i < len; i++) {
					flashErrorMessage('Error: ' + err[i]);
				}
			},
			success: function(data) {
				for (var i = 0, len = data.length; i < len; i++) {
					flashMessage(data[i] + ' saved.');
				}
				$('#addJobHolder').load('/get/' + selectedServer);
			}
		});
	});
    
 /*   setInterval(function() {
		displayReminders();
	}, 60000);
   */ 
    setInterval(function() {
		loadBuilds();
	}, 300000);
	
	setInterval(function() {
		checkServers();
	}, 600000);
});

function loadBuilds() {
	$('#failureList').load('/listBuilds');
}

function displayReminders() {
    $('#tickerHolder').load('/reminder/displayReminders');
}

function checkServers() {
	$('#serverList').load('/serverstatus');
}

function retrieveJobs() {
	if ($('#server').val() != ''){
		$('#addJobHolder').load('/get/' + $('#server').val());		
	} else {
		$('#addJobHolder').html('');
	}
}

function removeJob(job) {
	$.ajax({
		type: 'GET',
		url: '/delete/' + job.id,
		error: function(err) {
			for (var i = 0, len = err.length; i < len; i++) {
				flashErrorMessage('Error: ' + err[i]);
			}
		},
		success: function(data) {
			flashMessage(job.id + ' removed.');
            $('#listJobHolder').load('/list #jobContent');
		}
	});
}

function clearCache() {
	$.ajax({
		type: 'GET',
		url: '/clear/cache',
		error: function(err) {
			flashErrorMessage('Error clearing cache - '+err);
		},
		success: function(data) {
            flashMessage('Cache cleared');
		}
	});
}

function flashMessage(message) {
	jQuery.noticeAdd({
		text: message,
		stay: false,
		type: 'success'
    });
}

function flashErrorMessage(message) {
	jQuery.noticeAdd({
		text: message,
		stay: true,
		type: 'error'
    });
}

function processJobsShoutout(jobs) {
	var red_prefix = 'Failed job', yellow_prefix = 'Partial failure', aborted_prefix = 'Cancelled job';
	var messages = [];
	for (var i = 0, len = jobs.length; i < len; i++) {
		var job = jobs[i];
		if(job.status.startsWith('red')) {
			messages.push(red_prefix + ', ' + job.name);
		} else if (job.status.startsWith('yellow')) {
			messages.push(yellow_prefix + ', ' + job.name);
		} else if (job.status.startsWith('aborted')) {
			messages.push(aborted_prefix + ', ' + job.name);
		}
	}
	shout(messages);
}

function shout(messages) {
	var vconfig = {};
	vconfig.speed = 150;
	vconfig.wordgap = 10;
	vconfig.pitch = 100;
	
	if(messages instanceof Array) {
		speak.play(messages.pop(), vconfig, function() {
			if(messages.length > 0) {
				shout(messages);
			}
		});
	} else {
		speak.play(message, vconfig);
	}
}

String.prototype.startsWith = function (str) {
	return this.indexOf(str) == 0;
};