
/**
 * Handles an Association
 */

var Association = module.exports = function() {
  this.addModels = [];
  this.removeModels = [];
  this.value = [];
};

/**
 * Set Value
 *
 * @param {Number|Object} value
 * @api private
 */

Association.prototype._setValue = function(value) {
  if(Array.isArray(value)) {
    this.value = value;
    return;
  }

  this.value = this.value = [value];
};

/**
 * Get Value
 *
 * @api private
 */

Association.prototype._getValue = function() {
  var self = this,
      value = this.value;

  // Attach association methods to values array
  // This allows access using the getter and the desired
  // API for synchronously adding and removing associations.

  value.add = function add (obj) {
    self.addModels.push(obj);
  };

  value.remove = function remove (obj) {
    self.removeModels.push(obj);
  };

  return value;
};
