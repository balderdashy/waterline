var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {

    describe('with adapter implemented createEach()', function() {
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
        var adapterDef = { 
          create: function(con, col, values, cb) { values.name = 'no name'; return cb(null, values); },
          createEach: function(con, col, values, cb) { return cb(null, values); }
        };

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


      it('should call adapters createEach method', function(done) {
        query.createEach([{ name: 'bob' }, { name: 'foo'}], function(err, values) {
          assert(!err);
          assert(values);
          assert.equal(values[0].name, 'bob');
          assert.equal(values[1].name, 'foo');
          done();
        });
      });

      
    });

  });
});
