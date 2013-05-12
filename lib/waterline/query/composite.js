/**
 * Composite Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers');

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

    // This is actually an implicit call to findOrCreateEach
    if(Array.isArray(criteria) && Array.isArray(values)) {
      return this.findOrCreateEach(criteria, values, cb);
    }

    var usage = utils.capitalize(this.identity) + '.findOrCreate([criteria], values, callback)';
    if(!criteria) return usageError('No criteria option specified!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Set Default Values if available
    for(var key in this.attributes) {
      if(!values[key] && this.attributes[key].defaultsTo) {
        values[key] = this.attributes[key].defaultsTo;
      }
    }

    // Validate Values
    this._validator.validate(values, function(err) {
      if(err) return cb(err);

      // Automatically add updated_at and created_at (if enabled)
      if(self.autoCreatedAt) values.created_at = new Date();
      if(self.autoUpdatedAt) values.updated_at = new Date();

      // Return Deferred or pass to adapter
      if(typeof cb !== 'function') {
        return {}; // Deferred object goes here
      }

      // Build model(s) from result set
      self._adapter.adapter.findOrCreate(criteria, values, function(err, values) {
        if(err) return cb(err);

        // Return an instance of Model
        var model = new self._model(values);
        cb(null, model);
      });
    });
  }

};
