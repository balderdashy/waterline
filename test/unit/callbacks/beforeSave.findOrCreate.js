var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeSave()', function() {
  var person;

  before(function(done) {
    var Model = Collection.extend({
      identity: 'user',
      adapter: 'foo',
      attributes: {
        name: 'string'
      },

      beforeSave: function(cb) {
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
   * findOrCreate
   */

  describe('.findOrCreate()', function() {

    it('should run beforeSave and mutate values', function(done) {
      person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
        assert(!err);
        assert(user.name === 'test updated');
        done();
      });
    });
  });

});
