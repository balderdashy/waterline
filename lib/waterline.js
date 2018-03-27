//  ██╗    ██╗ █████╗ ████████╗███████╗██████╗ ██╗     ██╗███╗   ██╗███████╗
//  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██║     ██║████╗  ██║██╔════╝
//  ██║ █╗ ██║███████║   ██║   █████╗  ██████╔╝██║     ██║██╔██╗ ██║█████╗
//  ██║███╗██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║     ██║██║╚██╗██║██╔══╝
//  ╚███╔███╔╝██║  ██║   ██║   ███████╗██║  ██║███████╗██║██║ ╚████║███████╗
//   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
//

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
// var EA = require('encrypted-attr'); « this is required below for node compat.
var flaverr = require('flaverr');
var Schema = require('waterline-schema');
var buildDatastoreMap = require('./waterline/utils/system/datastore-builder');
var buildLiveWLModel = require('./waterline/utils/system/collection-builder');
var BaseMetaModel = require('./waterline/MetaModel');
var getModel = require('./waterline/utils/ontology/get-model');


/**
 * ORM (Waterline)
 *
 * Construct a Waterline ORM instance.
 *
 * @constructs {Waterline}
 */
function Waterline() {

  // Start by setting up an array of model definitions.
  // (This will hold the raw model definitions that were passed in,
  // plus any implicitly introduced models-- but that part comes later)
  //
  // > `wmd` stands for "weird intermediate model def thing".
  // - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: make this whole wmd thing less weird.
  // - - - - - - - - - - - - - - - - - - - - - - - -
  var wmds = [];

  // Hold a map of the instantaited and active datastores and models.
  var modelMap = {};
  var datastoreMap = {};

  // This "context" dictionary will be passed into the BaseMetaModel constructor
  // later every time we instantiate a new BaseMetaModel instance (e.g. `User`
  // or `Pet` or generically, sometimes called "WLModel" -- sorry about the
  // capital letters!!)
  //
  var context = {
    collections: modelMap,
    datastores:  datastoreMap
  };
  // ^^FUTURE: Level this out (This is currently just a stop gap to prevent
  // re-writing all the "collection query" stuff.)


  // Now build an ORM instance.
  var orm = {};


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐ ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╔╦╗╔═╗╦
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝║║║║ ║ ║║║╣ ║
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═╩ ╩╚═╝═╩╝╚═╝╩═╝
  /**
   * .registerModel()
   *
   * Register a "weird intermediate model definition thing".  (see above)
   *
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * FUTURE: Deprecate support for this method in favor of simplified `Waterline.start()`
   * (see bottom of this file).  In WL 1.0, remove this method altogether.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   *
   * @param  {Dictionary} wmd
   */
  orm.registerModel = function registerModel(wmd) {
    wmds.push(wmd);
  };

  // Alias for backwards compatibility:
  orm.loadCollection = function heyThatsDeprecated(){
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Change this alias method so that it throws an error in WL 0.14.
    // (And in WL 1.0, just remove it altogether.)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    console.warn('\n'+
      'Warning: As of Waterline 0.13, `loadCollection()` is now `registerModel()`.  Please call that instead.\n'+
      'I get what you mean, so I temporarily renamed it for you this time, but here is a stack trace\n'+
      'so you know where this is coming from in the code, and can change it to prevent future warnings:\n'+
      '```\n'+
      (new Error()).stack+'\n'+
      '```\n'
    );
    orm.registerModel.apply(orm, Array.prototype.slice.call(arguments));
  };


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐ ╦╔╗╔╦╔╦╗╦╔═╗╦  ╦╔═╗╔═╗
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ║║║║║ ║ ║╠═╣║  ║╔═╝║╣
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩╝╚╝╩ ╩ ╩╩ ╩╩═╝╩╚═╝╚═╝

  /**
   * .initialize()
   *
   * Start the ORM and set up active datastores.
   *
   * @param  {Dictionary}   options
   * @param  {Function} done
   */
  orm.initialize = function initialize(options, done) {

    try {


      // First, verify traditional settings, check compat.:
      // =============================================================================================

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: In WL 0.14, deprecate support for this method in favor of the simplified
      // `Waterline.start()` (see bottom of this file).  In WL 1.0, remove it altogether.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


      // Ensure the ORM hasn't already been initialized.
      // (This prevents all sorts of issues, because model definitions are modified in-place.)
      if (_.keys(modelMap).length > 0) {
        throw new Error('A Waterline ORM instance cannot be initialized more than once. To reset the ORM, create a new instance of it by running `new Waterline()`.');
      }

      // Backwards-compatibility for `connections`:
      if (!_.isUndefined(options.connections)){

        // Sanity check
        assert(_.isUndefined(options.datastores), 'Attempted to provide backwards-compatibility for `connections`, but `datastores` was ALSO defined!  This should never happen.');

        options.datastores = options.connections;
        console.warn('\n'+
          'Warning: `connections` is no longer supported.  Please use `datastores` instead.\n'+
          'I get what you mean, so I temporarily renamed it for you this time, but here is a stack trace\n'+
          'so you know where this is coming from in the code, and can change it to prevent future warnings:\n'+
          '```\n'+
          (new Error()).stack+'\n'+
          '```\n'
        );
        delete options.connections;
      }//>-

      // Usage assertions
      if (_.isUndefined(options) || !_.keys(options).length) {
        throw new Error('Usage Error: .initialize(options, callback)');
      }

      if (_.isUndefined(options.adapters) || !_.isPlainObject(options.adapters)) {
        throw new Error('Options must contain an `adapters` dictionary');
      }

      if (_.isUndefined(options.datastores) || !_.isPlainObject(options.datastores)) {
        throw new Error('Options must contain a `datastores` dictionary');
      }


      // - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: anchor ruleset checks
      // - - - - - - - - - - - - - - - - - - - - -


      // Next, validate ORM settings related to at-rest encryption, if it is in use.
      // =============================================================================================
      var areAnyModelsUsingAtRestEncryption;
      _.each(wmds, function(wmd){
        _.each(wmd.prototype.attributes, function(attrDef){
          if (attrDef.encrypt !== undefined) {
            areAnyModelsUsingAtRestEncryption = true;
          }
        });//∞
      });//∞

      // Only allow using at-rest encryption for compatible Node versions
      var EA;
      if (areAnyModelsUsingAtRestEncryption) {
        var RX_NODE_MAJOR_DOT_MINOR = /^v([^.]+\.?[^.]+)\./;
        var parsedNodeMajorAndMinorVersion = process.version.match(RX_NODE_MAJOR_DOT_MINOR) && (+(process.version.match(RX_NODE_MAJOR_DOT_MINOR)[1]));
        var MIN_NODE_VERSION = 6;
        var isNativeCryptoFullyCapable = parsedNodeMajorAndMinorVersion >= MIN_NODE_VERSION;
        if (!isNativeCryptoFullyCapable) {
          throw new Error('Current installed node version\'s native `crypto` module is not fully capable of the necessary functionality for encrypting/decrypting data at rest with Waterline.  To use this feature, please upgrade to Node v' + MIN_NODE_VERSION + ' or above, flush your node_modules, run npm install, and then try again.  Otherwise, if you cannot upgrade Node.js, please remove the `encrypt` property from your models\' attributes.');
        }
        EA = require('encrypted-attr');
      }//ﬁ

      _.each(wmds, function(wmd){

        var modelDef = wmd.prototype;

        // Verify that `encrypt` attr prop is valid, if in use.
        var isThisModelUsingAtRestEncryption;
        try {
          _.each(modelDef.attributes, function(attrDef, attrName){
            if (attrDef.encrypt !== undefined) {
              if (!_.isBoolean(attrDef.encrypt)){
                throw flaverr({
                  code: 'E_INVALID_ENCRYPT',
                  attrName: attrName,
                  message: 'If set, `encrypt` must be either `true` or `false`.'
                });
              }//•

              if (attrDef.encrypt === true){

                isThisModelUsingAtRestEncryption = true;

                if (attrDef.type === 'ref') {
                  throw flaverr({
                    code: 'E_ATTR_NOT_COMPATIBLE_WITH_AT_REST_ENCRYPTION',
                    attrName: attrName,
                    whyNotCompatible: 'with `type: \'ref\'` attributes.'
                  });
                }//•

                if (attrDef.autoCreatedAt || attrDef.autoUpdatedAt) {
                  throw flaverr({
                    code: 'E_ATTR_NOT_COMPATIBLE_WITH_AT_REST_ENCRYPTION',
                    attrName: attrName,
                    whyNotCompatible: 'with `'+(attrDef.autoCreatedAt?'autoCreatedAt':'autoUpdatedAt')+'` attributes.'
                  });
                }//•

                if (attrDef.model || attrDef.collection) {
                  throw flaverr({
                    code: 'E_ATTR_NOT_COMPATIBLE_WITH_AT_REST_ENCRYPTION',
                    attrName: attrName,
                    whyNotCompatible: 'with associations.'
                  });
                }//•

                if (attrDef.defaultsTo !== undefined) {
                  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                  // FUTURE: Consider adding support for this.  Will require some refactoring
                  // in order to do it right (i.e. otherwise we'll just be copying and pasting
                  // the encryption logic.)  We'll want to pull it out from normalize-value-to-set
                  // into a new utility, then call that from the appropriate spot in
                  // normalize-new-record in order to encrypt the initial default value.
                  //
                  // (See also the other note in normalize-new-record re defaultsTo + cloneDeep.)
                  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                  throw flaverr({
                    code: 'E_ATTR_NOT_COMPATIBLE_WITH_AT_REST_ENCRYPTION',
                    attrName: attrName,
                    whyNotCompatible: 'with an attribute that also specifies a `defaultsTo`.  '+
                    'Please remove the `defaultsTo` from this attribute definition.'
                  });
                }//•

              }//ﬁ

            }//ﬁ
          });//∞
        } catch (err) {
          switch (err.code) {
            case 'E_INVALID_ENCRYPT':
              throw flaverr({
                message:
                'Invalid usage of `encrypt` in the definition for `'+modelDef.identity+'` model\'s '+
                '`'+err.attrName+'` attribute.  '+err.message
              }, err);
            case 'E_ATTR_NOT_COMPATIBLE_WITH_AT_REST_ENCRYPTION':
              throw flaverr({
                message:
                'Invalid usage of `encrypt` in the definition for `'+modelDef.identity+'` model\'s '+
                '`'+err.attrName+'` attribute.  At-rest encryption (`encrypt: true`) cannot be used '+
                err.whyNotCompatible
              }, err);
            default: throw err;
          }
        }


        // Verify `dataEncryptionKeys`.
        // (Remember, if there is a secondary key system in use, these DEKs should have
        // already been "unwrapped" before they were passed in to Waterline as model settings.)
        if (modelDef.dataEncryptionKeys !== undefined) {

          if (!_.isObject(modelDef.dataEncryptionKeys) || _.isArray(modelDef.dataEncryptionKeys) || _.isFunction(modelDef.dataEncryptionKeys)) {
            throw flaverr({
              message: 'In the definition for the `'+modelDef.identity+'` model, the `dataEncryptionKeys` model setting '+
              'is invalid.  If specified, `dataEncryptionKeys` must be a dictionary (plain JavaScript object).'
            });
          }//•

          // Check all DEKs for validity.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // (FUTURE: maybe extend EA to support a `validateKeys()` method instead of this--
          // or at least to have error code)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          try {
            _.each(modelDef.dataEncryptionKeys, function(dek, dekId){

              if (!dek || !_.isString(dek)) {
                throw flaverr({
                  code: 'E_INVALID_DATA_ENCRYPTION_KEYS',
                  dekId: dekId,
                  message: 'Must be a cryptographically random, 32 byte string.'
                });
              }//•

              if (!dekId.match(/^[a-z\$]([a-z0-9])*$/i)){
                throw flaverr({
                  code: 'E_INVALID_DATA_ENCRYPTION_KEYS',
                  dekId: dekId,
                  message: 'Please make sure the ids of all of your data encryption keys begin with a letter and do not contain any special characters.'
                });
              }//•

              if (areAnyModelsUsingAtRestEncryption) {
                try {
                  EA(undefined, { keys: modelDef.dataEncryptionKeys, keyId: dekId }).encryptAttribute(undefined, 'test-value-purely-for-validation');
                } catch (err) {
                  throw flaverr({
                    code: 'E_INVALID_DATA_ENCRYPTION_KEYS',
                    dekId: dekId
                  }, err);
                }
              }

            });//∞
          } catch (err) {
            switch (err.code) {
              case 'E_INVALID_DATA_ENCRYPTION_KEYS':
                throw flaverr({
                  message: 'In the definition for the `'+modelDef.identity+'` model, one of the data encryption keys (`dataEncryptionKeys.'+err.dekId+'`)  is invalid.\n'+
                  'Details:\n'+
                  '  '+err.message
                }, err);
              default:
                throw err;
            }
          }

        }//ﬁ


        // If any attrs have `encrypt: true`, verify that there is both a valid
        // `dataEncryptionKeys` dictionary and a valid `dataEncryptionKeys.default` DEK set.
        if (isThisModelUsingAtRestEncryption) {

          if (!modelDef.dataEncryptionKeys || !modelDef.dataEncryptionKeys.default) {
            throw flaverr({
              message:
              'DEKs should be 32 bytes long, and cryptographically random.  A random, default DEK is included '+
              'in new Sails apps, so one easy way to generate a new DEK is to generate a new Sails app.  '+
              'Alternatively, you could run:\n'+
              '    require(\'crypto\').randomBytes(32).toString(\'base64\')\n'+
              '\n'+
              'Remember: once in production, you should manage your DEKs like you would any other sensitive credential.  '+
              'For example, one common best practice is to configure them using environment variables.\n'+
              'In a Sails app:\n'+
              '    sails_models__dataEncryptionKeys__default=vpB2EhXaTi+wYKUE0ojI5cVQX/VRGP++Fa0bBW/NFSs=\n'+
              '\n'+
              ' [?] If you\'re unsure or want advice, head over to https://sailsjs.com/support'
            });
          }//•
        }//ﬁ


      });//∞


      // Next, set up support for the default archive, and validate related settings:
      // =============================================================================================

      var DEFAULT_ARCHIVE_MODEL_IDENTITY = 'archive';

      // Notes for use in docs:
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // • To choose which datastore the Archive model will live in:
      //
      //   …in top-level orm settings:
      //   archiveModelIdentity: 'myarchive',
      //
      //   …in 'MyArchive' model:
      //   datastore: 'foo'
      //
      //
      // • To choose the `tableName` and `columnName`s for your Archive model:
      //   …in top-level orm settings:
      //     archiveModelIdentity: 'archive',
      //
      //   …in 'archive' model:
      //     tableName: 'foo',
      //     attributes: {
      //       originalRecord: { type: 'json', columnName: 'barbaz' },
      //       fromModel: { type: 'string', columnName: 'bingbong' }
      //     }
      //
      //
      // • To disable support for the `.archive()` model method:
      //
      //   …in top-level orm settings:
      //     archiveModelIdentity: false
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      var archiversInfoByArchiveIdentity = {};

      _.each(wmds, function(wmd){

        var modelDef = wmd.prototype;
        // console.log('· checking `'+util.inspect(wmd,{depth:null})+'`…');
        // console.log('· checking `'+modelDef.identity+'`…');

        // Check the `archiveModelIdentity` model setting.
        if (modelDef.archiveModelIdentity === undefined) {
          if (modelDef.archiveModelIdentity !== modelDef.identity) {
            // console.log('setting default archiveModelIdentity for model `'+modelDef.identity+'`…');
            modelDef.archiveModelIdentity = DEFAULT_ARCHIVE_MODEL_IDENTITY;
          }
          else {
            // A model can't be its own archive model!
            modelDef.archiveModelIdentity = false;
          }
        }//ﬁ

        if (modelDef.archiveModelIdentity === false) {
          // This will cause the .archive() method for this model to error out and explain
          // that the feature was explicitly disabled.
        }
        else if (modelDef.archiveModelIdentity === modelDef.identity) {
          return done(new Error('Invalid `archiveModelIdentity` setting.  A model cannot be its own archive!  But model `'+modelDef.identity+'` has `archiveModelIdentity: \''+modelDef.archiveModelIdentity+'\'`.'));
        }
        else if (!modelDef.archiveModelIdentity || !_.isString(modelDef.archiveModelIdentity)){
          return done(new Error('Invalid `archiveModelIdentity` setting.  If set, expecting either `false` (to disable .archive() altogether) or the identity of a registered model (e.g. "archive"), but instead got: '+util.inspect(options.defaults.archiveModelIdentity,{depth:null})));
        }//ﬁ

        // Keep track of the model identities of all archive models, as well as info about the models using them.
        if (modelDef.archiveModelIdentity !== false) {
          if (!_.contains(Object.keys(archiversInfoByArchiveIdentity), modelDef.archiveModelIdentity)) {
            // Save an initial info dictionary:
            archiversInfoByArchiveIdentity[modelDef.archiveModelIdentity] = {
              archivers: []
            };
          }//ﬁ

          archiversInfoByArchiveIdentity[modelDef.archiveModelIdentity].archivers.push(modelDef);

        }//ﬁ


      });//∞


      // If any models are using the default archive, then register the default archive model
      // if it isn't already registered.
      if (_.contains(Object.keys(archiversInfoByArchiveIdentity), DEFAULT_ARCHIVE_MODEL_IDENTITY)) {


        // Inject the built-in Archive model into the ORM's ontology:
        //   • id               (pk-- string or number, depending on where the Archive model is being stored)
        //   • createdAt        (timestamp-- this is effectively ≈ "archivedAt")
        //   • originalRecord   (json-- the original record, completely unpopulated)
        //   • originalRecordId (pk-- string or number, the pk of the original record)
        //   • fromModel        (string-- the original model identity)
        //
        //  > Note there's no updatedAt!

        var existingDefaultArchiveWmd = _.find(wmds, function(wmd){ return wmd.prototype.identity === DEFAULT_ARCHIVE_MODEL_IDENTITY; });
        if (!existingDefaultArchiveWmd) {

          var defaultArchiversInfo = archiversInfoByArchiveIdentity[DEFAULT_ARCHIVE_MODEL_IDENTITY];

          // Arbitrarily pick the first archiver.
          // (we'll use this to derive a datastore and pk style so that they both match)
          var arbitraryArchiver = defaultArchiversInfo.archivers[0];
          // console.log('arbitraryArchiver', arbitraryArchiver);

          var newWmd = Waterline.Model.extend({
            identity: DEFAULT_ARCHIVE_MODEL_IDENTITY,
            // > Note that we inject a "globalId" for potential use in higher-level frameworks (e.g. Sails)
            // > that might want to globalize this model.  This way, it'd show up as "Archive" instead of "archive".
            // > Remember: Waterline is NOT responsible for any globalization itself, this is just advisory.
            globalId: _.capitalize(DEFAULT_ARCHIVE_MODEL_IDENTITY),
            primaryKey: 'id',
            datastore: arbitraryArchiver.datastore,
            attributes: {
              id: arbitraryArchiver.attributes[arbitraryArchiver.primaryKey],
              createdAt: { type: 'number', autoCreatedAt: true, autoMigrations: { columnType: '_numbertimestamp' } },
              fromModel: { type: 'string', required: true, autoMigrations: { columnType: '_string' } },
              originalRecord: { type: 'json', required: true, autoMigrations: { columnType: '_json' } },

              // Use `type:'json'` for this:
              // (since it might contain pks for records from different datastores)
              originalRecordId: { type: 'json', autoMigrations: { columnType: '_json' } },
            }
          });
          wmds.push(newWmd);

        }//ﬁ

      }//ﬁ


      // Now make sure all archive models actually exist, and that they're valid.
      _.each(archiversInfoByArchiveIdentity, function(archiversInfo, archiveIdentity) {
        var archiveWmd = _.find(wmds, function(wmd){ return wmd.prototype.identity === archiveIdentity; });
        if (!archiveWmd) {
          throw new Error('Invalid `archiveModelIdentity` setting.  A model declares `archiveModelIdentity: \''+archiveIdentity+'\'`, but there\'s no other model actually registered with that identity to use as an archive!');
        }

        // Validate that this archive model can be used for the purpose of Waterline's .archive()
        // > (note that the error messages here should be considerate of the case where someone is
        // > upgrading their app from an older version of Sails/Waterline and might happen to have
        // > a model named "Archive".)
        var EXPECTED_ATTR_NAMES = ['id', 'createdAt', 'fromModel', 'originalRecord', 'originalRecordId'];
        var actualAttrNames = _.keys(archiveWmd.prototype.attributes);
        var namesOfMissingAttrs = _.difference(EXPECTED_ATTR_NAMES, actualAttrNames);

        try {

          if (namesOfMissingAttrs.length > 0) {
            throw flaverr({
              code: 'E_INVALID_ARCHIVE_MODEL',
              because: 'it is missing '+ namesOfMissingAttrs.length+' mandatory attribute'+(namesOfMissingAttrs.length===1?'':'s')+': '+namesOfMissingAttrs+'.'
            });
          }//•

          if (archiveWmd.prototype.primaryKey !== 'id') {
            throw flaverr({
              code: 'E_INVALID_ARCHIVE_MODEL',
              because: 'it is using an attribute other than `id` as its logical primary key attribute.'
            });
          }//•

          if (_.any(EXPECTED_ATTR_NAMES, { encrypt: true })) {
            throw flaverr({
              code: 'E_INVALID_ARCHIVE_MODEL',
              because: 'it is using at-rest encryption on one of its mandatory attributes, when it shouldn\'t be.'
            });
          }//•

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: do more checks (there's a lot of things we should probably check-- e.g. the `type` of each
          // mandatory attribute, that no crazy defaultsTo is provided, that the auto-timestamp is correct, etc.)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        } catch (err) {
          switch (err.code) {
            case 'E_INVALID_ARCHIVE_MODEL':
              throw new Error(
                'The `'+archiveIdentity+'` model cannot be used as a custom archive, because '+err.because+'\n'+
                'Please adjust this custom archive model accordingly, or otherwise switch to a different '+
                'model as your custom archive.  (For reference, this `'+archiveIdentity+'` model this is currently '+
                'configured as the custom archive model for '+archiversInfo.archivers.length+' other '+
                'model'+(archiversInfo.archivers.length===1?'':'s')+': '+_.pluck(archiversInfo.archivers, 'identity')+'.'
              );
            default:
              throw err;
          }
        }

      });//∞






      // Build up a dictionary of datastores (used by our models?)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: verify the last part of that statement ^^ (not seeing how this is related to "used by our models")
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // =================================================================

      try {
        datastoreMap = buildDatastoreMap(options.adapters, options.datastores);
      } catch (err) { throw err; }


      // Now check out the models and build a schema map (using wl-schema)
      // =================================================================
      var internalSchema;
      try {
        internalSchema = new Schema(wmds, options.defaults);
      } catch (err) { throw err; }


      // Check the internal "schema map" for any junction models that were
      // implicitly introduced above and handle them.
      _.each(_.keys(internalSchema), function(table) {
        if (internalSchema[table].junctionTable) {
          // Whenever one is found, flag it as `_private: true` and generate
          // a custom constructor for it (based on a clone of the `BaseMetaModel`
          // constructor), then push it on to our set of wmds.
          internalSchema[table]._private = true;
          wmds.push(BaseMetaModel.extend(internalSchema[table]));
        }//ﬁ
      });//∞


      // Now build live models
      // =================================================================

      // Hydrate each model definition (in-place), and also set up a
      // reference to it in the model map.
      _.each(wmds, function (wmd) {

        // Set the attributes and schema values using the normalized versions from
        // Waterline-Schema where everything has already been processed.
        var schemaVersion = internalSchema[wmd.prototype.identity];

        // Set normalized values from the schema version on the model definition.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: no need to use a prototype here, so let's avoid it to minimize future boggling
        // (or if we determine it significantly improves the performance of ORM initialization, then
        // let's keep it, but document that here and leave a link to the benchmark as a comment)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        wmd.prototype.identity = schemaVersion.identity;
        wmd.prototype.tableName = schemaVersion.tableName;
        wmd.prototype.datastore = schemaVersion.datastore;
        wmd.prototype.primaryKey = schemaVersion.primaryKey;
        wmd.prototype.meta = schemaVersion.meta;
        wmd.prototype.attributes = schemaVersion.attributes;
        wmd.prototype.schema = schemaVersion.schema;
        wmd.prototype.hasSchema = schemaVersion.hasSchema;

        // Mixin junctionTable or throughTable if available
        if (_.has(schemaVersion, 'junctionTable')) {
          wmd.prototype.junctionTable = schemaVersion.junctionTable;
        }

        if (_.has(schemaVersion, 'throughTable')) {
          wmd.prototype.throughTable = schemaVersion.throughTable;
        }

        var WLModel = buildLiveWLModel(wmd, datastoreMap, context);

        // Store the live Waterline model so it can be used
        // internally to create other records
        modelMap[WLModel.identity] = WLModel;

      });

    } catch (err) { return done(err); }


    // Finally, register datastores.
    // =================================================================

    // Simultaneously register each datastore with the correct adapter.
    // (This is async because the `registerDatastore` method in adapters
    // is async.  But since they're not interdependent, we run them all in parallel.)
    async.each(_.keys(datastoreMap), function(datastoreName, next) {

      var datastore = datastoreMap[datastoreName];

      if (_.isFunction(datastore.adapter.registerConnection)) {
        return next(new Error('The adapter for datastore `' + datastoreName + '` is invalid: the `registerConnection` method must be renamed to `registerDatastore`.'));
      }

      try {
        // Note: at this point, the datastore should always have a usable adapter
        // set as its `adapter` property.

        // Check if the datastore's adapter has a `registerDatastore` method
        if (!_.has(datastore.adapter, 'registerDatastore')) {
          // FUTURE: get rid of this `setImmediate` (or if it's serving a purpose, document what that is)
          setImmediate(function() { next(); });//_∏_
          return;
        }//-•

        // Add the datastore name as the `identity` property in its config.
        datastore.config.identity = datastoreName;

        // Get the identities of all the models which use this datastore, and then build up
        // a simple mapping that can be passed down to the adapter.
        var usedSchemas = {};
        var modelIdentities = _.uniq(datastore.collections);
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: figure out if we still need this `uniq` or not.  If so, document why.
        // If not, remove it. (hopefully the latter)
        //
        // e.g.
        // ```
        // assert(modelIdentities.length === datastore.collections.length);
        // ```
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        _.each(modelIdentities, function(modelIdentity) {
          var WLModel = modelMap[modelIdentity];

          // Track info about this model by table name (for use in the adapter)
          var tableName;
          if (_.has(Object.getPrototypeOf(WLModel), 'tableName')) {
            tableName = Object.getPrototypeOf(WLModel).tableName;
          }
          else {
            tableName = modelIdentity;
          }
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Suck the `getPrototypeOf()` poison out of this stuff.  Mike is too dumb for this.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          assert(WLModel.tableName === tableName, 'Expecting `WLModel.tableName === tableName`. (Please open an issue: http://sailsjs.com/bugs)');
          assert(WLModel.identity === modelIdentity, 'Expecting `WLModel.identity === modelIdentity`. (Please open an issue: http://sailsjs.com/bugs)');
          assert(WLModel.primaryKey && _.isString(WLModel.primaryKey), 'How flabbergasting!  Expecting truthy string in `WLModel.primaryKey`, but got something else. (If you\'re seeing this, there\'s probably a bug in Waterline.  Please open an issue: http://sailsjs.com/bugs)');
          assert(WLModel.schema && _.isObject(WLModel.schema), 'Expecting truthy string in `WLModel.schema`, but got something else. (Please open an issue: http://sailsjs.com/bugs)');

          usedSchemas[tableName] = {
            primaryKey: WLModel.primaryKey,
            definition: WLModel.schema,
            tableName: tableName,
            identity: modelIdentity
          };
        });//</ each model identity >

        // Call the `registerDatastore` adapter method.
        datastore.adapter.registerDatastore(datastore.config, usedSchemas, next);

      } catch (err) { return next(err); }

    }, function(err) {
      if (err) { return done(err); }

      // Build up and return the ontology.
      return done(undefined, {
        collections: modelMap,
        datastores: datastoreMap
      });

    });//</async.each>

  };//</ definition of `orm.initialize` >


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝
  orm.teardown = function teardown(done) {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: In WL 0.14, deprecate support for this method in favor of the simplified
    // `Waterline.start()` (see bottom of this file).  In WL 1.0, remove it altogether.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    async.each(_.keys(datastoreMap), function(datastoreName, next) {
      var datastore = datastoreMap[datastoreName];


      // Check if the adapter has a teardown method implemented.
      // If not, then just skip this datastore.
      if (!_.has(datastore.adapter, 'teardown')) {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: get rid of this `setImmediate` (or if it's serving a purpose, document what that is)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        setImmediate(function() { next(); });//_∏_
        return;
      }//-•

      // But otherwise, call its teardown method.
      try {
        datastore.adapter.teardown(datastoreName, next);
      } catch (err) { return next(err); }

    }, done);

  };

  //  ╦═╗╔═╗╔╦╗╦ ╦╦═╗╔╗╔  ┌┐┌┌─┐┬ ┬  ┌─┐┬─┐┌┬┐  ┬┌┐┌┌─┐┌┬┐┌─┐┌┐┌┌─┐┌─┐
  //  ╠╦╝║╣  ║ ║ ║╠╦╝║║║  │││├┤ │││  │ │├┬┘│││  ││││└─┐ │ ├─┤││││  ├┤
  //  ╩╚═╚═╝ ╩ ╚═╝╩╚═╝╚╝  ┘└┘└─┘└┴┘  └─┘┴└─┴ ┴  ┴┘└┘└─┘ ┴ ┴ ┴┘└┘└─┘└─┘
  return orm;

}

