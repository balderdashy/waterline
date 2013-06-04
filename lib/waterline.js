/**
 * Waterline
 */

var Waterline = module.exports = {};

// Collection to be extended in your application
Waterline.Collection = require('./waterline/collection');

// Model Instance, returned as query results
Waterline.Model = require('./waterline/model');
