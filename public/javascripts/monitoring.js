// $(function() {
//     // Code here
// });

function retrieveJobs() {
	$('#jobContent').load('/get/' + $('#server').val());
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
            $('#jobList').html('/list #jobList');
		}
	});
}