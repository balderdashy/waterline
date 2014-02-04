
var should = require('should');
var bootstrapCollection = require('./helpers/Collection.bootstrap');
var Adapter = require('./fixtures/adapter.withHandlers.fixture');



describe('calling describe', function() {

	var Collection;

	before(function(done) {

		bootstrapCollection({
			adapter: Adapter,
			properties: {
				attributes: {
					name: 'string',
					age: 'integer'
				}
			}
		})(function (err) {
			if (err) return done(err);

			this.ocean.should.be.an.Object; // access to all connections + collections
			this.ocean.connections.my_foo.should.be.an.Object;// a connection
			this.ocean.collections.tests.should.be.an.Object;// a collection called `tests`
			this.SomeCollection.should.be.an.Object; // same as `tests`, for convenience

			this.SomeCollection.attributes
				.should.be.an.Object;
			this.SomeCollection.attributes
				.should.have.property('name');
			this.SomeCollection.attributes
				.should.have.property('age');

			Collection = this.SomeCollection;

			done();
		});

	});

	it('should work', function (done) {
		Collection.describe({
			success: function ( schema ) {

				schema
					.should.be.an.Object;
				schema
					.should.have.property('name');
				schema
					.should.have.property('age');

				done();
			}
		});
	});

});




describe('calling drop', function() {

	var Collection;

	before(function(done) {

		bootstrapCollection({
			adapter: Adapter,
			properties: {
				identity: 'tests',
				attributes: {
					name: 'string',
					age: 'integer'
				}
			}
		})(function (err) {
			if (err) return done(err);

			this.ocean.should.be.an.Object; // access to all connections + collections
			this.ocean.connections.my_foo.should.be.an.Object;// a connection
			this.ocean.collections.tests.should.be.an.Object;// a collection called `tests`
			this.SomeCollection.should.be.an.Object; // same as `tests`, for convenience

			this.SomeCollection.attributes
				.should.be.an.Object;
			this.SomeCollection.attributes
				.should.have.property('name');
			this.SomeCollection.attributes
				.should.have.property('age');

			Collection = this.SomeCollection;

			done();
		});

	});

	it('should work', function (done) {
		Collection.drop(function (err ) {
			if (err) return done(err);

			// Verify that the collection is actually gone:
			Collection.describe({
				success: function (schema) {
					should(schema).not.be.ok;
					done();
				}
			});
		});
	});

});


