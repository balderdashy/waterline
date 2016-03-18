/**
 * Streaming Queries
 */

var usageError = require('../utils/usageError');
var utils = require('../utils/helpers');
var normalize = require('../utils/normalize');
var ModelStream = require('../utils/stream');

module.exports = {

  /**
   * Stream a Result Set
   *
   * @param {Object} criteria
   * @param {Object} transformation, defaults to JSON
   */

  stream: function(criteria, transformation, metaContainer) {
    var self = this;

    var usage = utils.capitalize(this.identity) + '.stream([criteria],[options])';

    // Normalize criteria and fold in options
    criteria = normalize.criteria(criteria);

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // Configure stream to adapter, kick off fetch, and return stream object
    // so that user code can use it as it fires data events
    var stream = new ModelStream(transformation);

    // very important to wait until next tick before triggering adapter
    // otherwise write() and end() won't fire properly
    process.nextTick(function() {

      // Write once immediately to force prefix in case no models are returned
      stream.write();

      // Trigger Adapter Method
      self.adapter.stream(criteria, stream, metaContainer);
    });

    return stream;
  }

};
