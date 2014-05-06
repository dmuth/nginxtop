#!/usr/bin/env node
/**
* This script provides a top-like interface to your nginx (or Apache, if you prefer)
* access.log file.  It's most useful for dealing with dumb spambots or misbehaving 
* webcrawlers that keep hitting your site over and over from the same IP.
*
* @author Douglas Muth <dmuth@dmuth.org>
*/


var fs = require("fs");
var util = require("util");
var readline = require('readline');
    
var commander = require("commander");
var sprintf = require("sprintf-js").sprintf;


/**
* Schedule a report to be run at regular intervals
* @param {object} data Object contain our acquired data
* @param {object} commander Our commander object which holds CLI arguments
*/
function scheduleReport(commander, data) {

	setTimeout(function() {
		report(commander, data);
		}, commander.interval * 1000);

} // End of scheduleReport()


/**
* Actually print up the report of the top-n hosts
*/
function report(commander, data) {

	var num_hosts = commander.numHosts;

	//
	// First step: copy the data into an array grouped by number of hits.
	//
	var data_num = {};
	for (var k in data) {
		var ip = k;
		var num = data[k];

		if (!data_num[num]) {
			data_num[num] = [];
		}

		data_num[num].push(ip);

	}

	//
	// Now get the keys from that array, and sort them so the top 
	// number of hits come first.
	//
	var keys = Object.keys(data_num);
	keys.sort(function(a, b) {
		a = parseInt(a);
		b = parseInt(b);
		
		if  (a < b) {
			return(1);
		} else if (a > b) {
			return(-1);
		} else {
			return(0);
		}
		});
	//console.log(data, data_num, keys); // Debugging

	//
	// Finally, print up as many of the top hosts as we are allowed.
	//
	console.log("\n"
		+ "             Nginxtop Top Hosts\n"
		+ "===========================================");
	for (var k in keys) {

		var key = keys[k];
		var hosts = data_num[key];

		for (var k2 in hosts) {

			if (num_hosts <= 0) {
				break;
			}

			var host = hosts[k2];
			var num_hits = data[host];
			console.log(sprintf("%30s: %6s hits", host, num_hits));
			num_hosts--;

		}

	}

	//
	// Schedule the next run
	//
	scheduleReport(commander, data);

} // End of report()


/**
* Read lines from stdin, which oughta be in common log format: 
*	http://en.wikipedia.org/wiki/Common_Log_Format
*
* @param {object} data Object container our acquired data
* @param {object} rl Our readline object for reading lines from stdin
*/
function readLog(data, rl) {

	console.log("Reading from stdin, ^C to abort...");
	console.log("[ Top IPs will be cumulative for the life of this run. ]");

	rl.on("line", function(line) {
		parseLine(data, line);
	});

} // End of readLog()


/**
* Parse a specific line and store it in our data.
*/
function parseLine(data, line) {

	var fields = line.split(/ /);
	var ip = fields[0];
	
	if (!data[ip]) {
		data[ip] = 0;
	}

	data[ip]++;

} // End of parseLine()


/**
* Our main entry point.
*/
function main() {

	//
	// Parse our arguments
	// 
	commander
		.option("-i, --interval <n>", "How many seconds between screen refreshes?")
		.option("-n, --num-hosts <n>", "How many hosts to display?")
		.parse(process.argv)
		;

	commander.interval = commander.interval || 1;
	commander.numHosts = commander.numHosts || 10;

	var data = {};
	scheduleReport(commander, data);

	//
	// Read input a line at a time, with output being discarded
	//
	var output = fs.createWriteStream("/dev/null");
	var rl = readline.createInterface(process.stdin, output);
	readLog(data, rl);


} // End of main()


main();


