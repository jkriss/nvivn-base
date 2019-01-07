// const nvivn = require('../../client')

console.log('nvivn:', nvivn)

document.body.style.background = '#eee'

nvivn.create('hi!').then(nvivn.sign).then(result => {
  document.getElementById('app').innerHTML = `<pre>${JSON.stringify(result)}</pre>`
})

nvivn.setItem('thing', 'hi').then(() => {
  nvivn.getItem('thing').then(result => console.log("got thing", result))
})
