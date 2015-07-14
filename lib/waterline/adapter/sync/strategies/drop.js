/**
 * Module dependencies
 */

var _ = require('lodash');
var getRelations = require('../../../utils/getRelations');


/**
 * Drop and recreate collection
 *
 * @param  {Function} cb
 */

module.exports = function drop(cb) {
  var self = this;

  // Refuse to run this migration strategy in production.
  if (process.env.NODE_ENV === 'production') {
    return cb(new Error('`migrate: "drop"` strategy is not supported in production, please change to `migrate: "safe"`.'));
  }

  // Find any junctionTables that reference this collection
  // var relations = getRelations({
  //   schema: self.query.waterline.schema,
  //   parentCollection: self.collection
  // });

  // Pass along relations to the drop method
  // console.log('Dropping ' + self.collection);
  this.drop(function afterDrop(err, data) {
    if (err) return cb(err);

    self.define(function() {
      cb.apply(null, Array.prototype.slice.call(arguments));
    });
  });
};
