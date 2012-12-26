var forever = require('forever-monitor');

  var child = new (forever.Monitor)('app.js', {
    max: 5,
    silent: true,
    //sourceDir: '/Users/huan/Development/workspace/MonitoringV2'
    sourceDir: 'C:/SG_Monitoring/MonitoringV2'
  });

  child.on('exit', function () {
    console.log('Server stopped gracefully on exit.');
  });

  child.start();