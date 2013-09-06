/**
 * Streams
 *
 * A Streaming API with support for Transformations
 */

var util = require('util'),
    Stream = require('stream'),
    Transformations = require('./transformations'),
    _ = require('lodash');

var ModelStream = module.exports = function(transformation) {

  // Use specified, or otherwise default, JSON transformation
  this.transformation = transformation || Transformations.json;

  // Reset write index
  this.index = 0;

  // Make stream writable
  this.writable = true;
};

util.inherits(ModelStream, Stream);

/**
 * Write to stream
 *
 * Extracts args to write and emits them as data events
 *
 * @param {Object} model
 * @param {Function} cb
 */

ModelStream.prototype.write = function(model, cb) {
  var self = this;

  // Run transformation on this item
  this.transformation.write(model, this.index, function writeToStream(err, transformedModel) {

    // Increment index for next time
    self.index++;

    // Write transformed model to stream
    self.emit('data', _.clone(transformedModel));

    // Inform that we're finished
    if(cb) return cb(err);
  });

};

/**
 * End Stream
 */

ModelStream.prototype.end = function(err, cb) {
  var self = this;

  if(err) {
    this.emit('error', err.message);
    if(cb) return cb(err);
    return;
  }

  this.transformation.end(function(err, suffix) {

    if(err) {
      self.emit('error', err);
      if(cb) return cb(err);
      return;
    }

    // Emit suffix if specified
    if(suffix) self.emit('data', suffix);
    self.emit('end');
    if(cb) return cb();
  });
};
