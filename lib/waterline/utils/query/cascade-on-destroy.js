//   ██████╗ █████╗ ███████╗ ██████╗ █████╗ ██████╗ ███████╗     ██████╗ ███╗   ██╗
//  ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝    ██╔═══██╗████╗  ██║
//  ██║     ███████║███████╗██║     ███████║██║  ██║█████╗      ██║   ██║██╔██╗ ██║
//  ██║     ██╔══██║╚════██║██║     ██╔══██║██║  ██║██╔══╝      ██║   ██║██║╚██╗██║
//  ╚██████╗██║  ██║███████║╚██████╗██║  ██║██████╔╝███████╗    ╚██████╔╝██║ ╚████║
//   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝     ╚═════╝ ╚═╝  ╚═══╝
//
//  ██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗
//  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝
//  ██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝
//  ██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝
//  ██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║
//  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝
//


var async = require('async');
var _ = require('@sailshq/lodash');

module.exports = function cascadeOnDestroy(primaryKeys, model, cb) {
  // Find all the collection attributes on the model
  var collectionAttributes = [];
  _.each(model.attributes, function findCollectionAttributes(val, key) {
    if (_.has(val, 'collection')) {
      collectionAttributes.push(key);
    }
  });


  // Run .replaceCollection() on all the collection attributes
  async.each(collectionAttributes, function replaceCollection(attrName, next) {
    model.replaceCollection(primaryKeys, attrName, [], next);
  }, function(err) {
    if (err) {
      return cb(err);
    }

    return cb();
  });
};
