
/**
 * Export DQL Methods
 */

module.exports = {
  create: require('./create'),
  update: require('./update'),
  destroy: require('./destroy'),
  count: require('./count'),
  join: require('./join'),
  addToCollection: require('./add-to-collection'),
  removeFromCollection: require('./remove-from-collection'),
  resetCollection: require('./reset-collection'),
};
