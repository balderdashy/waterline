
module.exports = function foo(){

  var err = new Error('in test-error');
  Error.captureStackTrace(err, foo);
  throw err;

};
