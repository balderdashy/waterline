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
  _.each(obj.waterline.collections, function (wl1Collection, identity) {
    orm.model(identity, {
      attributes: wl1Collection._attributes,
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

  // Transform joins into nested select
  var joins = _.cloneDeep(obj.criteria.joins)||[];

  var firstJoin = joins.shift();
  if (firstJoin) {

    var model = orm.model(firstJoin.parent);

    criteria.select = _.reduce(model.attributes, function buildSelectFromParentModel (memo, attrDef, attrName) {
      memo[attrName] = true;
      return memo;
    }, {})||{};

    var otherModel = orm.model(firstJoin.child);
    var firstJoinAttr = firstJoin.alias;
    criteria.select[firstJoinAttr] = _.reduce(otherModel.attributes, function buildSelectFromChildModel (memo, attrDef, attrName) {
      memo[attrName] = true;
      return memo;
    }, {})||{};


    var secondJoin = joins.shift();
    if (secondJoin) {
      criteria.select[firstJoinAttr][secondJoin.parentKey] = {};
      throw new Error('Many to many joins not supported via the WL2 shim yet.');
    }
  }

  // criteria.select = _.reduce(joins, function eachJoinInstruction (selectClause, join) {
  //   selectClause[join.alias] = {

  //   };
  //   return selectClause;
  // }, {});
  // console.log('new criteria *->', criteria);

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
