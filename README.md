# xardao
--------
## Overview

Xardao Asynchronous Relational Database Access Object

A library to standardize datadase interface in Node without obscuring SQL.
Currently supports SQLite, MariaDB (mysql), PostgreSQL, SQL server

The library is fully asynchronous and provides both a callback and a promise version of all functions.

It provides the basic functions of a database driver through the same interface for all databases:

* Read query result to an object
* Read a set of rows to a data table or array of objects
* Read a single value
* Execute SQL statement, eithe individually or sequentially

It also provides a base CRUD adapter that can be used as the foundation for creating business objects

The package DOES NOT specify the original driver as dependencies. This is done on purpose bacause you 
generally use only one type of database in your project.

The underlying database driver module must be installed in your project

`a = Connection ( connSpec )`

