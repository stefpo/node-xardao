/********************************************************************************
 * rdao_sqlite3.js
 * Sqlite3 rdao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var mysql = require('mysql');
var data = require('./datatable.js');
var rdao = require ('./rdao_common.js');

isFunction = rdao.isFunction;
then = rdao.then;

class Connection {
    constructor() {
        this.debugMode = true;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
    }
    
    debug(f,s) {
       if (this.debugMode) console.log(f + ": " + s)
    }

    open(dbname, callback) {
        this.db =  new mysql.createConnection(dbname);
        this.db.connect(callback);
    }

    batch() {
        return new rdao.Batch(this);
    }

    close(callback) {
        try {
            this.db.end();
            then(callback);
        } catch (e) {
            then( function() { callback(e) }  );
        }        
    }

    sqlDate(d) { return rdao.sqlDate(this,d) }
    sqlParam(value) { return rdao.sqlParam(this, value) }
    mergeParams(sql, params) { return rdao.mergeParams(this, sql, params) }
    getRealSql(queryObject) { return rdao.getRealSql(this, queryObject) }

    getDataTable(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err, rows, fields)  {
            if (err) {
                self.debug("getDataTable",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let dt = new data.DataTable;
                if (rows.length > 0 ) {
                    let cols = Object.keys(rows[0])
                    for (let c = 0; c< cols.length; c++) dt.addColumn(cols[c])
                    for (let r = 0; r<rows.length; r++ ) {
                        dt.addRow( dt.newRow(rows[r]));
                    }
                }
                self.debug("getDataTable",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, dt) } );
            }
        });
    }

    getList(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err,rows, fields)  {
            if (err) {
                self.debug("getList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    let k = Object.keys(rows[0]);
                    let k1 = k[0];
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push(rows[r][k1]);
                    }
                }
                self.debug("getList",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { undefined, callback(list) } );
            }
        });
    }    

    getKVList(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err,rows, fields)  {
            if (err) {
                self.debug("getKVList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    let k = Object.keys(rows[0]);
                    let k1 = k[0];
                    let k2 
                    if (k.length>=2) k2 = k[1]; else k2=k[0];
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push( [ rows[r][k1], rows[r][k2]]);
                    }
                }
                self.debug("getKVList",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { undefined, callback(list) } );
            }
        });
    }       

    getScalar(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err,rows, fields)  {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    let k = Object.keys(rows[0]);
                    let k1 = k[0];
                    let ret = rows[0][k1];
                    console.log (JSON.stringify(rows) );
                    console.log (JSON.stringify(ret) );
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                } else {
                    if (isFunction(callback)) then( function() { callback(undefined, []) } );
                }
                self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
                
            }
        });
    
    }

    exec(params, callback) { rdao.exec(this, params, callback) }
    execMultiple(queries, callback) { rdao.execMultiple(this, queries, callback) }

    execSingle(params, callback) {
        var self=this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        this.debug("execSingle",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err, result)  {
            if (err) { 
                self.debug("execSingle",'Error: '+err.code);
                then( function() {callback(err)}) ;
            }
            else { 
                self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms LastId: ' + result.insertId + ' Changes: '+result.affectedRows);
                self.lastInsertId = result.insertId;
                self.lastStatementChanges = result.affectedRows;
                then(callback)
            };
        });
    }

}

exports.Connection = Connection;
 