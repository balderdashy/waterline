/**
 * A simple example of how to use Waterline with Express
 */

var express = require('express'),
    app = express(),
    Waterline = require('../../lib/waterline.js');

// Require any waterline compatible adapters here
var adapter = require('sails-postgresql');

// Setup Express Application
app.use(express.bodyParser());
app.use(express.methodOverride());

// Set Adapter Config
adapter.database = 'waterline_test';
adapter.user = 'root';
adapter.password = '';

// Namespaced Models Object
app.models = {};

// Build Express Routes (CRUD routes for /users)

app.get('/users', function(req, res) {
  app.models.user.find().done(function(err, models) {
    if(err) return res.json({ err: err }, 500);
    res.json(models);
  });
});

app.post('/users', function(req, res) {
  app.models.user.create(req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.get('/users/:id', function(req, res) {
  app.models.user.findOne({ id: req.params.id }, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.del('/users/:id', function(req, res) {
  app.models.user.destroy({ id: req.params.id }, function(err) {
    if(err) return res.json({ err: err }, 500);
    res.json({ status: 'ok' });
  });
});

app.put('/users/:id', function(req, res) {
  // Don't pass ID to update
  delete req.body.id;

  app.models.user.update({ id: req.params.id }, req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

// Build A Model
var User = Waterline.Collection.extend({
  adapter: 'postgresql',
  tableName: 'users',

  attributes: {
    first_name: 'string',
    last_name: 'string'
  }
});

// Load Models passing adapters in
new User({ adapters: { postgresql: adapter }}, function(err, collection) {
  app.models.user = collection;

  // Start Server
  app.listen(3000);
});
