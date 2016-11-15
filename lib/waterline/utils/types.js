/**
 * Types Supported By Schemas
 */

module.exports = [
  'string',
  'number',
  'boolean',
  'json',// << generic json (`'*'`)
  'ref' // < passed straight through to adapter
];
