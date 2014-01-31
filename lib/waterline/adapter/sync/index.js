// TODO: probably can eliminate this file
module.exports = {
  migrateDrop: require('./strategies/drop.js'),
  migrateAlter: require('./strategies/alter.js'),
  migrateSafe: require('./strategies/safe.js')
};
