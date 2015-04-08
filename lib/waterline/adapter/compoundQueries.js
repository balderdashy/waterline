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
  },

  findAndModify: function(criteria, values, options, cb) {
    var self = this;
    var connName;
    var adapter;

    if(typeof options === 'function') {
      cb = options;
      // set default values
      options = {
        upsert: false,
        new: false,
        mergeArrays: false
      };
    }

    if (typeof values === 'function') {
      cb = values;
      values = null
    }

    options = options || { };

    //new: true is the default value
    if (!('new' in options)) {
      options.new = true;
    }

    // // If no values were specified, use criteria
    // if (!values) values = criteria.where ? criteria.where : criteria;

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No find() or create() method defined in adapter!";

    // Custom user adapter behavior
    if(hasOwnProperty(this.dictionary, 'findAndModify')) {
      connName = this.dictionary.findOrCreate;
      adapter = this.connections[connName]._adapter;

      if(hasOwnProperty(adapter, 'findAndModify')) {
        return adapter.findAndModify(connName, this.collection, values, options, cb);
      }
    }

    // Default behavior
    // WARNING: Not transactional!  (unless your data adapter is)
    this.findOne(criteria, function(err, result) {
      if(err) return cb(err);
      if(result) {

        self.update(criteria, values, function(err, updatedResults) {
          // if new is given return the model after it has been updated
          if (options.new) {
            return cb(null, updatedResults);
          } else {
            // Unserialize values
            return cb(null, result);
          }

        });
      } else if (options.upsert) {
        // Create a new record if nothing is found and upsert is true.
        //Note(globegitter): This might now ignore the 'options.new' flag
        //so need to find a proper way to test/verify that.
        self.create(values, function(err, result) {
          if(err) return cb(err);
          if (options.new) {
            return cb(null, result);
          } else {
            return cb(null, []);
          }
        });
      } else {
        return cb(null, []);
      }
    });
  }

};
