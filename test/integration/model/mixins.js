var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('mixins', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection;

    before(function(done) {
      var waterline = new Waterline();
      var Collection = Waterline.Collection.extend({
        adapter: 'foo',
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

      waterline.initialize({ adapters: { foo: {} }}, function(err, colls) {
        if(err) done(err);
        collection = colls.person;
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('instantiated model should have a full_name function', function() {
      var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
      var name = person.full_name();

      assert(typeof person.full_name === 'function');
      assert(name === 'foo bar');
    });

  });
});
