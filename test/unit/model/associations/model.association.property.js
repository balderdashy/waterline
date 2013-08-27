/**
 * Test Model Association Getters and Setters for has_many keys
 */

var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('association', function() {

    describe('getter and setters', function() {
      var collection;

      /**
       * Build a test model
       */

      before(function(done) {
        var waterline = new Waterline();

        // user model
        var userModel = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'person',
          attributes: {
            preferences: {
              collection: 'preference'
            }
          }
        });

        // preference
        var prefModel = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'preference',
          attributes: {
            user: {
              model: 'person'
            }
          }
        });

        waterline.loadCollection(userModel);
        waterline.loadCollection(prefModel);

        var _values = [
          { preference: [{ foo: 'bar' }, { foo: 'foobar' }] },
          { preference: [{ foo: 'a' }, { foo: 'b' }] },
        ];

        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, _values); }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) done(err);
          collection = colls.person;
          done();
        });
      });

      it('should have a getter for preferences', function(done) {
        collection.find().exec(function(err, data) {
          if(err) return done(err);

          assert(Array.isArray(data[0].preferences));
          assert(data[0].preferences.length == 2);
          assert(data[0].preferences[0].foo === 'bar');

          assert(Array.isArray(data[1].preferences));
          assert(data[1].preferences.length == 2);
          assert(data[1].preferences[0].foo === 'a');

          done();
        });
      });

      it('should have special methods on the preference key', function(done) {
        collection.find().exec(function(err, data) {
          if(err) return done(err);

          assert(typeof data[0].preferences.add == 'function');
          assert(typeof data[0].preferences.remove == 'function');

          assert(typeof data[1].preferences.add == 'function');
          assert(typeof data[1].preferences.remove == 'function');

          done();
        });
      });

      it('should allow new associations to be added using the add function', function(done) {
        collection.find().exec(function(err, data) {
          if(err) return done(err);

          data[0].preferences.add(1);
          assert(data[0].associations.preferences.addModels.length === 1);

          done();
        });
      });

      it('should allow new associations to be removed using the remove function', function(done) {
        collection.find().exec(function(err, data) {
          if(err) return done(err);

          data[0].preferences.remove(1);
          assert(data[0].associations.preferences.removeModels.length === 1);

          done();
        });
      });

    });
  });
});
