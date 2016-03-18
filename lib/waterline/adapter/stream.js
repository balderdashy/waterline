/**
 * Module Dependencies
 */

var normalize = require('../utils/normalize');
var hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

/**
 * Stream Normalization
 */

module.exports = {

  // stream.write() is used to send data
  // Must call stream.end() to complete stream
  stream: function(criteria, stream, metaContainer) {

    // Normalize Arguments
    criteria = normalize.criteria(criteria);

    // Build Default Error Message
    var err = 'No stream() method defined in adapter!';

    // Find the connection to run this on
    if (!hasOwnProperty(this.dictionary, 'stream')) return stream.end(new Error(err));

    var connName = this.dictionary.stream;
    var adapter = this.connections[connName]._adapter;

    if (!hasOwnProperty(adapter, 'stream')) return stream.end(new Error(err));
    adapter.stream(connName, this.collection, criteria, stream, metaContainer);
  }

};
