/********************************************************************************
 * driver_pgsql.js
 * PosgreSQL xardao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var pg 
try {
    pg = require('pg');
} catch (e) {
    console.error("Please add module \"pg\" to your package.json dependencies")
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
        this.explicitReturnKey = true
        this.saveDatesAsUTC = true
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
    setNoCount() {}
    
    debug(f,s) {
       if (this.debugMode) console.error(f + ": " + s)
    }

    openCB(dbInfo, callback) {
        this.debug('open','Opening connection for PGSQL')
        let connInfo
        if (dbInfo) {
            connInfo=dbInfo
        } else {
            connInfo= { host: this.connUrlInfo.hostname, user: this.connUrlInfo.username, password: this.connUrlInfo.password, database: this.connUrlInfo.database }
        }

        this.db =  new pg.Client(connInfo);
        this.debug('open','Opening connection for PostgresQL')
        this.db.connect( callback )
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
            this.debug('close','Closing connection for PostgresQL')
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

        this.db.query(realSql, function(err, result)  {
            let ret =[]
            let rows = result.rows

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

        this.debug("getObject",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getObject",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
                if (rows.length > 0 ) {
                    let ret = rows[0];
                    if (useSnakeCase) ret = common.toSnakeCase(ret) 
                    if (useCamelCase) ret = common.toCamelCase(ret)                          
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                } else {
                    if (isFunction(callback)) then( function() { callback(undefined, null) } );
                }
                self.debug("getObject",'Completed in ' + (Date.now() -ts) + ' ms');
                
            }
        });
    }    

    getListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getList",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
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
        let realSql = `select COLUMN_NAME from information_schema.COLUMNS where TABLE_NAME = '${tn}'`
        this.debug("readStructure",realSql);
        this.db.query(realSql, [], function(err,result)  {
            if (err) {
                self.debug("readStructure",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
                if (rows.length > 0 ) {
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push(rows[r]['column_name']);
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
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getKVList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
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
        this.debug("getScalar",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
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
        this.db.query(realSql, function(err, result)  {
            if (err) { 
                self.debug("execSingle",'Error: '+err);
                then( function() {callback(err)}) ;
            }
            else { 
                if (result.rows.length > 0 ) {
                    let k = Object.keys(result.rows[0]);
                    let k1 = k[0];
                    self.lastInsertId = result.rows[0][k1];
                }
                self.lastStatementChanges = result.rowCount; if (self.lastStatementChanges == null ) self.lastStatementChanges = 0;
                self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms LastId: ' + self.lastInsertId + ' Changes: '+self.lastStatementChanges);                
                then(callback)
            };
        });
    }
}

exports.Connection = Connection;
 