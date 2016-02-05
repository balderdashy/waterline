var Waterline = require('../../../lib/waterline');
var _ = require('lodash');
var assert = require('assert');

describe('Model', function() {
  describe('.save()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var personCollection;
    var petCollection;
    var updatedThroughCollection;
    var populates;
    var vals;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'person',
        attributes: {
          first_name: 'string',
          last_name: 'string',
          error: 'string',
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          },
          pets: {
            collection: 'pet',
            via: 'owner'
          },
          cars: {
            collection: 'car',
            via: 'owner'
          }
        }
      });

      var Pet = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'pet',
        attributes: {
          type: 'string',
          owner: {
            model: 'person'
          }
        }
      });

      var Car = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'car',
        attributes: {
          type: 'string',
          owner: {
            model: 'person'
          }
        }
      });

      waterline.loadCollection(Person);
      waterline.loadCollection(Pet);
      waterline.loadCollection(Car);

      vals = {
        person: { pets: [] , cars: []},
        pet: {},
        car: {}
      };

      var adapterDef = {
        find: function(con, col, criteria, cb) {
          populates.push(col);
          return cb(null, [vals[col]]);
        },
        update: function(con, col, criteria, values, cb) {
          if(values.error) return cb(new Error('error'));
          vals[col] = values;
          return cb(null, [values]);
        },
        create: function(con, col, values, cb) {

          if (col === 'pet') {
            vals.person.pets.push(values);
          }

          vals[col] = values;
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

        // Setup pet collection
        petCollection = colls.collections.pet;

        // Setup person collection
        personCollection = colls.collections.person;

        // Setup value catching through personCollection.update
        personCollection.update = (function(_super) {

          return function() {

            // Grab this value just for first update on the second test
            if (!updatedThroughCollection && arguments[1].id === 2) {
              updatedThroughCollection = _.cloneDeep(arguments[1]);
            }

            return _super.apply(personCollection, arguments);
          };

        })(personCollection.update);

        done();
      });
    });

    beforeEach(function(){
      populates = [];
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass model values to adapter update method.', function(done) {
      var person = new personCollection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

      // Update a value
      person.last_name = 'foobaz';

      person.save(function(err) {
        assert(!err);
        assert.equal(vals.person.last_name, 'foobaz');
        done();
      });
    });

    it('should not pass *-to-many associations through update.', function(done) {
      var person = new personCollection._model({ id: 2, first_name: 'don', last_name: 'moe' }, {showJoins: true});

      // Update collection
      person.pets.push({type: 'dog'});
      person.pets.push({type: 'frog'});
      person.pets.push({type: 'log'});

      person.save(function(err) {
        assert(!err);

        assert(_.isPlainObject(vals.pet));
        assert.equal(_.keys(vals.pet).length, 0);

        assert.equal(typeof updatedThroughCollection, 'object');
        assert.equal(typeof updatedThroughCollection.pets, 'undefined');
        done();
      });
    });

    it('should only return one argument to the callback', function(done) {
      var person = new personCollection._model({ id: 1, error: 'error' });
      person.save(function() {
        assert.equal(arguments.length, 1);

        var person = new personCollection._model({ id: 1 });
        person.save(function() {
          assert.equal(arguments.length, 0);
          done();
        });
      });
    });

  });
});
