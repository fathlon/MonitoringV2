// $(function() {
//     // Code here
// });

function removeJob(job) {
	$.ajax({
		type: 'GET',
		url: '/delete/'+job.id,
		error: function(err){
			alert('i got error meh');
			alert(err);
		},
		success: function(data){
			alert('i succeed');
		}
	});
}