/**
 * Test dependencies
 */
var leftOuterJoin = require('../../../lib/waterline/query/integrator/leftOuterJoin');
var populate = require('../../../lib/waterline/query/integrator/populate');
var fixtures = {
	cache: require('../../support/fixtures/integrator/cache')
};
var assert = require('assert');
var should = require('should');
var _ = require('lodash');


describe('populate', function () {



	describe('when run with valid input', function () {

		var results;
		var expected = {
			'results.length': 3,

			// All objects in results should have:
			properties: [
				'id', 'subject', 'body', 'from',
				'asdf'
			]
		};

		it('should not throw', function () {
			assert.doesNotThrow(function () {

				var pk = 'id';
				var alias = 'asdf';
				results = fixtures.cache.message;

				populate(
					results,
					alias,
					leftOuterJoin({
						left: fixtures.cache.message,
						right: fixtures.cache.message_to_user, 
						leftKey: 'id',
						rightKey: 'message_id'
					}),
					pk
				);
			});
		});

		it('output should be an array', function () {
			results.should.be.Array;
		});

		it('output should match the expected results', function () {
			results.should.have.lengthOf(expected['results.length']);
		});

		describe('when run again, as a many-to-many', function () {

			var results_2;
			var expected = {
				'results_2.length': 3,
				properties: [
					'id', 'subject', 'body', 'from',
					'asdf'
				]
			};

			it('should not throw', function () {
				assert.doesNotThrow(function () {

					var pk = 'id';
					var alias = 'asdf';
					results_2 = fixtures.cache.message;

					populate(
						results_2,
						alias,
						leftOuterJoin({
							left: leftOuterJoin({
								left: fixtures.cache.message,
								right: fixtures.cache.message_to_user, 
								leftKey: 'id',
								rightKey: 'message_id'
							}),
							right: fixtures.cache.user, 
							leftKey: 'user_id',
							rightKey: 'id'
						}),
						pk
					);
				});
			});

			it('output should be an array', function () {
				results_2.should.be.Array;
			});

			it('output should match the expected results', function () {
				results_2.should.have.lengthOf(expected['results_2.length']);
				_.each(results_2, function (result) {
					_.each(expected.properties, function (property) {
						result.should.have.property(property);
					});
				});
			});
		});
	});


});
