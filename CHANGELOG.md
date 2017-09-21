# Waterline Changelog

### Edge

##### General
* [BREAKING] Waterline attribute names must now be [ECMAScript 5.1-compatible variable names](https://github.com/mikermcneil/machinepack-javascript/blob/3786c05388cf49220a6d3b6dbbc1d80312d247ec/machines/validate-varname.js#L41).
  + Custom column names can still be configured to anything, as long as it is supported by the underlying database.
* [BREAKING] Breaking changes to criteria usage:
  + For performance, criteria passed in to Waterline's model methods will now be mutated in-place in most situations (whereas in Sails/Waterline v0.12, this was not necessarily the case.)
  + Aggregation clauses (`sum`, `average`, `min`, `max`, and `groupBy`) are no longer supported in criteria.  Instead, see new model methods.
  + `limit: 0` **no longer does the same thing as `limit: undefined`**.  Instead of matching ∞ results, it now matches 0 results.
  + `skip: -20` **no longer does the same thing as `skip: undefined`**.  Instead of skipping zero results, it now refuses to run with an error.
  + Limit must be < Number.MAX_SAFE_INTEGER (...with one exception: for compatibility/convenience, `Infinity` is tolerated and normalized to `Number.MAX_SAFE_INTEGER` automatically.)
  + Skip must be < Number.MAX_SAFE_INTEGER
  + Criteria dictionaries with a mixed `where` clause are no longer supported.
    + e.g. instead of `{ username: 'santaclaus', limit: 4, select: ['beardLength', 'lat', 'long']}`,
    + use `{ where: { username: 'santaclaus' }, limit: 4, select: ['beardLength', 'lat', 'long'] }`.
    + Note that you can still do `{ username: 'santaclaus' }` as shorthand for `{ where: { username: 'santaclaus' } }` -- it's just that you can't mix other top-level criteria clauses (like `limit`) alongside constraints (e.g. `username`).
    + And as for anywhere you're building criteria using Waterline's chainable deferred object, then don't worry about this-- it's taken care of for you.
* [DEPRECATE] Deprecated criteria usage:
  + Avoid specifying a limit of < 0.  It is still ignored, and acts like `limit: undefined`, but it now logs a deprecation warning to the console.
* [BREAKING] With the major exception of `.populate()`, repeated use of any other one chainable query method like `.sort()`, `.where()`, `.set()`, `.meta()`, etc is no longer supported. For example, you should not do: `User.find().where({username: 'santaclaus'}).where({location: 'north pole'})`
* [BREAKING] Coercion of result records
  + Resulting records from calling model methods are no longer special instances-- they are just dictionaries (plain JavaScript objects)
  + There are now warning messages for some common problematic results from the adapter. This is designed to make it easier to catch schema migration issues, as well as to identify adapter bugs.


##### Automigrations
* [BREAKING] Automigrations now live outside of Waterline core (in waterline-util)
  + Remove `index` for automigrations
  + In core SQL adapters, `.create()` and `.createEach()` no longer deals with updating the current autoincrement sequence (the "next value to use") when a record with a greater value is explicitly created

##### Data types
* The data types in Waterline have changed to more closely reflect their purpose: validation and coercion of JavaScript values. This drastically reduced the number of types to just 5: string, number, boolean, json, and ref.
* To allow for flexibility in automigrations, attributes may also specify a new key, `columnType`. If specified, the `columnType` is sent to the appropriate adapter during automigration (in sails-hook-orm). This allows Sails/Waterline models to indicate how the values for individual attributes should be stored _at rest_ vs. how they are validated/coerced when your code calls `.create()` or `.update()`.
* All documented previously-supported types are checked for and adjusted if possible (in sails-hook-orm), but if you are using a custom type, you may need to choose an appropriate `type` and `columnType`.
* `defaultsTo` can no longer be specified as a function. In practice, this can lead to unintended consequences, and its implementation was adding considerable weight and complexity to Waterline (without a whole lot of tangible benefit).
* Optional attributes with no value specified are no longer necessarily stored as `null`. If they are set to `type: 'json'` or `type: 'ref'`, and there is no `defaultsTo`, then `null` is stored. But, if an attribute declares itself as `type: 'string'`, then when a record is created without specifying a value for that attribute, it is stored as `''` (empty string). Similarly, `type: 'number'` is stored as `0`, and `type: 'boolean'` as `false`. To represent an attribute which might be `null` or a string, use `type: 'json'` (combining it with the new `isString` validation rule, if you like).

##### Model methods
+ Revamped [.stream()](http://sailsjs.com/documentation/reference/waterline-orm/models/stream)
  + Simplify interface and remove reliance on emitters in favor of [adapter-agnostic batch processing](https://gitter.im/balderdashy/sails?at=58655edd9d4cc4fc53553d51).
  + Add support for `.populate()`
  + Now supports batch-at-a-time or record-at-a-time iteration.


##### `required` & `allowNull`

* [BREAKING] Standardizing the definition of `required`
  + If an attribute specifies itself as `required`, it means that a value for the attribute must be _defined_ when using Waterline to do a `.create()`.
  + For example, if `foo` is a required attribute, then passing in `foo: undefined` or omitting `foo` on a `.create()` would fail the required check.
  + In addition, trying to .create() OR .update() the value as either `''` (empty string) or `null` would fail the required check.
+ If an attribute specifies itself as `type: 'string'`, then if a value for that attr is explicitly provided as `null` in a `.create()` or `.update()`, it will **no longer be allowed through**-- regardless of the attribute's `required` status.
+ Other types (json and ref) allow `null` out of the box.  To support a string attribute which might be `null`, you'll want to set the attribute to `type: 'json'`.  If you want to prevent numbers, booleans, arrays, and dictionaries, then you'll also want to add the `isString: true` validation rule.
+ For more information and a reference of edge cases, see https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1927470769


### 0.12.2

* [BUGFIX] Fix issues with compatibility in alter auto-migrations. This was causing corrupted data depending on the permutation of adapter version and Waterline version. This should be fixed in the SQL adapters that support the new select query modifier.

* [ENHANCEMENT] Updated dependencies to remove warning messages when installing.

### 0.12.1

* [BUGFIX] Fixes an issue when searching by `id` in schemaless mode. See [#1326](https://github.com/balderdashy/waterline/issues/1326) for more details.

### 0.12.0

* [ENHANCEMENT] Allows attribute definitions to contain a `meta` property that will be passed down to the adapter. This allows arbitrary information about an attribute to be passed down to interactions on the physical storage engine. Going forward any adapter specific migration information should be sent via the `meta` property. See [#1306](https://github.com/balderdashy/waterline/pull/1306) for more information.

* [ENHANCEMENT] Allows for the use of `.select()` to build out projections in both top level queries and association queries. See [#1310](https://github.com/balderdashy/waterline/pull/1310) for more details and examples.

* [ENHANCEMENT] Allow for the ability to pass in extra data to an adapter function using the `.meta()` option. This could be used for a variety of things inside custom adapters such as passing connections around for transactions or passing config values for muti-tenant functionality. For more details see [#1325](https://github.com/balderdashy/waterline/pull/1325).

### 0.11.6

* [BUGFIX] Remove max engines SVR re #1406. Also normalize 'bugs' URL, and chang…  …     [d89d2a6](https://github.com/balderdashy/waterline/commit/d89d2a6)
* [INTERNAL] Add latest Node versions, and add 0.11.x branch to CI whitelist.      [ca0814e](https://github.com/balderdashy/waterline/commit/ca0814e)
* [INTERNAL] Add appveyor.yml for running tests on Windows.      [c88cfa7](https://github.com/balderdashy/waterline/commit/c88cfa7)

### 0.11.5

* [BUGFIX] Fix join table mapping for 2-way collection assocations (i.e. "many to many"), specifically in the case when a `through` model is being used, and custom column names are configured.  Originally identified in [this StackOverflow question](http://stackoverflow.com/questions/37774857/sailsjs-through-association-how-to-create-association)  (Thanks [@ultrasaurus](https://github.com/ultrasaurus)!)   [8b46f0f](https://github.com/balderdashy/waterline/commit/8b46f0f), [1f4ff37](https://github.com/balderdashy/waterline/commit/1f4ff37)
* [BUGFIX] Make `.add()` idempotent in 2-way collection associations -- i.e. don't error out if the join record already exists.  Fixes [#3784](https://github.com/balderdashy/sails/issues/3784 (Thanks [@linxiaowu66](https://github.com/linxiaowu66)!)      [a14d16a](https://github.com/balderdashy/waterline/commit/a14d16a),[5b0ea8b](https://github.com/balderdashy/waterline/commit/5b0ea8b)

### 0.11.4

* [BUGFIX] Fix auto-updating attributes to take into account custom column names. See [#1360](https://github.com/balderdashy/waterline/pull/1360) for more details. Thanks to [@jenjenut233](https://github.com/jenjenut233) for the patch!   Also fixes https://github.com/balderdashy/sails/issues/3821.

### 0.11.2

* [BUGFIX] Fixes an issue when searching by `id` in schemaless mode. See [#1326](https://github.com/balderdashy/waterline/issues/1326) for more details.

### 0.11.1

* [ENHANCEMENT] Handles fatal errors in validations better and returns clearer error messages for them. Who knew crashing the process would be bad? Thanks [@mikermcneil](https://github.com/mikermcneil)

### 0.11.0

* [BREAKING CHANGE] Removed the second argument from `.save()` commands that returns the newly updated data that has been re-populated. This should increase performance and limit memory. See [#1295](https://github.com/balderdashy/waterline/pull/1295) for more details.

* [ENHANCEMENT] Errors coming from `.save()` now return actual Error objects that have been extended from `WLError`.

* [BUGFIX] Fixes issue with dynamic finders not understanding custom `columnName` attributes. See [#1298](https://github.com/balderdashy/waterline/pull/1298) for more details. Thanks [@HaKr](https://github.com/HaKr) for the detailed test case.

* [ENHANCEMENT] Auto timestamps column names are now overridable. See[#946](https://github.com/balderdashy/waterline/pull/946) for more details. Thanks [@Esya](https://github.com/Esya) for the patch.

* [ENHANCEMENT] Add support for an array of values to be passed into `populate`. ex `.populate(['foo', 'bar'])`. See [#1190](https://github.com/balderdashy/waterline/pull/1190) for more details. Thanks [@luislobo](https://github.com/luislobo) for the patch.

* [ENHANCEMENT] Ensures that createdAt and updatedAt are always the exact same on `create`. See [#1201](https://github.com/balderdashy/waterline/pull/1201) for more details. Thanks [@ziacik](https://github.com/ziacik) for the patch.

* [BUGFIX] Fixed issue with booleans not being cast correctly for validations. See [#1225](https://github.com/balderdashy/waterline/pull/1225) for more details. Thanks [@edupsousa](https://github.com/edupsousa) for the patch.

* [BUGFIX] Fixed bug where dates as primary keys would fail serialization. See [#1269](https://github.com/balderdashy/waterline/pull/1269) for more details. Thanks [@elennaro](https://github.com/elennaro) for the patch.

* [BUGFIX] Update support and patch some bugs in Many-To-Many through associations. See [#1134](https://github.com/balderdashy/waterline/pull/1134) for more details. Thanks [@atiertant](https://github.com/atiertant) for the patch.


### 0.10.30

* [BUGFIX] Fix issue with maximum callstack when using dates as foreign keys. See [#1265](https://github.com/balderdashy/waterline/issues/1265) for more details. Thanks [@elennaro](https://github.com/elennaro) for the patch.

### 0.10.29

* [ENHANCEMENT] Update version of Anchor to fix issue with email validations

### 0.10.28

* [BUGFIX] Fix issue with `through` table joins. See [#1134](https://github.com/balderdashy/waterline/pull/1134) for more details. Thanks [@atiertant](https://github.com/atiertant) for the patch!

* [ENHANCEMENT] Bump version of [Waterline-Schema](https://github.com/balderdashy/waterline-schema) to the latest.

* [ENHANCEMENT] Update Travis tests to run on Node 4 and 5.

### 0.10.27

* [BUGFIX] Fix issue with invalid `in` criteria removing more data than it should. See [#1076](https://github.com/balderdashy/waterline/pull/1076) for more details. Thanks [@slester](https://github.com/slester) for the patch!

### 0.10.26

* [BUGFIX] Fix issue with `defaultsTo` not setting values for undefined values.

### 0.10.25 and earlier?

See https://github.com/balderdashy/waterline/commits/f5efc0349fe9594a962357287bb6c25acdda9a76.

> #### Earlier still?
>
> For the first year or so, Waterline lived in the main Sails repo.  See https://github.com/balderdashy/sails/commits/master?after=q8Jnoggc%2F%2B7O7021adjRanuRhssrNDM3NA%3D%3D and back.


