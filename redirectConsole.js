//DO NOT PUT "use strict" HERE OR THE LOGGER WILL NOT BE ABLE TO LOG ERROR

var windows_error_log_root = __dirname + "/",
	unix_error_log_root    = "/var/log/node/";

var fs   = require('fs'),
	util = require("util");

var consoleLogger = function consoleLogger(){
	//defining a var instead of this (works for variable & function) will create a private definition
	var stdout = null,
		stderr = null;

	if(process.platform === 'win32'){
		//Test or create the directory, we do it synchronously to never loose any log message
		try{
			if(!fs.statSync(windows_error_log_root).isDirectory()){
				fs.mkdirSync(windows_error_log_root, 0600);
			}
		}catch(e){
			fs.mkdirSync(windows_error_log_root, 0600);
		}
		stdout = fs.createWriteStream(windows_error_log_root + "access.log", { flags: 'a' });
		stderr = fs.createWriteStream(windows_error_log_root + "error.log", { flags: 'a' });
	}else{
		//Test or create the directory, we do it synchronously to never loose any log message
		try{
			if(!fs.statSync(unix_error_log_root).isDirectory()){
				fs.mkdirSync(unix_error_log_root, 0600);
			}
		}catch(e){
			fs.mkdirSync(unix_error_log_root, 0600);
		}
		stdout = fs.createWriteStream(unix_error_log_root + "access.log", { flags: 'a' });
		stderr = fs.createWriteStream(unix_error_log_root + "error.log", { flags: 'a' });
	}

	//Now we log the system
	process.__defineGetter__("stdout", function(){
		return stdout;
	});
	process.__defineGetter__("stderr", function(){
		return stderr;
	});

	//Catching all system error
	process.on("uncaughtException", function(err){
		this.error("Uncaught exception : " + err);
	}.bind(this));

	//Return a beautiful date printed, add 0 if variable is less to 10
	var beautifulDate = function(variable){
		if(variable < 10){
			return "0" + variable;
		}
		return variable;
	};

	//Return a formated date string
	var printDate = function(){
		var d = new Date();
		return ("" + d.getFullYear() + "-" + beautifulDate(d.getMonth()+1) + "-" + beautifulDate(d.getDate()) + "   " + beautifulDate(d.getHours()) + 
			":" + beautifulDate(d.getMinutes()) + ":" + beautifulDate(d.getSeconds()) + "   (UTC : " + (d.getTimezoneOffset()/60) + "h) => ");
	};

	//This function replace the usual console.log, it just automatically add date
	this.log = function(){
		if(stdout.writable===true){
			stdout.write(printDate() + util.format.apply(this, arguments) + "\n");
		}
	};

	//This function replace the usual console.dir, it just automatically add date
	this.dir = function(object){
		if(stdout.writable===true){
			stdout.write(printDate() + util.inspect(object) + "\n");
		}
	};

	//This function replace usual console.error, it just automatically add date
	this.error = function(){
		if(stderr.writable===true){
			stderr.write(printDate() + util.format.apply(this, arguments) + "\n");
		}
	};

	this.err = this.error;

	//Remove instanciate possibility for other module
	if(consoleLogger.caller != consoleLogger.getInstance){
		throw new Error("This object cannot be instanciated");
	}
}

/* ************************************************************************
CONSOLE LOGGER SINGLETON CLASS DEFINITION
************************************************************************ */
consoleLogger.instance = null;

/**
* consoleLogger getInstance definition
* @return consoleLogger class
*/
consoleLogger.getInstance = function(){
	if(this.instance === null){
		this.instance = new consoleLogger();
	}
	return this.instance;
}

module.exports = consoleLogger.getInstance();