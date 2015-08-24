/**
 * Module Dependencies
 */

var normalize = require('../utils/normalize');
var schema = require('../utils/schema');
var hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;
var _ = require('lodash');


/**
 * DQL Adapter Normalization
 */
module.exports = {

  hasJoin: function() {
    return hasOwnProperty(this.dictionary, 'join');
  },


  /**
   * join()
   *
   * If `join` is defined in the adapter, Waterline will use it to optimize
   * the `.populate()` implementation when joining collections within the same
   * database connection.
   *
   * @param  {[type]}   criteria
   * @param  {Function} cb
   */
  join: function(criteria, cb) {

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = 'No join() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'join')) return cb(new Error(err));

    var connName = this.dictionary.join;
    var adapter = this.connections[connName]._adapter;

    if (!hasOwnProperty(adapter, 'join')) return cb(new Error(err));

    // Parse Join Criteria and set references to any collection tableName properties.
    // This is done here so that everywhere else in the codebase can use the collection identity.
    criteria = schema.serializeJoins(criteria, this.query.waterline.schema);

    adapter.join(connName, this.collection, criteria, cb);
  },


  /**
   * create()
   *
   * Create one or more models.
   *
   * @param  {[type]}   values [description]
   * @param  {Function} cb     [description]
   * @return {[type]}          [description]
   */
  create: function(values, cb) {

    var globalId = this.query.globalId;

    // Normalize Arguments
    cb = normalize.callback(cb);

    if (Array.isArray(values)) return this.createEach.call(this, values, cb);

    // Build Default Error Message
    var err = 'No create() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'create')) return cb(new Error(err));

    var connName = this.dictionary.create;
    var adapter = this.connections[connName]._adapter;

    if (!hasOwnProperty(adapter, 'create')) return cb(new Error(err));
    adapter.create(connName, this.collection, values, normalize.callback(function afterwards(err, createdRecord) {
      if (err) {
        if (typeof err === 'object') err.model = globalId;
        return cb(err);
      }
      else return cb(null, createdRecord);
    }));
  },


  /**
   * find()
   *
   * Find a set of models.
   *
   * @param  {[type]}   criteria [description]
   * @param  {Function} cb       [description]
   * @return {[type]}            [description]
   */
  find: function(criteria, cb) {

    // Normalize Arguments
    criteria = normalize.criteria(criteria);
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = 'No find() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'find')) return cb(new Error(err));

    var connName = this.dictionary.find;
    var adapter = this.connections[connName]._adapter;

    if (!adapter.find) return cb(new Error(err));
    adapter.find(connName, this.collection, criteria, cb);
  },


  /**
   * findOne()
   *
   * Find exactly one model.
   *
   * @param  {[type]}   criteria [description]
   * @param  {Function} cb       [description]
   * @return {[type]}            [description]
   */
  findOne: function(criteria, cb) {

    // make shallow copy of criteria so original does not get modified
    criteria = _.clone(criteria);

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = '.findOne() requires a criteria. If you want the first record try .find().limit(1)';

    // If no criteria is specified or where is empty return an error
    if (!criteria || criteria.where === null) return cb(new Error(err));

    // Detects if there is a `findOne` in the adapter. Use it if it exists.
    if (hasOwnProperty(this.dictionary, 'findOne')) {
      var connName = this.dictionary.findOne;
      var adapter = this.connections[connName]._adapter;

      if (adapter.findOne) {
        // Normalize Arguments
        criteria = normalize.criteria(criteria);
        return adapter.findOne(connName, this.collection, criteria, cb);
      }
    }

    // Fallback to use `find()` to simulate a `findOne()`
    // Enforce limit to 1
    criteria.limit = 1;

    this.find(criteria, function(err, models) {
      if (!models) return cb(err);
      if (models.length < 1) return cb(err);

      cb(null, models);
    });
  },

  /**
   * [count description]
   * @param  {[type]}   criteria [description]
   * @param  {Function} cb       [description]
   * @return {[type]}            [description]
   */
  count: function(criteria, cb) {
    var connName;

    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    // Build Default Error Message
    var err = '.count() requires the adapter define either a count method or a find method';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'count')) {

      // If a count method isn't defined make sure a find method is
      if (!hasOwnProperty(this.dictionary, 'find')) return cb(new Error(err));

      // Use the find method
      connName = this.dictionary.find;
    }

    if (!connName) connName = this.dictionary.count;
    var adapter = this.connections[connName]._adapter;

    if (hasOwnProperty(adapter, 'count')) return adapter.count(connName, this.collection, criteria, cb);

    this.find(criteria, function(err, models) {
      if (err) return cb(err);
      var count = models && models.length || 0;
      cb(err, count);
    });
  },


  /**
   * [update description]
   * @param  {[type]}   criteria [description]
   * @param  {[type]}   values   [description]
   * @param  {Function} cb       [description]
   * @return {[type]}            [description]
   */
  update: function(criteria, values, cb) {
    var globalId = this.query.globalId;


    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    if (criteria === false) {
      return cb(null, []);
    } else if (!criteria) {
      return cb(new Error('No criteria or id specified!'));
    }

    // Build Default Error Message
    var err = 'No update() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'update')) return cb(new Error(err));

    var connName = this.dictionary.update;
    var adapter = this.connections[connName]._adapter;

    adapter.update(connName, this.collection, criteria, values, normalize.callback(function afterwards(err, updatedRecords) {
      if (err) {
        if (typeof err === 'object') err.model = globalId;
        return cb(err);
      }
      return cb(null, updatedRecords);
    }));
  },


  /**
   * [destroy description]
   * @param  {[type]}   criteria [description]
   * @param  {Function} cb       [description]
   * @return {[type]}            [description]
   */
  destroy: function(criteria, cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);
    criteria = normalize.criteria(criteria);

    // Build Default Error Message
    var err = 'No destroy() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'destroy')) return cb(new Error(err));

    var connName = this.dictionary.destroy;
    var adapter = this.connections[connName]._adapter;

    adapter.destroy(connName, this.collection, criteria, cb);
  }

};
