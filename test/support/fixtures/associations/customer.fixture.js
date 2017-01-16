var Collection = require('../../../../lib/waterline/collection');

module.exports = Collection.extend({
  identity: 'user',
  adapter: 'test',

  attributes: {

    // deals: {
    //   collection: 'Deal'
    // },

    payments: {
      collection: 'Payment'
    },

    name: 'string'

  }
});
