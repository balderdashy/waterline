var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('associations hasMany', function() {
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
              via: 'user'
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'preference',
          attributes: {
            foo: 'string',
            user: {
              model: 'person'
            }
          }
        });

        waterline.loadCollection(User);
        waterline.loadCollection(Preference);

        var _values = [{ id: 1 }, { id: 2 }];

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            if(col === 'person') return cb(null, _values);
            cb(null, []);
          },
          update: function(con, col, criteria, values, cb) {
            if(col === 'preference') {
              prefValues.push(values);
            }

            return cb(null, values);
          }
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
            assert(prefValues[0].user === 1);
            assert(prefValues[1].user === 1);

            done();
          });
        });
      });

    });
  });
});
