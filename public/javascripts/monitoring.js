$(function() {
    // code here
	loadFailures();
});

function loadFailures() {
	$('#failureList').load('/failures');
}

function retrieveJobs() {
	if ($('#server').val() != ''){
		$('#jobContent').load('/get/' + $('#server').val());		
	}
}

function removeJob(job) {
	$.ajax({
		type: 'GET',
		url: '/delete/' + job.id,
		error: function(err) {
			alert(err);
		},
		success: function(data) {
            $('#jobContent').load('/list #jobContent/');
		}
	});
}

function clearCache() {
	$.ajax({
		type: 'GET',
		url: '/clear/cache',
		error: function(err) {
			alert('Error clearing cache - '+err);
		},
		success: function(data) {
            alert('Cache cleared');
		}
	});
}