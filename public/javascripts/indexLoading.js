$(function() {

	loadBuilds();
	loadHLE(false);

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
		loadBuilds();
	}, 300000);
	
	setInterval(function() {
		loadHLE(false);
	}, 1800000);
	
});