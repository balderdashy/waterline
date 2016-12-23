/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var Waterline = require('../../lib/waterline'); //<< replace that with `require('waterline')`



/**
 * Set up Waterline with the specified
 * models, datastores, and adapters.
 *
 * > This is just an example of a little utility
 * > that makes Waterline easier to work with,
 * > for convenience.
 *
 * @optional {Dictionary} adapters
 * @optional {Dictionary} datastores
 * @optional {Dictionary} models
 *
 * @callback
 *   @param {Error?} err
 *   @param {Dictionary} ontology
 *     @property {Dictionary} models
 *     @property {Dictionary} datastores
 */

module.exports = function bootstrap (options, done) {

  var adapterDefs = options.adapters || {};
  var datastores = options.datastores || {};
  var models = options.models || {};



  // Assign an `identity` to each of our adapter definitions.
  _.each(adapterDefs, function (def, key) {
    def.identity = def.identity || key;
  });


  // Assign an `identity` and call `Waterline.Model.extend()`
  // on each of our model definitions.
  var extendedModelDefs = _.reduce(models, function (memo, def, key) {
    def.identity = def.identity || key;
    memo.push(Waterline.Model.extend(def));
    return memo;
  }, []);


  // Construct a Waterline ORM instance.
  var orm = new Waterline();


  // Load the  already-extended Waterline collections.
  extendedModelDefs.forEach(function (extendedModelDef) {
    orm.registerModel(extendedModelDef);
  });


  // Initialize this Waterline ORM instance.
  // (and tell it about our adapters)
  orm.initialize({
    adapters: adapterDefs,
    connections: datastores,
  }, function (err, rawResult){
    if (err) { return done(err); }

    // Send back the ORM metadata.
    // (we call this the "ontology")
    return done(undefined, {
      models: rawResult.collections,
      datastores: rawResult.connections,
    });

  });//</orm.initialize()>

};

