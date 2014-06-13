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
  //

  // Build WL2 criteria object
  var criteria = _.cloneDeep(obj.criteria);
  criteria.from = obj.from;
  criteria.select = {'*':true};
  // console.log('Original WL1 criteria:',require('util').inspect(criteria, false, null));

  // Transform joins into nested select
  var joins = _.cloneDeep(criteria.joins)||[];
  // if (joins[0]) {

  _.each(joins, function (join){

    if (!criteria.select[join.alias]) {
      criteria.select[join.alias] = { select: {'*': true} };
    }
    else {
      // If sub-select already exists, this must be a second join
      // so we don'thave to recreate it-- just merge in any new criteria
      // (don't need to do anything here)
    }

    // Handle populate..where/limit/skip/etc
    if (join.criteria) {

      var populateCriteria = {

        where: (function _buildPopulateWhere(){
          return _.merge(join.criteria.where||{}, _.omit(join.criteria, function (val,key) {
            return key==='skip'||key==='limit'||key==='sort'||key==='where';
          }));
        })(),

        limit: (function _buildPopulateLimit() {
          return join.criteria.limit || undefined;
        })(),

        skip: (function _buildPopulateSkip() {
          return join.criteria.skip || undefined;
        })(),

        sort: (function _buildPopulateSort() {
          return join.criteria.sort || undefined;
        })()

      };

      // Merge in populate criteria
      _.merge(criteria.select[join.alias], populateCriteria);
    }
  });


  // }


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

  // console.log('Criteria passed in to WL2:\n', util.inspect(criteria, false, null));

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

    console.log('\n\n===============\nfinished! heap=', util.inspect(heap._buffers, false, null));

    // Now reduce our heap until it looks like the traditional query cache:
    var traditionalQueryCache = _.reduce(heap._buffers, function (memo, buffer, bufferIdent) {
      memo[buffer.from.identity] = (memo[buffer.from.identity]||[]).concat(buffer.records);
      return memo;
    }, {});

    traditionalQueryCache = _.mapValues(traditionalQueryCache, function (records, key) {

      var pk = orm.model(key).primaryKey;

      // If the primary key doesn't exist, skip the uniqueness check
      // (this is important for `groupBy`, etc.)
      var ifPKValueExists = _.any(records, function (record) {if (record[pk] === undefined) return true;});
      // But otherwise, enforce uniqueness in the traditional query cache based
      // on the primary key value of records stored therein.
      if (!ifPKValueExists) {
        records = _.uniq(records, pk);
      }

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
