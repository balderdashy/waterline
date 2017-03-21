#!/usr/bin/env node

/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var SailsDiskAdapter = require('sails-disk');
var Waterline = require('../../');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// `raw-example.js`
//
// This is an example demonstrating how to use Waterline
// from a vanilla Node.js script.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


// Set up Waterline.
Waterline.start({


  adapters: {

    'sails-disk': SailsDiskAdapter,
    // ...other Waterline-compatible adapters (e.g. 'sails-mysql') might go here

  },


  datastores: {

    default: {
      adapter: 'sails-disk'
    }

  },


  models: {

    user: {
      datastore: 'default',

      attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true } },
        numChickens: { type: 'number' },
        pets: { collection: 'pet' }
      },
      primaryKey: 'id',
      schema: true
    },

    pet: {
      datastore: 'default',

      attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true } },
        name: { type: 'string' }
      },
      primaryKey: 'id',
      schema: true
    }

  }


}, function waterlineReady (err, orm) {
  if (err) {
    console.error('Could not start up Waterline ORM:',err.stack);
    return process.exit(1);
  }//--•

  console.log();
  console.log();
  console.log('--');
  console.log('Waterline ORM is started and ready.');
  console.log('Press CTRL+C to terminate process.');

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // NOTE: Sails takes care of all this kind of stuff automatically, but if you're using
  // vanilla express, it would be a good idea to bind SIGINT/SIGTERM listeners here and have
  // them shut down the ORM if fired.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Get access to models:
  var Pet = Waterline.getModel('pet', orm);
  var User = Waterline.getModel('user', orm);

  console.log();
  console.log('(this is where you could write come code)');
  // ...for example, like this:


  console.log(
    '\n'+
    '\n'+
    '==========================================================================\n'+
    '• EXAMPLE: Calling some model methods:                                   •\n'+
    '==========================================================================\n'
  );


  var PET_NAMES = ['Carrie', 'Samantha', 'Charlotte', 'Miranda', 'Mr. Big'];
  Pet.createEach([
    { name: _.random(PET_NAMES) },
    { name: _.random(PET_NAMES) }
  ])
  .meta({fetch: true})
  .exec(function (err, pets) {
    if (err) {
      console.log('Failed to create pets:', err.stack);
      return process.exit(1);
    }

    User.create({
      numChickens: 2,
      pets: _.pluck(pets, 'id')
    }).exec(function (err) {
      if (err) {
        console.log('Failed to create records:',err.stack);
        return process.exit(1);
      }

      User.stream(

        // Criteria
        {
          select: ['*'],
          where: {},
          limit: 10,
          // limit: (Number.MAX_SAFE_INTEGER||9007199254740991),
          skip: 0,
          sort: 'id asc',
          // sort: {},
          // sort: [
          //   { name: 'ASC' }
          // ]
        },

        // Iteratee
        function eachRecord(user, next){
          console.log('Record:',util.inspect(user,{depth: null}));
          return next();
        },

        // Explicit cb
        function afterwards (err){
          if (err) {
            console.error('Unexpected error occurred while streaming users:',err.stack);
            return process.exit(1);
          }//--•

          console.log();
          console.log();
          console.log('--');
          console.log('Done.  (Stopping ORM...)');
          Waterline.stop(orm, function(err) {
            if (err) {
              console.error('Failed to shut down ORM gracefully!  Details:',err);
              return process.exit(1);
            }

            return process.exit(0);

          });

        },

        // Meta
        undefined,

        // More query keys:
        {
          populates: {

            pets: {
              select: ['*'],
              where: {},
              limit: 100000,
              skip: 0,
              sort: 'id asc',
            }

          }
        }

      );//</ User.stream().exec() >

    });//</ User.create().exec() >
  });//</ Pet.createEach().exec() >

});

