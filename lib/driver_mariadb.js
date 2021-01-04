/********************************************************************************
 * driver_mariadb.js
 * MariaDB rdao driver
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
        this.debugMode = false;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
        this.driverConvertsTimeZones = true
        this.transactionLevel = 0

        this.open = ESNext(this.openCB,this)
        this.getDataTable = ESNext(this.getDataTableCB,this)
        this.getObjects = ESNext(this.getObjectsCB,this)
        this.getSingleObject  = ESNext(this.getSingleObjectCB ,this)
        this.getList = ESNext(this.getListCB,this)
        this.getKVList = ESNext(this.getKVListCB,this)
        this.getScalar = ESNext(this.getScalarCB,this)
        this.exec = ESNext(this.execCB,this)
        this.execSingle = ESNext(this.execSingleCB,this)
        this.execMultiple = ESNext(this.execMultipleCB,this)
        this.readTableStructure =  ESNext(this.readTableStructureCB,this)
        this.beginTrans = ESNext(this.beginTransCB, this)
        this.commitTrans = ESNext(this.commitTransCB, this)
        this.rollbackTrans = ESNext(this.rollbackTransCB, this)     
        this.forEachRow = ESNext(this.forEachRowCB, this)            
        this.close = ESNext(this.closeCB,this)
    }

    open() {}
    getDataTable() {}
    getObjects() {}
    getSingleObject () {}    
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

    openCB(dbInfo, callback) {
        function postConnection(cn, sql, callback) {
            if (typeof (sql) == "string" || Array.isArray(sql) ) cn.execCB(sql, callback)
            else then( callback )
        }

        this.db =  new mysql.createConnection(dbInfo);
        this.debug('open','Opening connection for MariaDB')
        this.db.connect( function() { postConnection(this, dbInfo.initSql, callback) })
    }

    batch() {
        return new common.Batch(this);
    }


    beginTransCB(callback) { 
        let me = this 
        this.execCB('start transaction', function( e ) {
        if ( !e ) { 
            me.transactionLevel ++
            callback()
        } else {
            callback(e)
        }
    })} 

    commitTransCB(callback) { 
        let me = this
        if ( this.transactionLevel > 0 ) this.execCB('commit', function( e ) {
        if ( !e ) { 
            me.transactionLevel --
            callback()
        } else {
            callback(e)
        }
    })} 

    rollbackTransCB(callback) { if ( this.transactionLevel > 0 ) this.execCB('rollback', function( e ) {
        let me = this
        if ( !e ) { 
            me.transactionLevel --
            callback()
        } else {
            callback(e)
        }
    })} 

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

    forEachRowCB(params, eachfunc, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("forEachRow",realSql);

        let query = this.db.query(realSql)
        query.on("error", function(err) {
                self.debug("forEachRow",'Error: '+err.code);
                then( function() {callback(err)}) ;
            })
            .on("fields", function(fields) {})
            .on("result", function(row) {
                self.db.pause()
                eachfunc (row, function() {
                    self.db.resume()
                })
            })
            .on("end", function() {
                self.debug("forEachRow",'Completed in ' + (Date.now() -ts) + ' ms');
                callback()
            })
    }    


    getDataTableCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }

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
                    for (let c = 0; c< cols.length; c++) {
                        if (useSnakeCase) dt.addColumn(common.toSnakeCase(cols[c]))
                        else if (useCamelCase) dt.addColumn(common.toCamelCase(cols[c]))
                        else  dt.addColumn(cols[c])
                    }

                    let r = 0
                    then( function populateTable() {
                        if (r<rows.length) {
                            dt.addRow( dt.newRow(rows[r]));
                            r++
                            then(populateTable)
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
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
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
                    if (useSnakeCase) { for ( let i =0 ; i< ret.length; i++ ) { ret[i] = common.toSnakeCase(ret[i])} }
                    if (useCamelCase) { for ( let i =0 ; i< ret.length; i++ ) { ret[i] = common.toCamelCase(ret[i])} }                           
                } 
                finish()
            }
        });
    }    

    getSingleObjectCB (params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
         
        this.debug("getDataTable",realSql);
        this.db.query({sql: realSql, timeout: this.timeoutMilliSeconds }, function(err,rows, fields)  {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    let ret = rows[0];
                    if (useSnakeCase) ret = common.toSnakeCase(ret) 
                    if (useCamelCase) ret = common.toCamelCase(ret)                    
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                } else {
                    if (isFunction(callback)) then( function() { callback(undefined, undefined) } );
                }
                self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
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
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                } else {
                    if (isFunction(callback)) then( function() { callback(undefined, null) } );
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
 