var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.afterSave()', function() {
  var person;

  before(function(done) {
    var Model = Collection.extend({
      identity: 'user',
      adapter: 'foo',
      attributes: {
        name: 'string'
      },

      afterSave: function(cb) {
        this.name = this.name + ' updated';
        cb();
      }
    });

    // Fixture Adapter Def
    var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
    new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
      if(err) done(err);
      person = coll;
      done();
    });
  });

  /**
   * Update All
   */

  describe('.updateAll()', function() {

    it('should run afterSave and mutate values', function(done) {
      person.updateAll({ name: 'criteria' }, { name: 'test' }, function(err, users) {
        assert(!err);
        assert(users[0].name === 'test updated');
        done();
      });
    });
  });

});
