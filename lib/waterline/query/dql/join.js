/**
 * Join
 *
 * Join with another collection
 * (use optimized join in adapter if one was provided)
 */

module.exports = function(collection, fk, pk, cb) {
  this._adapter.join(collection, fk, pk, cb);
};
