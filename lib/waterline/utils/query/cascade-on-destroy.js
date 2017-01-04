/**
 * Module dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// TODO: fold this code inline where it's being used, since it's only being used
// in one place (lib/waterline/methods/destroy.js), and is very short
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/**
 * cascadeOnDestroy()
 *
 * An internal utility for use in the implementation of the `.destroy()` model method.
 * Clears out collections belonging to the specified records.
 *
 * @param  {Array}   targetRecordIds
 * @param  {Ref}   WLModel
 * @param  {Function} done
 * @param  {Ref} meta
 */

module.exports = function cascadeOnDestroy(targetRecordIds, WLModel, done, meta) {

  // If there are no target records, then gracefully bail without complaint.
  // (i.e. this is a no-op)
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Revisit this and verify that it's unnecessary.  While this isn't a bad micro-optimization,
  // its existence makes it seem like this wouldn't work or would cause a warning or something.  And it
  // really shouldn't be necessary.  (It's doubtful that it adds any real tangible performance benefit anyway.)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  if (targetRecordIds.length === 0) {
    return done();
  }//-•


  // Find the names of all collection attributes for this model.
  var collectionAttrNames = [];
  _.each(WLModel.attributes, function (attrDef, attrName) {
    if (attrDef.collection){
      collectionAttrNames.push(attrName);
    }
  });

  // Run .replaceCollection() for each associated collection of the targets, wiping them all out.
  // (if n..m, this destroys junction records; otherwise, it's n..1, so this just nulls out the other side)
  //
  // > Note that we pass through `meta` here, ensuring that the same db connection is used, if possible.
  async.each(collectionAttrNames, function _clearOutCollectionAssoc(attrName, next) {

    WLModel.replaceCollection(targetRecordIds, attrName, [], function (err) {
      if (err) { return next(err); }
      return next();
    }, meta);

  },// ~∞%°
  function _afterwards(err) {
    if (err) { return done(err); }

    return done();

  });//</ async.each >
};
