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
    criteria.select[joins[0].alias] = { select: {'*': true} };
    if (joins[0].criteria) {
      _.merge(criteria.select[joins[0].alias], joins[0].criteria);
    }
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

    console.log('finished! heap=', util.inspect(heap._buffers, false, null));

    // Now reduce our heap until it looks like the traditional query cache:
    var traditionalQueryCache = _.reduce(heap._buffers, function (memo, buffer, bufferIdent) {
      memo[buffer.from.identity] = (memo[buffer.from.identity]||[]).concat(buffer.records);
      return memo;
    }, {});

    traditionalQueryCache = _.mapValues(traditionalQueryCache, function (records, key) {

      // Enforce uniqueness based on the primary key
      records = _.uniq(records, orm.model(key).primaryKey);

      // Look up schema of the relevant relation
      var relation = orm.model(key);

      // Re-map all keys in each record to their `fieldName`, where relevant
      // (b/c that's what the integrator expects)
      records = _.map(records, function (record) {
        return _.reduce(record, function (memo, attrVal, attrKey) {

          var attrDef = relation.attributes[attrKey];
          if (!attrDef) {
            // If the attrKey cannot be found in the schema, pass it straight through
            memo[attrKey] = attrVal;
          }
          else {
            memo[attrDef.fieldName] = attrVal;
          }

          return memo;
        }, {});
      });

      return records;
    });

    console.log('TRADITIONAL QUERY CACHE:', util.inspect(traditionalQueryCache, false, null));

    cb(err, {
      preCombined: query.preCombined,
      cache: traditionalQueryCache
    });
  });
  // .once('finish', function () {
  //   cb(null, {});
  // });

};
