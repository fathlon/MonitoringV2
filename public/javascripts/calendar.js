$(function() {
    var myCalendar = new dhtmlXCalendarObject('dateTime');
    myCalendar.setWeekStartDay(7);
    myCalendar.setDateFormat('%d/%m/%Y %H:%i');
	
	$('input[name=recurring]').change(function() {
		if($(this).val() == 'no') {
			$('#rfrequency').hide();
		} else {
			$('#rfrequency').show();
		}
	});
});