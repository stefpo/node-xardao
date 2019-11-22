# xardao

Xardao Asynchronous Relational Database Access Object

A library to standardize datadase interface in Node without obscuring SQL.
Currently supports SQLite and MariaDB (mysql)

The library is fully asynchronous and provides both a callback and a promise version of all functions.

It provides the basic functions of a database driver through the same interface for all databases:

* Read a set of rows to a data table
* Read a single value
* Execute SQL statement, eithe individually or sequentially

It also provides a base CRUD adapter that can be used as the foundation for creating business objects
