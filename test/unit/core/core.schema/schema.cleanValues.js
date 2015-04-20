var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('cleanValues method', function() {
    var user;
    var userschemaless;

    before(function(done) {
      var waterline = new Waterline();
      
      var UserSchema = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        schema: true,
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          age: {
            type: 'integer',
          },
          schemalessFriends: {
            collection: 'userschemaless',
            via: 'schemaFriends'
          }
        }
      });
        
      var UserSchemaless = Waterline.Collection.extend({
        identity: 'userschemaless',
        connection: 'foo',
        schema: false,
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          age: {
            type: 'integer',
          },
          schemaFriends: {
            collection: 'user',
            via: 'schemalessFriends'
          }
        }
      });

      waterline.loadCollection(UserSchema);
      waterline.loadCollection(UserSchemaless);
        
      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        user = colls.collections.user;
        userschemaless = colls.collections.userschemaless;
        done();
      });
    });

    it('when collection is schemaless, should only remove collection attributes.', function() {
      
      var rawValues = {
        name: 'don-moe',
        non: 'should be here',
        schemaFriends: []
      }
      
      var cleanValues = userschemaless._schema.cleanValues(rawValues);
      
      assert.equal(cleanValues.name, 'don-moe');
      assert.equal(cleanValues.non, 'should be here');
      assert.equal(cleanValues.schemaFriends, undefined);
    });

    it('when collection has schema, should clean attributes not in the schema, including collection attributes.', function() {

      var rawValues = {
        name: 'don-moe',
        non: 'should be here',
        schemalessFriends: []
      }
      
      var cleanValues = user._schema.cleanValues(rawValues);
      
      assert.equal(cleanValues.name, 'don-moe');
      assert.equal(cleanValues.non, undefined);
      assert.equal(cleanValues.schemalessFriends, undefined);
    });
  });

});
