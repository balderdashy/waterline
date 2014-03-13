/**
 * Known error codes/types:
 */

module.exports = {

  E_VALIDATION: {
    status: 'invalid',
    code: 'E_VALIDATION'
  },

  E_CONSTRAINT: {
    status: 'invalid',
    code: 'E_CONSTRAINT'
  },

  E_ADAPTER: {
    status: 'error',
    code: 'E_ADAPTER'
  },

  E_UNKNOWN: {
    status: 'error',
    code: 'E_UNKNOWN',
    prefix: 'Waterline ORM encountered an unknown error:\n'
  }
};