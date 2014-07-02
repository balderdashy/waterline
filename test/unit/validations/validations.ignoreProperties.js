var Validator = require( '../../../lib/waterline/core/validations' ),
  assert = require( 'assert' );

describe( 'validations', function () {

  describe( 'special types', function () {
    var validator;

    before( function () {

      var validations = {
        name: {
          type: 'string'
        },
        email: {
          type: 'email',
          special: true
        },
        cousins: {
          collection: 'related',
          via: 'property',
          async: true
        }
      };

      var defaults = {
        ignoreProperties: [ 'async', 'special' ]
      };

      validator = new Validator();
      validator.initialize( validations );

      customValidator = new Validator();
      customValidator.initialize( validations, {}, defaults );
    } );

    it( 'custom validator should validate email type', function ( done ) {
      customValidator.validate( {
        email: 'foobar@gmail.com'
      }, function ( errors ) {
        assert( !errors );
        done();
      } );
    } );

    it( 'custom validator should validate collection type', function ( done ) {
      customValidator.validate( {
        cousins: []
      }, function ( errors ) {
        assert( !errors );
        done();
      } );
    } );

    it( 'standard validator should error with unrecognized properties', function ( done ) {
      assert.throws( function () {
        validator.validate( {
          email: 'foobar@gmail.com'
        }, function ( errors ) {
          return done();
        } );
      }, function ( err ) {
        if ( ( err instanceof Error ) && /Unknown rule: special/im.test( err ) ) {
          return true;
        }
      } );
      done();

    } );

    it( 'standard validator should error with unrecognized properties in an association', function ( done ) {
      assert.throws( function () {
        validator.validate( {
          cousins: []
        }, function ( errors ) {
          return done();
        } );
      }, function ( err ) {
        if ( ( err instanceof Error ) && /Unknown rule: async/im.test( err ) ) {
          return true;
        }
      } );
      done();
    } );

  } );
} );
