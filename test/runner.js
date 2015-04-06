/*eslint no-process-exit:0*/
'use strict';

var glob  = require('glob');
var Mocha = require('mocha');
var chalk = require('chalk');

//Define Mocha
var mocha = new Mocha({
  // For some reason, tests take a long time on Windows (or at least AppVeyor)
  timeout: (process.platform === 'win32') ? 30000 : 18000,
  reporter: 'spec'
});

// Determine which tests to run based on argument passed to runner
var arg = process.argv[2];
console.log(proces.argv.length);
process.exit(0);
var root;
var files = '/**/*.js';
if (!arg) {
  root = 'test/{unit,integration}';
} else if (arg === 'lint') {
  root = 'tests/unit';
  files = 'eslint.test.js'
} else {
  root = 'test/{unit,integration}';
}

function addFiles(mocha, files) {
  glob.sync(root + files).forEach(mocha.addFile.bind(mocha));
}

addFiles(mocha, '/**/*Test.js');

mocha.run(function (failures) {
  process.on('exit', function () {
    if (failures === 1) {
      console.log(chalk.red('1 Failing Test'));
    } else if (failures > 1) {
      console.log(chalk.red(failures, 'Failing Tests'));
    } else if (failures === 0) {
      console.log(chalk.green('All Tests Passed!'));
    }
    process.exit(failures);
  });
});
