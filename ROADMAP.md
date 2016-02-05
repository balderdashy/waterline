# Waterline Roadmap

This file contains the development roadmap for the upcoming release of Waterline, as well as the project backlog.

&nbsp;
&nbsp;


## v0.12

This section includes the main features, enhancements, and other improvements tentatively planned or already implemented for the v0.11 release of Waterline.  Note that this is by no means a comprehensive changelog or release plan and may exclude important additions, bug fixes, and documentation tasks; it is just a reference point.  Please also realize that the following notes may be slightly out of date-- until the release is finalized, API changes, deprecation announcements, additions, etc. are all tentative.

 + Updated lifecyle hooks
  + Pass criteria into the hooks.
 + Deep populate
  + Recursively populate child associations.
 + Updated Docs
  + Document adapter spec in detail, including the `join` method and how it's used.


&nbsp;
&nbsp;


## Backlog

The backlog consists of approved proposals for useful features which are not currently in the immediate-term roadmap above, but would be excellent places to contribute code to Waterline. We would exuberantly accept a pull request implementing any of the items below, so long as it was accompanied with reasonable tests that prove it, and it doesn't break other core functionality. Please see the Sails/Waterline [contribution guide](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md) to get started.

> - If you would like to see a new feature or an enhancement to an existing feature in Waterline, please review the [Sails/Waterline contribution guide](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md). When you are ready, submit a pull request adding a new row to the bottom of this table.
> - In your pull request, please include a detailed proposal with a short summary of your use case, the reason why you cannot implement the feature as an adapter, and a well-reasoned explanation of how you think that feature could be implemented.  Your proposal should include changes or additions to usage, expected return values, and any errors or exit conditions.
> - Once your pull request has been created, add an additional commit which links to it from your new row in the table below.



Feature                                          | Proposal                                                                              | Summary
 :---------------------------------------------- | :------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------
 Pass criteria into lifecycle hooks              | [#1122](https://github.com/balderdashy/waterline/pull/1122)                           | Pass the queries criteria into lifecycle hooks.
 Deep populate                                   | [#1052](https://github.com/balderdashy/waterline/pull/1052)                           | Recursively populate child associations.



&nbsp;
&nbsp;


## Pending Proposals

The backlog items below are from before the recent change to the Waterline project's contribution guidelines, and are suggestions for features or enhancements, but are not yet accompanied by a complete proposal.  Before any of the following backlog items can be implemented or a pull request can be merged, a detailed proposal needs to be submitted, discussed and signed off on by the project maintainers.  For information on writing a proposal, see the [Sails/Waterline contribution guide](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md).  **Please do not submit a pull request _adding_ to this section.**

> - If you are the original proposer of one of these items, someone from the core team has contacted you in the linked issue or PR, if one was provided. Thank you for your help!
> - If you are interested in seeing one of the features or enhancements below in Sails core, please create a new pull request moving the relevant item(s) to the backlog table with additional details about your use case (see the updated contribution guide for more information).


Feature                                                     | Summary
 :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Support the full Bluebird API                              | Support the full bluebird API. See this [issue](https://github.com/balderdashy/waterline/issues/1232) for more details.
 Support for custom indexes                                 | Support custom and composite indexes. See this [issue](https://github.com/balderdashy/waterline/issues/109) for more details.
 Support for concurrency locking                            | Prevent multiple users from accidentally overwriting each other's updates. See this [issue](https://github.com/balderdashy/waterline/issues/1259) for more details.
 Better batch insert queries                                | Optimize `create` using the adapter's `createEach` when this possible. See this [issue](https://github.com/balderdashy/waterline/issues/1007) for more details.
 Add support for populating primary keys only               | Return an array of the child's primary keys. See this [issue](https://github.com/balderdashy/waterline/issues/532) for more details.
 Support for polymorphic associations                       | Support polymorphic associations. See this [issue](https://github.com/balderdashy/waterline/issues/484) for more details.
 Populate performance improvements                          | Make populate run faster with less memory usage. See this [issue](https://github.com/balderdashy/waterline/issues/343) for more details.
 Add where `empty`/ `not empty` criteria                    | Support `where empty` / `where not empty` criteria modifiers. See this [issue](https://github.com/balderdashy/waterline/issues/189) for more details.
 Add a cache mechanism                                      | Add the ability to cache ORM results. See this [issue](https://github.com/balderdashy/waterline/issues/200) for more details.
 Add the ability to toggle case sensitivity in queries      | Add the ability to select a case sensitivity when running a query. See this [issue](https://github.com/balderdashy/waterline/issues/239) for more details.
 Add cascading delete support                               | Add the ability to do cascading deletes. See this [issue](https://github.com/balderdashy/waterline/issues/251) for more details.
 Deeper association criteria modifiers                      | Add the ability to filter parent records using child attribute criteria. See this [issue](https://github.com/balderdashy/waterline/issues/266) for more details.
 Support upsert queries                                     | Add support for `upsert` to create a new record if no matches were found.
 Add population count                                       | Add syntax for getting the count of populated records rather than the values. See this [issue](https://github.com/balderdashy/waterline/issues/811) for more details.
 Support denormalization                                    | Support embeddable association. See this [PR](https://github.com/balderdashy/waterline/pull/428) for more details.
 Support default conditions                                 | Support default conditions in queries. See this [issue](https://github.com/balderdashy/waterline/issues/988) for more details.
 Make m:n nested updates API consistent with 1:1 and 1:M    | Nested updates in the form of `User.update({id: 1 }, { posts: [ { id: 1, title: 'Test post - updated' }] })` work for 1:1 and 1:M associations but breaks for M:N associations. The API for this should be consistent between association types. See [tests](https://github.com/balderdashy/waterline-adapter-tests/pull/51) for more details.
 Support explicit `in` key in query language                | Add support for an explicit `in` key to work alongside using an array. See this [issue](https://github.com/balderdashy/waterline/issues/1186) for more details.
 Support deeper M:M through options                         | Add the ability for `through` tables to support multiple associations. See this [issue](https://github.com/balderdashy/waterline/issues/705) for more details.
 Transactions                                               | Add the ability to run transactions on adapters that support them. See this [issue](https://github.com/balderdashy/waterline/issues/755) for more details.
 Projections                                                | Add the ability to use `.select()` on any query, including associations. See this [issue](https://github.com/balderdashy/waterline/issues/919) for more details.
 Change the `this` context inside lifecycle callbacks       | Currently the `this` context is the generic collection instead of the instance (no instance has been made yet). Change this to get access to instance methods. See [issue](https://github.com/balderdashy/waterline/issues/1210) for more details.
 Run lifecycle callbacks on defined join tables             | Lifecycle callbacks don't run for join table records. See [issue](https://github.com/balderdashy/waterline/issues/1215) for more details.
 Do not mess with identity case                             | Identities of models should not be lowercased per default, better be left as defined. See [issue](https://github.com/balderdashy/waterline/issues/745) for more details.
 Support JSONB in PostgreSQL                                | Add support for JSONB querying in the Postgres adapter. This requires modifing/extending the criteria language. See [issue](https://github.com/balderdashy/sails-postgresql/issues/212) for more details.
