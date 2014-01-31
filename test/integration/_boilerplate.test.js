var bootstrapCollection = require('./helpers/Collection.bootstrap');
var Adapter = require('./fixtures/adapter.withHandlers.fixture');


describe('something to test', function () {

	before(bootstrapCollection({
    adapter: Adapter
  }));

	it('should not throw', function () {

		this.ocean.should.be.an.Object; // access to all connections + collections
		this.ocean.connections.my_foo.should.be.an.Object;// a connection
		this.ocean.collections.tests.should.be.an.Object;// a collection called `tests`
		this.SomeCollection.should.be.an.Object; // same as `tests`, for convenience
	});

	// more tests here

});