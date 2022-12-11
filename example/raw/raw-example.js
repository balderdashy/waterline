#!/usr/bin/env node

/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var SailsDiskAdapter = require('sails-disk');
var Waterline = require('../../');


/**
 * `raw-example.js`
 *
 * This is an example demonstrating how to use Waterline
 * from a vanilla Node.js script.
 *
 *
 * To run this example, do:
 * ```
 * node example/raw/raw-example
 * ```
 */


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//
// NOTE: The `machine-as-script` package, like Sails, takes care of all this kind of
// stuff automatically, including bootstrapping the ORM in the context of a Sails app.
// (For deets, see https://npmjs.com/package/machine-as-script)
//
// But since we're doing this vanilla-style, we'll kick things off by calling a self-invoking
// function here.  This just lets us avoid repeating ourselves and gives us a level of control
// over logging.  See the two callbacks below in order to better understand how it works.
//
// > To read more general tips about managing flow and exposing customizable logic via
// > self-invoking functions in Node.js apps/scripts, check out:
// >   https://www.npmjs.com/package/parley#flow-control
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
(function (handleLog, done){

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


  }, function whenWaterlineIsReady (err, orm) {
    if (err) {
      return done(new Error('Could not start up Waterline ORM: '+err.stack));
    }//--•


    // Now kick off another self-invoking function.
    // (Once again, this is just to avoid repeating ourselves.)
    (function (proceed){

      handleLog();
      handleLog();
      handleLog('--');
      handleLog('Waterline ORM is started and ready.');

      // Get access to models:
      var Pet = Waterline.getModel('pet', orm);
      var User = Waterline.getModel('user', orm);

      handleLog();
      handleLog('(this is where you could write come code)');
      // ...for example, like this:

      handleLog(
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
        if (err) { return proceed(new Error('Failed to create new pets: '+err.stack)); }

        User.create({
          numChickens: pets.length,
          pets: _.pluck(pets, 'id')
        })
        .exec(function (err) {
          if (err) { return proceed(new Error('Failed to create new user: '+err.stack)); }

          User.stream()
          .populate('pets')
          .eachRecord(function eachRecord(user, next){
            handleLog('Streamed record:',util.inspect(user,{depth: null}));
            return next();
          })
          .exec(function afterwards(err) {
            if (err) { return proceed(new Error('Unexpected error occurred while streaming users:',err.stack)); }

            return proceed();

          });//</ User.stream().exec() >

        });//</ User.create().exec() >
      });//</ Pet.createEach().exec() >

    })(function (err){
      if (err) {
        Waterline.stop(orm, function(secondaryErr) {
          if (secondaryErr) {
            handleLog();
            handleLog('An error occurred, and then, when trying to shut down the ORM gracefully, THAT failed too!');
            handleLog('More on the original error in just a while.');
            handleLog('But first, here\'s the secondary error that was encountered while trying to shut down the ORM:\n', secondaryErr);
            handleLog('... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ');
            return done(err);
          }//-•

          return done(err);

        });//_∏_
        return;
      }//-•

      // IWMIH, everything went well.
      handleLog();
      handleLog('Done.  (Stopping ORM...)');
      handleLog('... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ');
      Waterline.stop(orm, function(secondaryErr) {
        if (secondaryErr) {
          return done(new Error('Everything else went fine, but then when attempting to shut down the ORM gracefully, something went wrong!  Details:'+secondaryErr.stack));
        }
        return done();
      });

    });//</ inner self-invoking function>

  });//</ Waterline.start() >

})(
  function handleLog(){ console.log.apply(console, Array.prototype.slice.call(arguments)); },
  function whenFinishedAndORMHasBeenStopped(err){
    if (err) {
      console.log();
      console.log(err.stack);
      console.log();
      console.log(' ✘      Something went wrong.');
      console.log('       (see stack trace above)');
      console.log();
      return process.exit(1);
    }//-•

    console.log();
    console.log(' ✔      OK.');
    console.log();
    return process.exit(0);
  }
);//</ outer self-invoking function>
