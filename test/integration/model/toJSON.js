var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('.toJSON()', function() {

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
          },
          toJSON: function() {
            var obj = this.toObject();
            delete obj.last_name;
            return obj;
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

    it('should be overridable', function() {
      var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
      var obj = person.toJSON();

      assert(obj === Object(obj));
      assert(obj.first_name === 'foo');
      assert(!obj.last_name);
      assert(!obj.full_name);
    });

  });
});
