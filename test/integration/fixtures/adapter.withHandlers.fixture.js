/**
 * Module dependencies
 */
var _ = require('lodash');




// Keeps track of registered collections
var _colls = {};


/**
 * Test Adapter Which Uses Handlers
 */
module.exports = {

  // Waterline Vocabulary Methods
  //
  // (supports automatic switching for handlers since we know the fn signature)
  //
  // The tests work by passing a `_simulate` option as a property to the first argument,
  // which might be `options` or `values`.  If `options`, it's a criteria, so we have to
  // check the `where` since it's being automatically normalized in Waterline core.
  find: function (conn, cid, options, cb) {
    // console.log('IN FIND::', require('util').inspect(arguments));
    return _interpretUsageTest(options.where && options.where._simulate, cb);
  },
  create: function (conn, cid, values, cb) {
    return _interpretUsageTest(values._simulate, cb);
  },
  update: function (conn, cid, options, values, cb) {
    return _interpretUsageTest(options.where && options.where._simulate, cb);
  },
  destroy: function (conn, cid, options, cb) {
    return _interpretUsageTest(options.where && options.where._simulate, cb);
  },


  // DDL Methods
  // 
  describe: function (conn, cid, cb) {
    cb(null, _colls[cid]);
  },

  define: function (conn, cid, definition, cb) {
    _colls[cid] = definition;
    cb();
  },

  addAttribute: function (conn, cid, attrName, attrDef, cb) {
    try {
      _colls[cid].definition[attrName] = attrDef;
    }
    catch (e) { return cb(e); }
    
    cb();
  },

  removeAttribute: function (conn, cid, attrName, cb) {
    try {
      delete _colls[cid].definition[attrName];
    }
    catch (e) { return cb(e); }

    cb();
  },

  drop: function (conn, cid, relations, cb) {
    try {
      delete _colls[cid];
    }
    catch (e) { return cb(e); }

    cb();
  },


  // Lifecycle
  //
  registerConnection: function (con, collections, cb) {
    _.extend(_colls, collections);
    cb();
  },



  // Custom Methods
  //
  // (automatic switching is not enabled since we don't know the fn signature)
  traditionalError: function(conn, cid, options, cb) {
    return cb(new Error('oops'));
  },

  traditionalSuccess: function(conn, cid, options, cb) {
    return cb(null, [{ someResults: [] }]);
  },


  // Future:
  // convention of (options, cb) would allow us to further normalize usage
  // Right now, the commented-out ones wouldn't work out of the box.

  // error: function(cid, options, cb) {
  //   return cb.error(new Error('oops'));
  // },

  // anonError: function(cid, options, cb) {
  //   return cb.error();
  // },

  // invalid: function(cid, options, cb) {
  //   return cb.invalid(new Error('oops'));
  // },

  // anonInvalid: function(cid, options, cb) {
  //   return cb.error();
  // },

  // success: function(cid, options, cb) {
  //   return cb.success([{ someResults: [] }]);
  // },

  // anonSuccess: function(cid, options, cb) {
  //   return cb.error();
  // }


};




/**
 * @param  {String}   usageCode
 * @param  {Function || Object} cb
 */
function _interpretUsageTest(usageCode, cb) {
  switch (usageCode) {
    case 'traditionalError': return cb(new Error('oops'));
    case 'traditionalSuccess': return cb(null, [{ someResults: [] }]);

    case 'error': return cb.error(new Error('oops'));
    case 'anonError': return cb.error();

    case 'invalid': return cb.invalid(new Error('oops'));
    case 'anonInvalid': return cb.invalid();

    case 'success': return cb.success([{ someResults: [] }]);
    case 'anonSuccess': return cb.success();

    default: return cb(null, [{ someResults: [] }]);
  }
}
