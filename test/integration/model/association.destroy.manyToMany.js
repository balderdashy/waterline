var Waterline = require('../../../lib/waterline'),
    _ = require('lodash'),
    assert = require('assert');

describe('Model', function() {
  describe('associations Many To Many', function() {
    describe('.destroy()', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var collections = {};
      var prefDestroyCall;

      before(function(done) {
        var waterline = new Waterline();

        var User = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'person',
          attributes: {
            id : {
              primaryKey : true,
              columnName : 'CUSTOM_ID'
            },
            preferences: {
              collection: 'preference',
              via: 'people',
              dominant: true
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'preference',
          attributes: {
            id : {
              primaryKey : true,
              columnName : 'CUSTOM_ID'
            },
            foo: 'string',
            people: {
              collection: 'person',
              via: 'preferences'
            }
          }
        });

        waterline.loadCollection(User);
        waterline.loadCollection(Preference);

        var _values = [
          { id: 1, preference: [{ foo: 'bar' }, { foo: 'foobar' }] },
          { id: 2, preference: [{ foo: 'a' }, { foo: 'b' }] },
        ];

        var i = 1;

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            if(col === 'person_preference') return cb(null, []);
            cb(null, _values);
          },
          destroy: function(con, col, criteria, cb) {
            if(col === 'person_preferences__preference_people') {
              prefDestroyCall = criteria;
            }
            return cb(null, [{
              'CUSTOM_ID' : 1,
              'preference'  : [ { foo: 'bar' }, { foo: 'foobar' } ]
            }]);
          },
          update: function(con, col, criteria, values, cb) {
            return cb(null, values);
          },
          create: function(con, col, values, cb) {
            return cb(null, values);
          },
        };

        var connections = {
          'my_foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          collections = colls.collections;

          done();
        });
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should obey column names in many to many destroy', function(done) {
        collections.person.destroy(1).exec(function(err, results) {
          var expected = { where: { person_preferences: [ 1 ] } }
          assert.deepEqual(prefDestroyCall, expected);
          done();
        });
      });

    });
  });
});
