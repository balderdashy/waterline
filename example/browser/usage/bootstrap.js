/**
 * Set up Waterline.
 * 
 * @param  {[type]}   adapters    [description]
 * @param  {[type]}   collectionDefs [description]
 * @param  {Function} cb          [description]
 * @return {[type]}               [description]
 */
function bootstrap(adapters, collectionDefs, cb) {
  var instantiatedCollections = [];
  collectionDefs.forEach(function (def) {
    instantiatedCollections.push(Waterline.Collection.extend(def));
  });

  var waterline = new Waterline();
  instantiatedCollections.forEach(function (collection) {
    waterline.loadCollection(collection);
  });
  waterline.initialize({
    adapters: adapters
  }, cb);
  return waterline;
}


var waterline = bootstrap({
  foobar: {
    identity: 'foobar',
    foobar: function(collectionName, options, cb) {
      return cb(null, {
        status: true
      });
    }
  }
},[{
  identity: 'cheesybread',
  attributes: {},
  adapter: 'foobar',
  schema: false
}], console.log.bind(console));