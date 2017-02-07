/**
 * Module dependencies
 */

var assert = require('assert');


/**
 * Module constants
 */

var ALL_QUERY_METHODS = {

  // ...
  // ... actually-- consider doig this differently.
  // TODO: At the top of each model method, build a constant like this
  // that contains a custom set of query methods.  They can be required.
};


/**
 * getQueryMethods()
 *
 * Return a dictionary containing the appropriate query (Deferred) methods
 * for the specified category (i.e. model method name).
 *
 * > For example, calling `getQueryMethods('find')` returns a dictionary
 * > of methods like `where` and `select`, as well as the usual suspects
 * > like `meta` and `usingConnection`.
 * >
 * > This never returns generic, universal Deferred methods; i.e. `exec`,
 * > `then`, `catch`, and `toPromise`.  Those are expected to be supplied
 * > by parley.
 *
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {String} category
 *         The name of the model method this query is for.
 *
 * @returns {Dictionary}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function getQueryMethods(category){

  assert(category && _.isString(category), 'A category must be provided as a valid string.');

  // Set up the initial state of the dictionary that we'll be returning.
  // No matter what category this is, we always begin with certain baseline methods.
  var queryMethods = {



  };


  // TODO

};
