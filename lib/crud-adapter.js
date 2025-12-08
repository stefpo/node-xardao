
import { ESNext } from  './esnext.js'

export function createCRUDAdapter(conn, table, pk) {
    return new CRUDAdapter(conn, table, pk)
}

export class CRUDAdapter {
    constructor (conn, table, pk) {
        this.conn = conn
        this.table = table
        this.fields = []
        this.pk = pk || 'id'    // By default the primary key is 'id' column
        this.readTableStructure = ESNext(this.readTableStructureCB, this)
        this.create = ESNext(this.createCB, this)
        this.read = ESNext(this.readCB, this)
        this.update = ESNext(this.updateCB, this)
        this.delete = ESNext(this.deleteCB, this)
        this.createValidate = this.defaultCreateValidate
        this.updateValidate = this.defaultUpdateValidate
        this.content={}
        this.prevContent={}
    }

    readTableStructureCB(callback) {
        let self = this;
        if (this.fields.length > 0 ) callback() // Only read stucture once
        else 
            this.conn.readTableStructure( this.table, function (err, fields){
                if (! err) {
                    self.fields = fields
                    self.clear()
                    callback()
                } else {
                    callback(err)
                }
            })
    }

    selectSql() {
        if (this.fields.length == 0 ) throw new Error('selectSql(): table field list is empty. Use  readTableStructure')
        return 'select '+this.fields.join(', ') + ' from ' + this.table + ' where ' + this.pk + ' = @' + this.pk
    }

    deleteSql() {
        if (this.fields.length == 0 ) throw new Error('deleteSql(): table field list is empty. Use  readTableStructure')
        return 'delete from ' + this.table + ' where ' + this.pk + ' = @' + this.pk
    }

    clear() {
        this.content = this.objectTemplate()
        this.prevContent = this.objectTemplate() // Make sure we have a clone.        
    }

    insertSql( oi ) {
        if (this.fields.length == 0 ) throw new Error('insertSql(): table field list is empty. Use  readTableStructure')
        let fields = []
        let params = []
        let o 
            if ( oi ) {
            o = {}
            for (let k in oi) {
                o[k.toLowerCase()] = oi[k]
            }
        }

        for (let i = 0; i < this.fields.length; i++) {
            if (!o ) {
                if ( this.fields[i].toLowerCase() != this.pk.toLowerCase()) {
                    fields.push (this.fields[i])
                    params.push ('@' + this.fields[i])
                }
            }
            else if (o[this.fields[i].toLowerCase()] !== undefined) {
                if ( this.fields[i].toLowerCase() != this.pk.toLowerCase()) {
                    fields.push (this.fields[i])
                    params.push ('@' + this.fields[i])
                }
            }
        }
        if (this.conn.explicitReturnKey) return 'insert into ' + this.table + '(' + fields.join(', ') + ') values (' + params.join(', ') + ') returning ' + this.pk

        return 'insert into ' + this.table + '(' + fields.join(', ') + ') values (' + params.join(', ') + ')'
    }    

    updateSql( oi ) {
        let o 
        if ( oi ) {
            o = {}
            for (let k in oi) {
                o[k.toLowerCase()] = oi[k]
            }
        }        
        if (this.fields.length == 0 ) throw new Error('updateSql(): table field list is empty. Use  readTableStructure')
        let set = []
        for (let i = 0; i < this.fields.length; i++) {
            if (!o ) {
                if ( this.fields[i].toLowerCase() != this.pk.toLowerCase()) set.push (this.fields[i] + ' = @' + this.fields[i])
            }
            else if (o[this.fields[i].toLowerCase()] !== undefined) {
                if ( this.fields[i].toLowerCase() != this.pk.toLowerCase() ) set.push (this.fields[i] + ' = @' + this.fields[i])
            }
        }
        return 'update '+ this.table + ' set ' + set.join(', ') + ' where ' + this.pk + ' = @' + this.pk        
    }

