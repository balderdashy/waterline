/**
 * Known error codes/types:
 */

module.exports = {

  E_VALIDATION: {
    status: 'invalid',
    code: 'E_VALIDATION',
    msg: 'Waterline: Could not complete operation - violates one or more of your model\'s validation rules.'
  },

  E_CONSTRAINT: {
    status: 'invalid',
    code: 'E_CONSTRAINT',
    msg: 'Waterline: Could not complete operation - violates one or more of your model\'s validation rules.'
  },

  E_ADAPTER: {
    status: 'error',
    code: 'E_ADAPTER',
    msg: 'Waterline: An adapter encountered an error.'
  },

  E_UNKNOWN: {
    status: 'error',
    code: 'E_UNKNOWN',
    msg: 'Waterline: ORM encountered an unknown error.'
  }
};