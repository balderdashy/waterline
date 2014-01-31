/**
 * Module dependencies
 */

var _ = require('lodash')
  , Waterline = require('../../lib/waterline');


/**
 * Set up Waterline with the specified
 * models, connections, and adapters.

  @param options
    :: {Object}   adapters     [i.e. a dictionary]
    :: {Object}   connections  [i.e. a dictionary]
    :: {Object}   collections  [i.e. a dictionary]

  @param  {Function} cb
    () {Error} err
    () ontology
      :: {Object} collections
      :: {Object} connections

  @return {Waterline}
 */

module.exports = function bootstrap( options, cb ) {

  var adapters = options.adapters || {};
  var connections = options.connections || {};
  var collections = options.collections || {};



  _(adapters).each(function (def, identity) {
    // Make sure our adapter defs have `identity` properties
    def.identity = def.identity || identity;
  });
  

  var extendedCollections = [];
  _(collections).each(function (def, identity) {

    // Make sure our collection defs have `identity` properties
    def.identity = def.identity || identity;

    // Fold object of collection definitions into an array
    // of extended Waterline collections.
    extendedCollections.push(Waterline.Collection.extend(def));
  });


  // Instantiate Waterline and load the already-extended
  // Waterline collections.
  var waterline = new Waterline();
  extendedCollections.forEach(function (collection) {
    waterline.loadCollection(collection);
  });


  // Initialize Waterline
  // (and tell it about our adapters)
  waterline.initialize({
    adapters: adapters,
    connections: connections
  }, cb);

  return waterline;
};

