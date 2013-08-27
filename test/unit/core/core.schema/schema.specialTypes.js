var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with special types', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          email: 'email',
          age: 'integer'
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should transform unknown types to strings', function() {
      assert(person._schema.schema.email.type === 'string');
    });

    it('should not transform known type', function() {
      assert(person._schema.schema.age.type === 'integer');
    });
  });

});
