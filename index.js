const getStore = require('@nvivn/core/util/store-connection')
const { generate } = require('@nvivn/core/util/keys')
const setupHub = require('@nvivn/hub/hub/browser').setup
const { expose } = require('postmsg-rpc')
const $ = window.$ = require('jquery')
// const popop = require('magnific-popup/src/js/core')
// require('magnific-popup/src/js/inline')
const popop = require('./vendor/magnific-popup')
require('./app.css')

const pathParts = window.location.pathname.split('/')
const appName = pathParts[1]
const appPath = appName ? `apps/${appName}/index.js` : 'index.js'
const clientPath = window.__APP__ && window.__APP__.clientPath || '/dist/client.js'

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

  const hub = await setupHub({
    localStorage,
    settings: {
      messageStore: `leveljs:${keys.publicKey}/messages`,
      keys
    },
  })

  // TODO use the public key to namespace these

  const methods = {
    // core nvivn stuff
    create: hub.create,
    sign: hub.sign,
    post: hub.post,
    postMany: hub.postMany,
    list: hub.list,
    verify: hub.verify,
    del: hub.del,
    info: hub.info,

    // scoped localStorage replacement
    setItem: (k, v) => {
      // console.log("setting", k, "to", v)
      localStorage.setItem(`${appName}:${keys.publicKey}:${k}`, v)
    },
    getItem: (k) => {
      // console.log("getting", k)
      return localStorage.getItem(`${appName}:${keys.publicKey}:${k}`)
    },

    // additional functions
    export: ({ type }) => {
      $.magnificPopup.open({
        items: {
          src: `
            <div class="white-popup-block">
              Dynamically created popup for ${type} export
          </div>`,
          type: 'inline'
        }
      });
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