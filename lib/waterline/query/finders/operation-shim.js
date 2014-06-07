/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var ORMShim = require('./orm-shim');


/**
 * Shim for Waterline2
 */

module.exports = function(obj, cb) {

  var orm = ORMShim(obj);

  // console.log(orm.adapters);
  // console.log(orm.datastore('my_foo'));
  // console.log('\n\n\n',orm.models);
  // console.log(orm.adapter('barbaz'));

  // Build WL2 criteria object
  var criteria = _.cloneDeep(obj.criteria);
  criteria.from = obj.from;
  criteria.select = {'*':true};

  // Transform joins into nested select
  var joins = _.cloneDeep(criteria.joins)||[];
  if (joins[0]) {
    criteria.select[joins[0].alias] = {'*': true};
  }


    // var model = orm.model(firstJoin.parent);
    // I dont think this part even matters:
    // var secondJoin = joins.shift();
    // if (secondJoin) {
    //   var grandchildModel = orm.model(secondJoin.child);
    //   // criteria.select[secondJoin.alias] = {'*': true};
    //   // criteria.select[firstJoin.alias][secondJoin.parentKey] = {'*': true};
    // }
    //
  // console.log('------******------<MODELS>******------******');
  // console.log(orm.models.length, orm.models);
  // console.log('------******------</MODELS>******------******');




  // We can't just delete joins from criteria, because some adapters may
  // be using them within the native `join()` method.
  // So instead, we tuck them away as a query option (`wl1Joins`)
  // They'll be pulled out in wl2 and reattached to the criteria if an adapter
  // adapter supports native joins.
  //
  // NOTE:
  // There's actually no reason we *have* to do this-- WL2 ignores any extra
  // stuff attached to the criteria tree.  This extra step exists merely to keep
  // things tidy and prevent inadvertent dependencies from being created during
  // the transition process.
  var wl1Joins;
  if (criteria.joins) {
    wl1Joins = criteria.joins;
    delete criteria.joins;
  }


  // Create the query
  var query = orm.query(criteria);

  // See note above
  if (wl1Joins) {
    query.wl1Joins = wl1Joins;
  }

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
