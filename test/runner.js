#!/usr/bin/env node

/*eslint no-process-exit:0*/
'use strict';

//Setup environemnt
process.env.NODE_ENV = 'test';

if (process.argv.length === 2) {
  process.argv.push('unit', 'adapter');
}

// Determine which tests to run based on argument passed to runner
var args = process.argv.splice(2);
var root;
var files;
var runUnitTests = false;

if (args[0] === 'lint') {
  root = 'test/unit/';
  files = 'eslint.test.js';
  runUnitTests = true;
}

if (args.indexOf('unit') > -1) {
  root = 'test/{unit,integration,structure,support}';
  files = '/**/*.js';
  runUnitTests = true;
}

//Run unit tests
if (runUnitTests) {
  var glob  = require('glob');
  var Mocha = require('mocha');

  //Define Mocha
  var mocha = new Mocha({
    // For some reason, tests take a long time on Windows (or at least AppVeyor)
    timeout: (process.platform === 'win32') ? 30000 : 18000,
    reporter: 'spec'
  });

  root = 'test/unit';

  function addFiles(mocha, files) {
    glob.sync(root + files).forEach(mocha.addFile.bind(mocha));
  }

  addFiles(mocha, files);

  mocha.run(function (failures) {
    process.on('exit', function () {
      process.exit(failures);
    });
  });
}


//Run integration tests
if (args.indexOf('adapter') > -1) {
  var ln = require('shelljs').ln;
  var rm = require('shelljs').rm;
  var adapterRunner = require('./adapter/runner');
  //forces symlink if target exists
  rm('-rf', 'node_modules/waterline-adapter-tests/node_modules/waterline');
  ln('-sf', process.cwd(), 'node_modules/waterline-adapter-tests/node_modules/waterline');
  adapterRunner();
}
