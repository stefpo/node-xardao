/********************************************************************************
 * esnext.js
 * ESNext conversion function
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var util = require('util');


function ESNext(f, obj) {
    const fp = util.promisify(f)
    return function(...args) {
        if (typeof (args[args.length-1])=='function' && args.length == f.length)  
            f.apply(obj, args)
        else 
            return fp.apply(obj, args)
    }
}

module.exports = ESNext