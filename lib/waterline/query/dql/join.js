/**
 * Join
 *
 * Join with another collection
 * (use optimized join in adapter if one was provided)
 */

module.exports = function(collection, fk, pk, cb, metaContainer) {
  this._adapter.join(collection, fk, pk, cb, metaContainer);
};


//================================================================================
// TODO: deprecate this -- no need for it to be exposed directly to userland
//================================================================================
