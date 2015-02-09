var _ = require('lodash');
var diff = require('deep-diff').diff;

/**
 * Model.dirty()
 *
 * Returns whether the given attribute has changed since instantiation.
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Object} attributes
 * @return bool
 * @api public
 */
module.exports = function(context, proto, attribute) {
    var comp = diff(proto._originalValues[attribute], proto[attribute]);

    return typeof comp !== 'undefined';
};

/**
 * Model.clean()
 *
 * Resets the "dirty" state.
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Object} attributes
 * @return void
 * @api public
 */
module.exports.clean = function (context, proto, attribute) {
    if (typeof attribute === 'undefined') {
        for (var key in proto) {
            proto._originalValues[key] = _.cloneDeep(proto[key]);
        }
    } else {
        proto._originalValues[attribute] = _.cloneDeep(proto[attribute]);
    }
};
