/**
 * Module dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');


/**
 * cascadeOnDestroy()
 *
 * An internal utility for use in the implementation of the `.destroy()` model method.
 * Clears out collections belonging to the specified records.
 *
 * @param  {Array}   targetRecordIds
 * @param  {Ref}   WLModel
 * @param  {Function} done
 */

module.exports = function cascadeOnDestroy(targetRecordIds, WLModel, done) {

  // If there are no target records, then gracefully continue without complaint.
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Revisit this and verify that it's unnecessary.  While this isn't a bad micro-optimization,
  // its existence makes it seem like this wouldn't work or would cause a warning or something.  And it
  // really shouldn't be necessary.  (It's doubtful that it adds any real tangible performance benefit anyway.)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  if (targetRecordIds.length === 0) {
    return done();
  }//-•

  // Find all the collection attributes on the WLModel
  var collectionAttrNames = [];
  _.each(WLModel.attributes, function (attrDef, attrName) {
    if (attrDef.collection){
      collectionAttrNames.push(key);
    }
  });

  // Run .replaceCollection() on all the collection attributes, wiping them out.
  async.each(collectionAttrNames, function _clearOutCollectionAssoc(attrName, next) {

    WLModel.replaceCollection(targetRecordIds, attrName, [], next);

  }, function(err) {
    if (err) {
      return done(err);
    }

    return done();

  });//</ async.each >
};
