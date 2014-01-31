/**
 * Module dependencies
 */

var _ = require('lodash');



module.exports = {
  migrateDrop: require('./strategies/drop.js'),
  migrateAlter: require('./strategies/alter.js'),
  migrateSafe: require('./strategies/safe.js')
};
