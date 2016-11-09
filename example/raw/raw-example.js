#!/usr/bin/env node


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// `raw-example.js`
//
// This is an example demonstrating how to use Waterline
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
      attributes: {}
    }

  }


}, function waterlineReady (err, ontology) {
  if (err) {
    console.error('Could not set up Waterline: '+err.stack);
    return;
  }//--•



  // Our model definitions
  console.log(
    '\n'+
    '\n'+
    '==========================================================================\n'+
    '• Model definitions:                                                     •\n'+
    '==========================================================================\n',
    ontology.models
  );
  //
  // e.g.
  // models.user.find().exec(...)
  // models.user.find().exec(...)


  // Our datastore definitions
  console.log(
    '\n'+
    '\n'+
    '==========================================================================\n'+
    '• Datastore definitions:                                                 •\n'+
    '==========================================================================\n',
    ontology.datastores
  );
  //
  // e.g.
  // datastores.myDb.config;


  console.log();
  console.log();
  console.log('--');
  console.log('Waterline is ready.');
  console.log('(this is where you could write come code)');

});

