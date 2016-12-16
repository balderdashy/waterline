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
    + Note that you can still do `{ username: 'santaclaus' }` as shorthand for `{ where: { username: 'santaclaus' } }` -- it's just that you can't mix other top-level query clauses in there without namespacing the `where` operators inside of `where`.
    + And as for anywhere you're building criteria using Waterline's chainable deferred object, then don't worry about this-- it's taken care of for you.
* [DEPRECATE] Deprecated criteria usage:
  + Avoid specifying a limit of < 0.  It is still ignored, and acts like `limit: undefined`, but it now logs a deprecation warning to the console.
* [BREAKING] With the major exception of `.populate()`, repeated use of any other one chainable query method like `.sort()`, `.where()`, `.set()`, `.meta()`, etc is no longer supported.
* [BREAKING] Coercion of resulting records
  + Resulting records are no longer special instances-- they are just dictionaries (plain JavaScript objects)
  + Resulting records are now also coerced using RTTC semantics; meaning that when properties come back from the adapter as `undefined`, Waterline's behavior is now standardized.  Specifically, it is governed by the concept of RTTC base values.  The exact meaning of this varies depending on `type`, so here's a rundown:
    + `type: 'string'` - `''` (empty string)
    + `type: 'number'` - `0` (zero)
    + `type: 'boolean'` - `false`
    + `type: 'json'` - `null`
    + `type: 'ref'` - `null`
    + `model: ...` - `null`
    + _(collection attrs are virtual, so they are omitted when not being populated)_

* [BREAKING] Updating records to have `null` values for an attribute that declares a `defaultsTo` now results in setting the default value in the database-- _instead of `null`_.
* [BREAKING] If adapter does not send back a value for a particular attribute (or if it sends back `undefined`), then send the following back to userland code:
  + if it is the primary key, then trigger callback with an Error
  + else if it is a singular ("model") association, return `null` as the result
  + else if it has a default value, return it as the result
  + otherwise, return the appropriate base value for the type as the result
    + For type: 'string', this is `''`
    + For type: 'number', this is `0`
    + For type: 'boolean', this is `false`
    + For type: 'json', this is `null`
    + For type: 'ref', this is `null`
    + See https://gist.github.com/mikermcneil/dfc6b033ea8a75cb467e8d50606c81cc for more details.

##### Automigrations
* [BREAKING] Automigrations now live outside of Waterline core (in waterline-util)
  + Remove `index` for automigrations
  + In core SQL adapters, `.create()` no longer deals with updating the current autoincrement value (the "next value") when a record with a greater value is explicitly created
  + In core SQL adapters, `.createEach()` will STILL deal with updating the current autoincrement value (the "next value") when a record with a greater value is explicitly created -- BUT only when the `incrementSequencesOnCreateEach` meta key is set to `true`.


<!--

  TODO: figure this out; see https://gist.github.com/mikermcneil/dfc6b033ea8a75cb467e8d50606c81cc

##### `required` & `allowNull`

* [BREAKING] Standardizing the definition of `required`
  + If an attribute specifies itself as `required`, it means that a value for the attribute must be _defined_ when using Waterline to do a `.create()`.
  + For example, if `foo` is a required attribute, then passing in `foo: undefined` or omitting `foo` on a `.create()` would fail the required check.
