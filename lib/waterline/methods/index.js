
/**
 * Export some DQL methods
 *
 * > Note: For other methods like `.find()`, check the
 * > `finders/` directory.
 */

module.exports = {

  // DML
  find: require('./find'),
  findOne: require('./find-one'),
  create: require('./create'),
  createEach: require('./create-each'),
  update: require('./update'),
  destroy: require('./destroy'),
  addToCollection: require('./add-to-collection'),
  removeFromCollection: require('./remove-from-collection'),
  replaceCollection: require('./replace-collection'),

  // Misc.
  count: require('./count'),
  sum: require('./sum'),
  avg: require('./avg'),
  stream: require('./stream')

};
