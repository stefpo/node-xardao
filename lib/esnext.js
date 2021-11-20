/********************************************************************************
 * esnext.js
 * ESNext conversion function
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var util = require('util');


function ESNextGood(f, obj) {
    const fp = util.promisify(f)
    return function(...args) {
        if (typeof (args[args.length-1])=='function' && args.length == f.length)  
            f.apply(obj, args)
        else 
            return fp.apply(obj, args)
    }
}

function ESNext(f, obj) {
    const fp = util.promisify(f)
    return function(...args) {
        if (typeof (args[args.length-1])=='function' && args.length == f.length)  
            f.apply(obj, args)
        else 
            while (args.length < f.length-1) args.push(undefined)
            return fp.apply(obj, args)
    }
}


module.exports = ESNext