$(function() {
	toggleDateDisplayable('All');
	
    $('#date').datepicker({
		changeMonth: true,
		changeYear: true,
		dateFormat: 'dd/mm/yy'
	});
    
    $('#time').timepicker({
		showButtonPanel: false,
        stepMinute: 5
    });
    
	$('input[name=recurring]').change(function() {
		resetDateTime();
		if($(this).val() == 'No') {
			$('#rfrequency').hide();
			toggleDateDisplayable('All');
		} else {
			$('#rfrequency').show();
			toggleDateDisplayable($('input[name=frequency]:checked').val());
		}
	});
	
	$('input[name=frequency]').change(function() {
		toggleDateDisplayable($(this).val());
	});
	
	$('#addReminder').submit(function() {
		/* Prevent form from submitting normally */
		event.preventDefault();
		
		if($('#time').val() != '' && $('#rname').val() != '') {
			var method = $('#addReminder').attr('method');
			var action = $('#addReminder').attr('action');
			var data = $(this).serialize();

			$.ajax({
				type: method,
				url: action,
				data: data,
				success: function(data) {
					flashMessage(data + ' saved.');
                    $('#reminderHolder').load('/reminder/list #reminderContent');
				},
				error: function(err) { flashErrorMessage('Error: ' + err); }
			});
		} else {
			flashErrorMessage('Check input values before submitting !');
		}
	});
});

function toggleDateDisplayable(frequency) {
	var dformat = 'dd/mm/yy';
	if (frequency == 'Annually') {
		$('#rdate').show();
		$('#rdow').hide();
		dformat = 'dd/mm';
	} else if (frequency == 'Monthly') {
		$('#rdate').show();
		$('#rdow').hide();
		dformat = 'dd';
	} else if (frequency == 'Weekly') {
		$('#rdate').hide();
		$('#rdow').show();
	} else if (frequency == 'Daily'){
		$('#rdate').hide();
		$('#rdow').hide();
	} else {
		$('#rdate').show();
		$('#rdow').hide();
	}
	resetDateTime();
	$('#date').datepicker('option', 'dateFormat', dformat);
}

function resetDateTime() {
	$('#date').val('');
	$('#time').val('');
}