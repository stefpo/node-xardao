/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var sqlite3Connection;
var mariaDBConnection;

function Connection(driver) {
    if (driver == 'mysql' || driver == 'mariadb') { 
        if ( mariaDBConnection == undefined ) mariaDBConnection = require ('./driver_mariadb').Connection;
        return new mariaDBConnection() 
    }
    else if (driver == 'sqlite' || driver == 'sqlite3') { 
        if ( sqlite3Connection == undefined ) sqlite3Connection = require ('./driver_sqlite3').Connection;
        return new sqlite3Connection() 
    }
    else if (driver == 'pg' || driver == 'pgsql' || driver == 'postgres') { 
        if ( sqlite3Connection == undefined ) sqlite3Connection = require ('./driver_pgsql').Connection;
        return new sqlite3Connection() 
    }    
    else {
        throw new Error('Invalid RDAO driver name');
    }
}

exports.Connection = Connection;
exports.sqlite3Connection = sqlite3Connection;
exports.mariaDBConnection = mariaDBConnection;
exports.DataTable = require ('./datatable').DataTable;
