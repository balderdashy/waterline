/**
 * Create a nicely formatted usage error
 */

module.exports = function(err, usage, cb) {
  var message = err + '\n==============================================\nProper usage :: \n' + usage + '\n==============================================\n';
  if(cb) return cb(message);
  throw new Error(message);
};