/**
 * Mixes Custom Non-CRUD Adapter Methods into the prototype.
 */

module.exports = function(adapter) {
  var self = this;

  Object.keys(adapter).forEach(function(key) {

    // Ignore the Identity Property
    if(key === 'identity') return;

    // Don't override keys that already exists
    if(self[key]) return;

    // Apply the Function with passed in args and set this.identity as
    // the first argument
    self[key] = function() {

      // Concat self.identity with args (must massage arguments into a proper array)
      // Use a normalized _tableName set in the core module.
      var args = [self._tableName].concat(Array.prototype.slice.call(arguments));
      adapter[key].apply(self, args);
    };
  });

};
