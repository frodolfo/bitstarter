#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var util = require('util');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var HTMLREMOTEFILE_DEFAULT = "remote-index.html";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkJson = function(output) {
    return (JSON.stringify(output, null, 4));
};

var processLocalHtmlFile = function(htmlfile, checksfile) {
    var out, 
	outJson,
	checks;

    $ = cheerioHtmlFile(htmlfile);
    checks = loadChecks(checksfile).sort();
    out = {}; 
    for(var ii in checks) {
       var present = $(checks[ii]).length > 0;
       out[checks[ii]] = present;
    }
    outJson = checkJson(out);
    console.log("outJson:\n" + outJson);
    // Write outJson to output.json
    fs.writeFileSync("output.json", outJson);
};

var processRemoteHtmlFile = function(urlToFile, checksfile) {
    var out,
	outJson, 
	checks,
        remoteHtmlFile = HTMLREMOTEFILE_DEFAULT;

    rest.get(urlToFile).on('complete', function(result, response) {
         if (result instanceof Error) {
            console.error('Error: ' + util.format(response.message));
         } else {
            //console.error("Wrote %s", remoteHtmlFile);
            fs.writeFileSync(remoteHtmlFile, result);
    	    $ = cheerioHtmlFile(remoteHtmlFile);
    	    checks = loadChecks(checksfile).sort();
    	    out = {};
    	    for(var ii in checks) {
       		var present = $(checks[ii]).length > 0;
         	out[checks[ii]] = present;
    	    }
         }
	 outJson = checkJson(out);
	 console.log("outJson:\n" + outJson);
	 // Write outJson to output.json
	 fs.writeFileSync("output.json", outJson);
     });
};

var checkHtmlFile = function(urlToFile, htmlfile, checksfile) {
    if (urlToFile) {
	processRemoteHtmlFile(urlToFile, checksfile);
    } else {
    	processLocalHtmlFile(htmlfile, checksfile);
    } 
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url_to_html_file>', 'URL to index.html')
        .parse(process.argv);

    checkHtmlFile(program.url, program.file, program.checks);
} else {
    exports.checkHtmlFile = checkHtmlFile;
}

