
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
    if( Array.isArray(obj) ) {
      obj.forEach(function(el) {
        self.addModels.push(el);
      });
    } else {
      self.addModels.push(obj);
    }
  };

  value.remove = function remove (obj) {
    if( Array.isArray(obj) ) {
      obj.forEach(function(el) {
        self.removeModels.push(el);
      });
    } else {
      self.removeModels.push(obj);
    }
  };

  return value;
};
