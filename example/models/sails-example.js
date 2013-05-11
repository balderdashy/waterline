// Note that instance and class methods could also be defined at the adapter level
// (e.g. CRUD adapters add .save() and .destroy() methods, but the Twillio API might add a .call() method)

// User.js
module.exports = sails.Model.extend({

  // Adapters are applied from left to right
  // (methods defined in more than one adapter use the rightmost adapter's version, just like _.extend)
  adapter: ['mysql', 'twilio'],

  // Cache the results of the specified methods
  // (just class/static methods in this example-- not sure the best way to do instance methods)
  cache: {

    findAll: {
      adapter: 'memory',
      ttl: 60 * 1000
    },

    // Cache adapters are applied left to right
    // (cache for one hour in memory,
    // then cache for the rest of the day in redis)
    findSingles: [{
      adapter: 'memory',
      ttl: 60 * 60 * 1000
    }, {
      adapter: 'redis',
      ttl: 24 * 60 * 60 * 1000
    }]
  },

  attributes: {
    age: 'int',
    female: 'boolean',
    name: 'string',
    phoneNumber: 'string',
    friends: { many: 'User' },
    boyfriend: { one: 'User' },

    // Instance method to start dating this person
    // (all partners are boyfriends in this app, I guess)
    goSteady: function (user, cb) {
      user.boyfriend = user;
      this.boyfriend = user;
      async.parallel(this.save, user.save, cb);
    },

    // Instance method to initiate a phone call using the Twilio API
    // with some special parameters
    dirtyCall: function (options, cb) {

      // call() is an instance method which
      // comes from the Twillio adapter
      this.call({
        to: options.to,
        from: this.phoneNumber,
        anonymous: true,
        deepSexyVoice: true
      }, cb);
    }
  },

  // Class method to find users who are single
  findSingles: function (cb) {
    User
    .findAll()
    .andFetch('friends')
    .done(function (err, users) {
      if (err) throw err;

      cb(null, _.where({
        boyfriend: null
      }));
    });
  }
});




// Examples

// Class methods:
// Find singles
User.findSingles()
.done(function (err, singles) {
  if (err) throw err;
  sails.log('Take your pick:', singles);
});

// Associations:
// Get user 7, fetching no more than 3 of her friends
// who are at least 17 years old
User.find(7)
.andFetch('friends', {
  where: { age: {'>=': 17}, female: true },
  limit: 3
}).done(function (err, user) {
  if (err) throw err;
  sails.log('Take your pick:', user.friends);
});


// Cross-adapter assocations:
// Perform a dirty call from the current user to user 7
User.find(7).done(function (err, targetUser) {
  if (err) throw err;
  if (!req.session.userId) throw 'Account not valid- could not place call.';

  // Lookup current user's phone no.
  User.find(req.session.userId).done(function (err, currentUser) {
    if (err) throw err;
    if (!currentUser) throw 'Account not valid- could not place call.';

    // Perform call
    currentUser.dirtyCall({
      to: targetUser.phoneNumber
    }), function (err) {
      if (err) throw err;
      sails.log('Now what?');
    });
  });
});