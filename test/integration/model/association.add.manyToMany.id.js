var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('associations Many To Many', function() {
    describe('.add() with an id', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var collections = {};
      var prefValues = [];

      before(function(done) {
        var waterline = new Waterline();

        var User = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'person',
          attributes: {
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
            if(col === 'person_preferences__preference_people') return cb(null, []);
            cb(null, _values);
          },
          update: function(con, col, criteria, values, cb) {
            if(col === 'preference') {
              prefValues.push(values);
            }

            return cb(null, values);
          },
          create: function(con, col, values, cb) {
            prefValues.push(values);
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

      it('should pass foreign key values to update method for each relationship', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);

          var person = models[0];

          person.preferences.add(1);
          person.preferences.add(2);

          person.save(function(err) {
            if(err) return done(err);

            assert(prefValues.length === 2);

            assert(prefValues[0].preference_people === 1);
            assert(prefValues[1].preference_people === 2);

            done();
          });
        });
      });

    });
  });
});