* [NEW] The introduction of `allowNull` (some details still TBD)
  + If an attribute specifies itself as `allowNull: true`, then if a value for that attr is explicitly provided as `null` in a `.create()` or `.update()`, it will always be allowed through-- even in cases where it wouldn't be normally (i.e. the RTTC type safety check is skipped.)  For example, this allows you to set `null` for `type: 'string'` attributes (or "number", or "boolean").
  + If you attempt to explicitly specify `allowNull: false`, then you're prevented from initializing Waterline.  (You'll see an error, suggesting that you should use `validations: { notNull: true }` instead.)  This behavior could change in future versions of Waterline to allow for more intuitive usage, but for now, since there are other changes to how type safety checks work, it's better to err on the side of strictness.
  + Other types (json and ref) allow `null` out of the box anyway, so `allowNull: true` is not necessary for them.  If you try to set `allowNull: true` on a type: 'json' or type: 'ref' attribute, Waterline will refuse to initialize (explaining that this configuration is redundant, and that you can remove `allowNull: true`, since `type: 'json'`/`type: 'ref'` implicitly allow it anyways).
    + This is completely separate from the `required` check, which works the same way regardless- an attribute can be both `required: true` AND `allowNull: true`...as long as it is allowed to be both of those things individually.
  + If `allowNull: true` is set, then `defaultsTo` is allowed to be set to `null` regardless of whether it would normally be allowed.
    + For type: 'string', the implicit default is `''`
    + For type: 'number', the implicit default is `0`
    + For type: 'boolean', the implicit default is `false`
    + For type: 'json', the implicit default is `null`
    + For type: 'ref', the implicit default is `null`
    + For `model: ...`, the implicit default is `null`
  + In waterline-schema: If a singular ("model") association is NOT `required`, and it does not specify a `allowNull` setting, then the association is implicitly set to `allowNull: true`.
  + In waterline-schema: If a singular ("model") association IS `required`, and it does not specify a `allowNull` setting, then `null` will not pass (because it is not a valid foreign key value)
  + `allowNull: true` is never allowed on plural ("collection") associations
  + `allowNull: true` is also never allowed to be explicitly set on singular ("model") associations: if `allowNull: true` is explicitly set, then Waterline fails to initialize w/ an error (telling you that the attribute definition is invalid because you should not ever need to explicitly set `allowNull` on a singular ("model") association)
  + **Best practice**
    + Most of the time, `allowNull` shouldn't need to be used.  (For most attributes, it tends to be better not to use `null`- since it's so easy to store `null` accidentally, and then cause hard-to-debug data type mismatch issues.)


-->


### 0.11.6

* [BUGFIX] Remove max engines SVR re #1406. Also normalize 'bugs' URL, and chang…  …     [d89d2a6](https://github.com/balderdashy/waterline/commit/d89d2a6)
* [INTERNAL] Add latest Node versions, and add 0.11.x branch to CI whitelist.      [ca0814e](https://github.com/balderdashy/waterline/commit/ca0814e)
* [INTERNAL] Add appveyor.yml for running tests on Windows.      [c88cfa7](https://github.com/balderdashy/waterline/commit/c88cfa7)

### 0.11.5

* [BUGFIX] Fix join table mapping for 2-way collection assocations (i.e. "many to many"), specifically in the case when a `through` model is being used, and custom column names are configured.  Originally identified in [this StackOverflow question](http://stackoverflow.com/questions/37774857/sailsjs-through-association-how-to-create-association)  (Thanks [@ultrasaurus](https://github.com/ultrasaurus)!)   [8b46f0f](https://github.com/balderdashy/waterline/commit/8b46f0f), [1f4ff37](https://github.com/balderdashy/waterline/commit/1f4ff37)
* [BUGFIX] Make `.add()` idempotent in 2-way collection associations -- i.e. don't error out if the join record already exists.  Fixes [#3784](https://github.com/balderdashy/sails/issues/3784 (Thanks [@linxiaowu66](https://github.com/linxiaowu66)!)      [a14d16a](https://github.com/balderdashy/waterline/commit/a14d16a),[5b0ea8b](https://github.com/balderdashy/waterline/commit/5b0ea8b)

### 0.11.4

* [BUGFIX] Fix auto-updating attributes to take into account custom column names. See [#1360](https://github.com/balderdashy/waterline/pull/1360) for more details. Thanks to [@jenjenut233](https://github.com/jenjenut233) for the patch!   Also fixes https://github.com/balderdashy/sails/issues/3821.

### 0.12.2

* [BUGFIX] Fix issues with compatibility in alter auto-migrations. This was causing corrupted data depending on the permutation of adapter version and Waterline version. This should be fixed in the SQL adapters that support the new select query modifier.

* [ENHANCEMENT] Updated dependencies to remove warning messages when installing.

### 0.12.1

* [BUGFIX] Fixes an issue when searching by `id` in schemaless mode. See [#1326](https://github.com/balderdashy/waterline/issues/1326) for more details.

### 0.12.0

* [ENHANCEMENT] Allows attribute definitions to contain a `meta` property that will be passed down to the adapter. This allows arbitrary information about an attribute to be passed down to interactions on the physical storage engine. Going forward any adapter specific migration information should be sent via the `meta` property. See [#1306](https://github.com/balderdashy/waterline/pull/1306) for more information.

* [ENHANCEMENT] Allows for the use of `.select()` to build out projections in both top level queries and association queries. See [#1310](https://github.com/balderdashy/waterline/pull/1310) for more details and examples.

* [ENHANCEMENT] Allow for the ability to pass in extra data to an adapter function using the `.meta()` option. This could be used for a variety of things inside custom adapters such as passing connections around for transactions or passing config values for muti-tenant functionality. For more details see [#1325](https://github.com/balderdashy/waterline/pull/1325).

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