// Export the Waterline ORM constructor.
module.exports = Waterline;







//  ╔═╗═╗ ╦╔╦╗╔═╗╔╗╔╔═╗╦╔═╗╔╗╔╔═╗
//  ║╣ ╔╩╦╝ ║ ║╣ ║║║╚═╗║║ ║║║║╚═╗
//  ╚═╝╩ ╚═ ╩ ╚═╝╝╚╝╚═╝╩╚═╝╝╚╝╚═╝

// Expose the generic, stateless BaseMetaModel constructor for direct access from
// vanilla Waterline applications (available as `Waterline.Model`)
//
// > Note that this is technically a "MetaModel", because it will be "newed up"
// > into a Waterline model instance (WLModel) like `User`, `Pet`, etc.
// > But since, from a userland perspective, there is no real distinction, we
// > still expose this as `Model` for the sake of simplicity.
module.exports.Model = BaseMetaModel;

// Expose `Collection` as an alias for `Model`, but only for backwards compatibility.
module.exports.Collection = BaseMetaModel;
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// ^^FUTURE: In WL 1.0, remove this alias.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -





/**
 * Waterline.start()
 *
 * Build and initialize a new Waterline ORM instance using the specified
 * userland ontology, including model definitions, datastore configurations,
 * and adapters.
 *
 * --EXPERIMENTAL--
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * FUTURE: Have this return a Deferred using parley (so it supports `await`)
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Dictionary} options
 *         @property {Dictionary} models
 *         @property {Dictionary} datastores
 *         @property {Dictionary} adapters
 *         @property {Dictionary?} defaultModelSettings
 *
 * @param {Function} done
 *        @param {Error?} err
 *        @param {Ref} orm
 */
