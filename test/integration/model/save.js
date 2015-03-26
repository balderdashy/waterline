var Waterline = require('../../../lib/waterline'),
    _ = require('lodash'),
    assert = require('assert');

describe('Model', function() {
  describe('.save()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection;
    var updatedThroughCollection;
    
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
      
      waterline.loadCollection(Person);
      waterline.loadCollection(Pet);

      var vals = {};

      var adapterDef = {
        find: function(con, col, criteria, cb) {
          return cb(null, [vals]);
        },
        update: function(con, col, criteria, values, cb) {
          vals = values;
          return cb(null, [values]);
        },
        create: function(con, col, values, cb) {
          vals.pets.push(values);
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
        collection = colls.collections.person;
        
        // Setup value catching through collection.update
        collection.update = (function(_super) {
          
          return function() {
            
            // Grab this value just for first update on the second test
            if (!updatedThroughCollection && arguments[1].id == 2) {
              updatedThroughCollection = _.cloneDeep(arguments[1]);
            }
            
            return _super.apply(collection, arguments);
          }
          
        })(collection.update)
        
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass model values to adapter update method.', function(done) {
      var person = new collection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

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
      var person = new collection._model({ id: 2, first_name: 'don', last_name: 'moe' }, {showJoins: true});

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
    
  });
});
