var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('.save()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection;

    before(function(done) {
      var waterline = new Waterline();
      var Collection = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'person',
        attributes: {
          first_name: 'string',
          last_name: 'string',
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          }
        }
      });

      waterline.loadCollection(Collection);

      var vals = {};

      var adapterDef = {
        find: function(con, col, criteria, cb) {
          return cb(null, vals);
        },
        update: function(con, col, criteria, values, cb) {
          vals = values;
          return cb(null, [values]);
        }
      };

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        collection = colls.collections.person;
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass model values to update method', function(done) {
      var person = new collection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

      // Update a value
      person.last_name = 'foobaz';

      person.save(function(err, values) {
        assert(!err);
        assert(values.last_name === 'foobaz');
        assert(person.last_name === 'foobaz');
        done();
      });
    });

  });
});
