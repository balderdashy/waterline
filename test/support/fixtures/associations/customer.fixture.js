var BaseMetaModel = require('../../../../lib/waterline/MetaModel');

module.exports = BaseMetaModel.extend({
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
