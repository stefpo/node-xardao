/********************************************************************************
 * esnext.js
 * ESNext conversion function
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

import * as util from 'util'

export function ESNext(f, obj) {
    const fp = util.promisify(f)
    return function(...args) {
        if (typeof (args[args.length-1])=='function' && args.length == f.length) {
            //console.log(`${f.name}(${JSON.stringify(args)})`)
            f.apply(obj, args)
        } else {
            while (args.length < fp.length-1) args.push(undefined)
            //console.log(`async ${f.name}(${JSON.stringify(args)})`)
            return fp.apply(obj, args)
        }
    }
}


