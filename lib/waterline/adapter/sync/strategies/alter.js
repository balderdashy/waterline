/**
 * Module dependencies
 */

var _ = require('lodash');
var async = require('async');
var getRelations = require('../../../utils/getRelations');


/**
 * Try and synchronize the underlying physical-layer schema
 * to work with our app's collections. (i.e. models)
 *
 * @param  {Function} cb
 */
module.exports = function(cb) {
  var self = this;

  // Refuse to run this migration strategy in production.
  if (process.env.NODE_ENV === 'production') {
    return cb(new Error('`migrate: "alter"` strategy is not supported in production, please change to `migrate: "safe"`.'));
  }

  // Find any junctionTables that reference this collection
  var relations = getRelations({
    schema: self.query.waterline.schema,
    parentCollection: self.collection
  });

  var backupData;

  // Check that collection exists--
  self.describe(function afterDescribe(err, attrs) {

    if (err) return cb(err);

    // if it doesn't go ahead and add it and get out
    if (!attrs) return self.define(cb);

    var collectionName = _.find(self.query.waterline.schema, {tableName: self.collection}).identity;

    // Create a mapping of column names -> attribute names
    var columnNamesMap = _.reduce(self.query.waterline.schema[collectionName].attributes, function(memo, val, key) {
      // If the attribute has a custom column name, use it as the key for the mapping
      if (val.columnName) {
        memo[val.columnName] = key;
      // Otherwise just use the attribute name
      } else {
        memo[key] = key;
      }
      return memo;
    }, {});

    // Transform column names into attribute names using the columnNamesMap,
    // removing attributes that no longer exist (they will be dropped)
    attrs = _.compact(_.keys(attrs).map(function(key) {
      return columnNamesMap[key];
    }));

    //
    // TODO:
    // Take a look and see if anything important has changed.
    // If it has (at all), we still have to follow the naive strategy below,
    // but it will at least save time in the general case.
    // (because it really sucks to have to wait for all of this to happen
    //  every time you initialize Waterline.)
    //


    //
    // OK so we have to fix up the schema and migrate the data...
    //
    // ... we'll let Waterline do it for us.
    //
    // Load all data from this collection into memory.
    // If this doesn't work, crash to avoid corrupting any data.
    // (see `waterline/lib/adapter/ddl/README.md` for more info about this)
    //
    // Make sure we only select the existing keys for the schema.
    // The default "find all" will select each attribute in the schema, which
    // now includes attributes that haven't been added to the table yet, so
    // on SQL databases the query will fail with "unknown field" error.
    //
    var hasSchema = self.query.hasSchema;

    // If we have a schema, make sure we only select the existing keys for the schema.
    // The default "find all" will select each attribute in the schema, which
    // now includes attributes that haven't been added to the table yet, so
    // on SQL databases the query will fail with "unknown field" error.
    //
    // If we don't have a schema then we need to select all the values to make
    // sure we don't lose data in the process.
    var queryCriteria;

    if (hasSchema) {
      queryCriteria = {select: attrs};
    } else {
      queryCriteria = {};
    }

    self.query.find(queryCriteria, function(err, existingData) {

      if (err) {
        //
        // TODO:
        // If this was a memory error, log a more useful error
        // explaining what happened.
        //
        return cb(err);
      }

      //
      // From this point forward, we must be very careful.
      //
      backupData = _.cloneDeep(existingData, function dealWithBuffers(val) {
        if (val instanceof Buffer) {
          return val.slice();
        }
      });


      // Check to see if there is anything obviously troublesome
      // that will cause the drop and redefinition of our schemaful
      // collections to fail.
      // (i.e. violation of uniqueness constraints)
      var attrs = self.query.waterline.collections[self.identity]._attributes;
      var pk = self.query.waterline.collections[self.identity].primaryKey;
      var attrsAsArray = _.reduce(_.cloneDeep(attrs), function(memo, attrDef, attrName) {
        attrDef.name = attrName;
        memo.push(attrDef);
        return memo;
      }, []);
      var uniqueAttrs = _.where(attrsAsArray, {unique: true});
      async.each(uniqueAttrs, function(uniqueAttr, each_cb) {
        var uniqueData = _.uniq(_.pluck(existingData, uniqueAttr.name));

        // Remove any unique values who have their values set to undefined or null
        var cleansedExistingData = _.filter(existingData, function(val) {
          return [undefined, null].indexOf(val[uniqueAttr.name]) < 0;
        });

        // Remove any undefined or null values from the unique data
        var cleansedUniqueData = _.filter(uniqueData, function(val) {
          return [undefined, null].indexOf(val) < 0;
        });

        if (cleansedUniqueData.length < cleansedExistingData.length) {
          // Some existing data violates a new uniqueness constraint
          var prompt = require('prompt');
          prompt.start();
          console.log(
            'One or more existing records in your database violate ' +
            'a new uniqueness constraint\n' +
            'on `' + uniqueAttr.name + '` ' +
            'in your `' + self.identity + '` model.');
          console.log();
          console.log('Should we automatically remove duplicates?');
          console.log();
          console.log('** WARNING: DO NOT TYPE "y" IF YOU ARE WORKING WITH PRODUCTION DATA **');
          // var laptimer = setInterval(function beepbeepbeepbeep(){
          //   process.stdout.write('\u0007');
          // }, 1500);
          prompt.get(['y/n'], function(err, results) {
            // clearInterval(laptimer);
            if (err) return each_cb(err);
            var wasConfirmedByUser = _.isString(results['y/n']) && results['y/n'].match(/y/);
            if (wasConfirmedByUser) {

              // Wipe out duplicate records in `backupData` and continue
              // to perform the automigration
              var diff = _.difference(existingData, _.uniq(existingData, false, uniqueAttr.name));

              var destroyCriteria = {};
              destroyCriteria[pk] = _.pluck(diff, pk);
              // console.log(diff, '\n', destroyCriteria);
              backupData = _.remove(backupData, function(datum) {
                return !_.contains(destroyCriteria[pk], datum[pk]);
              });
              return each_cb();
              // console.log(backupData);
              // throw new Error();
              // self.query.waterline.collections[self.collection].destroy(destroyCriteria).exec(each_cb);
            } else return each_cb(new Error('Auto-migration aborted. Please migrate your data manually and then try this again.'));
          });
        } else return each_cb();
      }, function afterAsyncEach(err) {
        if (err) return cb(err);

        // Now we'll drop the collection.
        self.drop(relations, function(err) {
          if (err) return uhoh(err, backupData, cb);

          // Now we'll redefine the collection.
          self.define(function(err) {
            if (err) return uhoh(err, backupData, cb);

            // Now we'll create the `backupData` again,
            // being careful not to run any lifecycle callbacks
            // and disable automatic updating of `createdAt` and
            // `updatedAt` attributes:
            //
            // ((((TODO: actually be careful about said things))))
            //
            self.query.createEach(backupData, function(err) {
              if (err) return uhoh(err, backupData, cb);

              // Done.
              return cb();
            });

          }); // </define>
        }); // </drop>
      }); // </find>
    });


    //
    // The old way-- (doesn't always work, and is way more
    // complex than we should spend time on for now)
    //
    //   ||      ||      ||      ||      ||      ||
    //   \/      \/      \/      \/      \/      \/
    //
    // Otherwise, if it *DOES* exist, we'll try and guess what changes need to be made
    // self.alter(function(err) {
    //   if (err) return cb(err);
    //   cb();
    // });

  });
};


/**
 * uh oh.
 *
 * If we can't persist the data again, we'll log an error message, then
 * stream the data to stdout as JSON to make sure that it gets persisted
 * SOMEWHERE at least.
 *
 * (this is another reason this automigration strategy cannot be used in
 * production currently..)
 *
 * @param  {[type]}   err        [description]
 * @param  {[type]}   backupData [description]
 * @param  {Function} cb         [description]
 * @return {[type]}              [description]
 */

function uhoh(err, backupData, cb) {

  console.error('Waterline encountered a fatal error when trying to perform the `alter` auto-migration strategy.');
  console.error('In a couple of seconds, the data (cached in memory) will be logged to stdout.');
  console.error('(a failsafe put in place to preserve development data)');
  console.error();
  console.error('In the mean time, here\'s the error:');
  console.error();
  console.error(err);
  console.error();
  console.error();

  setTimeout(function() {
    console.error('================================');
    console.error('Data backup:');
    console.error('================================');
    console.error('');
    console.log(backupData);
    return cb(err);
  }, 1200);

}
