var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.afterCreate()', function() {
  var person;

  before(function(done) {
    var Model = Collection.extend({
      identity: 'user',
      adapter: 'foo',
      attributes: {
        name: 'string'
      },

      afterCreate: function(values, cb) {
        values.name = values.name + ' updated';
        cb();
      }
    });

    // Fixture Adapter Def
    var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
    new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
      if(err) done(err);
      person = coll;
      done();
    });
  });

  /**
   * CreateEach
   */

  describe('.createEach()', function() {

    it('should run afterCreate and mutate values', function(done) {
      person.createEach([{ name: 'test' }, { name: 'test2' }], function(err, users) {
        assert(!err);
        assert(users[0].name === 'test updated');
        assert(users[1].name === 'test2 updated');
        done();
      });
    });
  });

});
