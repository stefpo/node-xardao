/********************************************************************************
 * driver_sqlite3.js
 * Sqlite3 xardao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var sq3 
try {
    sq3 = require('sqlite3');
} catch (e) {
    console.error("Please add module \"sqlite3\" to your package.json dependencies")
    process.exit(1)
}

var common = require ('./common.js');
var ESNext = require('./esnext');

isFunction = common.isFunction;
then = common.then;

class Connection {
    constructor(connUrlInfo) {
        this.debugMode = false;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
        this.saveDatesAsUTC = true
        this.pooled = false
        this.transactionLevel = 0
        this.connUrlInfo=connUrlInfo


        this.open = ESNext(this.openCB, this)
        this.getObjects = ESNext(this.getObjectsCB, this)
        this.getSingleObject  = ESNext(this.getSingleObjectCB , this)
        this.getList = ESNext(this.getListCB, this)
        this.getKVList = ESNext(this.getKVListCB, this)
        this.getScalar = ESNext(this.getScalarCB, this)
        this.exec = ESNext(this.execCB, this)
        this.execSingle = ESNext(this.execSingleCB, this)
        this.execMultiple = ESNext(this.execMultipleCB, this)
        this.readTableStructure =  ESNext(this.readTableStructureCB, this)
        this.beginTrans = ESNext(this.beginTransCB, this)
        this.commitTrans = ESNext(this.commitTransCB, this)
        this.rollbackTrans = ESNext(this.rollbackTransCB, this)         
        this.close = ESNext(this.closeCB, this)
    }

    open() {}
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

    openCB(pDbInfo, callback) {
        let dbInfo = pDbInfo || this.connUrlInfo.database
        
        try {
            let dbfile = undefined
            if (typeof(dbInfo) == "string" ) dbfile = dbInfo
            else if (dbInfo.database) dbfile = dbInfo.database
            this.db =  new sq3.Database(dbfile);
            this.debug('open','Opening connection for SQLite3')
            then( callback )
        } catch (e) {
            then( function() { callback(e) }  );
        }
    }

    batch() {
        return new common.Batch(this);
    }

    beginTransCB(callback) { 
        let me = this 
        this.execCB('begin transaction', function( e ) {
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
            this.debug('Close','Closing connection for SQLite3')
            this.db.close()
            then(callback)
        } catch (e) {
            then( function() { callback(e) }  );
        }        
    }    
    
    sqlDate(d) { return common.sqlDate(this,d) }
    sqlParam(value) { return common.sqlParam(this, value) }
    mergeParams(sql, params) { return common.mergeParams(this, sql, params) }
    getRealSql(queryObject) { return common.getRealSql(this, queryObject) }

    
    getObjectsCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }

        var self = this;
        this.debug("getObjects",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)
        this.db.all(realSql, [], function(err,rows)  {
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
        var self = this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }

        this.debug("getObject",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.get(realSql, [], function(err,row) {
            if (err) {
                self.debug("getObject",'Error: '+err.code);
                then( function() { callback(err) }) ;
            } else {
                let ret;
                if (row) {
                    ret = row;
                    if (useSnakeCase) ret = common.toSnakeCase(ret) 
                    if (useCamelCase) ret = common.toCamelCase(ret)
                } else {
                    ret = null;
                }
                self.debug("getObject",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, ret) } );
            }
        });        
    }    

    getListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getList",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.all(realSql, [], function(err,rows)  {
            if (err) {
                self.debug("getList",'Error: '+err.code);
                then( function() { callback(err)}) ;
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
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
    }    

    readTableStructureCB(tn, callback) {
        var ts = Date.now();
        var self = this;
        let realSql = `pragma table_info(${tn})`
        this.debug("readStructure",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.all(realSql, [], function(err,rows)  {
            if (err) {
                self.debug("readStructure",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                let list = [];
                if (rows.length > 0 ) {
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push(rows[r]['name']);
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
        this.debug("getKVList",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.all(realSql, [], function(err,rows)  {
            if (err) {
                self.debug("getKVList",'Error: '+err.code);
                then( function() { callback(err)}) ;
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
                self.debug("getList",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
    }       

    getScalarCB(params, callback) {
        var self = this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        this.debug("getScalar",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.get(realSql, [], function(err,row) {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() { callback(err) }) ;
            } else {
                let ret;
                if (row) {
                    let cols = Object.keys(row)
                    ret = row[cols[0]];
                } else {
                    ret = null;
                }
                self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, ret) } );
            }
        });        
    }
    
    execCB(params, callback) { common.execCB(this, params, callback) }
    execMultipleCB(queries, callback) { common.execMultipleCB(this, queries, callback) }


    execSingleCB(params, callback) {
        var self=this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        this.debug("execSingle",realSql);

        this.db.configure("busyTimeout", this.timeoutMilliSeconds)        
        this.db.run(realSql, function(err)  {
            if (err) { 
                self.debug("execSingle",'Error: '+err.code);
                then( function() { callback(err) }) ;
            }
            else { 
                self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms LastId: ' + this.lastID + ' Changes: '+this.changes);
                self.lastInsertId = this.lastID;
                self.lastStatementChanges = this.changes;
                then(callback)
            };
        });
    }

}

exports.Connection = Connection;
 