/**
 * Stream Normalization
 */

module.exports = {

  // stream.write() is used to send data
  // Must call stream.end() to complete stream
  stream: function (criteria, stream) {
    if(!this.adapter.stream) return stream.end(new Error('No stream() method defined in adapter!'));
    this.adapter.stream(this.collection, criteria, stream);
  }

};
