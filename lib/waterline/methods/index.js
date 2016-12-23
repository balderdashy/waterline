
/**
 * Export some DQL methods
 *
 * > Note: For other methods like `.find()`, check the
 * > `finders/` directory.
 */

module.exports = {

  // DQL
  find: require('./find'),
  findOne: require('./find-one'),
  findOrCreate: require('./find-or-create'),
  stream: require('./stream'),
  count: require('./count'),
  sum: require('./sum'),
  avg: require('./avg'),

  // DML
  create: require('./create'),
  createEach: require('./create-each'),
  update: require('./update'),
  destroy: require('./destroy'),
  addToCollection: require('./add-to-collection'),
  removeFromCollection: require('./remove-from-collection'),
  replaceCollection: require('./replace-collection'),

  // Misc.
  validate: require('./validate'),

};
