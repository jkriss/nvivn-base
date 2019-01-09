const getStore = require('@nvivn/core/util/store-connection')
const { generate } = require('@nvivn/core/util/keys')
const setupHub = require('@nvivn/hub/hub/browser').setup
const { expose } = require('postmsg-rpc')
const proquint = require('proquint')
const {
  IMPORT_TEXT,
  IMPORT_QR,
  EXPORT_TEXT,
  EXPORT_QR
} = require('constants')

require('./sw-loader.js')
const app = require('./base-app')

const pathParts = window.location.pathname.split('/')
let appName = pathParts[1]
const appPath = appName ? `apps/${appName}/index.js` : 'index.js'
if (!appName) appName = 'default'
console.log("app name:", appName)

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
  // TODO make this less hacky
  window.hub = hub

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

    clear: async () => {
      const messages = await hub.list()
      for (const m of messages) {
        await hub.del({ hash: m.meta.hash, hard: true })
      }
    },

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

    // public key formatting
    readableKey: (key, { words=3 }={}) => {
      const buf = Buffer.from(key, 'base64')
      return proquint.encode(buf.slice(0,words*2))
    },

    // data sync utilities
    import: async ({ type }) => {
      return new Promise((resolve, reject) => {
        if (type === 'text') {
          app.emitter.emit(IMPORT_TEXT, { resolve, reject })
        } else if (type === 'qr') {
          app.emitter.emit(IMPORT_QR, { resolve, reject })
        }
      })
    },

    export: async ({ type, records, filter }) => {
      if (!records) records = await hub.list(filter)

      if (type === 'text') {
        app.emitter.emit(EXPORT_TEXT, { records })
      } else if (type === 'qr') {
        app.emitter.emit(EXPORT_QR, { records })
      }
    }

  }

  // const iframe = document.querySelector('iframe')
  // console.log("iframe:", iframe)
  // iframe.src = '/iframe.html'+window.location.hash

  const customPostMessage = (data, targetOrigin) => {
    // console.log("posting result back", data, targetOrigin)
    iframe.contentWindow.postMessage(data, targetOrigin)
  }

  // TODO lock this down to the current origin?

  for (const m of Object.keys(methods)) {
    expose(m, methods[m], { postMessage: customPostMessage })
  }

  // create an iframe which will host the app code
  const iframe = document.createElement('iframe');

  // const iframe = document.querySelector('iframe')
  // iframe.contentWindow.location.hash=window.location.hash.replace(/^#/,'')


  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin')
  iframe.src = 'iframe.html'+window.location.hash
  document.body.appendChild(iframe)
}

setup()