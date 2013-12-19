/**
 * Module dependencies
 */
var anchor = require('anchor');


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
 * @param  {Array}    joins
 * @callback  {Function} cb(err, results)
 *           @param {Error}
 *           @param {Array}  [results, complete w/ populations]
 */
module.exports = function integrate(cache, joins, cb) {  

  // Ensure valid usage
  var invalid = false;
  invalid = invalid || anchor(cache).to({ type: 'object' });
  invalid = invalid || anchor(joins).to({ type: 'array' });
  invalid = invalid || typeof cb !== 'function';
  if (invalid) return cb(invalid);

  // Nab the first join so we know our starting point
  // (the parent table, the calling Model, `big daddy`, etc.)
  var parentTable = joins[0];

  // Group the joins array by alias
  
  // Populate data from cache into each alias

  // Return the populated results.
  return cb(null, []);
};
