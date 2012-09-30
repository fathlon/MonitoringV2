// $(function() {
//     // Code here
// });

function getPath(path) {
	$('#mainContent').load(path);
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
			alert('i got error meh');
			alert(err);
		},
		success: function(data) {
            $('#jobList').load('/list #jobList');
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