var _ = require('lodash');
module.exports = {
  supportsType: function(type) {
    var adapter = this.connections[connName]._adapter;
    return _.isFunction(adapter.supportsType) && adapter.supportsType(type);
  }
};
