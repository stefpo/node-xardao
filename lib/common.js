/********************************************************************************
 * rdao_common.js
 * Common elements in xardao implementation.
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

exports.isFunction = function (f) {
    if (!f ) return false;
    return (typeof(f)=='function');
}

exports.then = function (f) {
    if (isFunction(f)) setImmediate(f);
    else throw new Error('"Parameter should be a function. Found '+ typeof(f));
}

exports.Batch = class {
    constructor(cn){
        this.conn = cn;
        this.statements=[];
    }

    add(statement) {
        this.statements.push(statement);
        return this;
    }

    exec(callback) {
        cn.exec(this.statements, callback);
    }
}

// Common implementation of the "exec" functionality. 
// Specific drivers may use their own version of it.
exports.exec = function(cn,params, callback) {
    let t=typeof(params)
    if (Array.isArray(params)) cn.execMultiple(params, callback);
    else if ( t == 'string' || t == 'object')  cn.execSingle(params, callback);
    else throw new Error('Invalid parameter: '+t);
}

// Common implementation of the "execMultiple" functionality. 
// Specific drivers may use their own version of it.
exports.execMultiple = function(cn, queries, callback) {
    var i = 0;
    loop();

    function loop(err) {
        if ( err ) then(function() { callback(err) });
        else if ( i>= queries.length ) then(callback);
        else {
            let p = queries[i];
            i++;
            cn.execSingle(p, loop);
        }
    }
}

// Common implementation of the "exec" functionality. 
// Specific drivers may use their own version of it.
exports.execCB = function(cn,params, callback) {
    let t=typeof(params)
    if (Array.isArray(params)) cn.execMultipleCB(params, callback);
    else if ( t == 'string' || t == 'object')  cn.execSingleCB(params, callback);
    else throw new Error('Invalid parameter: '+t);
}

// Common implementation of the "execMultiple" functionality. 
// Specific drivers may use their own version of it.
exports.execMultipleCB = function(cn, queries, callback) {
    var i = 0;
    loop();

    function loop(err) {
        if ( err ) then(function() { callback(err) });
        else if ( i>= queries.length ) then(callback);
        else {
            let p = queries[i];
            i++;
            cn.execSingleCB(p, loop);
        }
    }
}



// Base implementation of the "sqlParam" method. 
// Specific drivers may use their own version of it.
exports.sqlParam = function(cn,value) {
    if ( value == undefined ) return 'null'
    if ( typeof(value)=='number') { return value}
    if ( typeof(value)=='boolean') { return value == null ? null : value ? 1 : 0 }
    if ( typeof(value)=='string') { return "'" + value.replace(/'/g,"''") +"'" }
    if ( typeof(value.getFullYear )=='function') { return "'" + cn.sqlDate(value) + "'"}
    return 'null'
}

exports.mergeParams_old = function(cn,sql, params) {
    var keys = Object.keys(params);
    var osql = sql;
    for ( let i = 0; i< keys.length; i++) {
        let k = keys[i];
        osql = osql.replace(new RegExp('@'+ k + '\\b','ig'), cn.sqlParam(params[k]));
    }
    return osql;
}

// Base implementation of the "mergeParams" method. 
// Specific drivers may use their own version of it.
exports.mergeParams = function(cn,sql, params) {
    let rt = []
    let isql = sql
    let uparams = {}
    for ( let k of Object.keys(params)) {
        uparams[k.toLowerCase()] = params[k]
    }

    while (true) {
        let p = isql.search( /@\w+/)
        if (p == -1 ) {
            rt.push(isql)
            break
        } else {
            rt.push(isql.substring(0, p))
            let fn = /@(\w+)/i.exec(isql)
            let v = uparams[fn[1].toLowerCase()]
            if ( v === undefined ) 
                throw ( `Missing value for parameter ${fn[0]} `)
            rt.push(cn.sqlParam(v))
            isql = isql.substring(p+fn[0].length)
        }
    }
    return rt.join('')
}

// Base implementation of the "getRealSql" method. 
// Specific drivers may use their own version of it.
exports.getRealSql = function(cn,queryObject) {
    var realSql; 
    if ( queryObject.params == undefined ) queryObject.params  = {}
    if (typeof(queryObject)=="string") { realSql= queryObject; }
    else {
        if (queryObject.params) realSql = cn.mergeParams(queryObject.sql, queryObject.params);
    }
    return realSql;
}

// Base implementation of the "sqlDate" method. 
// Specific drivers may use their own version of it.
exports.sqlDate = function(cn,d) {
    function fixedInt(n, dig) {
        var s = '' + n;
        if (s.length < dig ) s = '0'.repeat(dig-s.length) + s;
        return s;
    } 

    if ( cn.saveDatesAsUTC && ! d.isUTC ){
        if ( d.isDateOnly ) {
            return fixedInt(d.getUTCFullYear(), 4) + "-" + 
            fixedInt(d.getUTCMonth()+1, 2) + '-' + 
            fixedInt(d.getUTCDate(), 2) +
            " 12:00:00"  
        } else {
            return fixedInt(d.getUTCFullYear(), 4) + "-" + 
            fixedInt(d.getUTCMonth()+1, 2) + '-' + 
            fixedInt(d.getUTCDate(), 2) + ' ' + 
            fixedInt(d.getUTCHours(), 2) + ':' + 
            fixedInt(d.getUTCMinutes(), 2) + ':' + 
            fixedInt(d.getUTCSeconds(), 2) ;
        }
    } else {
        if ( d.isDateOnly ) {
            return fixedInt(d.getFullYear(), 4) + "-" + 
            fixedInt(d.getMonth()+1, 2) + '-' + 
            fixedInt(d.getDate(), 2)  +
            " 12:00:00"    
        } else {
            return fixedInt(d.getFullYear(), 4) + "-" + 
            fixedInt(d.getMonth()+1, 2) + '-' + 
            fixedInt(d.getDate(), 2) + ' ' + 
            fixedInt(d.getHours(), 2) + ':' + 
            fixedInt(d.getMinutes(), 2) + ':' + 
            fixedInt(d.getSeconds(), 2) ;
        }
    }
}

function strToCamelCase(fn, startUpperCase) {
    let a = Array.from (fn)
    let ra = []
    let us = startUpperCase || false
    for ( let c of a ) {
        if ( c == '_') {
            us = true 
        } else {
            if (us) ra.push(c.toUpperCase())
            else ra.push(c.toLowerCase())
            us = false
        }
    }
    return ra.join('')
}

function strToSnakeCase(fn) {
    let a = Array.from (fn)
    let ra = []
    let us = true
    for ( let c of a ) {
        //if (c.toUpperCase() == c && c != '_' && ! us ) {
        if ( c >='A' && c <= 'Z' && ! us ) {
            ra.push('_')
            us = true
        } else us = false

        ra.push(c.toLowerCase())
        if ( c == '_' ) us = true
    }
    return ra.join('')
}

exports.toCamelCase = function toCamelCase(o) {
    if (o == undefined || o == null) 
        return o
    else if (typeof(o) == "object") {
        return transformKeyCase(o, strToCamelCase)
    } else if (typeof(o) == "string") {
        return strToCamelCase(o)
    } else {
        throw Error("o Must be object or string")
    }
}

exports.toSnakeCase = function toSnakeCase(o) {
    if (o == undefined || o == null) 
        return o
    else if (typeof(o) == "object") {
        return transformKeyCase(o, strToSnakeCase)
    } else if (typeof(o) == "string") {
        return strToSnakeCase(o)
    } else {
        throw Error("o Must be object or string")
    }
}

function transformKeyCase(o, transform) {
    let ret = {}
    for ( let k of Object.keys(o)) {
        ret[transform(k)] = o[k]
    }
    return ret
}