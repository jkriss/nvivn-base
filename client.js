const { caller } = require('postmsg-rpc')

const methods = ['create', 'sign', 'list', 'del', 'verify', 'post', 'postMany', 'setItem', 'getItem', 'info']

const client = {}
for (const m of methods) {
  client[m] = caller(m, { postMessage: (...args) => window.parent.postMessage(...args) })
}

window.nvivn = client