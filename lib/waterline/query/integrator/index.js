/**
 * Module dependencies
 */
var SubqueryCache = require('./SubqueryCache');




/**
 * Query Integrator
 *
 * Combines the results from multiple child queries into
 * the final return format using an in-memory join.
 * Final step in fulfilling a `.find()` with one or more
 * `populate(alias[n])` modifiers.
 * 
 */
module.exports = function integrate () {
	
	// Join instructions
	var joins = 


	var cache = new SubqueryCache();
	// TODO:
	// Populate the cache w/ real data
	// For now, use dummy data for a many-to-many association
	cache.to = {
		user: [],
		message: [],
		message_user: []
	};
	cache.cc = {
		user: [],
		message: [],
		message_user: []
	};
	cache.from = {
		user: [theSender],
		message: [],
		message_user: []
	};



	var operationTree = {};

};

