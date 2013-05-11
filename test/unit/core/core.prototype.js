var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core', function() {

  describe('instantiation', function() {
    var adapterDef;

    before(function() {

      // Fixture Adapter Def
      // Has a foo method that should be mixed in with
      // the default adapter methods
      adapterDef = {
        foo: function() {}
      };

    });

    it('should normalize adapter definition', function() {
      var Person = Core.extend({ adapter: 'foobar' });
      var person = new Person({ adapters: { foobar: adapterDef }});

      assert(typeof person.adapter.foo === 'function');
    });

  });
});
