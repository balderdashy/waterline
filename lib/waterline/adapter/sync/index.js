// TODO: probably can eliminate this file
module.exports = {
  migrateDrop: require('./strategies/drop.js'),
  migrateAlter: require('./strategies/alter.js'),
  migrateCreate: require('./strategies/create.js'),
  migrateSafe: require('./strategies/safe.js')
};
