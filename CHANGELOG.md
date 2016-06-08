# Waterline Changelog

### 0.12.2

* [BUG] Fix issues with compatibility in `alter` auto-migrations. This was causing corrupted data depending on the permutation of adapter version and Waterline version. This should be fixed in the SQL adapters that support the new `select` query modifier.

* [ENHANCEMENT] Updated dependencies to remove warning messages when installing.

### 0.12.1

* [BUG] Fixes an issue when searching by `id` in schemaless mode. See [#1326](https://github.com/balderdashy/waterline/issues/1326) for more details.

### 0.12.0

* [Enhancement] Allows attribute definitions to contain a `meta` property that will be passed down to the adapter. This allows arbitrary information about an attribute to be passed down to interactions on the physical storage engine. Going forward any adapter specific migration information should be sent via the `meta` property. See [#1306](https://github.com/balderdashy/waterline/pull/1306) for more information.

* [Enhancement] Allows for the use of `.select()` to build out projections in both top level queries and association queries. See [#1310](https://github.com/balderdashy/waterline/pull/1310) for more details and examples.

* [Enhancement] Allow for the ability to pass in extra data to an adapter function using the `.meta()` option. This could be used for a variety of things inside custom adapters such as passing connections around for transactions or passing config values for muti-tenant functionality. For more details see [#1325](https://github.com/balderdashy/waterline/pull/1325).

### 0.11.3

* [BUG] Fix auto-updating attributes to take into account custom column names. See [#1360](https://github.com/balderdashy/waterline/pull/1360) for more details. Thanks to [@jenjenut233](https://github.com/jenjenut233) for the patch!

### 0.11.2

* [BUG] Fixes an issue when searching by `id` in schemaless mode. See [#1326](https://github.com/balderdashy/waterline/issues/1326) for more details.

### 0.11.1

* [Enhancement] Handles fatal errors in validations better and returns clearer error messages for them. Who knew crashing the process would be bad? Thanks [@mikermcneil](https://github.com/mikermcneil)

### 0.11.0

* [BREAKING CHANGE] Removed the second argument from `.save()` commands that returns the newly updated data that has been re-populated. This should increase performance and limit memory. See [#1295](https://github.com/balderdashy/waterline/pull/1295) for more details.

* [ENHANCEMENT] Errors coming from `.save()` now return actual Error objects that have been extended from `WLError`.

* [BUG] Fixes issue with dynamic finders not understanding custom `columnName` attributes. See [#1298](https://github.com/balderdashy/waterline/pull/1298) for more details. Thanks [@HaKr](https://github.com/HaKr) for the detailed test case.

* [ENHANCEMENT] Auto timestamps column names are now overridable. See[#946](https://github.com/balderdashy/waterline/pull/946) for more details. Thanks [@Esya](https://github.com/Esya) for the patch.

* [ENHANCEMENT] Add support for an array of values to be passed into `populate`. ex `.populate(['foo', 'bar'])`. See [#1190](https://github.com/balderdashy/waterline/pull/1190) for more details. Thanks [@luislobo](https://github.com/luislobo) for the patch.

* [ENHANCEMENT] Ensures that createdAt and updatedAt are always the exact same on `create`. See [#1201](https://github.com/balderdashy/waterline/pull/1201) for more details. Thanks [@ziacik](https://github.com/ziacik) for the patch.

* [BUG] Fixed issue with booleans not being cast correctly for validations. See [#1225](https://github.com/balderdashy/waterline/pull/1225) for more details. Thanks [@edupsousa](https://github.com/edupsousa) for the patch.

* [BUG] Fixed bug where dates as primary keys would fail serialization. See [#1269](https://github.com/balderdashy/waterline/pull/1269) for more details. Thanks [@elennaro](https://github.com/elennaro) for the patch.

* [BUG] Update support and patch some bugs in Many-To-Many through associations. See [#1134](https://github.com/balderdashy/waterline/pull/1134) for more details. Thanks [@atiertant](https://github.com/atiertant) for the patch.


### 0.10.30

* [BUG] Fix issue with maximum callstack when using dates as foreign keys. See [#1265](https://github.com/balderdashy/waterline/issues/1265) for more details. Thanks [@elennaro](https://github.com/elennaro) for the patch.

### 0.10.29

* [ENHANCEMENT] Update version of Anchor to fix issue with email validations

### 0.10.28

* [BUG] Fix issue with `through` table joins. See [#1134](https://github.com/balderdashy/waterline/pull/1134) for more details. Thanks [@atiertant](https://github.com/atiertant) for the patch!

* [ENHANCEMENT] Bump version of [Waterline-Schema](https://github.com/balderdashy/waterline-schema) to the latest.

* [ENHANCEMENT] Update Travis tests to run on Node 4 and 5.

### 0.10.27

* [BUG] Fix issue with invalid `in` criteria removing more data than it should. See [#1076](https://github.com/balderdashy/waterline/pull/1076) for more details. Thanks [@slester](https://github.com/slester) for the patch!

### 0.10.26

* [BUG] Fix issue with `defaultsTo` not setting values for undefined values.
