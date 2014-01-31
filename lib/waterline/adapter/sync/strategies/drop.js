/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * Drop and recreate collection
 *
 * @param  {Function} cb
 */
module.exports = function (cb) {
  var self = this;
  var relations = [];


  // Find any junctionTables that reference this collection
  Object.keys(this.query.waterline.schema).forEach(function(collection) {
    if(!self.query.waterline.schema[collection].hasOwnProperty('junctionTable')) return;

    var schema = self.query.waterline.schema[collection];

    Object.keys(schema.attributes).forEach(function(key) {
      if(!schema.attributes[key].hasOwnProperty('foreignKey')) return;
      if(schema.attributes[key].references !== self.collection) return;
      relations.push(collection);
    });
  });

  // Pass along relations to the drop method
  this.drop(relations, function afterDrop(err, data) {
    if (err) return cb(err);
    self.define(cb);
  });
};
