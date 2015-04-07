var rm = require('shelljs').rm;
var exec = require('shelljs').exec;
// var istanbul = require('istanbul');
//
// var collector = new istanbul.Collector();
// var reporter = new istanbul.Reporter(),
// var sync = false;
//
// collector.add(obj1);
//
// reporter.add('text');
//
//
console.log("\n\nRunning coverage report...");
rm('-rf', 'coverage');

var child = exec('./node_modules/istanbul/lib/cli.js cover ./test/runner.js',
{ async: true, silent: false });

//
//
// ./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/core ./node_modules/.bin/_mocha \
// test/integration test/structure test/support test/unit -- --recursive
//
// ./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/adapter test/adapter/runner.js
//
// ./node_modules/istanbul/lib/cli.js report
