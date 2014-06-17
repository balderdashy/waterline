var assert = require('assert');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var Waterline = require('../../../lib/waterline');

describe('Model', function() {
  describe('associations Many To Many', function() {
    describe('.add() with an object', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var collections = {};
      var fooValues = [];

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

        // var _values = [
        //   { id: 1, preferences: [{ id: 1, foo: 'bar' }, { id: 2, foo: 'foobar' }] },
        //   { id: 2, preferences: [{ id: 3, foo: 'a' }, { id: 4, foo: 'b' }] },
        // ];

        var i = 1;
        var added = false;

        // var adapterDef = {
        //   find: function(con, col, criteria, cb) {
        //     if(col === 'person_preferences__preference_people') {
        //       if(!added) return cb();
        //       if(criteria === fooValues[0]) return cb(null, fooValues[0]);
        //       return cb(null, []);
        //     }

        //     return cb(null, _values);
        //   },
        //   create: function(con, col, values, cb) {
        //     if(col !== 'person_preferences__preference_people') {
        //       values.id = i;
        //       i++;
        //       return cb(null, values);
        //     }

        //     added = true;
        //     fooValues.push(values);
        //     return cb(null, values);
        //   },
        //   update: function(con, col, criteria, values, cb) { return cb(null, values); }
        // };

        var _data = {
          person_preferences__preference_people: [
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

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            cb(null, WLTransform(_data[col], criteria).results);
          },
          update: function(con, col, criteria, values, cb) {
            return cb(null, _.where(_data[col],function (record) {
              if (_.contains(_.pluck(WLTransform(_data[col], criteria).results,'id'), record.id)) {
                _.extend(record, values);
                return true;
              }
              return false;
            }));

            // return cb(null, values);
          },
          create: function(con, col, values, cb) {
            if(col === 'person_preferences__preference_people') {
              added = true;
              fooValues.push(values);
              _data[col].push(values);
            }
            else {
              values.id = i;
              i++;
              _data[col].push(values);
            }

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

      it('should pass model values to create method for each relationship', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);
          // console.log('!!!!!!!!');
          var person = models[0];

          person.preferences.add({ foo: 'foo' });
          person.preferences.add({ foo: 'bar' });

          person.save(function(err) {
            if(err) return done(require('util').inspect(err, false, null));

            assert(fooValues.length === 2, 'expected 2 things, but got: '+require('util').inspect(fooValues, false, null));

            assert(fooValues[0].person_preferences === 1, 'expected fooValues[0].person_preferences === 1 but got fooValues[0] ==> '+ require('util').inspect(fooValues[0], false, null));
            assert(fooValues[0].preference_people === 1);

            assert(fooValues[1].preference_people === 2, 'fooValues==>'+require('util').inspect(fooValues, false, null));
            assert(fooValues[1].person_preferences === 1);

            done();
          });
        });
      });

    });
  });
});
