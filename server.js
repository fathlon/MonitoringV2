var forever = require('forever-monitor');

  var child = new (forever.Monitor)('app.js', {
    max: 3,
    silent: true,
    sourceDir: '/Users/huan/Development/workspace/MonitoringV2'
  });

  child.on('exit', function () {
    console.log('Server stopped gracefully on exit.');
  });

  child.start();