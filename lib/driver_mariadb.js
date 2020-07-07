/********************************************************************************
 * rdao_sqlite3.js
 * Sqlite3 rdao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var mysql 
try {
    mysql = require('mysql');
} catch (e) {
    console.error("Please add module \"mysql\" to your package.json dependencies")
    process.exit(1)
}

var data = require('./datatable.js');
var common = require ('./common.js');
var ESNext = require('./esnext');

isFunction = common.isFunction;
then = common.then;

class Connection {
    constructor() {
        this.debugMode = true;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
        this.driverConvertsTimeZones = true

        this.open = ESNext(this.openCB,this)
        this.getDataTable = ESNext(this.getDataTableCB,this)
        this.getObjects = ESNext(this.getObjectsCB,this)
        this.getList = ESNext(this.getListCB,this)
        this.getKVList = ESNext(this.getKVListCB,this)
        this.getScalar = ESNext(this.getScalarCB,this)
        this.exec = ESNext(this.execCB,this)
        this.execSingle = ESNext(this.execSingleCB,this)
        this.execMultiple = ESNext(this.execMultipleCB,this)
        this.readTableStructure =  ESNext(this.readTableStructureCB,this)
        this.close = ESNext(this.closeCB,this)
    }

    open() {}
    getDataTable() {}
    getObjects() {}
    getList() {}
    getKVList() {}
    getScalar() {}
    exec() {}
    execSingle() {}
    execMultiple() {}
    readTableStructure() {}
    close() {}
    
    debug(f,s) {
       if (this.debugMode) console.error(f + ": " + s)
    }

    openCB(dbname, callback) {
        this.db =  new mysql.createConnection(dbname);
        this.debug('open','Opening connection for MariaDB')
        this.db.connect(callback);
    }

    batch() {
        return new common.Batch(this);
    }

    closeCB(callback) {
        try {
            this.debug('close','Closing connection for MariaDB')
            this.db.end();
            then(callback);
        } catch (e) {
            then( function() { callback(e) }  );
        }        
    }

    sqlDate(d) { return common.sqlDate(this,d) }
    sqlParam(value) { return common.sqlParam(this, value) }
    mergeParams(sql, params) { return common.mergeParams(this, sql, params) }
    getRealSql(queryObject) { return common.getRealSql(this, queryObject) }

    getDataTableCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err, rows, fields)  {
            let dt = new data.DataTable;

            function finish() {
                self.debug("getDataTable",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, dt) } );            
            }

            if (err) {
                self.debug("getDataTable",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                if (rows.length > 0 ) {
                    let cols = Object.keys(rows[0])
                    for (let c = 0; c< cols.length; c++) dt.addColumn(cols[c])

                    let r = 0
                    setImmediate( function populateTable() {
                        if (r<rows.length) {
                            dt.addRow( dt.newRow(rows[r]));
                            r++
                            setImmediate(populateTable)
                        } else {
                            finish()
                        }
                    } )
                } else {
                    finish()
                }
            }
        });
    }

    getObjectsCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getObjects",realSql);


        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err, rows, fields)  {
            let ret =[]

            function finish() {
                self.debug("getObjects",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
            }

            if (err) {
                self.debug("getObjects",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                if (rows.length > 0 ) {
                    ret=rows                  
                } 
                finish()
            }
        });
    }    

    getListCB(params, callback) {
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
                if (isFunction(callback)) then( function() { undefined, callback(undefined,list) } );
            }
        });
    }    

    readTableStructureCB(tn, callback) {
        var ts = Date.now();
        var self = this;
        let realSql = `describe ${tn}`
        this.debug("readStructure",realSql);
        this.db.query(realSql, [], function(err,rows)  {
            if (err) {
                self.debug("readStructure",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push(rows[r]['Field']);
                    }
                }
                self.debug("readStructure",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
    }    

    getKVListCB(params, callback) {
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
                if (isFunction(callback)) then( function() { undefined, callback(undefined,list) } );
            }
        });
    }       

    getScalarCB(params, callback) {
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

    execCB(params, callback) { common.exec(this, params, callback) }
    execMultipleCB(queries, callback) { common.execMultiple(this, queries, callback) }

    execSingleCB(params, callback) {
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
                if (result.insertId > 0) self.lastInsertId = result.insertId;
                self.lastStatementChanges = result.affectedRows;
                then(callback)
            };
        });
    }

}

exports.Connection = Connection;
 