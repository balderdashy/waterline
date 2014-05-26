var Waterline = require('../../../lib/waterline'),
    WLTransform = require('waterline-criteria'),
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
            if(col === 'person') return cb(null, WLTransform(_values, criteria).results);
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

        // console.log('\n\n\n\n--------------------------------------------------------');
        collections.person.find().exec(function(err, records) {
          if(err) return done(err);
          assert(typeof records === 'object' && records.length && records[0], 'should have returned an array of at least one `person` record, instead got '+require('util').inspect(records));

          var person = records[0];

          person.preferences.add(1);
          person.preferences.add(2);

          // console.log('made it here');
          person.save(function(err) {
            if(err) return done(err);

            assert(prefValues.length === 2, 'prefValues should have a length of 2, not '+prefValues.length+'\nprefValues:\n'+require('util').inspect(prefValues));
            assert(prefValues[0].user === 1, 'prefValues[0].user should be === 1, not '+require('util').inspect(prefValues[0].user));
            assert(prefValues[1].user === 1, 'prefValues[1].user should be === 1, not '+require('util').inspect(prefValues[1].user));

            done();
          });
        });
      });

    });
  });
});
