$(function() {
    // code here
	checkServers();
	loadBuilds();

	$('#addForm').submit(function(event) {
		/* Prevent form from submitting normally */
		event.preventDefault();
		
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
			type: 'GET',
			url: '/save',
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