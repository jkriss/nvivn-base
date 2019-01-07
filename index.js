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
let appName = pathParts[1]
const appPath = appName ? `apps/${appName}/index.js` : 'index.js'
if (!appName) appName = 'default'
console.log("app name:", appName)
// const clientPath = window.__APP__ && window.__APP__.clientPath || '/dist/client.js'

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
      messageStore: `leveljs:${keys.publicKey}/${appName}/messages`,
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

    // url persistence
    setHash: (h) => {
      window.location.hash = h ? h.replace('#','') : ''
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
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms')
  iframe.src = '/iframe.html'+window.location.hash
  document.body.appendChild(iframe)
}

setup()