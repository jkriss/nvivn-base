const choo = require('choo')
const html = require('choo/html')
const getStore = require('@nvivn/core/util/store-connection')
const { generate } = require('@nvivn/core/util/keys')
const setupHub = require('@nvivn/hub/hub/browser').setup
const { expose } = require('postmsg-rpc')
const proquint = require('proquint')
const { dataToFrames } = require("qrloop/exporter")
const QRCode = require('qrcode')
const nvivnEncoding = require('@nvivn/lora/src/nvivn-encoding')

require('./app.css')

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

  // create  a little app so we can easily do interactive modal things
  const app = choo()
  const IMPORT_TEXT = 'import:text'
  const IMPORT_QR = 'import:qr'
  const EXPORT_TEXT = 'export:text'
  const EXPORT_QR = 'export:QR'

  app.use((state, emitter, app) => {
    const ndjson = (records) => {
      return records.map(r => JSON.stringify(r)+'\n').join('')
    }
    const showModal = () => {
      state.showModal = true
      emitter.emit('render')
    }
    emitter.on(EXPORT_TEXT, ({ records }) => {
      console.log("app handling export:text")
      state.modalType = EXPORT_TEXT
      // prepare text export
      const strPayload = ndjson(records)
      const blob = new Blob([strPayload], { type: 'text/plain' })
      const dataUri = URL.createObjectURL(blob)
      state.exportData = {
        stringData: strPayload,
        dataUri
      }
      showModal()
    })
    emitter.on(IMPORT_TEXT, () => {
      state.modalType = IMPORT_TEXT
      showModal()
    })
    emitter.on(EXPORT_QR, async ({ records }) => {
      console.log("app handling export:qr")
      state.modalType = EXPORT_QR
      showModal()
      setTimeout(async () => {
        const binPayload = Buffer.concat(records.map(r => nvivnEncoding.encode(r)))
        const packetSize = 250
        const loops = 10
        const frames = dataToFrames(binPayload, packetSize, loops)
        const qrImages = await Promise.all(frames.map(f => QRCode.toDataURL(f)))
        state.exportData = {
          qrImages,
          currentFrame: 0,
          delay: 150
        }
        showModal()
      }, 10)
    })
  })
  app.route('*', mainView)
  app.mount('#base-app')

  function plural (count, word, ending='s') {
    return `${count} ${word}${count === 1 ? '' : ending}`
  }

  function mainView (state, emit) {

    if (!state.keylistener) {
      console.log("initializing key listener")
      document.addEventListener('keydown', function(event) {
        if (event.keyCode == 27) { // escape
          console.log("escape key")
          hide()
        }
      })
      state.keylistener = true
    }

    if (!state.showModal) return html`<div></div>`

    let content = 'Loading...'

    function hide() {
      state.showModal = false
      state.importData = null
      state.exportData = null
      state.status = null
      state.error = null
      emit('render')
    }

    function trap(evt) {
      evt.stopPropagation()
    }

    function parseJsonLines(evt) {
      const data = evt.target.value
      state.pastedData = data
      console.log("parsing:", data)
      try {
        const messages = data.trim().split('\n').map(JSON.parse)
        state.importData = messages
        state.error = null
      } catch (err) {
        state.importData = null
        state.error = `Message text isn't valid`
      }
      emit('render')
    }

    async function importMessages(evt) {
      console.log(`importing ${state.importData} messages`)
      state.imported = await hub.postMany({ messages: state.importData })
      state.importData = null
      emit('render')
    }

    if (state.modalType === EXPORT_TEXT) {
      content = html`
        <textarea readonly>${state.exportData.stringData}</textarea>
        <a href="${state.exportData.dataUri}" download="messages.txt">download</a>
      `
    } else if (state.modalType === IMPORT_TEXT) {
      content = html`
      <textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeyup=${parseJsonLines}>${state.pastedData || ''}</textarea>
      ${state.error ? html`<div class="error">${state.error}</div>` : ''}
      <button disabled="${!state.importData}" onclick=${importMessages}>
        Import ${state.importData ? plural(state.importData.length, 'message') : ''}
      </button>
      ${state.imported ? html`
        <div>
          <div class="status">${`Imported ${plural(state.imported.length, 'new message')}`}</div>
          <button onclick=${hide}>Done</button>
        </div>
        ` : ''}
      `
    } else if (state.modalType === EXPORT_QR) {
      if (!state.exportData) {
        content = 'Loading...'
      } else {
        content = html`
        <img id="animated-qr" src="${state.exportData.qrImages[state.exportData.currentFrame++]}">
        `
        setTimeout(() => {
          if (!state.exportData) return
          if (state.exportData.currentFrame === state.exportData.qrImages.length) {
            state.exportData.currentFrame = 0
          }
          emit('render')
        }, state.exportData.delay)
      }
    }
    return html`
      <div>
        <div class="modal" onclick=${hide}>
          <div class="modal-content white-popup-block export" onclick=${trap}>
            <a class="close" onclick=${hide}>close</a>
            ${content}
          </div>
        </div>
      </div>
    `

  }

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

    // public key formatting
    readableKey: (key, { words=3 }={}) => {
      const buf = Buffer.from(key, 'base64')
      return proquint.encode(buf.slice(0,words*2))
    },

    // data sync utilities
    import: async ({ type }) => {
      if (type === 'text') {
        app.emitter.emit('import:text')
        // function doImport() {
        //   const value = document.querySelector('#paste-target').value
        //   console.log("importing", value)
        // }
        // content = html`
        // <p>Paste the text into here:</p>
        // <textarea id="paste-target"></textarea>
        // <button onclick=${doImport}>import</button>
        // `
      }
    },

    export: async ({ type, records, filter }) => {
      if (!records) records = await hub.list(filter)

      if (type === 'text') {
        app.emitter.emit(EXPORT_QR, { records })
      } else if (type === 'qr') {
        app.emitter.emit(EXPORT_QR, { records })
      }
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