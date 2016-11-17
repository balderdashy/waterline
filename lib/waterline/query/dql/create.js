/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../deferred');
var forgeStageTwoQuery = require('../../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../../utils/query/forge-stage-three-query');
var processValues = require('../../utils/process-values');
var callbacks = require('../../utils/callbacksRunner');
// var nestedOperations = require('../../utils/nestedOperations');


/**
 * Create a new record
 *
 * @param {Object || Array} values for single model or array of multiple values
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(values, cb, metaContainer) {

  var self = this;

  // Handle Deferred where it passes criteria first
  if(_.isPlainObject(arguments[0]) && (_.isPlainObject(arguments[1]) || _.isArray(arguments[1]))) {
    values = arguments[1];
    cb = arguments[2];
    metaContainer = arguments[3];
  }

  // Remove all undefined values
  if (_.isArray(values)) {
    values = _.remove(values, undefined);
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.create, {
      method: 'create',
      criteria: {},
      values: values
    });
  }


  // Handle Array of values
  if (Array.isArray(values)) {
    return this.createEach(values, cb, metaContainer);
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'create',
    using: this.identity,
    newRecord: values,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_NEW_RECORDS':
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid new record(s).\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }

  // Process Values
  try {
    query.newRecord = processValues(query.newRecord, this);
  } catch (e) {
    return cb(e);
  }

  // Run beforeCreate lifecycle callbacks
  beforeCallbacks.call(self, query.newRecord, function(err) {
    if (err) {
      return cb(err);
    }

    // Create the record
    try {
      createValues.call(self, query, cb, metaContainer);
    } catch (e) {
      return cb(e);
    }
  });
};


/**
 * Run Before* Lifecycle Callbacks
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function beforeCallbacks(values, cb) {
  var self = this;

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(done) {
      callbacks.validate(self, values, false, done);
    },

    // Before Create Lifecycle Callback
    function(done) {
      callbacks.beforeCreate(self, values, done);
    }

  ], cb);
}

/**
 * Create Parent Record and any associated values
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function createValues(query, cb, metaContainer) {
  var self = this;

  // Generate the timestamps so that both createdAt and updatedAt have the
  // same initial value.
  var numDate = Date.now();
  var strDate = new Date();


  //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
  //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
  //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
  _.each(self.attributes, function(val, name) {
    if (_.has(val, 'autoCreatedAt') && val.autoCreatedAt) {
      var attributeVal;

      // Check the type to determine which type of value to generate
      if (val.type === 'number') {
        attributeVal = numDate;
      } else {
        attributeVal = strDate;
      }

      if (!query.newRecord[name]) {
        query.newRecord[name] = attributeVal;
      }
    }
  });


  //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
  //  ║ ║╠═╝ ║║╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
  //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
  _.each(self.attributes, function(val, name) {
    if (_.has(val, 'autoUpdatedAt') && val.autoUpdatedAt) {
      var attributeVal;

      // Check the type to determine which type of value to generate
      if (val.type === 'number') {
        attributeVal = numDate;
      } else {
        attributeVal = strDate;
      }

      if (!query.newRecord[name]) {
        query.newRecord[name] = attributeVal;
      }
    }
  });


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  var stageThreeQuery;
  try {
    stageThreeQuery = forgeStageThreeQuery({
      stageTwoQuery: query,
      identity: this.identity,
      transformer: this._transformer,
      originalModels: this.waterline.collections
    });
  } catch (e) {
    return cb(e);
  }


  //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
  //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
  //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─
  self.adapter.create(stageThreeQuery.newRecord, function(err, values) {
    if (err) {
      // Attach the name of the model that was used
      err.model = self.globalId;

      return cb(err);
    }

    // Attempt to un-serialize the values
    try {
      values = self._transformer.unserialize(values);
    } catch (e) {
      return cb(e);
    }

    // Run the after cb
    return after(values);

    // If no associations were used, run after
    // if (valuesObject.associations.collections.length === 0) {
    //   return after(values);
    // }
    //
    // var parentModel = new self._model(values);
    // nestedOperations.create.call(self, parentModel, valuesObject.originalValues, valuesObject.associations.collections, function(err) {
    //   if (err) {
    //     return cb(err);
    //   }
    //
    //   return after(parentModel.toObject());
    // });


    function after(values) {

      // Run After Create Callbacks
      callbacks.afterCreate(self, values, function(err) {
        if (err) {
          return cb(err);
        }

        // Return an instance of Model
        var model = new self._model(values);
        cb(undefined, model);
      });
    }

  }, metaContainer);
}
