#!/usr/bin/env node


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// `another-raw-example.js`
//
// This is ANOTHER example demonstrating how to use Waterline
// from a vanilla Node.js script.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


// Import dependencies
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
        pets: { collection: 'Pet' }
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

  var User = ontology.models.user;

  User.addToCollection([], 'pets', [], function (err){
    if (err) {
      console.error(err);
      return;
    }//--•

    console.log('k');
  });//</ User.addToCollection() >


});

