/**
 * Compound Queries Adapter Normalization
 */

var _ = require('underscore'),
    normalize = require('../utils/normalize');

module.exports = {

  findOrCreate: function(criteria, values, cb) {
    var self = this;

    // If no values were specified, use criteria
    if (!values) values = criteria.where ? criteria.where : criteria;
    criteria = normalize.criteria(criteria);

    if(this.adapter.findOrCreate) {
      this.adapter.findOrCreate(this.collection, criteria, values, cb);
      return;
    }

    // Default behavior
    // WARNING: Not transactional!  (unless your data adapter is)
    this.find(this.collection, criteria, function(err, result) {
      if(err) return cb(err);
      if(result) return cb(null, result);

      // Call Query .create()
      // This gives us the default values and timestamps
      self.query.create(values, cb);
    });
  }

};
