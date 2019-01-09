const fs = require('fs')

const src = fs.readFileSync('./html/iframe.html', 'utf8')
const clientCode = fs.readFileSync('./dist/client.js')

const iframe = src.replace('$CLIENT_CODE', clientCode)
fs.writeFileSync('./dist/iframe.html', iframe)