/* 
CSI.js

Client Site Includes 
*/

function include(url) {
    let req = new XMLHttpRequest()

    req.open('GET', url, false)
    req.send()

    if (req.status === 200) {
        document.write(req.responseText);
      }

}