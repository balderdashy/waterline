var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with validation properties', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          first_name: {
            type: 'STRING',
            length: { min: 2, max: 10 }
          }
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should ignore validation properties in the schema', function() {
      assert(!person._schema.schema.first_name.length);
    });
  });

});
