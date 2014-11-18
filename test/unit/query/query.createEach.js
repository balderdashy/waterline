var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {

    describe('with proper values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            first:{
              type: 'string',
              defaultsTo: 'Foo'
            },
            second: {
              type: 'string',
              defaultsTo: 'Bar'
            },
            full: {
              type: 'string',
              defaultsTo: function() { return this.first + ' ' + this.second; }
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            arr: {
              type: 'array',
              defaultsTo: []
            },
            doSomething: function() {}
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });


      it('should require an array of values', function(done) {
        query.createEach({}, function(err, values) {
          assert(err);
          done();
        });
      });

      it('should require a valid set of records', function(done) {
        query.createEach([{},'string'], function(err, values) {
          assert(err);
          done();
        });
      });

      it('should add default values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].name === 'Foo Bar');
          assert(values[1].name === 'Foo Bar');
          done();
        });
      });

      it('should add default values to each record when function', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].full === 'Foo Bar');
          assert(values[1].full === 'Foo Bar');
          done();
        });
      });

      it('should clone default values for each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].arr !== values[1].arr);
          values[1].arr.push('another');
          assert(values[0].arr.length === 0);
          assert(values[1].arr.length === 1);
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.createEach([{ foo: 'bar' }], function(err, values) {
          assert(!values[0].foo);
          done();
        });
      });

      it('should add timestamp values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(values[0].createdAt);
          assert(values[0].updatedAt);
          assert(values[0].createdAt);
          assert(values[1].updatedAt);
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.createEach()
        .set([{ name: 'bob' }, { name: 'foo'}])
        .exec(function(err, result) {
          assert(!err);
          assert(result);
          assert(result[0].name === 'bob');
          assert(result[1].name === 'foo');
          done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: 'string',
            age: 'integer'
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, col, valuesList, cb) { return cb(null, valuesList); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.createEach([{ name: 'foo', age: '27' }], function(err, values) {
          assert(values[0].name === 'foo');
          assert(values[0].age === 27);
          done();
        });
      });

      it('should not be detructive to passed-in arrays', function(done) {
        var myPreciousArray = [{ name: 'foo', age: '27' }];
        query.createEach(myPreciousArray, function(err, values) {
          assert(myPreciousArray.length === 1);
          done();
        });
      });
    });

  });
});
