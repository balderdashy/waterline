var Collection = require('../../../../lib/waterline/collection');

// Extend for testing purposes
var Model = Collection.extend({
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

module.exports = Model;
