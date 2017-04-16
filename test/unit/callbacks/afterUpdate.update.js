var Waterline = require('../../../lib/waterline'),
  assert = require('assert');
  _ = require('lodash');

describe('.afterUpdate()', function() {
  var User, afterUpdateValues = null;

  before(function (done) {
    var waterline = new Waterline();
    var Model = Waterline.Collection.extend({
      identity: 'user',
      connection: 'foo',
      attributes: {
        name: 'string',
        employed: 'boolean',
        meta: 'json',
        hobbies: 'array'
      },

      afterUpdate: function (values, cb) {
        afterUpdateValues = _.cloneDeep(values);
        cb();
      }
    });

    waterline.loadCollection(Model);

    // Fixture Adapter Def
    var adapterDef = {
      update: function (con, col, criteria, values, cb) {
        // emulate values coming back from (for example) sails-mysql adapter
        Object.keys(values).forEach(function (key) {
          var val = values[key];
          if (typeof val === 'object') {
            // will stringify arrays and objects
            values[key] = JSON.stringify(val);
          }
          if (typeof val === 'boolean') {
            values[key] = val ? 1: 0;
          }
        });

        cb(null, [values]);
      }
    };

    var connections = {
      foo: {
        adapter: 'foobar'
      }
    };

    waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function (err, colls) {
      if (err) done(err);
      User = colls.collections.user;
      done();
    });
  });

  it('should be passed deserialized values', function (done) {
    var valuesToUpdate = {
      employed: true,
      hobbies: ['hiking', 'fishing'],
      meta: {
        lovesChocolate: true
      }
    };

    User.update({name: 'criteria'}, valuesToUpdate, function (err /*, user */) {
      assert(!err);
      assert(afterUpdateValues !== null);
      assert(typeof afterUpdateValues.employed === 'boolean', "'employed' is not of expected 'boolean' type");
      assert(Array.isArray(afterUpdateValues.hobbies), "'hobbies' is not of expected 'Array' type");
      assert(typeof afterUpdateValues.meta === 'object', "'meta' is not of expected 'object' type");
      done();
    });
  });
});
