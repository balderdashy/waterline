/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash'),
  leftOuterJoin = require('./leftOuterJoin');


/**
 * FOLD_KEY
 * 
 * A generic, intra-Waterline alias, used for doing destructive
 * joins on in-memory data sets.
 * 
 * (would be an invalid attribute on a collection in userspace)
 * @type {String}
 */
var FOLD_KEY = ':::<-:::';



/**
 * Query Integrator
 *
 * Combines the results from multiple child queries into
 * the final return format using an in-memory join.
 * Final step in fulfilling a `.find()` with one or more
 * `populate(alias[n])` modifiers.
 *
 *    > Why is this asynchronous?
 *    >
 *    > While this function isn't doing anything strictly
 *    > asynchronous, it still expects a callback to enable
 *    > future use of `process[setImmediate|nextTick]()` as
 *    > a potential optimization.
 * 
 * @param  {Object}   cache
 * @param  {Array}    joinInstructions
 * @callback  {Function} cb(err, results)
 *           @param {Error}
 *           @param {Array}  [results, complete w/ populations]
 *
 * @throws {Error} on invalid input
 * @asynchronous
 */
module.exports = function integrate(cache, joinInstructions, cb) {  

  // Ensure valid usage
  var invalid = false;
  invalid = invalid || anchor(cache).to({ type: 'object' });
  invalid = invalid || anchor(joinInstructions).to({ type: 'array' });
  invalid = invalid || anchor(joinInstructions[0]).to({ type: 'object' });
  invalid = invalid || anchor(joinInstructions[0].parent).to({ type: 'string' });
  invalid = invalid || anchor(cache[joinInstructions[0].parent]).to({ type: 'object' });
  invalid = invalid || typeof cb !== 'function';
  if (invalid) return cb(invalid);





  // Nab the table name from the first join so we know our starting point.
  // (the parent table, the calling Model, `big daddy`, etc.)
  var parentTable = joinInstructions[0].parent;
  var results = _.cloneDeep(cache[parentTable]);    // TODO: remove this clone to optimize memory usage

  // Group the joinInstructions array by alias
  var populateInstructions = _.groupBy(joinInstructions, 'alias');

  // For each populate (i.e. alias)
  _.each(populateInstructions, function (instructions, alias) {

    // Pop and run `instructions` (joinInstructions) 
    // until there's only one left
    while (instructions.length > 1) {
      var poppedJoin = instructions.pop();
      leftOuterJoin(poppedJoin);
    }
    
  });



  // Then process the final remaining `populate` for each alias
  // Folding back into the parent, using FOLD_KEY
  results = leftOuterJoin({
    
  });

  // Return the populated results.
  return cb(null, results);



  // For each instance of our calling Model (big daddy):
  // _.each(results, function (instance) {

  //   // For each relationship, add a key for the alias to our instance, calculating
  //   // its contents by reducing the list of join instructions into real data from 
  //   // the cache using left outer joins.
  //   // console.log(' * Populates: ', relationships);
  //   _.each(relationships, function (joins, alias) {


  //     // The first join's parent is always our "lefthand-side" table,
  //     // so we can safely start by cloning the current instance of "big daddy"
  //     // into a 1-cardinality array to represent this `initialDataSet`.
  //     var initialDataSet = [ _.cloneDeep(instance) ];

  //     // Go through and run each join in order
  //     instance[alias] = _.reduce(joins, function (leftRows, join) {

        
  //       // Already have the lefthand-side data (we're reducing it)
  //       // But we need to get the the data for the righthand-side
  //       // from the current join instruction:
  //       var rightTableName = join.child;
  //       var rightRows = cache[parentTable];

  //       var joinOptions = {
  //         left: leftRows,
  //         right: rightRows,
  //         leftKey: join.parentKey,
  //         rightKey: join.childKey
  //       };

  //       // console.log(' * Running a join on left rows ::\n', leftRows,'\nJoin options ::', joinOptions);

  //       // Return the result of a left outer join
  //       return leftOuterJoin(joinOptions);

  //     }, initialDataSet);
  //   });
    
  // });
};



