var Waterline = require('../../lib/waterline'),
    adapter = require('./fixtures/adapter.withHandlers.fixture'),
    assert = require('assert'),
    should = require('should');


// Helpers
//////////////////////////////////////////////////////////////////////////////
var bootstrap = function(done) {
  var self = this;

  var Model = Waterline.Collection.extend({
    attributes: {},
    adapter: 'barbaz',
    tableName: 'tests'
  });

  var waterline = new Waterline();
  waterline.loadCollection(Model);

  waterline.initialize({ adapters: { barbaz: adapter }}, function(err, colls) {
    if(err) return done(err);
    SomeCollection = colls.tests;
    self.SomeCollection = SomeCollection;
    done();
  });
};


var expect = {
  cbHasErr: function (shouldMsg) {
    it(shouldMsg || 'should provide conventional error arg to caller cb', function () {
      var err = this.resultArgs[0];
      should(err).exist;
    });
  },
  cbHasNoErr: function (shouldMsg) {
    it(shouldMsg || 'should provide NO error arg to caller cb', function () {
      var err = this.resultArgs[0];
      should(err).not.exist;
    });
  }
};





        // // Run default msg fn
        // var optionsArg = args && args[0];
        // var msg = '.'+nameOfMethod+'()' + (optionsArg ? '  [usage: "' + optionsArg._simulate + '"]' : '');
var Deferred = {
  inspect: function (config) {

    return function _inspect ( /* [testMsg], mochaDescribeFn */ ) {
      var testMsg = typeof arguments[0] === 'string' ? arguments[0] : '???';
      var mochaDescribeFn = arguments[1] || function () { it('should not crash', function () {}); };

      if (typeof arguments[0] !== 'string') mochaDescribeFn = arguments[0];

      describe(testMsg, function () {

        // Simulates a call like :: `SomeCollection.nameOfMethod( options, cb )`
        before(function (done){  

          var self = this;
          var fn = this.SomeCollection[config.nameOfMethod];
          var options = this.options || {};
          var cb = function adapterFnCallback () {
            self.resultArgs = Array.prototype.slice.call(arguments);
            return done();
          };

          console.log(options);
          fn.apply(null, [options, cb]);
        });

        mochaDescribeFn();
      });
    };
  },

  options: function (options) {
    before(function () {
      this.options = options;
    });
  }
  
};


var test = {

  // Deferred object allows chained usage, i.e.:
  // adapterMethod(foo).inspect(mochaDescribeFn)
  adapterMethod: function (nameOfMethod) {
    return {
      inspect: Deferred.inspect({ nameOfMethod: nameOfMethod }),
      options: Deferred.options()
    };
  }
};
//////////////////////////////////////////////////////////////////////////////
















describe('Waterline Collection', function() {

  describe('error negotiation & handlers', function() {

    before(bootstrap);



    describe('Vocabulary methods upgrade callbacks to handlers', function () {

      test.adapterMethod('find', { _simulate: 'traditionalSuccess' })
      .inspect(function () {
        expect.cbHasNoErr();
      });

      test.adapterMethod('find', { _simulate: 'traditionalSuccess' })
      .inspect(function () {
        expect.cbHasNoErr();
      });

    });








    // Methods of dummy custom adapter methods do exactly what you would expect
    // based on their names.  Usage signature is: `Foo.bar(options, callback)`
    describe('Custom methods still work', function () {

      it('should have the expected methods for use in our test', function () {
        this.SomeCollection.traditionalError.should.be.a.Function;
        this.SomeCollection.traditionalSuccess.should.be.a.Function;
      });

      test.adapterMethod('traditionalError').inspect(function (){
        expect.cbHasErr();
      });

      test.adapterMethod('traditionalSuccess').inspect(function (){
        expect.cbHasNoErr();
      });
    });

  });
});
