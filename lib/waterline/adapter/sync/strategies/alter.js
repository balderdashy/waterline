/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * Try and synchronize the underlying physical-layer schema
 * to work with our app's collections. (i.e. models)
 *
 * @param  {Function} cb
 */
module.exports = function(cb) {
  var self = this;

  // Check that collection exists--
  this.describe(function afterDescribe(err, attrs) {
    if(err) return cb(err);

    // if it doesn't go ahead and add it and get out
    if(!attrs) return self.define(cb);

    // Otherwise, if it *DOES* exist, we'll try and guess what changes need to be made
    self.alter(function(err) {
      if(err) return cb(err);
      cb();
    });
  });
};