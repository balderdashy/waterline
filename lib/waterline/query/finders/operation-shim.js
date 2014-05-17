/**
 * Module dependencies
 */

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
// console.log(obj.adapters);
  // Simulate a WL2 ORM instance
  var orm = WL2();
  _.each(obj.waterline.collections, function (wl1Collection, identity) {
    orm.model(identity, {
      attributes: wl1Collection._attributes,
      database: _.isArray(wl1Collection.connection) ? wl1Collection.connection[0] : wl1Collection.connection
    });
  });
  _.each(obj.waterline.connections, function (wl1Connection, identity) {
    orm.database(identity, {
      adapter: wl1Connection.config.adapter
    });
    orm.adapter(wl1Connection._adapter.identity, wl1Connection._adapter);
  });

  // console.log(obj.waterline.connections);

  // _.reduce(orm.databases, function (db) {
  //   db.adapter
  // });
  // _.each(obj.databases, function (wl1Adapter, identity) {
  //   console.log('*******************');
  //   console.log(identity);
  //   console.log(wl1Adapter);
  //   console.log('');
  //   console.log('');
  //   orm.adapter(identity, {
  //     find: wl1Adapter.find
  //   });
  // });

  // console.log(orm.adapters);
  // console.log(orm.database('my_foo'));
  // console.log(orm.model('tests'));
  // console.log(orm.adapter('barbaz'));

  // Build WL2 criteria object
  var criteria = obj.criteria;
  criteria.from = obj.from;

  // Create the query
  var query = orm.query(criteria);

  console.log('Query:',query);

  // Run the query
  query
  .exec()
  .once('finish', function () {
    cb(null, {});
  });

};
