var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with instance methods', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          first_name: 'string',
          doSomething: function() {}
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should ignore instance methods in the schema', function() {
      assert(!person._schema.schema.doSomething);
    });
  });

});
