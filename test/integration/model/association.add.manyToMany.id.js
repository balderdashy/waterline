var assert = require('assert');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var Waterline = require('../../../lib/waterline');

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

        var _data = {
          person_preferences__preference_people: [
            { id: 12, preference_people: 2, person_preferences: 4 },
            { id: 13, preference_people: 2, person_preferences: 3 }
          ],
          person: [
            { id: 1 },
            { id: 2 },
          ],
          preference: [
            { id: 1, foo: 'bar' },
            { id: 2, foo: 'foobar' },
            { id: 3, foo: 'a' },
            { id: 4, foo: 'b' }
          ]
        };

        var i = 1;

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            cb(null, WLTransform(_data[col], criteria).results);
            // // switch (col) {
            // //   case 'person_preferences__preference_people':
            // //     return cb(null, []);
            // //   default:
            // }
          },
          update: function(con, col, criteria, values, cb) {
            if(col === 'preference') {
              prefValues.push(values);
            }

            _data[col] = _.map(_data[col],function (record) {
              _.extend(record, values);
              return record;
            });

            return cb(null, values);
          },
          create: function(con, col, values, cb) {
            prefValues.push(values);
            _data[col].push(values);
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
        collections.person.find().exec(function(err, records) {
          if(err) return done(err);

          var person = records[0];
          console.log(person);

          person.preferences.add(1);
          person.preferences.add(2);

          console.log('\n\n***** -()=PERSON:', person, person.preferences);
          try {
            person.save(function(err) {
              try {
                console.log('ran SAVE: error?', err);
                if(err) return done(err);

                assert(prefValues.length === 2);

                assert(prefValues[0].preference_people === 1);
                assert(prefValues[1].preference_people === 2);

                done();
              }
              catch (e) {
                return done(e);
              }
            });
          }
          catch (e) {
            if (e) return done(e);
          }
        });
      });

    });
  });
});
