/**
 * Test Model.save() instance method with many to many associations
 */

var Waterline = require('../../../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('associations many to many', function() {

    describe('.add()', function() {
      var userModel, prefMode;

      before(function() {

        // user model
        userModel = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'person',
          attributes: {
            preferences: {
              collection: 'preference'
            }
          }
        });

        // preference
        prefModel = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'preference',
          attributes: {
            foo: 'string',
            people: {
              collection: 'person'
            }
          }
        });
      });


      describe('with an object', function() {
        var collections = {},
            fooValues = [];

        before(function(done) {
          var waterline = new Waterline();

          waterline.loadCollection(userModel);
          waterline.loadCollection(prefModel);

          var _values = [
            { id: 1, preference: [{ id: 1, foo: 'bar' }, { id: 2, foo: 'foobar' }] },
            { id: 2, preference: [{ id: 3, foo: 'a' }, { id: 4, foo: 'b' }] },
          ];

          var i = 1;

          var adapterDef = {
            find: function(col, criteria, cb) {
              if(col === 'person_preference') return cb();
              return cb(null, _values);
            },
            create: function(col, values, cb) {
              if(col !== 'person_preference') {
                values.id = i;
                i++;
                return cb(null, values);
              }

              fooValues.push(values);
              return cb(null, values);
            },
            update: function(col, criteria, values, cb) { return cb(null, values); }
          };

          waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
            if(err) done(err);
            collections = colls;
            done();
          });
        });

        it('should pass model values to create method for each relationship', function(done) {
          collections.person.find().exec(function(err, models) {
            if(err) return done(err);

            var person = models[0];

            person.preferences.add({ foo: 'foo' });
            person.preferences.add({ foo: 'bar' });

            person.save(function(err) {
              if(err) return done(err);

              assert(fooValues.length === 2);
              assert(fooValues[0].preference_id === 1);
              assert(fooValues[0].person_id === 1);

              assert(fooValues[1].preference_id === 2);
              assert(fooValues[1].person_id === 1);

              done();
            });
          });
        });
      });


      describe('with an id', function() {
        var collections = {},
            prefValues = [];

        before(function(done) {
          var waterline = new Waterline();

          waterline.loadCollection(userModel);
          waterline.loadCollection(prefModel);

          var _values = [
            { id: 1, preference: [{ foo: 'bar' }, { foo: 'foobar' }] },
            { id: 2, preference: [{ foo: 'a' }, { foo: 'b' }] },
          ];

          var i = 1;

          var adapterDef = {
            find: function(col, criteria, cb) {
              if(col === 'person_preference') return cb(null, []);
              cb(null, _values);
            },
            update: function(col, criteria, values, cb) {
              if(col === 'preference') {
                prefValues.push(values);
              }

              return cb(null, values);
            },
            create: function(col, values, cb) {
              prefValues.push(values);
              return cb(null, values);
            },
          };

          waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
            if(err) done(err);
            collections = colls;
            done();
          });
        });

        it('should pass foreign key values to update method for each relationship', function(done) {
          collections.person.find().exec(function(err, models) {
            if(err) return done(err);

            var person = models[0];

            person.preferences.add(1);
            person.preferences.add(2);

            person.save(function(err) {
              if(err) return done(err);

              assert(prefValues.length === 2);
              assert(prefValues[0].person_id === 1);
              assert(prefValues[1].person_id === 1);

              done();
            });
          });
        });
      });

    });
  });
});
