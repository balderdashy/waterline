var Waterline = require('../../../lib/waterline'),
    _ = require('lodash'),
    assert = require('assert');

describe('Model', function() {
  describe('.save()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var personCollection;
    var petCollection;
    var updatedThroughCollection;
    var populates;
    
    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'person',
        attributes: {
          first_name: 'string',
          last_name: 'string',
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

      var vals = {
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
          vals[col] = values;
          return cb(null, [values]);
        },
        create: function(con, col, values, cb) {
          
          if (col == 'pet') {
            
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
            if (!updatedThroughCollection && arguments[1].id == 2) {
              updatedThroughCollection = _.cloneDeep(arguments[1]);
            }
            
            return _super.apply(personCollection, arguments);
          }
          
        })(personCollection.update)
        
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

      person.save(function(err, values) {
        assert(!err);
        assert.equal(values.last_name, 'foobaz');
        assert.equal(person.last_name, 'foobaz');
        done();
      });
    });

    it('should not pass *-to-many associations through update.', function(done) {
      var person = new personCollection._model({ id: 2, first_name: 'don', last_name: 'moe' }, {showJoins: true});

      // Update collection      
      person.pets.push({type: 'dog'});
      person.pets.push({type: 'frog'});
      person.pets.push({type: 'log'});
      
      person.save(function(err, values) {
        assert(!err);
        
        // Indeed: does not create/update on save!
        assert( Array.isArray(values.pets) );
        assert.equal(values.pets.length, 0);
        assert( Array.isArray(person.pets) );
        assert.equal(person.pets.length, 3);
        assert.equal(typeof updatedThroughCollection, 'object');
        assert.equal(typeof updatedThroughCollection.pets, 'undefined');
        done();
      });
    });

    it('should populate all associations by default', function(done){
      var person = new personCollection._model({ id: 3, first_name: 'jane', last_name: 'doe' }, {showJoins: true});

      // Update collection      
      person.pets.push({type: 'dog'});
      person.pets.push({type: 'frog'});
      person.pets.push({type: 'log'});

      person.cars.push({type: 'truck'});
      person.cars.push({type: 'bike'});

      person.save(function(err, values) {
        assert(!err);

        populates.sort();

        assert.equal(populates.length, 3);
        assert.deepEqual(populates, ['car', 'person', 'pet']);

        done();
      });
    });

    it('should not populate any associations if options.populate = false', function(done){
      var options;
      var person = new personCollection._model({ id: 4, first_name: 'jane', last_name: 'doe' }, {showJoins: true});

      // Update collection      
      person.pets.push({type: 'dog'});
      person.pets.push({type: 'frog'});
      person.pets.push({type: 'log'});

      person.cars.push({type: 'truck'});
      person.cars.push({type: 'bike'});

      options = {
        populate: false
      };

      person.save(options, function(err, values) {
        assert(!err);

        populates.sort();

        assert.equal(populates.length, 1);
        assert.deepEqual(populates, ['person']);

        done();
      });
    });

    it('should populate only the specified associations', function(done){
      var options;
      var person = new personCollection._model({ id: 5, first_name: 'jane', last_name: 'doe' }, {showJoins: true});

      // Update collection      
      person.pets.push({type: 'dog'});
      person.pets.push({type: 'frog'});
      person.pets.push({type: 'log'});

      person.cars.push({type: 'truck'});
      person.cars.push({type: 'bike'});

      options = {
        populate: [
        {
          key: 'cars'
        }
        ]
      };

      person.save(options, function(err, values) {
        assert(!err);

        populates.sort();

        assert.equal(populates.length, 2);
        assert.deepEqual(populates, ['car', 'person']);
        done();
      });
    });


    it('should succeed when saving an unmodified nested model instance.', function(done) {
      
      // Person nested in pet as owner.
      var pet = new petCollection._model({ id: 1, type: 'dog', owner: {id: 1} });
      
      pet.save(function(err, values) {
        assert(!err);
        assert.equal(values.id, 1);
        assert.equal(values.type, 'dog');
        done();
      });
    });
    
  });
});
