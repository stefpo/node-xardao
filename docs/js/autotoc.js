/*!
 * NORT web UI component library
 * Copyright(c) 2019 Stephane Potelle 
 * MIT Licensed
 * Automatic TOC generator
*/

function generateToc(elt, headings) {
    let headers = elt.getElementsByTagName(headings)
    let out = []
    out.push("<ul>")
    for (let i = 0; i< headers.length; i++) {
        let t = headers[i].innerText
        let tocid = headings+ "_toc_"+i
        headers[i].id = tocid
        out.push("<li><a href=\"#"+ tocid+"\">" + t + "</a></li>")
    }
    out.push("</ul>")
    return out.join("")
}

function insertToc(dest, source, tag) {
    document.getElementById(dest).innerHTML = document.getElementById(dest).innerHTML + generateToc(document.getElementById(source),tag) 
}
