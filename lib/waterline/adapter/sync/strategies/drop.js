/**
 * Module dependencies
 */

var _ = require('lodash'),
  getRelations = require('../../../utils/getRelations');



/**
 * Drop and recreate collection
 *
 * @param  {Function} cb
 */

module.exports = function drop (cb) {
  var self = this;

  //
  // TODO:
  // Refuse to run this migration strategy in production.
  //

  // Find any junctionTables that reference this collection
  var relations = getRelations({
    schema: self.query.waterline.schema,
    parentCollection: self.collection
  });

  console.log('  migrating (drop) `'+self.collection+'`   w/ relations:: ', relations);

  // Pass along relations to the drop method
  this.drop(relations, function afterDrop(err, data) {
    if (err) return cb(err);
    self.define(function () {
      cb.apply(null, Array.prototype.slice.call(arguments));
    });
  });
};
