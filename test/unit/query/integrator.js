/**
 * Module dependencies
 */
var integrate = require('../../../lib/waterline/query/integrator');
var assert = require('assert');
var should = require('should');
var _ = require('lodash');




describe('integrator', function () {

	describe('with no callback', function () {

		it('should throw', function () {
			assert.throws(function () {
				integrate({}, []);
			});
		});
	});



	describe('with otherwise-invalid input', function () {

		it('should trigger cb(err)', function (done) {
			assert.doesNotThrow(function () {
				integrate('foo', 'bar', 'id', function (err, results) {
					assert(err);
					done();
				});
			});
		});
	});



	describe('with valid input', function () {

		describe(':: N..M :: ',function () {

			var fixtures = {
				joins: _.cloneDeep(require('../../support/fixtures/integrator/n..m.joins.js')),
				cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
			};
			var results;

			before(function (done){
				assert.doesNotThrow(function () {
					integrate(fixtures.cache, fixtures.joins, 'id', function (err, _results) {
						assert(!err);
						results = _results;
						done(err);
					});
				});
			});

			it('should be an array', function () {
				results.should.be.Array;
			});

			it('should have items which have all the properties of the parent table');

			describe(':: populated aliases', function () {
				var aliases = Object.keys(_.groupBy(fixtures.joins, 'alias'));

				it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function () {

					// Each result is an object and contains a valid alias
					_.each(results, function (result) {
						result
						.should.be.Object;

						_.any(aliases, function (alias) {
							return result[alias];
						})
						.should.be.true;
					});

					// Double check.
					_.each(results, function (result) {
						result.should.be.Object;

						_.each(aliases, function (alias) {
							result[alias].should.be.ok;
						});
					});

					// All aliases are accounted for in results
					_.all(aliases, function (alias) {
						return results.length === _.pluck(results, alias).length;
					}).should.be.true;
				});

				it('should not include extraneous attributes');


				describe('with no matching child records',function () {

					// Empty the child table in the cache
					before(function () {
						fixtures.cache.message_to_user = [];
					});

					it('should still work in a predictable way (populate an empty array)', function (done) {
						assert.doesNotThrow(function () {
							integrate(fixtures.cache, fixtures.joins, 'id', function (err, _results) {
								assert(!err);
								return done(err);
							});
						});
					});
				});
			});
		});







		describe(':: 1..N ::',function () {

			var results;
			var fixtures = {
				joins: _.cloneDeep(require('../../support/fixtures/integrator/n..1.joins.js')),
				cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
			};

			before(function (done){
				assert.doesNotThrow(function () {
					integrate(fixtures.cache, fixtures.joins, 'id', function (err, _results) {
						assert(!err);
						results = _results;
						done(err);
					});
				});
			});

			it('should be an array', function () {
				results.should.be.Array;
			});

			describe(':: populated aliases', function () {
				var aliases = Object.keys(_.groupBy(fixtures.joins, 'alias'));

				it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function () {

					// Each result is an object and contains a valid alias
					_.each(results, function (result) {
						result
						.should.be.Object;

						_.any(aliases, function (alias) {
							return result[alias];
						})
						.should.be.true;
					});

					// Double check.
					_.each(results, function (result) {
						result.should.be.Object;

						_.each(aliases, function (alias) {
							result[alias].should.be.ok;
							result[alias].should.be.ok;
						});
					});

					// All aliases are accounted for in results
					_.all(aliases, function (alias) {
						return results.length === _.pluck(results, alias).length;
					}).should.be.true;
				});

				it('should have proper number of users in "from"', function () {

					// console.log('\n\n:: 1..N ::\nresults ::\n',
						// require('util').inspect(results, {depth: 4}));

					results[0].should.have.property('from').with.lengthOf(1);
					results[1].should.have.property('from').with.lengthOf(1);
					results[2].should.have.property('from').with.lengthOf(0);

				});
			});


			it('should not include extraneous attributes');
		});
	});






	describe(':: multiple populates ::',function () {

		var results;
		var fixtures = {
			joins: _.cloneDeep(require('../../support/fixtures/integrator/multiple.joins.js')),
			cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
		};

		before(function (done){
			assert.doesNotThrow(function () {
				integrate(fixtures.cache, fixtures.joins, 'id', function (err, _results) {
					assert(!err);
					results = _results;
					done(err);
				});
			});
		});

		it('should be an array', function () {
			results.should.be.Array;
		});

		describe(':: populated aliases', function () {
			var aliases = Object.keys(_.groupBy(fixtures.joins, 'alias'));

			it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function () {

				// Each result is an object and contains a valid alias
				_.each(results, function (result) {
					result
					.should.be.Object;

					_.any(aliases, function (alias) {
						return result[alias];
					})
					.should.be.true;
				});

				// Double check.
				_.each(results, function (result) {
					result.should.be.Object;

					_.each(aliases, function (alias) {
						result[alias].should.be.ok;
						result[alias].should.be.ok;
					});
				});

				// All aliases are accounted for in results
				_.all(aliases, function (alias) {
					return results.length === _.pluck(results, alias).length;
				}).should.be.true;

			});

			it('should contain expected results', function () {

				// console.log('\n\n:: multiple populates ::\nresults ::\n',
					// require('util').inspect(results, {depth: 4}));
				results[0].should.have.property('from').with.lengthOf(1);
				results[1].should.have.property('from').with.lengthOf(1);
				results[2].should.have.property('from').with.lengthOf(0);
			});
		});


		it('should not include extraneous attributes');
	});

});
