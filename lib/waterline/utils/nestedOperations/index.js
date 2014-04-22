/**
 * Handlers for parsing nested associations within create/update values.
 */

module.exports = {
  reduceAssociations: require('./reduceAssociations'),
  valuesParser: require('./valuesParser'),
  create: require('./create'),
  update: require('./update')
};
