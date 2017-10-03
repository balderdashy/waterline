var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.find()', function() {
    describe('with transformed values', function() {
      var modelDef = {
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string',
            columnName: 'login'
          }
        }
      };

      it('should transform criteria before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(null, [{ id: 1, login: 'foo' }]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          orm.collections.user.find({ where: { name: 'foo' }}, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(null, [{ id: 1, login: 'foo' }]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if(err) {
            return done(err);
          }

          orm.collections.user.find({ name: 'foo' }, function(err, values) {
            if (err) {
              return done(err);
            }

            assert(values[0].name);
            assert(!values[0].login);
            return done();
          });
        });
      });//it

      it('should include base value for no-op populates', function(done) {

        Waterline.start({
          defaultModelSettings: {
            attributes: {
              id: { type: 'number' }
            },
            primaryKey: 'id',
            datastore: 'default'
          },
          models: {
            user: {
              attributes: {
                name: {
                  type: 'string',
                  columnName: '_userName'
                },
                pets: {
                  collection: 'pet'
                }
              }
            },
            pet: {
              attributes: {
                name: {
                  type: 'string',
                  columnName: '_petName'
                }
              }
            }
          },
          adapters: {
            fake: {
              identity: 'fake',
              find: function(datastoreName, query, done) {
                if (query.using === 'user') {
                  assert(!query.criteria.where.name);
                  return done(undefined, [{ id: 1, _userName: query.criteria.where._userName||'someuser' }]);
                }
                else if (query.using === 'pet') {
                  // console.log('query.criteria.where', require('util').inspect(query.criteria.where,{depth:null}));
                  assert(!query.criteria.where.name);
                  return done(undefined, [{ id: 1, _petName: query.criteria.where._petName||'somepet' }]);
                }
                else if (query.using === 'pet_pets_pet__user_pets') {
                  assert(_.contains(query.criteria.select, 'id'));
                  assert(_.contains(query.criteria.select, 'user_pets'));
                  assert(_.contains(query.criteria.select, 'pet_pets_pet'));
                  assert.equal(query.criteria.where.and[0].user_pets.in[0], 1);
                  return done(undefined, [{ id: 999, user_pets: 1, pet_pets_pet: 1 }]);//eslint-disable-line camelcase
                }
                else {
                  return done(new Error('Unexpected result for this test-- what model is this??  (`'+query.using+'`)'));
                }
              }
            }
          },
          datastores: {
            default: { adapter: 'fake' }
          }
        }, function(err, orm) {
          if(err) { return done(err); }

          // First, just a quick sanity check.
          Waterline.getModel('pet', orm).find({ name: 'fluffy' }, function(err, pets) {
            if (err){ return done(err); }

            if (pets.length !== 1) { return done(new Error('Expected there to be exactly one record returned!')); }

            // Then, let's test the meat of this.
            Waterline.getModel('user', orm).find({ name: 'jorahmormont' }, {
              // Use a deliberate no-op populate:
              pets: {
                or: [
                  {
                    id: { in: [] }
                  },
                  {
                    and: [
                      {},
                      {
                        id: { nin: [] }
                      },
                      {
                        or: []
                      }
                    ]
                  }
                ]
              }
            }, function(err, users) {
              if (err){ return done(err); }

              if (users.length !== 1) { return done(new Error('Expected there to be exactly one record returned!')); }
              if (!_.isArray(users[0].pets) || users[0].pets.length !== 0) { return done(new Error('Expected base value for populated `pets`  (i.e. empty array)')); }

              return done();

            });//_∏_
          });//_∏_
        });//_∏_     (Waterline.start())
      });//it

    });
  });
});
