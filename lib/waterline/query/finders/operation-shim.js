/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

// TODO:
// maybe extrapolate query engine into a separate module
// so we don't have to require the entire wl2 here?
var WL2 = require('waterline2');



/**
 * Shim for Waterline2
 */

module.exports = function(obj, cb) {

  // TODO:
  // maybe extrapolate query engine into a separate module
  // so we don't have to require the entire wl2 here?

  // Simulate a WL2 ORM instance
  var orm = WL2({
    compatibilityMode: true
  });
  // console.log(_.pluck(_.pluck(obj.waterline.collections, '_schema'), 'schema'));
  _.each(obj.waterline.collections, function (wl1Collection, identity) {

    // Ensure `createdAt` and `updatedAt` are deep-cloned and distinct fromone another
    var attrs = _.cloneDeep(wl1Collection._attributes);
    attrs.updatedAt = _.cloneDeep(attrs.updatedAt);
    attrs.createdAt = _.cloneDeep(attrs.createdAt);


    orm.model(identity, {
      attributes: attrs,
      datastore: _.isArray(wl1Collection.connection) ? wl1Collection.connection[0] : wl1Collection.connection
    });
  });
  _.each(obj.waterline.connections, function (wl1Connection, identity) {
    orm.datastore(identity, {
      adapter: wl1Connection.config.adapter
    });
    orm.adapter(wl1Connection.config.adapter, wl1Connection._adapter);
  });

  // console.log('\n\n\n==============================\n\noriginal criteria *->', obj.criteria);
  // console.log(orm.adapters);
  // console.log(orm.datastore('my_foo'));
  // console.log('\n\n\n',orm.models);
  // console.log(orm.adapter('barbaz'));

  // Build WL2 criteria object
  var criteria = obj.criteria;
  criteria.from = obj.from;
  criteria.select = {'*':true};

  // Transform joins into nested select
  var joins = _.cloneDeep(obj.criteria.joins)||[];

  var firstJoin = joins.shift();
  if (firstJoin) {

    var model = orm.model(firstJoin.parent);
    var wl1Junction = orm.model(firstJoin.child);
    criteria.select[firstJoin.alias] = {'*': true};

    var secondJoin = joins.shift();
    if (secondJoin) {

      wl1Junction = orm.model(secondJoin.parent);
      var grandchildModel = orm.model(secondJoin.child);
      criteria.select[firstJoin.alias][secondJoin.alias] = {'*': true};
    }
  }

  // Create the query
  var query = orm.query(criteria);

  // console.log('Query:',query);

  // Run the query
  query
  .exec(function (err) {
    if (err) return cb(err);

    // Hand control back to WL1 to finish up.
    // Pass it any errors as well as the query's heap.
    var heap = query.heap;

    // console.log('finished! heap=', util.inspect(heap._models, false, null));
    cb(err, {
      preCombined: query.preCombined,
      cache: heap._models
    });
  });
  // .once('finish', function () {
  //   cb(null, {});
  // });

};
