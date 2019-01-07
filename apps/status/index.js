// document.body.style.background = '#f1f1f1'
//
// const html = `
//   <input type="button" id="export" value="Export via QR code"></input>
// `
// document.querySelector('#app').innerHTML = html
//
// document.querySelector('#export').addEventListener('click', () => {
//   nvivn.export({ type: 'QR' })
// })
//
// console.log("nvivn:", nvivn)

// monkeypatch localStorage
window.localStorage = {
  setItem: nvivn.setItem,
  getItem: nvivn.getItem
}


const html = require('choo/html')
const choo = require('choo')

const report = require('./pages/report')
const search = require('./pages/search')
const sync = require('./pages/sync')
const makeRoute = require('./make-route')

const app = choo()
app.emitter.on('navigate', () => nvivn.setHash(window.location.hash))
app.route(makeRoute('/'), report)
app.route(makeRoute('/search'), search)
app.route(makeRoute('/sync'), sync)
app.mount('#app')
