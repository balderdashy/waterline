/**
 * Module Dependencies
 */

var normalize = require('../utils/normalize'),
    schema = require('../utils/schema'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

/**
 * DQL Adapter Normalization
 */



module.exports = {

  hasJoin: function() {
    return hasOwnProperty(this.dictionary, 'join');
  },

  join: function(criteria, cb) {

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No join() method defined in adapter!";

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'join')) return cb(new Error(err));

    var connName = this.dictionary.join;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'join')) return cb(new Error(err));

    // Parse Join Criteria and set references to any collection tableName properties.
    // This is done here so that everywhere else in the codebase can use the collection identity.
    criteria = schema.serializeJoins(criteria, this.query.waterline.schema);

    adapter.join(connName, this.collection, criteria, cb);
  },

  create: function(values, cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No create() method defined in adapter!";

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'create')) return cb(new Error(err));

    var connName = this.dictionary.create;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'create')) return cb(new Error(err));
    adapter.create(connName, this.collection, values, cb);
  },

  // Find a set of models
  find: function(criteria, cb) {

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No find() method defined in adapter!";

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'find')) return cb(new Error(err));

    var connName = this.dictionary.find;
    var adapter = this.connections[connName]._adapter;

    if(!adapter.find) return cb(new Error(err));
    adapter.find(connName, this.collection, criteria, cb);
  },

  // Find exactly one model
  findOne: function(criteria, cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = '.findOne() requires a criteria. If you want the first record try .find().limit(1)';

    // If no criteria is specified or where is empty return an error
    if(!criteria || criteria.where === null) return cb(new Error(err));

    // Enforce limit to 1
    criteria.limit = 1;

    this.find(criteria, function(err, models) {
      if(!models) return cb(err);
      if(models.length < 1) return cb(err);

      cb(null, models);
    });
  },

  count: function(criteria, cb) {
    var connName;

    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    // Build Default Error Message
    var err = '.count() requires the adapter define either a count method or a find method';

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'count')) {

      // If a count method isn't defined make sure a find method is
      if(!hasOwnProperty(this.dictionary, 'find')) return cb(new Error(err));

      // Use the find method
      connName = this.dictionary.find;
    }

    if(!connName) connName = this.dictionary.count;
    var adapter = this.connections[connName]._adapter;

    if(hasOwnProperty(adapter, 'count')) return adapter.count(connName, this.collection, criteria, cb);

    this.find(criteria, function(err, models) {
      cb(err, models.length);
    });
  },

  update: function (criteria, values, cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    if(!criteria) return cb(new Error('No criteria or id specified!'));

    // Build Default Error Message
    var err = 'No update() method defined in adapter!';

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'update')) return cb(new Error(err));

    var connName = this.dictionary.update;
    var adapter = this.connections[connName]._adapter;

    adapter.update(connName, this.collection, criteria, values, cb);
  },

  destroy: function(criteria, cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    if(!criteria) return cb(new Error('No criteria or id specified!'));

    // Build Default Error Message
    var err = 'No destroy() method defined in adapter!';

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'destroy')) return cb(new Error(err));

    var connName = this.dictionary.destroy;
    var adapter = this.connections[connName]._adapter;

    adapter.destroy(connName, this.collection, criteria, cb);
  }

};
