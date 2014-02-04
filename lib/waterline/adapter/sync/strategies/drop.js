/**
 * Module dependencies
 */

var _ = require('lodash'),
  getRelations = require('../getRelations');



/**
 * Drop and recreate collection
 *
 * @param  {Function} cb
 */

module.exports = function getRelations (cb) {
  var self = this;

  //
  // TODO:
  // Refuse to run this migration strategy in production.
  //
  
  if (!self.query) {
    console.log('UNEXPECTED CONTEXT!!!!');
  }

  // Find any junctionTables that reference this collection
  var relations = getRelations({
    schema: self.query.waterline.schema,
    parentCollection: self.collection
  });

  // Pass along relations to the drop method
  this.drop(relations, function afterDrop(err, data) {
    if (err) return cb(err);
    self.define(cb);
  });
};
