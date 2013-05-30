var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {
    var Model;

    before(function() {

      // Extend for testing purposes
      Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar',
            columnName: 'login'
          }
        }
      });
    });


    it('should transform values before sending to adapter', function(done) {

      // Fixture Adapter Def
      var adapterDef = {
        createEach: function(col, valuesList, cb) {
          assert(valuesList[0].login);
          return cb(null, valuesList);
        }
      };

      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        coll.createEach([{ name: 'foo' }], done);
      });
    });

    it('should transform values after receiving from adapter', function(done) {

      // Fixture Adapter Def
      var adapterDef = {
        createEach: function(col, valuesList, cb) {
          assert(valuesList[0].login);
          return cb(null, valuesList);
        }
      };

      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        coll.createEach([{ name: 'foo' }], function(err, values) {
          assert(values[0].name);
          assert(!values[0].login);
          done();
        });
      });
    });

  });
});
