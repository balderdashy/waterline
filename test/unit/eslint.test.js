var lint = require('mocha-eslint');

var paths = [
  'example',
  'lib',
  'test'
];
var options = {
  formatter: 'stylish'
};

lint(paths, options);
