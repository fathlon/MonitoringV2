$(function() {
    /*
    var myCalendar = new dhtmlXCalendarObject('dateTime');
    myCalendar.setWeekStartDay(7);
    myCalendar.setDateFormat('%d/%m/%Y %H:%i');
	*/
    $('#date').datepicker();
    
    $('#time').timepicker({
        stepMinute: 5
    });
    
	$('input[name=recurring]').change(function() {
		if($(this).val() == 'no') {
			$('#rfrequency').hide();
		} else {
			$('#rfrequency').show();
		}
	});
	
	$('#addReminder').submit(function() {
		/* Prevent form from submitting normally */
		event.preventDefault();
		
		if($('#dateTime').val() != '') {
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
		}
	});
});