#!/usr/bin/env node


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// `another-raw-example.js`
//
// This is ANOTHER example demonstrating how to use Waterline
// from a vanilla Node.js script.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


// Import dependencies
var util = require('util');
var _ = require('lodash');
var setupWaterline = require('./bootstrap');
var SailsDiskAdapter = require('sails-disk');


// Set up Waterline.
setupWaterline({


  adapters: {

    'sails-disk': SailsDiskAdapter

  },


  datastores: {

    myDb: {
      adapter: 'sails-disk'
    }

  },


  models: {

    user: {
      connection: 'myDb',//<< the datastore this model should use
      attributes: {
        numChickens: { type: 'integer' },
        pets: { collection: 'pet' }
      }
    },

    pet: {
      connection: 'myDb',//<< the datastore this model should use
      attributes: {
        name: { type: 'string' }
      }
    }

  }


}, function waterlineReady (err, ontology) {
  if (err) {
    console.error('Could not set up Waterline: '+err.stack);
    return;
  }//--•



  // // Our model definitions
  // console.log(
  //   '\n'+
  //   '\n'+
  //   '==========================================================================\n'+
  //   '• Model definitions:                                                     •\n'+
  //   '==========================================================================\n',
  //   ontology.models
  // );
  // //
  // // e.g.
  // // models.user.find().exec(...)
  // // models.user.find().exec(...)


  // // Our datastore definitions
  // console.log(
  //   '\n'+
  //   '\n'+
  //   '==========================================================================\n'+
  //   '• Datastore definitions:                                                 •\n'+
  //   '==========================================================================\n',
  //   ontology.datastores
  // );
  // //
  // // e.g.
  // // datastores.myDb.config;


  console.log();
  console.log();
  console.log('--');
  console.log('Waterline is ready.');
  console.log('(this is where you could write come code)');



  // Now more example stuff.
  console.log(
    '\n'+
    '\n'+
    '==========================================================================\n'+
    '• EXAMPLE: Calling some model methods:                                   •\n'+
    '==========================================================================\n'
  );

  var Pet = ontology.models.pet;
  var User = ontology.models.user;

  // User.addToCollection([], 'chickens', [], function (err){
  //   if (err) {
  //     console.error(err.stack);
  //     return;
  //   }//--•

  //   console.log('k');

  // });


  // User.removeFromCollection([], 'chickens', [], function (err){
  //   if (err) {
  //     console.error(err.stack);
  //     return;
  //   }//--•

  //   console.log('k');

  // });

  // User.replaceCollection([], 'chickens', [], function (err){
  //   if (err) {
  //     console.error(err.stack);
  //     return;
  //   }//--•

  //   console.log('k');

  // });


  // User.sum('pets', {}, function (err, sum){
  //   if (err) {
  //     console.error('Uhoh:',err.stack);
  //     return;
  //   }//--•

  //   console.log('got '+sum);

  // });


  // User.stream({}, function eachRecord(user, next){

  //   console.log('Record:',user);
  //   return next();

  // }, function (err){
  //   if (err) {
  //     console.error('Uhoh:',err.stack);
  //     return;
  //   }//--•

  //   console.log('k');

  // });//</ User.stream() >

  Pet.createEach([
    { name: 'Rover' },
    { name: 'Samantha' }
  ]).exec(function (err, pets) {
    if (err) {
      console.log('Failed to create pets:', err);
      return;
    }

    User.create({
      numChickens: 74,
      pets: _.pluck(pets, 'id')
    }).exec(function (err) {
      if (err) {
        console.log('Failed to create records:',err);
        return;
      }

      User.find({
        // select: ['*'],
        where: {},
        limit: 10,
        // limit: Number.MAX_SAFE_INTEGER,
        skip: 0,
        sort: 'id asc',
        // sort: {},
        // sort: [
        //   { name: 'ASC' }
        // ]
      })
      .populate('pets')
      .exec(function (err, records) {
        if (err) {
          console.log('Failed to find records:',err);
          return;
        }

        console.log('found:',records);

      });

      // User.stream({
      //   select: ['*'],
      //   where: {},
      //   limit: 10,
      //   // limit: Number.MAX_SAFE_INTEGER,
      //   skip: 0,
      //   sort: 'id asc',
      //   // sort: {},
      //   // sort: [
      //   //   { name: 'ASC' }
      //   // ]
      // }, function eachRecord(user, next){

      //   console.log('Record:',util.inspect(user,{depth: null}));
      //   return next();

      // }, {
      //   populates: {

      //     pets: {
      //       select: ['*'],
      //       where: {},
      //       limit: 100000,
      //       skip: 0,
      //       sort: 'id asc',
      //     }

      //   }
      // }, function (err){
      //   if (err) {
      //     console.error('Uhoh:',err.stack);
      //     return;
      //   }//--•

      //   console.log('k');

      // });//</ User.stream().exec() >

    });//</ User.create().exec() >
  });//</ Pet.createEach().exec() >




});

