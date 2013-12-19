/**
 * Module dependencies
 */
var SubqueryCache = require('./SubqueryCache');



/**
 * Query Integrator
 *
 * Final step in fulfilling a `populate(alias)`.
 * Combine the results from multiple descendant queries into
 * the final return format using an in-memory join.
 *
 * 
 */


// TODO:
// Populate the cache w/ real data
// For now, use dummy data for a many-to-many association



var cache = new SubqueryCache();

this.to = {
	user: [],
	message: [],
	message_user: []
};
this.cc = {
	user: [],
	message: [],
	message_user: []
};
this.from = {
	user: [theSender],
	message: [],
	message_user: []
};



var operationTree = {};
