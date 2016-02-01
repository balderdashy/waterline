# Waterline Changelog

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
