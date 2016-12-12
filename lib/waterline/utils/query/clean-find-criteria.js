/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');

var NAMES_OF_RECOGNIZED_CLAUSES = ['where', 'limit', 'skip', 'sort', 'select', 'omit'];

module.exports = function cleanFindCriteria(criteria) {
  //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╦╔╦╗╔═╗╦  ╦╔═╗╦╔╦╗  ╦ ╦╦ ╦╔═╗╦═╗╔═╗  ╔═╗╦  ╔═╗╦ ╦╔═╗╔═╗
  //  ├─┤├─┤│││ │││  ├┤   ║║║║╠═╝║  ║║  ║ ║   ║║║╠═╣║╣ ╠╦╝║╣   ║  ║  ╠═╣║ ║╚═╗║╣
  //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╩╩ ╩╩  ╩═╝╩╚═╝╩ ╩   ╚╩╝╩ ╩╚═╝╩╚═╚═╝  ╚═╝╩═╝╩ ╩╚═╝╚═╝╚═╝
  //
  // Now, if the provided criteria dictionary DOES NOT contain the names of ANY
  // known criteria clauses (like `where`, `limit`, etc.) as properties, then we
  // can safely assume that it is relying on shorthand: i.e. simply specifying what
  // would normally be the `where` clause, but at the top level.
  var recognizedClauses = _.intersection(_.keys(criteria), NAMES_OF_RECOGNIZED_CLAUSES);
  if (recognizedClauses.length === 0) {
    criteria = {
      where: criteria
    };
  }
  // Otherwise, it DOES contain a recognized clause keyword.
  // Check if a where clause can be built.
  else if (!_.has(criteria, 'where')) {
    var _criteria = {
      where: criteria
    };

    _.each(recognizedClauses, function(clause) {
      _criteria[clause] = _criteria.where[clause];
      delete _criteria.where[clause];
    });

    criteria = _criteria;
  }

  return criteria;
};
