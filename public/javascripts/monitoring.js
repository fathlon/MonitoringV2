$(function() {
    // code here
	checkServers();
	loadBuilds();
    //shoutOut('what');

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
	
	$('#addReminder').submit(function() {
		/* Prevent form from submitting normally */
		event.preventDefault();
		
		var method = $('#addReminder').attr('method');
		var action = $('#addReminder').attr('action');
		var data = $(this).serialize();
		
		//alert($(this).serialize());
		
		$.ajax({
			type: method,
			url: action,
			data: data,
			success: function(data) { },
			error: function(err) { flashErrorMessage('Error: ' + err); }
		});
	});
});

function loadBuilds() {
	$('#failureList').load('/listBuilds');
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

function shoutOut(message) {
    speak.play(message);
}