module.exports.start = function (options, done){

  // Verify usage & apply defaults:
  if (!_.isFunction(done)) {
    throw new Error('Please provide a valid callback function as the 2nd argument to `Waterline.start()`.  (Instead, got: `'+done+'`)');
  }

  try {

    if (!_.isObject(options) || _.isArray(options) || _.isFunction(options)) {
      throw new Error('Please provide a valid dictionary (plain JS object) as the 1st argument to `Waterline.start()`.  (Instead, got: `'+options+'`)');
    }

    if (!_.isObject(options.adapters) || _.isArray(options.adapters) || _.isFunction(options.adapters)) {
      throw new Error('`adapters` must be provided as a valid dictionary (plain JS object) of adapter definitions, keyed by adapter identity.  (Instead, got: `'+options.adapters+'`)');
    }
    if (!_.isObject(options.datastores) || _.isArray(options.datastores) || _.isFunction(options.datastores)) {
      throw new Error('`datastores` must be provided as a valid dictionary (plain JS object) of datastore configurations, keyed by datastore name.  (Instead, got: `'+options.datastores+'`)');
    }
    if (!_.isObject(options.models) || _.isArray(options.models) || _.isFunction(options.models)) {
      throw new Error('`models` must be provided as a valid dictionary (plain JS object) of model definitions, keyed by model identity.  (Instead, got: `'+options.models+'`)');
    }

    if (_.isUndefined(options.defaultModelSettings)) {
      options.defaultModelSettings = {};
    } else if (!_.isObject(options.defaultModelSettings) || _.isArray(options.defaultModelSettings) || _.isFunction(options.defaultModelSettings)) {
      throw new Error('If specified, `defaultModelSettings` must be a dictionary (plain JavaScript object).  (Instead, got: `'+options.defaultModelSettings+'`)');
    }

    var VALID_OPTIONS = ['adapters', 'datastores', 'models', 'defaultModelSettings'];
    var unrecognizedOptions = _.difference(_.keys(options), VALID_OPTIONS);
    if (unrecognizedOptions.length > 0) {
      throw new Error('Unrecognized option(s):\n  '+unrecognizedOptions+'\n\nValid options are:\n  '+VALID_OPTIONS+'\n');
    }


    // Check adapter identities.
    _.each(options.adapters, function (adapter, key){

      if (_.isUndefined(adapter.identity)) {
        adapter.identity = key;
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // Note: We removed the following purely for convenience.
        // If this comes up again, we should consider bringing it back instead of the more
        // friendly behavior above.  But in the mean time, erring on the side of less typing
        // in userland by gracefully adjusting the provided adapter def.
        // ```
        // throw new Error('All adapters should declare an `identity`.  But the adapter passed in under `'+key+'` has no identity!  (Keep in mind that this adapter could get require()-d from somewhere else.)');
        // ```
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      }
      else if (adapter.identity !== key) {
        throw new Error('The `identity` explicitly defined on an adapter should exactly match the key under which it is passed in to `Waterline.start()`.  But the adapter passed in for key `'+key+'` has an identity that does not match: `'+adapter.identity+'`');
      }

    });//</_.each>


    // Now go ahead: start building & initializing the ORM.
    var orm = new Waterline();

    // Register models (checking model identities along the way).
    //
    // > In addition: Unfortunately, passing in `defaults` in `initialize()`
    // > below doesn't _ACTUALLY_ apply the specified model settings as
    // > defaults right now -- it only does so for implicit junction models.
    // > So we have to do that ourselves for the rest of the models out here
    // > first in this iteratee.  Also note that we handle `attributes` as a
    // > special case.
    _.each(options.models, function (userlandModelDef, key){

      if (_.isUndefined(userlandModelDef.identity)) {
        userlandModelDef.identity = key;
      }
      else if (userlandModelDef.identity !== key) {
        throw new Error('If `identity` is explicitly defined on a model definition, it should exactly match the key under which it is passed in to `Waterline.start()`.  But the model definition passed in for key `'+key+'` has an identity that does not match: `'+userlandModelDef.identity+'`');
      }

      _.defaults(userlandModelDef, _.omit(options.defaultModelSettings, 'attributes'));
      if (options.defaultModelSettings.attributes) {
        userlandModelDef.attributes = userlandModelDef.attributes || {};
        _.defaults(userlandModelDef.attributes, options.defaultModelSettings.attributes);
      }

      orm.registerModel(Waterline.Model.extend(userlandModelDef));

    });//</_.each>


    // Fire 'er up
    orm.initialize({
      adapters: options.adapters,
      datastores: options.datastores,
      defaults: options.defaultModelSettings
    }, function (err, _classicOntology) {
      if (err) { return done(err); }

      // Attach two private properties for compatibility's sake.
      // (These are necessary for utilities that accept `orm` to work.)
      // > But note that we do this as non-enumerable properties
      // > to make it less tempting to rely on them in userland code.
      // > (Instead, use `getModel()`!)
      Object.defineProperty(orm, 'collections', {
        value: _classicOntology.collections
      });
      Object.defineProperty(orm, 'datastores', {
        value: _classicOntology.datastores
      });

      return done(undefined, orm);
    });

  } catch (err) { return done(err); }

};//</Waterline.start()>

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// To test quickly:
// ```
// require('./').start({adapters: { 'sails-foo': { identity: 'sails-foo' } }, datastores: { default: { adapter: 'sails-foo' } }, models: { user: { attributes: {id: {type: 'number'}}, primaryKey: 'id', datastore: 'default'} }}, function(err, _orm){ if(err){throw err;}  console.log(_orm);  /* and expose as `orm`: */  orm = _orm;  });
// ```
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


