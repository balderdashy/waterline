/**
 * Transformations
 */

var Transformations = module.exports = {};

// Add JSON Transformation methods
Transformations.json = {};

/**
 * Write Method Transformations
 *
 * Used to stream back valid JSON from Waterline
 */

Transformations.json.write = function(model, index, cb) {
  var transformedModel;

  if (!model) transformedModel = '';

  // Transform to JSON
  if (model) {
    try {
      transformedModel = JSON.stringify(model);
    } catch (e) {
      return cb(e);
    }
  }

  // Prefix with opening [
  if (index === 0) { transformedModel = '['; }

  // Prefix with comma after first model
  if (index > 1) transformedModel = ',' + transformedModel;

  cb(null, transformedModel);
};

/**
 * Close off JSON Array
 */
Transformations.json.end = function(cb) {
  var suffix = ']';
  cb(null, suffix);
};
