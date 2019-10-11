/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/


class DataTable {
    constructor(name) {
        this.columns = [];
        
        this.rows = [];
        this.colmap = {};
        if (name != undefined ) this.tablename = name;
        else this.tablename="";
    }

    json() {
        return JSON.stringify(this, (key,value) => {
            if ( this &&  key == 'datatable' ) return undefined;
            if ( this &&  key == 'colmap' ) return undefined;
            return value;
        });
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