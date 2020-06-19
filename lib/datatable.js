/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var ESNext = require('./esnext');

class DataTable {
    constructor(name) {
        this.columns = [];
        
        this.rows = [];
        this.colmap = {};
        if (name != undefined ) this.tablename = name;
        else this.tablename="";
        this.JSONAsObjects = ESNext(this.JSONAsObjectsCB,this);
        this.JSONAsTable = ESNext(this.JSONAsTableCB,this);
        
    }

    // This function will re-create all internal associations
    repair() {
        this.refreshColmap;
        for ( let i=0; i< this.rows.length; i++ ) {
            this.rows[i].datatable = this;
        }
    }

    JSONAsObjects() {} // This is just the function prototype
    JSONAsTable() {} // This is just the function prototype

    JSON() {
        return JSON.stringify(this, (key,value) => {
            if ( this &&  key == 'datatable' ) return undefined;
            if ( this &&  key == 'colmap' ) return undefined;
            return value;
        });
    }

    JSONAsObjectsCB( pfirst, plast, callback ) {
        let o = []
        let first = pfirst || 0
        let last = plast || -1
        if ( plast < 0 )  plast = this.rows.length
        this.forRange(first, last, function(row) {
            o.push(JSON.stringify(row.toObject()))
        }
        , function() { 
            let resp = '[' + o.join(',\n') + ']'
            callback(undefined, resp)  
        }) 
    }

    JSONAsTableCB( pfirst, plast, callback ) {
        let me = this;
        let o = []
        let first = pfirst || 0
        let last = plast || -1
        if ( plast < 0 )  plast = this.rows.length
        this.forRange(first, last, function(row) {
            o.push(JSON.stringify(row.items))
        }
        , function() { 
            let resp = '{"columns":'+ JSON.stringify(me.columns) + ',\n"rows": [' + o.join(',\n') + ']}'
            callback(undefined, resp)  
        }) 
    }    

    newRow(value) {
        var r = new DataRow(this);
        if ( value != undefined && typeof(value) == 'object') r.set(value);
        return r;
    }

    addRow(r) {
        this.rows.push(r)
    }

    delRow(n) {
        this.rows.splice(n,1);
    }

    addColumn(colName, defaultValue = null){
        if (this.getColumnIndex(colName) == undefined ) {
            this.colmap[colName]=this.columns.length;
            this.columns.push(colName)
            for (let i=0; i< this.rows.length; i++) this.rows[i].items.push(defaultValue);
        }
    }

    delColumn(colNameOrIndex) {
        var cindex = this.getColumnIndex(colNameOrIndex);
        if (cindex != undefined) {
            this.columns.splice(cindex,1);
            for (let i=0; i< this.rows.length; i++) this.rows[i].items.splice(cindex,1);;
        }
    }

    refreshColmap() {
        this.colmap = {};
        for (let i = 0; i< this.columns.length; i++ ) {
            this.colmap[this.columns[i]] = i;
        }
    }

    getColumnIndex(colNameOrIndex) {
        if (typeof(colNameOrIndex) == 'number') return colNameOrIndex;
        else if (typeof(colNameOrIndex) == 'string') return this.colmap[colNameOrIndex];
        else throw new Error('Invalid index');
    }

    forRange( first, last, block, next ) {
        var i = first ;
        var me=this;

        if ( i < 0 ) i = 0;

        function loop() {
            if ( i< me.rows.length && ( i<=last || last < 0 )) {
                block(me.rows[i]);
                i++;
                setImmediate(loop);
            }
            else setImmediate(next);
        }

        loop();
    }

    forEachRow(block, next) {
        this.forRange(0,-1, block, next);
    }

    toArraySync(){
        let a = []
        for (let r = 0; r<this.rows.length; r++) {
            a.push(this.rows[r].items)
        }
        return a
    }

    toArray(callback){
        let a = []

        forEachRow(function() { a.push(this.rows[r].items) }, function() { callback(a) })
    }
}

class DataRow {
    constructor(table) {
        this.items = [];
        this.datatable = table;
        for (let i = 0; i< this.datatable.columns.length; i++ ) {
            this.items.push(null);
        }
    }

    get(index) {
        return this.items[this.datatable.getColumnIndex(index)];
    }

    set(index, value) {
        if ((typeof(index) == 'number' || typeof(index) == 'string' ) && value != undefined )
            this.items[this.datatable.getColumnIndex(index)]=value;
        else if ( typeof(index) == 'object' ) {
            
            let obj = index;
            let keys = Object.keys(obj);
            for ( let i = 0 ; i < keys.length; i ++ ){
                let k = keys[i];
                let ix;
                if ( ( ix = this.datatable.getColumnIndex(k)) !=undefined ){
                    this.items[ix] = obj[k];
                }
            }
        }
    }

    toObject() {
        let ret = {};
        for (let i=0 ; i < this.datatable.columns.length; i++) {
            ret[this.datatable.columns[i]] = this.items[i];
        }
        return ret;
    }

}

exports.DataRow = DataRow;
exports.DataTable = DataTable;