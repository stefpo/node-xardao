
# xardao
--------
## Overview

Xardao Asynchronous Relational Database Access Object

A library to standardize datadase interface in Node without obscuring SQL.
Currently supports SQLite, MariaDB (mysql), PostgreSQL, SQL server

The library is fully asynchronous and all functions can be used both as for promise-style of callback-style calls.

```javascript
   // Callback style
   cn.getObjects ("select * from mytable", function(err, arrayOfObject) { do something ...} )

   // Promise style
   try {
      arrayOfObject = await cn.getObjects ("select * from mytable")
      do something ...
   } catch(e) {
      // in case there is an error
   } 
```

It provides the basic functions of a database driver through the same interface for all databases:

* Read query result to an object
* Read a set of rows to a data table or array of objects
* Read a single value
* Execute SQL statement, either individually or sequentially

It also provides a base CRUD adapter that can be used as the foundation for creating business objects

The package DOES NOT specify the original driver as dependencies. This is done on purpose bacause you 
generally use only one type of database in your project. 

The underlying database driver module must be added as a module dependency.

## API

### Class Connection

#### Opening a connection
Before you connect to a database engine, you need to get an instance of *Connection*.
It is not recommended to instanciate it using the "new" keyword from the driver class.

Instead you should use the *Connection* function from the xardao namespace.

```javascript
const xardao = require ('../lib/xardao.js'); 

cn = xardao.Connection('sqlite')
```

The Connection function accepts the following values as driver name:

* 'sqlite' or 'sqlite3'
* 'mysql' or 'mariadb'
* 'pg' or 'pgsql' or 'postgres'
* 'ms' or 'mssql'

 

#### One-line query specification
Most functions need a first parameter *query* that will indicates the SQL to be executed by the database engine. 
XARDAO provides a common method for passing SQL parameters to the underlying database engine.
Query may be one of the following:

* A SQL statement as a string
* An object with 2 or 3 attributes: 
     * *sql* : a string containing a SQL statement. Query parameters are prefixed with "@"
     * *params*: an object whose attributes are named after the parameters specified in *sql* (Without "@" prefix)
     * *options*: options to modify the function behavior

#####Example
```javascript
    await cn.exec ({ 
            sql: "insert into contacts(first_name, last_name) values (@firstName, @lastName) ",
            params: {
                firstName: "John",
                lastName: "Smith"
            }
          })
```


#### Opening and closing 
##### Connection#open( spec, [callback] )
Opens a database connection. *spec* is the database connection specification and is specific to the database driver chosen. 
Refer to each driver documentation for details. *Callback* is optional, but needed when using callback style.

##### Connection#close( [callback] )
Closes a database connection.
*Callback* is optional, but needed when using callback style.

#### Reading
##### Connection#getObjects( query, [callback] )
Runs the *query* and returns an array of objects, one for each row.
*Callback* is optional, but needed when using callback style.

##### Connection#getSingleObject( query, [callback] )
Runs the *query* and returns the first row as an object.
*Callback* is optional, but needed when using callback style.

##### Connection#getDataTable( query, [callback] )
Runs the *query* and returns the results as a datatable object.
*Callback* is optional, but needed when using callback style.

##### Connection#getScalar( query, [callback] )
Runs the *query* and returns the first field of the first row as single value.
*Callback* is optional, but needed when using callback style.

##### Connection#getList( query, [callback] )
Runs the *query* and returns the results as a array of scalar values containing only the fist column of each row.
*Callback* is optional, but needed when using callback style.

##### Connection#getKVList( query, [callback] )
Runs the *query* and returns the results as a an object. The first column is the Key and the second column is the value.
*Callback* is optional, but needed when using callback style.

##### Connection#forEachRow( query, eachRowFunc, [callback] )

#### Updating
##### Connection#execSingle( query, [callback] )
Executes a single query.
*Callback* is optional, but needed when using callback style.

##### Connection#execMultiple( arrayOfQueries, [callback] )
Executes multiple queries in a sequence.
*Callback* is optional, but needed when using callback style.

##### Connection#exec( queryOrArrayOfQueries, [callback] )
Provides a unique function for single and multiple queries. Act as an alias for *execSingle* or *execMultiple*, depending on the type of the first parmameter.

#### Working with transactions
The transaction methods provide a common wait of managing transactions.

##### Connection#beginTrans()
Starts a transaction 

##### Connection#commitTrans()
Commits current transaction. If no transaction is in progress, this call has no effect.

##### Connection#rollbackTrans()
Rolls back current transaction. If no transaction is in progress, this call has no effect.


### Class Datatable
This class provides a storage structure for the results. The columns and rows are stored separately which give the advantage that the columns information is available event of the resultset has no rows.

The Datatable object has the structure below:

```javascript
    {
        columns: [], // Each columns is a string 
        rows: []     // Each row is an array of values, in the same order as the columns
    }
```

*_Note_* The use of datatables may be deprecated in future releases.

### Integration with ExpressJS

In an web server context, each page call requires an isolated connection. It then becomes necessary to ensure that connections always get closed after each HTTP request.

Xardao provides 2 methods to ensure that the open connection will always be closed:

+ A decorator function to use in the router
+ A connection opener function

#### xardao.express.usingDBConnection(connSpec, controller)
"Decorates"  the function *Controller* by adding an open connection to request object.

```javascript
    // In the router:

    routes.get('/dtjson',   xardao.express.usingDBConnection(connSpec, controllers.dtjson))

    // In the controller, simply use the connection:

    req.conn.getDataTable('select * from assets', function(err, dt) {
      if (!err) {
        dt.className ='basic-table'
        res.render('dt', { title: 'Express', hitcount: req.session.hitcount, tbl: dt })
        next()
      }
      next(err)
    })
```

#### xardao.express.connect(connSpec, req, res)
Returns the connection specified by *connSpec*. A listener to the 'finish' event of the response is 
added to guarantee that the connection will always be closed, so there is no need to write specific code
to ensure proper connection closing.

```javascript
    // In the controller

    let conn = await xardao.express.connect(req.appconfig.database, req, res)

```