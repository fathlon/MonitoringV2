var messages = [];

$(function() {

	loadBuilds();
    displayReminders();
    
    setTimeout(function() {
        tempShout();
    }, 3000);

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
    
    setInterval(function() {
        tempShout();
    }, 59000);
    
    setInterval(function() {
		displayReminders();
	}, 50000);
   
    setInterval(function() {
		loadBuilds();
	}, 300000);
	
});

function loadBuilds() {
	$('#failureList').load('/listBuilds');
}

function displayReminders() {
    $('#tickerHolder').load('/reminder/displayReminders', function() {
		$('#js-news').ticker();
	});
}

function loadJira(toggleAjaxLoader) {
	if(toggleAjaxLoader) {		
		$('#loader').show();
	}
	$('#jiraList').load('/support', function() {
		$('#loader').hide();
	});
}

function loadHLE(toggleAjaxLoader) {
	if(toggleAjaxLoader) {		
		$('#loader').show();
	}
	$('#jiraList').load('/jira/hle', function() {
		$('#loader').hide();
	});
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

function tempShout() {
    if(messages.length > 0) {
        shout(messages);
    }
}

function processJobsShoutout(jobs) {
	//Hack code alert !!
	var processShout = messages.length == 0 ? true : false;
	
	var red_prefix = 'Failed job', yellow_prefix = 'Partial failure', aborted_prefix = 'Cancelled job';

	for (var i = 0, len = jobs.length; i < len; i++) {
		var job = jobs[i];
        if(!job.queueStatus) {
            if(job.status === 'red') {
                messages.push(red_prefix + ', ' + job.name);
            } else if (job.status === 'yellow') {
                messages.push(yellow_prefix + ', ' + job.name);
            } else if (job.status === 'aborted') {
                messages.push(aborted_prefix + ', ' + job.name);
            }
        }
	}
	
//	if(processShout) {
//		shout(messages);
//	}
}

function processRemindersShoutout(reminders) {
	//Hack code alert !!
	var processShout = messages.length == 0 ? true : false;
	
	for (var i = 0, len = reminders.length; i < len; i++) {
		var reminder = reminders[i];
		if(reminder.echo == true) {
			messages.push('Reminder alert, ' + reminder.rname + ', ' + reminder.rname);
		}
	}
	
//	if(processShout) {
//		shout(messages);
//	}
}

function shout(messages, bypass) {
	var vconfig = {};
	vconfig.speed = 180;
	vconfig.wordgap = 10;
	vconfig.pitch = 60;
	
	if(messages instanceof Array) {
		speak.play(messages.shift(), vconfig, function() {
			if(messages.length > 0) {
				shout(messages, true);
			}
		});
	} else {
		speak.play(messages, vconfig);
	}
}

String.prototype.startsWith = function (str) {
	return this.indexOf(str) == 0;
};