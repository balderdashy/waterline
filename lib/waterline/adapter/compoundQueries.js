/**
 * Compound Queries Adapter Normalization
 */

var _ = require('lodash'),
    normalize = require('../utils/normalize'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

module.exports = {

  findOrCreate: function(criteria, values, cb) {
    var self = this,
        connName,
        adapter;

    // If no values were specified, use criteria
    if (!values) values = criteria.where ? criteria.where : criteria;

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No find() or create() method defined in adapter!";

    // Custom user adapter behavior
    if(hasOwnProperty(this.dictionary, 'findOrCreate')) {
      connName = this.dictionary.findOrCreate;
      adapter = this.connections[connName]._adapter;

      if(hasOwnProperty(adapter, 'findOrCreate')) {
        return adapter.findOrCreate(connName, this.collection, values, cb);
      }
    }

    // Default behavior
    // WARNING: Not transactional!  (unless your data adapter is)
    this.findOne(criteria, function(err, result) {
      if(err) return cb(err);
      if(result) return cb(null, result[0]);

      self.create(values, cb);
    });
  }

};
