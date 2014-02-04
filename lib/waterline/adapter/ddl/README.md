# DDL

DDL stands for data definition language.  It refers to functionality which defines/modifies data structures.  For our purposes in Waterline, it refers to methods which read from or modify the schema.

This submodule implements default behavior for adapter methods like `define`, `describe`, `alter`, and `drop`.


### Altering a schema

Some considerations must be taken into account when modifying the schema of a structured database. 

##### Adding attributes
If a new attribute was added, it is trivial to update the physical layer accordingly-- we just call `addAttribute` and update all records using its the default value.

##### Removing attributes
We just call `removeAttribute` on the adapter, or use the default behavior (update all records, setting the attribute's value to `undefined`).

##### Updating attributes

This is trickier.  First, we try to load all data from the data source in memory.  If we can't do that, we give up.  This is not the most efficient or useful thing to do, but it is a safety measure to help prevent data from being corrupted.

Assuming this works, we remove any attributes which have changed, then add them again, using the approach described above.

Finally, we update all records, using data we stored in memory earlier to repopulate the values in any columns which were both removed AND added.