    objectTemplate() {
        if (this.fields.length == 0 ) throw new Error('objectTemplate(): table field list is empty. Use  readTableStructure')        
        let ret = {}
        for (let i = 0 ; i< this.fields.length; i++ ){
            ret[this.fields[i]] = null
        }
        return ret
    }

    normalizeParameters( p ) {
        if (Object.keys(this.content).length == 0 ){
            this.clear()
        }
        if (p == undefined ) { return this.content }
        if ( typeof(p) == 'object' ) {
            let kl = Object.keys(p)
            if (kl.length > 0) { 
                for (let i = 0; i<kl.length; i++ ) {
                    this.content[kl[i]] = p[kl[i]]
                }
                return p 
            }
            else return this.content
        }
        else {
            let ret = {}
            ret[this.pk] = p
            return ret
        }
    }

    selectStatement( p ) {
        if (this.fields.length == 0 ) throw new Error('selectStatement(): table field list is empty. Use  readTableStructure')
        let o = this.normalizeParameters(p)
        return { sql: this.selectSql(), params: o }
    }

    insertStatement( p ) {
        if (this.fields.length == 0 ) throw new Error('insertStatement(): table field list is empty. Use  readTableStructure')
        let o = this.normalizeParameters(p)
        return { sql: this.insertSql(o), params: o }
    }

    updateStatement( p ) {
        if (this.fields.length == 0 ) throw new Error('updateStatement(): table field list is empty. Use  readTableStructure')
        let o = this.normalizeParameters(p)
        return { sql: this.updateSql(o), params: o }
    }

    deleteStatement( p ) {
        if (this.fields.length == 0 ) throw new Error('deleteStatement(): table field list is empty. Use  readTableStructure')
        let o = this.normalizeParameters(p)
        return { sql: this.deleteSql(o), params: o }
    }

    defaultCreateValidate(p, callback) {
        callback(undefined)
    }

    defaultUpdateValidate(p, callback) {
        callback(undefined)
    }    

    // CRUD operations.

    createCB(p, callback) {
        let self=this
        function dbaction(err) {
            if (err) callback(err) 
            else {
                p = self.normalizeParameters( p )
                self.createValidate( p, function (err) {
                    if (err) callback(err)
                    else self.conn.execSingle(self.insertStatement(p),function(err) {
                        if (err) callback(err)
                        else { 
                            self.content[self.pk] = self.conn.lastInsertId
                            callback(undefined, self.conn.lastInsertId)
                        }
                    })
                } )
            }
        }        

        if (this.fields.length != 0 ) { dbaction() }
        else {this.readTableStructureCB( dbaction )}
    }

    readCB(p, callback) {
        let self=this
        function dbaction(err) {
            if (err) callback(err) 
            else {
                p = self.normalizeParameters( p )
                self.conn.getObjects(self.selectStatement(p), function(err, dt) {
                    if (err) callback(err) 
                    else {
                        if (dt.rlength>0) {
                            self.content = dt[0]
                            self.prevContent = dt[0]
                            callback(undefined, self.content)
                        } else {
                            self.clear()
                            callback(undefined, undefined)
                        }
                    }
                } )
            }
        }

        if (this.fields.length != 0 ) { dbaction() }
        else {this.readTableStructureCB( dbaction )}
    }

    updateCB(p, callback) {
        let self=this
        function dbaction(err) {
            if (err) callback(err) 
            else {     
                p = self.normalizeParameters( p )   
                self.updateValidate( p, function (err) {
                    if (err) callback(err)
                    else self.conn.execSingle(self.updateStatement(p),callback)
                } )
            }
        }        

        if (this.fields.length != 0 ) { dbaction() }
        else {this.readTableStructureCB( dbaction )}
    }

    deleteCB(p, callback) {
        let self=this
        function dbaction(err) {
            if (err) callback(err) 
            else {        
                p = self.normalizeParameters( p )
                self.conn.execSingle(self.deleteStatement(p),callback)
            }
        }        

        if (this.fields.length != 0 ) { dbaction() }
        else {this.readTableStructureCB( dbaction )}
    }

}

