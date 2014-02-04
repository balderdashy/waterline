/**
 * Module dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    normalize = require('../../utils/normalize'),
    hasOwnProperty = require('../../utils/helpers').object.hasOwnProperty;




/**
 * alter
 * 
 * Default definition of `alter` functionality in an adapter.
 * Compare physical (original) attributes with specified new schema,
 * and change the physical layer accordingly.
 */

module.exports = function(cb) {
  
  // The collection we're working with
  var Collection = this.collection;

  // Normalize Arguments
  cb = normalize.callback(cb);

  // Remove hasMany association keys before sending down to adapter
  var schema = _.clone(this.query._schema.schema) || {};
  Object.keys(schema).forEach(function(key) {
    if(schema[key].type) return;
    delete schema[key];
  });


  // Check if the adapter defines an alter method, if so
  // go ahead and use that, passing down the new schema.
  if(hasOwnProperty(this.dictionary, 'alter')) {

    var connName = this.dictionary.alter;
    var adapter = this.connections[connName]._adapter;

    if(hasOwnProperty(adapter, 'alter')) {
      return adapter.alter(connName, Collection, schema, cb);
    }
  }


  // Check if an addAttribute and removeAttribute adapter method are defined
  if(!hasOwnProperty(this.dictionary, 'addAttribute') || !hasOwnProperty(this.dictionary, 'removeAttribute')) {
    return cb();
    // return cb(new Error('Both addAttribute() and removeAttribute() methods are required to use alter()'));
  }

  // Find the relevant connections to run this on
  var AdderConnection = this.dictionary.addAttribute;
  var RemoverConnection = this.dictionary.removeAttribute;

  // Find the relevant adapters to run this with
  var AdderAdapter = this.connections[AdderConnection]._adapter;
  var RemoverAdapter = this.connections[RemoverConnection]._adapter;

  if(!hasOwnProperty(AdderAdapter, 'addAttribute')) return cb(new Error('Adapter is missing an addAttribute() method'));
  if(!hasOwnProperty(RemoverAdapter, 'removeAttribute')) return cb(new Error('Adapter is missing a removeAttribute() method'));


  this.describe(function afterDescribe(err, originalAttributes) {
    if(err) return cb(err);    

    // Iterate through each attribute in the new definition
    // Used for keeping track of previously undefined attributes
    // when updating the data stored at the physical layer.
    var newAttributes = _.reduce(schema, function checkAttribute(newAttributes, attribute, attrName) {
      if (!originalAttributes[attrName]) {
        newAttributes[attrName] = attribute;
      }
      return newAttributes;
    }, {});

    
    // Iterate through physical columns in the database
    // Used for keeping track of no-longer-existent attributes.
    // These must be removed from the physical (original) database.
    var deprecatedAttributes = _.reduce(originalAttributes, function (deprecatedAttributes, attribute, attrName) {
      if (!schema[attrName]) {
        deprecatedAttributes[attrName] = attribute;
      }
      return deprecatedAttributes;
    }, {});

    
    async.auto({
      newAttributes        : function (done_newAttributes) {
        async.forEachSeries(_.keys(newAttributes), function (attrName, nextAttr_) {
          var attrDef = newAttributes[attrName];
          AdderAdapter.addAttribute(AdderConnection, Collection, attrName, attrDef, nextAttr_);
        }, done_newAttributes);
      },
      deprecatedAttributes : function (done_deprecatedAttributes) {
        async.eachSeries(_.keys(deprecatedAttributes), function (attrName, nextAttr_) {
          RemoverAdapter.removeAttribute(RemoverConnection, Collection, attrName, nextAttr_);
        }, done_deprecatedAttributes);
      },
      modifiedAttributes   : function (done_modifiedAttributes) {
        done_modifiedAttributes();
      }
    }, cb);




    //
    // Should we update the data belonging to this attribute to reflect the new properties?
    // Realistically, this will mainly be about constraints, and primarily uniquness.
    // It'd be good if waterline could enforce all constraints at this time,
    // but there's a trade-off with destroying people's data
    // TODO: Figure this out
    // 

  });

};
