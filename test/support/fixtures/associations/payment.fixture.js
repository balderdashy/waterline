var BaseMetaModel = require('../../../../lib/waterline/collection');

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
