const mo = require("../lib/driver_mssql")

function functionInfo(funcOrClass) {
    if ( typeof funcOrClass === 'function' ) {
        let source = Function.prototype.toString.call(funcOrClass)
        let typeName = /^class\s/.test(source) ? "class" : "function"
        let e = source.indexOf("{")
        let signature = ""
        if ( e >= 0 ) {
            signature = source.substr(0, e)
        }
        return { name: funcOrClass.name, typeName: typeName, signature: signature }
    } else {
        return { name: funcOrClass.name, typename: typeof funcOrClass, signature: funcOrClass.name}
    }  
}

function documentNameSpace(mod, namespace) {
    namespace = namespace || ""

    if ( namespace == "" ) console.log ("Module")
    else console.log ("Namespace " + namespace)

    for (let f in mod ) {
        if ( mod[f] instanceof Function ) {
            let fi = functionInfo(mod[f])
            if (fi.typeName == "class") {
                console.log("  " + fi.signature)
                let cls = mod[f]
                let excludeProp = Object.getOwnPropertyNames(Object)
                for (m of Object.getOwnPropertyNames( cls ).filter (x => x!="constructor")) {
                    if (excludeProp.indexOf(m) == -1 ) {
                        let mi = functionInfo(cls[m])
                        console.log("    static "  + mi.signature)
                    }
                }                
                let clsProto = mod[f].prototype
                for (m of Object.getOwnPropertyNames( clsProto ).filter (x => x!="constructor")) {
                    let mi = functionInfo(clsProto[m])
                    console.log("    "  + mi.signature)
                }
            }
        } 
    }
    console.log("")

    for (let f in mod ) {
        if ( mod[f] instanceof Function ) {
            let fi = functionInfo(mod[f])
            if (fi.typeName != "class") { 
                console.log("  " + fi.signature)
            }
        } 
    }
    console.log("")

    for (let f in mod ) {
         if (typeof mod[f] =="string") {
            console.log(`  ${f} = "${mod[f]}"`)
        } else if (typeof(mod[f]) != "function" && typeof(mod[f]) != "object") {
            console.log(`  ${f} = ${mod[f]}`)
        }
    }

    console.log("")
    for (let f in mod ) {
        if ( typeof(mod[f]) == "object") {
            let ns = namespace=="" ? f : namespace + "." + f
            documentNameSpace(mod[f], ns  )
        }
    }
}

documentNameSpace(mo)

