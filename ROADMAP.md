# ROADMAP.md

The current build status, immediate-term plans, and future goals of this repository.

> ###### Feature Requests
>
> We welcome feature requests as edits to the "Backlog" section below.
>
> Before editing this file, please check out [How To Contribute to ROADMAP.md](https://gist.github.com/mikermcneil/bdad2108f3d9a9a5c5ed)- it's a quick read :)
>
> Also take a second to check that your feature request is relevant to Waterline core and not one of its dependencies (e.g. waterline-schema, one of its adapters, etc.)  If you aren't sure, feel free to send the PR here and someone will make sure it finds its way to the right place.



## Build Status

| Release                                                                                                                 | Install Command                                                | Build Status
|------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -----------------
| [![NPM version](https://badge.fury.io/js/waterline.png)](https://github.com/balderdashy/waterline/tree/stable) _(stable)_       | `npm install waterline`                                          | [![Build Status](https://travis-ci.org/balderdashy/waterline.png?branch=stable)](https://travis-ci.org/balderdashy/waterline) |
| [edge](https://github.com/balderdashy/waterline/tree/master)                                                                | `npm install waterline@git://github.com/balderdashy/waterline.git` | [![Build Status](https://travis-ci.org/balderdashy/waterline.png?branch=master)](https://travis-ci.org/balderdashy/waterline) |



#### Roadmap

Our short-to-medium-term roadmap items that are under active development. Only items that have an active developer working on them are included here. Feature requests that are sound, but lack someone stearing the development, are found below under backlog items.

_(feel free to suggest things)_


 Feature                                                  | Owner                                                                            | Details
 :------------------------------------------------------- | :------------------------------------------------------------------------------- | :------
 deep populate                                            | [@atiertant](https://github.com/atiertant)                                       | recursively populate child assosiations (see [PR](https://github.com/balderdashy/waterline/pull/1052))
 denormalization support                                  | [@clarkorz](https://github.com/clarkorz)                                         | support embeddable association (see [PR](https://github.com/balderdashy/waterline/pull/428))
 make m:n nested updates API consistent with 1:1 and 1:m  | [@dmarcelino](https://github.com/dmarcelino)                                     | nested updates in the form of User.update({id: 1 }, { posts: [ { id: 1, title: 'Test post - updated' }] }) work for 1:1 and 1:m associations but breaks for m:n associations. The API for this should be consistent between association types. (see [tests](https://github.com/balderdashy/waterline-adapter-tests/pull/51))
 add conditions to associations                           | [@atiertant](https://github.com/atiertant)                                       | add default criteria to asociation (see [issue](https://github.com/balderdashy/waterline/issues/988))
 pass criteria in before* hooks                           | [@mmiller42](https://github.com/mmiller42)                                       | pass criteria to the beforeUpdate, beforeDestroy, and beforeValidate callbacks, before the callback param. (see [PR](https://github.com/balderdashy/waterline/pull/1122))
 manytomany through improvements                          | [@atiertant](https://github.com/atiertant)                                       | handle manytomany through with all other feature (see [PR](https://github.com/balderdashy/waterline/pull/1134))


#### Backlog

The backlog consists of features that are useful, but have not been picked up by someone for active development.  We would exuberantly accept a pull request implementing any of the items below, so long as it was accompanied with reasonable tests that prove it, and it doesn't break other core functionality.

 Feature                                                          | Owner                                              | Details
 :--------------------------------------------------------------- | :------------------------------------------------- | :------
 support the full bluebird API                                    |                                                    | support the full bluebird API (see [issue](https://github.com/balderdashy/waterline/issues/1232))
 support for custom indexes                                       |                                                    | support custom and composite indexes (see [issue](https://github.com/balderdashy/waterline/issues/109))
 support for concurrency locking                                  |                                                    | prevent multiple users from accidentally overwriting each other's updates (see [issue](https://github.com/balderdashy/waterline/issues/1259))
 call adapter.createEach when possible                            |                                                    | optimize create using adapter.createEach when this is possible (see [issue](https://github.com/balderdashy/waterline/issues/1007))
 populate indexes for has-Many associations                       |                                                    | return an array of child's primaryKey in the association attribute. (see [issue](https://github.com/balderdashy/waterline/issues/532))
 polymorphic associations                                         |                                                    | support polymorphic associations (see [issue](https://github.com/balderdashy/waterline/issues/484))
 populate performance improvements                                |                                                    | make populate run faster with less memory usage (see [issue](https://github.com/balderdashy/waterline/issues/343))
 add 'empty' criteria                                             |                                                    | support '''model.find( field: { empty: true } )''' to find records based on field assignment or not.  (see [issue](https://github.com/balderdashy/waterline/issues/189))
 add cache mechanism                                              |                                                    | add the ability to cache orm results (see [issue](https://github.com/balderdashy/waterline/issues/200))
 add 'caseSensitive' keyword in model attribute                   |                                                    | override default case insensitive behavior for this column (see [issue](https://github.com/balderdashy/waterline/issues/239))
 cascading delete support                                         |                                                    | destroy the related associated child(s) (see [issue](https://github.com/balderdashy/waterline/issues/251))
 associations criteria based                                      |                                                    | filter results on child field value ex: '''model.find( 'model.child.id': 5 )''' (see [issue](https://github.com/balderdashy/waterline/issues/266))
 findOrCreate() - is new                                          |                                                    | In callback supply isNew value indicating if new record was created, or existing one was found.
 population count                                                 |                                                    | Add syntax for getting the count of populated records rather than the values. See [#811](https://github.com/balderdashy/waterline/issues/811)


#### Recently Merged

Recent items on this list that have been merged into master will move down here.

 Feature                                         | Owner                                              | Details
 :---------------------------------------------- | :------------------------------------------------- | :------
 Explicit 'in' key in query language             | @nwhatt                                            | From issue #1186. If the value of a key is an empty array, it can be interpreted ```Errors.find({or: [{ foo: { in: foodIds, '!': null } },{ bar: { in: barId,'!': null } }]}).exec(...)```
