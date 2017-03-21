/**
 * Module dependencies
 */

var express = require('express');
var bodyParser = require('body-parser');
var DiskAdapter = require('sails-disk');
var MySQLAdapter = require('sails-mysql');
// - - - - - - - - - - - - - - - - - - - - - - - - - - -
var Waterline = require('../../');
// ^^ or if running this example outside of this repo,
// require the following instead:
// ```
// var Waterline = require('waterline');
// ```
// - - - - - - - - - - - - - - - - - - - - - - - - - - -


/**
 * A simple example of how to use Waterline v0.13 with Express 4.
 *
 * Before running this example, be sure and do:
 * ```
 * npm install express body-parser waterline sails-disk
 * ```
 */


//////////////////////////////////////////////////////////////////
// WATERLINE SETUP
//////////////////////////////////////////////////////////////////

// Instantiate a new instance of the ORM
Waterline.start({

  adapters: {
    'sails-disk': DiskAdapter,
    'sails-mysql': MySQLAdapter,
    // ...other Waterline-compatible adapters (e.g. 'sails-mysql') might go here
  },

  datastores: {
    default: {
      adapter: 'sails-disk',
      // ...any misc. special config might go here
    },
    customerDb: {
      adapter: 'sails-mysql',
      url: 'localhost/foobar',
      // ...any misc. special config might go here
    },
    // ...any other datastores go here
  },

  models: {
    user: {
      attributes: {
        emailAddress: { type: 'string', required: true },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        numChickens: { type: 'number' },
        pets: { collection: 'pet' }
      }
    },
    pet: {
      datastore: 'customerDb',
      attributes: {
        name: { type: 'string', required: true },
        breed: {
          type: 'string',
          validations: {
            isIn: ['chihuahua', 'great dane', 'collie', 'unknown']
          },
          defaultsTo: 'unknown'
        }
      }
    }
    // ...any other model defs go here
  },

  defaultModelSettings: {
    primaryKey: 'id',
    datastore: 'default',
    attributes: {
      id: { type: 'number', autoMigrations: { autoIncrement: true } },
    },
    // ...any other orm-wide default settings for all models go here
  }

}, function(err, orm){
  if(err) {
    console.error('Could not start up the ORM:\n',err);
    return process.exit(1);
  }


  // ORM is now running!



  //////////////////////////////////////////////////////////////////
  // EXPRESS SETUP
  //////////////////////////////////////////////////////////////////


  // Setup simple Express application.
  var app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // Bind Express Routes (CRUD routes for /users)

  // Find all users
  app.get('/users', function(req, res) {
    Waterline.getModel('user', orm)
    .find().exec(function(err, records) {
      if(err) {
        switch (err.name) {
          case 'UsageError':
            return res.sendStatus(400);
          default:
            console.error('Unexpected error occurred:',err.stack);
            return res.sendStatus(500);
        }
      }//-•

      return res.json(records);
    });
  });


  // Find one user
  app.get('/users/:id', function(req, res) {
    Waterline.getModel('user', orm)
    .findOne({ id: req.params.id }, function(err, record) {
      if(err && err.name === 'UsageError') {
        return res.sendStatus(400);
      }
      else if (err && err.name === 'AdapterError' && err.code === 'E_UNIQUE') {
        return res.status(401).json(err);
      }
      else if (err) {
        console.error('Unexpected error occurred:',err.stack);
        return res.sendStatus(500);
      }
      else {
        return res.json(record);
      }
    });
  });



  // Create a user
  // (This one uses promises, just for fun.)
  app.post('/users', function(req, res) {
    Waterline.getModel('user', orm)
    .create(req.body)
    .meta({fetch:true})
    .catch({name:'UsageError'}, function (err) {
      console.log('Refusing to perform impossible/confusing query.  Details:',err);
      return res.sendStatus(400);
    })
    .catch({name:'AdapterError', code:'E_UNIQUE'}, function (err) {
      console.log('Refusing to create duplicate user.  Details:',err);
      return res.status(401).json(err);
    })
    .catch(function (err) {
      console.error('Unexpected error occurred:',err.stack);
      return res.sendStatus(500);
    })
    .then(function (newRecord){
      return res.status(201).json(newRecord);
    });
  });

  // Destroy a user (if it exists)
  app.delete('/users/:id', function(req, res) {
    Waterline.getModel('user', orm)
    .destroy({ id: req.params.id }, function(err) {
      if(err && err.name === 'UsageError') {
        return res.sendStatus(400);
      }
      else if (err) {
        console.error('Unexpected error occurred:',err.stack);
        return res.sendStatus(500);
      }
      else {
        return res.sendStatus(200);
      }
    });
  });


  // Update a user
  app.put('/users/:id', function(req, res) {

    // Don't pass ID to update
    // > (We don't want to try to change the primary key this way, at least not
    // > for this example.  It's totally possible to do that, of course... just
    // > kind of weird.)
    var valuesToSet = req.body;
    delete valuesToSet.id;

    // In this example, we'll send back a JSON representation of the newly-updated
    // user record, just for kicks.
    Waterline.getModel('user', orm)
    .update({ id: req.params.id })
    .set(valuesToSet)
    .meta({fetch:true})
    .exec(function(err, updatedUsers) {
      if(err && err.name === 'UsageError') {
        return res.sendStatus(400);
      }
      else if (err && err.name === 'AdapterError' && err.code === 'E_UNIQUE') {
        return res.status(401).json(err);
      }
      else if (err) {
        console.error('Unexpected error occurred:',err.stack);
        return res.sendStatus(500);
      }
      else if (updatedUsers.length < 1) {
        return res.sendStatus(404);
      }
      else {
        return res.status(200).json(updatedUsers[0]);
      }
    });
  });


  // Lift Express server and start listening to requests
  app.listen(3000, function (err){
    if (err) {
      console.error('Failed to lift express server:', err);
      console.error('(Attempting to shut down ORM...)');
      Waterline.stop(orm, function(err){
        if (err) {
          console.error('Unexpected failure when attempting to shut down ORM!  Details:', err);
          return process.exit(1);
        }

        console.error('ORM was shut down successfully.');
        return process.exit(1);
      });//_∏_
      return;
    }//-•

    console.log('Express server is running and ORM is started!');
    console.log('To see saved users, visit http://localhost:3000/users');
    console.log('Press CTRL+C to terminate process.');

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // NOTE: Sails takes care of all this kind of stuff automatically, but if you're using
    // vanilla express, it would be a good idea to bind SIGINT/SIGTERM listeners here and have
    // them shut down the ORM if fired.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  });

});
