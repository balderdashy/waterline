/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');



/**
 * Module constants
 */

var RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES = ['where', 'limit', 'skip', 'sort', 'select', 'omit'];



/**
 * expandWhereShorthand()
 *
 * Return a new dictionary wrapping the provided `where` clause, or if the
 * provided dictionary already contains a criteria clause (`where`, `limit`, etc),
 * then just return it as-is.
 *
 *
 * > This handles implicit `where` clauses provided instead of criteria.
 * >
 * > If the provided criteria dictionary DOES NOT contain the names of ANY known
 * > criteria clauses (like `where`, `limit`, etc.) as properties, then we can
 * > safely assume that it is relying on shorthand: i.e. simply specifying what
 * > would normally be the `where` clause, but at the top level.
 *
 *
 * > Note that, _in addition_ to calling this utility from FS2Q, it is sometimes
 * > necessary to call this directly from relevant methods.  That's because FS2Q
 * > normalization does not occur until we _actually_ execute the query, and in
 * > the mean time, we provide deferred methods for building criteria piece by piece.
 * > In other words, we need to allow for hybrid usage like:
 * > ```
 * > User.find({ name: 'Santa' }).limit(30)
 * > ```
 * >
 * > And:
 * > ```
 * > User.find().limit(30)
 * > ```
 * >
 * > ...in addition to normal usage like this:
 * > ```
 * > User.find({ limit: 30 }).where({ name: 'Santa', age: { '>': 1000 } })
 * > ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Ref?} criteria
 * @returns {Dictionary}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function expandWhereShorthand(criteria){


  if (_.isUndefined(criteria)) {

    criteria = {};

  }
  else if (!_.isObject(criteria)) {

    criteria = {
      where: criteria
    };

  }
  else {

    var recognizedClauses = _.intersection(_.keys(criteria), RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES);
    if (recognizedClauses.length === 0) {
      criteria = {
        where: criteria
      };
    }

  }

  return criteria;

};
