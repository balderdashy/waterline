var BaseMetaModel = require('../../../../lib/waterline/MetaModel');

module.exports = BaseMetaModel.extend({
  identity: 'user',
  adapter: 'test',

  attributes: {

    customer: {
      model: 'Customer'
    }

    // deal: {
    //   model: 'Deal'
    // },

    // amount: {
    //   type: 'float'
    // }

  }
});
