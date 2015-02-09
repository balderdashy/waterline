module.exports = {
  supportsType: function(type) {
    var adapter = this.connections[connName]._adapter;
    return adapter.supportsType && adapter.supportsType(type);
  }
};
