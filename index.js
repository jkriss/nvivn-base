const Client = require('@nvivn/core/src/client/index')
const getStore = require('@nvivn/core/src/util/store-connection')
const { generate } = require('@nvivn/core/src/util/keys')
const Config = require('@nvivn/core/src/config/localstorage-config')
const nvivnConfig = require('@nvivn/core/src/config/nvivn-config')
const { expose } = require('postmsg-rpc')

const pathParts = window.location.pathname.split('/')
const appName = pathParts[1]
const appPath = appName ? `examples/${appName}/index.js` : 'index.js'
const clientPath = window.__APP__ && window.__APP__.clientPath || '/client.js'

// get keys
// TODO support login/logout

const loadKeys = () => {
  publicKey = localStorage.getItem('NVIVN_PUBLIC_KEY')
  secretKey = localStorage.getItem('NVIVN_PRIVATE_KEY')
  if (publicKey && secretKey) return { publicKey, secretKey }
}

const saveKeys = k => {
  localStorage.setItem('NVIVN_PUBLIC_KEY', k.publicKey)
  localStorage.setItem('NVIVN_PRIVATE_KEY', k.secretKey)
}

let keys = loadKeys()
if (!keys) {
  keys = generate()
  saveKeys(keys)
}

const setup = async () => {
  // set up the nvivn stuff
  const prefix = `nvivn:config:${keys.publicKey}`
  const messageStore = getStore(`leveljs:${keys.publicKey}/messages`, { publicKey: keys.publicKey })
  const config = await nvivnConfig(new Config({
    prefix,
    layers: [
      { name: 'defaults', data: {} },
      { name: 'keys', data: { keys } },
      { name: 'node' },
      { name: 'syncs' }
    ]
  }))

  // const client = new Client({ keys, messageStore, skipValidation: true, config })
  const client = new Client({ messageStore, skipValidation: true, config })


  // TODO use the public key to namespace these

  const methods = {
    create: client.create,
    sign: client.sign,
    post: client.post,
    postMany: client.postMany,
    list: client.list,
    verify: client.verify,
    del: client.del,
    info: client.info,
    setItem: (k, v) => {
      // console.log("setting", k, "to", v)
      localStorage.setItem(`${appName}:${keys.publicKey}:${k}`, v)
    },
    getItem: (k) => {
      // console.log("getting", k)
      return localStorage.getItem(`${appName}:${keys.publicKey}:${k}`)
    }
  }

  const customPostMessage = (data, targetOrigin) => {
    // console.log("posting result back", data, targetOrigin)
    iframe.contentWindow.postMessage(data, targetOrigin)
  }

  // TODO lock this down to the current origin?

  for (const m of Object.keys(methods)) {
    expose(m, methods[m], { postMessage: customPostMessage })
  }

  // now mount the app, and call it with the client
  // create an iframe
  const iframe = document.createElement('iframe');
  iframe.style.border = 0
  const html = `
  <!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta charset="utf-8">
      <title>nvivn</title>
      <style>
      body {
        background: #fff;
      }
      </style>
    </head>
    <body>
      <div id="app"></div>
      <script src="${window.location.origin}/${clientPath}"></script>
      <script src="${window.location.origin}/${appPath}"></script>
    </body>
  </html>
  `
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms')
  iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  document.body.appendChild(iframe)
}

setup()