/**
 * Waterline.stop()
 *
 * Tear down the specified Waterline ORM instance.
 *
 * --EXPERIMENTAL--
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * FUTURE: Have this return a Deferred using parley (so it supports `await`)
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} orm
 *
 * @param {Function} done
 *        @param {Error?} err
 */
module.exports.stop = function (orm, done){

  // Verify usage & apply defaults:
  if (!_.isFunction(done)) {
    throw new Error('Please provide a valid callback function as the 2nd argument to `Waterline.stop()`.  (Instead, got: `'+done+'`)');
  }

  try {

    if (!_.isObject(orm)) {
      throw new Error('Please provide a Waterline ORM instance (obtained from `Waterline.start()`) as the first argument to `Waterline.stop()`.  (Instead, got: `'+orm+'`)');
    }

    orm.teardown(function (err){
      if (err) { return done(err); }
      return done();
    });//_∏_

  } catch (err) { return done(err); }

};



/**
 * Waterline.getModel()
 *
 * Look up one of an ORM's models by identity.
 * (If no matching model is found, this throws an error.)
 *
 * --EXPERIMENTAL--
 *
 * ------------------------------------------------------------------------------------------
 * @param {String} modelIdentity
 *        The identity of the model this is referring to (e.g. "pet" or "user")
 *
 * @param {Ref} orm
 *        The ORM instance to look for the model in.
 * ------------------------------------------------------------------------------------------
 * @returns {Ref}  [the Waterline model]
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If no such model exists.
 *         E_MODEL_NOT_REGISTERED
 *
 * @throws {Error} If anything else goes wrong.
 * ------------------------------------------------------------------------------------------
 */
module.exports.getModel = function (modelIdentity, orm){
  return getModel(modelIdentity, orm);
};
