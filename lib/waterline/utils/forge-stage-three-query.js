//  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗    ███████╗████████╗ █████╗  ██████╗ ███████╗
//  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
//  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗      ███████╗   ██║   ███████║██║  ███╗█████╗
//  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝      ╚════██║   ██║   ██╔══██║██║   ██║██╔══╝
//  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗    ███████║   ██║   ██║  ██║╚██████╔╝███████╗
//  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
//
//  ████████╗██╗  ██╗██████╗ ███████╗███████╗     ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔════╝    ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//     ██║   ███████║██████╔╝█████╗  █████╗      ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//     ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══╝      ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//     ██║   ██║  ██║██║  ██║███████╗███████╗    ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝     ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//

var util = require('util');
var _ = require('lodash');

module.exports = function forgeStageThreeQuery(options) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
  if (!_.has(options, 'stageTwoQuery') || !_.isPlainObject(options.stageTwoQuery)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `stageTwoQuery` option.');
  }

  if (!_.has(options, 'identity') || !_.isString(options.identity)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `identity` option.');
  }

  if (!_.has(options, 'schema') || !_.isPlainObject(options.schema)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `schema` option.');
  }

  if (!_.has(options, 'transformer') || !_.isObject(options.transformer)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `transformer` option.');
  }

  if (!_.has(options, 'originalModels') || !_.isPlainObject(options.originalModels)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `originalModels` option.');
  }


  // Store the options to prevent typing so much
  var stageTwoQuery = options.stageTwoQuery;
  var identity = options.identity;
  var transformer = options.transformer;
  var schema = options.schema;
  var originalModels = options.originalModels;


  //  ╔═╗╦╔╗╔╔╦╗  ┌┬┐┌─┐┌┬┐┌─┐┬
  //  ╠╣ ║║║║ ║║  ││││ │ ││├┤ │
  //  ╚  ╩╝╚╝═╩╝  ┴ ┴└─┘─┴┘└─┘┴─┘
  // Grab the current model definition from the schema. It will be used in all
  // sorts of ways.
  var model;
  try {
    model = schema[identity];
  } catch (e) {
    throw new Error('A model with the identity ' + identity + ' could not be found in the schema. Perhaps the wrong schema was used?');
  }


  //  ╔═╗╦╔╗╔╔╦╗  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
  //  ╠╣ ║║║║ ║║  ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
  //  ╚  ╩╝╚╝═╩╝  ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
  // Get the current model's primary key attribute
  var modelPrimaryKey;
  _.each(model.attributes, function(val, key) {
    if (_.has(val, 'primaryKey')) {
      modelPrimaryKey = val.columnName || key;
    }
  });


  //  ╔╗ ╦ ╦╦╦  ╔╦╗   ┬┌─┐┬┌┐┌  ┬┌┐┌┌─┐┌┬┐┬─┐┬ ┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╩╗║ ║║║   ║║   ││ │││││  ││││└─┐ │ ├┬┘│ ││   │ ││ ││││└─┐
  //  ╚═╝╚═╝╩╩═╝═╩╝  └┘└─┘┴┘└┘  ┴┘└┘└─┘ ┴ ┴└─└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
  // Build the JOIN logic for the population
  var joins = [];
  _.each(stageTwoQuery.populates, function(populateCriteria, populateAttribute) {
    try {
      // Find the normalized schema value for the populated attribute
      var attribute = model.attributes[populateAttribute];
      if (!attribute) {
        throw new Error('In ' + util.format('`.populate("%s")`', populateAttribute) + ', attempting to populate an attribute that doesn\'t exist');
      }

      // Grab the key being populated from the original model definition to check
      // if it is a has many or belongs to. If it's a belongs_to the adapter needs
      // to know that it should replace the foreign key with the associated value.
      var parentKey = originalModels[identity].attributes[populateAttribute];

      // Build the initial join object that will link this collection to either another collection
      // or to a junction table.
      var join = {
        parent: identity,
        parentKey: attribute.columnName || modelPrimaryKey,
        child: attribute.references,
        childKey: attribute.on,
        alias: populateAttribute,
        removeParentKey: !!parentKey.model,
        model: !!_.has(parentKey, 'model'),
        collection: !!_.has(parentKey, 'collection')
      };

      // Build select object to use in the integrator
      var select = [];
      var customSelect = populateCriteria.select && _.isArray(populateCriteria.select);
      _.each(schema[attribute.references].attributes, function(val, key) {
        // Ignore virtual attributes
        if(_.has(val, 'collection')) {
          return;
        }

        // Check if the user has defined a custom select
        if(customSelect && !_.includes(populateCriteria.select, key)) {
          return;
        }

        // Add the key to the select
        select.push(key);
      });

      // Ensure the primary key and foreign key on the child are always selected.
      // otherwise things like the integrator won't work correctly
      var childPk;
      _.each(schema[attribute.references].attributes, function(val, key) {
        if(_.has(val, 'primaryKey') && val.primaryKey) {
          childPk = key;
        }
      });

      select.push(childPk);

      // Add the foreign key for collections so records can be turned into nested
      // objects.
      if (join.collection) {
        select.push(attribute.on);
      }

      // Make sure the join's select is unique
      join.select = _.uniq(select);
      // Apply any omits to the selected attributes
      if (populateCriteria.omit.length) {
        _.each(populateCriteria.omit, function(omitValue) {
          _.pull(join.select, omitValue);
        });
      }

      // Find the schema of the model the attribute references
      var referencedSchema = schema[attribute.references];
      var reference = null;

      // If linking to a junction table, the attributes shouldn't be included in the return value
      if (referencedSchema.junctionTable) {
        join.select = false;
        reference = _.find(referencedSchema.attributes, function(referencedAttribute) {
          return referencedAttribute.references && referencedAttribute.columnName !== attribute.on;
        });
      }
      // If it's a through table, treat it the same way as a junction table for now
      else if (referencedSchema.throughTable && referencedSchema.throughTable[identity + '.' + populateAttribute]) {
        join.select = false;
        reference = referencedSchema.attributes[referencedSchema.throughTable[identity + '.' + populateAttribute]];
      }

      // Add the first join
      joins.push(join);

      // If a junction table is used, add an additional join to get the data
      if (reference && _.has(attribute, 'on')) {
        var selects = [];
        _.each(schema[reference.references].attributes, function(val, key) {
          // Ignore virtual attributes
          if(_.has(val, 'collection')) {
            return;
          }

          // Check if the user has defined a custom select and if so normalize it
          if(customSelect && !_.includes(populateCriteria.select, key)) {
            return;
          }

          // Add the value to the select
          selects.push(key);
        });

        // Apply any omits to the selected attributes
        if (populateCriteria.omit.length) {
          _.each(populateCriteria.omit, function(omitValue) {
            _.pull(selects, omitValue);
          });
        }

        // Ensure the primary key and foreign are always selected. Otherwise things like the
        // integrator won't work correctly
        _.each(schema[reference.references].attributes, function(val, key) {
          if(_.has(val, 'primaryKey') && val.primaryKey) {
            childPk = val.columnName || key;
          }
        });

        selects.push(childPk);

        join = {
          parent: attribute.references,
          parentKey: reference.columnName,
          child: reference.references,
          childKey: reference.on,
          select: _.uniq(selects),
          alias: populateAttribute,
          junctionTable: true,
          removeParentKey: !!parentKey.model,
          model: false,
          collection: true
        };

        joins.push(join);
      }

      // Append the criteria to the correct join if available
      if (populateCriteria && joins.length > 1) {
        joins[1].criteria = populateCriteria;
      } else if (populateCriteria) {
        joins[0].criteria = populateCriteria;
      }

      // Remove the select from the criteria. It will need to be used outside the
      // join's criteria.
      delete populateCriteria.select;

      // Set the criteria joins
      stageTwoQuery.joins = stageTwoQuery.joins || [];
      stageTwoQuery.joins = stageTwoQuery.joins.concat(joins);
    } catch (e) {
      throw new Error(
        'Encountered unexpected error while building join instructions for ' +
        util.format('`.populate("%s")`', populateAttribute) +
        '\nDetails:\n' +
        util.inspect(e, false, null)
      );
    }
  }); // </ .each loop >


  // Replace populates on the stageTwoQuery with joins
  delete stageTwoQuery.populates;


  //  ╔═╗╔═╗╔╦╗╦ ╦╔═╗  ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚═╗║╣  ║ ║ ║╠═╝  ├─┘├┬┘│ │ │├┤ │   │ ││ ││││└─┐
  //  ╚═╝╚═╝ ╩ ╚═╝╩    ┴  ┴└─└─┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘

  // If a select clause is being used, ensure that the primary key of the model
  // is included. The primary key is always required in Waterline for further
  // processing needs.
  if (_.indexOf(stageTwoQuery.criteria.select, '*') < 0) {
    _.each(model.attributes, function(val, key) {
      if (_.has(val, 'primaryKey') && val.primaryKey) {
        stageTwoQuery.criteria.select.push(key);
      }
    });

    // Just an additional check after modifying the select to ensure it only
    // contains unique values
    stageTwoQuery.criteria.select = _.uniq(stageTwoQuery.criteria.select);
  }

  // If no criteria is selected, expand out the SELECT statement for adapters. This
  // makes it much easier to work with and to dynamically modify the select statement
  // to alias values as needed when working with populates.
  if (_.indexOf(stageTwoQuery.criteria.select, '*') > -1) {
    var selectedKeys = [];
    _.each(model.attributes, function(val, key) {
      if (!_.has(val, 'collection')) {
        selectedKeys.push(key);
      }
    });

    stageTwoQuery.criteria.select = selectedKeys;
  }


  // Apply any omits to the selected attributes
  if (stageTwoQuery.criteria.omit.length) {
    _.each(stageTwoQuery.criteria.omit, function(omitValue) {
      _.pull(stageTwoQuery.criteria.select, omitValue);
    });
  }

  // Transform Search Criteria and expand keys to use correct columnName values
  stageTwoQuery.criteria = transformer.serialize(stageTwoQuery.criteria);

  // Transform any populate where clauses to use the correct columnName values
  _.each(stageTwoQuery.joins, function(join) {
    var joinCollection = originalModels[join.child];

    // Move the select onto the criteria for normalization
    join.criteria.select = join.select;
    join.criteria = joinCollection._transformer.serialize(join.criteria);

    // Move the select back off the join criteria for compatibility
    join.select = join.criteria.select;
    delete join.criteria.select;
  });

  return stageTwoQuery;
};
