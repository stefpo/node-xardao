/********************************************************************************
 * driver_mssql.js
 * MSSQL rdao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var mssql
try {
    mssql = require('tedious');
} catch (e) {
    console.error("Please add module \"tedious\" to your package.json dependencies")
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

    openCB(dbname, callback) {
        this.db =  new mssql.Connection(dbname);
        this.debug('open','Opening connection for MSSQL')
        this.db.on('connect', function(err) { callback(err) } )
    }

    batch() {
        return new common.Batch(this);
    }

    closeCB(callback) {
        let self=this
        this.debug('close','Closing connection for MSSQL')
        this.db.on('end', function(err) { 
            if (!err) self.debug('close','connection closed')
            callback(err)} 
        )
        this.db.close()
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
        let dt = new data.DataTable;
        let headersRead = false
        let request = new mssql.Request(realSql, function(err, rows, fields)  {
            if (err) {
                self.debug("getDataTable",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                self.debug("getDataTable",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, dt) } );
            }
        })
        request.on('row', function(columns) { 
            if (! headersRead ) {
                for ( let i=0; i< columns.length; i++) {
                    dt.addColumn(columns[i].metadata.colName)
                }
                headersRead = true
            }
            let dr = dt.newRow()
            for ( let i=0; i< columns.length; i++) {
                dr.items[i]=columns[i].value
            }
            dt.addRow(dr)
        }) 
        this.db.execSql(request)
    }

    getObjectsCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getObjects",realSql);
        let ret = []
        let fields = []
        let headersRead = false
        let request = new mssql.Request(realSql, function(err, rows, fields)  {
            if (err) {
                self.debug("getObjects",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                self.debug("getObjects",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, ret) } );
            }
        })
        request.on('row', function(columns) { 
            if (! headersRead ) {
                for ( let i=0; i< columns.length; i++) {
                    fields.push(columns[i].metadata.colName)
                }
                headersRead = true
            }
            let dr = {}
            for ( let i=0; i< columns.length; i++) {
                dr[fields[i]]=columns[i].value
            }
            ret.push(dr)
        }) 
        this.db.execSql(request)
    }

    getSingleObjectCB (params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getScalar",realSql);
        let dt = new data.DataTable;
        let headersRead = false        
        let valueRead = false
        let fields = []
        let retVal
        let request = new mssql.Request(realSql, function(err, rows, fields)  {
            if (err) {
                self.debug("getObject",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                self.debug("getObject",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, retVal) } );
            }
        })
        request.on('row', function(columns) { 
            if (! headersRead ) {
                for ( let i=0; i< columns.length; i++) {
                    fields.push(columns[i].metadata.colName)
                }
                headersRead = true
            }
            let dr = {}
            for ( let i=0; i< columns.length; i++) {
                dr[fields[i]]=columns[i].value
            }
            retVal = dr
            valueRead = true
        }) 
        this.db.execSql(request)        
    }    


    getListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getList",realSql);
        let list = [];
        let request = new mssql.Request(realSql, function(err,rowcount)  {
            if (err) {
                self.debug("getList",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                self.debug("getList",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
        request.on('row', function(columns) { 
            list.push(columns[0].value); 
        }) 
        this.db.execSql(request)
    }    

    readTableStructureCB(tn, callback) {
        var ts = Date.now();
        var self = this;
        let realSql = `select col.name from sys.tables tab inner join sys.columns as col on tab.object_id = col.object_id where tab.name ='${tn}'`
        this.debug("readStructure",realSql);
        let list = [];
        let request = new mssql.Request(realSql, function(err,rowcount)  {
            if (err) {
                self.debug("readStructure",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                self.debug("readStructure",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
        request.on('row', function(columns) { 
            list.push(columns[0].value); 
        }) 
        this.db.execSql(request)
    }    

    getKVListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getKVList",realSql);
        let list = [];
        let request = new mssql.Request(realSql, function(err,rowcount)  {
            if (err) {
                self.debug("getKVList",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                self.debug("getKVList",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
        request.on('row', function(columns) { 
            if (columns.length >1 ) { list.push( [columns[0].value , columns[1].value ] )}
            else { list.push( [columns[0].value , columns[0].value ] ) }
            
        }) 
        this.db.execSql(request)
    }       

    getScalarCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getScalar",realSql);
        let dt = new data.DataTable;
        let valueRead = false
        let retVal
        let request = new mssql.Request(realSql, function(err, rows, fields)  {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, retVal) } );
            }
        })
        request.on('row', function(columns) { 
            if (! valueRead ) {
                retVal = columns[0].value
                valueRead = true
            }
        }) 
        this.db.execSql(request)        
    }

    execCB(params, callback) { common.exec(this, params, callback) }
    execMultipleCB(queries, callback) { common.execMultiple(this, queries, callback) }

    execSingleCB(params, callback) {
        var self=this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        this.debug("execSingle",realSql);
        realSql = realSql + "; select @@ROWCOUNT, @@IDENTITY"
        let request = new mssql.Request(realSql, function(err, rowcount, rows)  {
            if (err) { 
                self.debug("execSingle",'Error: '+err.code);
                then( function() {callback(err)}) ;
            }
            else { 
                //self.lastInsertId = 0 //if (result.insertId > 0) self.lastInsertId = result.insertId;
                //self.lastStatementChanges = 0 //result.affectedRows;
                self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms LastId: ' + self.lastInsertId + ' Changes: ' + self.lastStatementChanges);
                then(callback)
            };
        })
        request.on('row', function(columns) { 
            self.lastStatementChanges = columns[0].value
            self.lastInsertId = columns[1].value
        })         
        this.db.execSql(request)
    }

}

exports.Connection = Connection;
 