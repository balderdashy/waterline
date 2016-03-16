# Waterline Changelog

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
