var WLModel = require('../../../../lib/waterline/collection');

module.exports = WLModel.extend({
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
