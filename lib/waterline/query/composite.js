/**
* Composite Queries
*/

var async = require('async'),
_ = require('lodash'),
usageError = require('../utils/usageError'),
utils = require('../utils/helpers'),
normalize = require('../utils/normalize'),
Deferred = require('./deferred'),
hasOwnProperty = utils.object.hasOwnProperty;

module.exports = {

  /**
  * Find or Create a New Record
  *
  * @param {Object} search criteria
  * @param {Object} values to create if no record found
  * @param {Function} callback
  * @return Deferred object if no callback
  */

  findOrCreate: function(criteria, values, cb) {
    var self = this;

    if(typeof values === 'function') {
      cb = values;
      values = null;
    }

    // If no criteria is specified, bail out with a vengeance.
    var usage = utils.capitalize(this.identity) + '.findOrCreate([criteria], values, callback)';
    if(typeof cb == 'function' && (!criteria || criteria.length === 0)) {
      return usageError('No criteria option specified!', usage, cb);
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);
    // If no values were specified, use criteria
    if (!values) values = criteria.where ? criteria.where : criteria;

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findOrCreate, criteria, values);
    }

    // This is actually an implicit call to findOrCreateEach
    if(Array.isArray(criteria) && Array.isArray(values)) {
      return this.findOrCreateEach(criteria, values, cb);
    }

    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Try a find first.
    this.find(criteria).exec(function(err, results) {
      if (err) return cb(err);

      if (results && results.length !== 0) {

        // Unserialize values
        results = self._transformer.unserialize(results[0]);

        // Return an instance of Model
        var model = new self._model(results);
        return cb(null, model);
      }

      // Create a new record if nothing is found.
      self.create(values).exec(function(err, result) {
        if(err) return cb(err);
        return cb(null, result);
      });
    });
  },

  /**
  * Finds and Updates a Record. If upsert is passed also creates it when it does
  * not find it.
  *
  * @param {Object} criteria search criteria
  * @param {Object} values values to update if record found
  * @param {Object} [options]
  * @param {Boolean} [options.upsert] If true, creates the object if not found
  * @param {Boolean} [options.new] If true returns the newly created object, otherwise
  * returns either the model before it was updated/created. Defaults to true.
  * @param {Boolean} [options.mergeArrays] If true, merges any arrays passed in values
  * @param {Function} [cb] callback
  * @return Deferred object if no callback is given
  */

  findAndModify: function(criteria, values, options, cb) {
    var self = this;

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

    if (!('new' in options)) {
      options.new = true;
    }

    // If no criteria is specified, bail out with a vengeance.
    var usage = utils.capitalize(this.identity) + '.findAndModify([criteria], values, upsert, new, callback)';
    if(typeof cb == 'function' && (!criteria || criteria.length === 0)) {
      return usageError('No criteria option specified!', usage, cb);
    }

    // If no values are specified, bail out with a vengeance.
    usage = utils.capitalize(this.identity) + '.findAndModify(criteria, [values], upsert, new, callback)';
    if(typeof cb == 'function' && (!values || values.length === 0)) {
      return usageError('No values option specified!', usage, cb);
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findAndModify, criteria, values, options);
    }

    // If an array of length 1 is passed convert, otherwise call findAndModifyEach
    if(Array.isArray(criteria) && Array.isArray(values)) {
      if (criteria.length > 1 || values.length > 1) {
        // return usageError('Passing an array of models is not supported yet!', usage, cb);
        return this.findAndModifyEach(criteria, values, options, cb);
      } else if (criteria.length === 1 && values.length === 1){
        criteria = criteria[0];
        values = values[0];
      }
    }

    // if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Try a find first.
    this.find(criteria).exec(function(err, results) {
      if (err) return cb(err);

      if (results && results.length !== 0) {

        // merging together any passed 'type: array' values with all the found ones
        // you should usually use mergeArrays only if you are searching for a unique
        // indexed element.
        if (options.mergeArrays) {
          for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var valueKeys = Object.keys(values);
            //Loop over all the value properties to see if it contains an array
            for (var j = 0; j < valueKeys.length; j++) {
              // Check if both properties are an array, if one isn't just ignore
              // Note: We do not have to explicitly check if the property exists in the result
              // because isArray then just returns false
              if (Array.isArray(values[valueKeys[i]]) && Array.isArray(result[valueKeys[i]])) {
                //now take the union of the arrays
                values[valueKeys[i]] = _.union(result[valueKeys[i]], values[[valueKeys[i]]]);
              }
            }
          }
        }

        //Then update
        self.update(criteria, values).exec(function(err, updatedResults) {
          if (err) {
            return cb(err);
          }
          // if new is given return the model after it has been updated
          if (options.new) {
            // Unserialize values
            results = self._transformer.unserialize(updatedResults[0]);
          } else {
            // Unserialize values
            results = self._transformer.unserialize(results[0]);
          }


          // Return an instance of Model
          var model = new self._model(results);
          return cb(null, results);
        });
      } else if (options.upsert) {
        // Create a new record if nothing is found and upsert is true.
        self.create(values).exec(function(err, result) {
          if(err) return cb(err);

          // if new is given return the model after it has been created
          //an empty array otherwise
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
