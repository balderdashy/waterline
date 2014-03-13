/**
 * Known error codes/types:
 */

module.exports = {

  E_VALIDATION: {
    status: 'invalid',
    code: 'E_VALIDATION',
    prefix: 'Waterline: Could not complete operation - violates one or more of your model\'s validation rules:\n'
  },

  E_CONSTRAINT: {
    status: 'invalid',
    code: 'E_CONSTRAINT',
    prefix: 'Waterline: Could not complete operation - violates one or more of your model\'s validation rules:\n'
  },

  E_ADAPTER: {
    status: 'error',
    code: 'E_ADAPTER',
    prefix: 'Waterline: An adapter encountered an error:\n'
  },

  E_UNKNOWN: {
    status: 'error',
    code: 'E_UNKNOWN',
    prefix: 'Waterline: ORM encountered an unknown error:\n'
  }
};