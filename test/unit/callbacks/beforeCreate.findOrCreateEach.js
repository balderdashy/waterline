var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeCreate()', function() {
  var person;

  before(function(done) {
    var Model = Collection.extend({
      identity: 'user',
      adapter: 'foo',
      attributes: {
        name: 'string'
      },

      beforeCreate: function(cb) {
        this.name = this.name + ' updated';
        cb();
      }
    });

    // Fixture Adapter Def
    var adapterDef = {
      find: function(col, criteria, cb) { return cb(null, null); },
      create: function(col, values, cb) { return cb(null, values); }
    };

    new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
      if(err) done(err);
      person = coll;
      done();
    });
  });

  /**
   * findOrCreateEach
   */

  describe('.findOrCreateEach()', function() {

    it('should run beforeCreate and mutate values', function(done) {
      person.findOrCreateEach(['name'], [{ name: 'test' }], function(err, users) {
        assert(!err);
        assert(users[0].name === 'test updated');
        done();
      });
    });
  });

});
