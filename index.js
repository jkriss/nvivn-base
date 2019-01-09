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
const Scanner = require('./components/scanner')

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
    if (!state.scanner) state.scanner = {}
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
    emitter.on(IMPORT_TEXT, ({ resolve, reject }) => {
      state.modalType = IMPORT_TEXT
      state.rpcPromise = ({ resolve, reject })
      showModal()
    })
    emitter.on(EXPORT_QR, async ({ records }) => {
      console.log("app handling export:qr")
      state.modalType = EXPORT_QR
      showModal()
      setTimeout(async () => {
        let start = Date.now()
        const binPayload = Buffer.concat(records.map(r => nvivnEncoding.encode(r)))
        let end = Date.now()
        console.log('binary encoded in', end-start, 'ms')
        start = end
        const packetSize = 250
        const loops = 5
        const frames = dataToFrames(binPayload, packetSize, loops)
        end = Date.now()
        console.log('calculated data frames in', end-start, 'ms')
        start = end
        // const qrImages = await Promise.all(frames.map(async (f) => {
        //   // return QRCode.toDataURL(f)
        //   return QRCode.toString(f).then(svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
        // }))
        end = Date.now()
        console.log('generated qr codes in', end-start, 'ms')
        state.exportData = {
          qrImages: [],
          frames,
          currentFrame: 0,
          delay: 80
        }
        showModal()
      }, 10)
    })
    emitter.on(IMPORT_QR, async ({ resolve, reject }) => {
      state.modalType = IMPORT_QR
      state.rpcPromise = ({ resolve, reject })
      showModal()
    })
    emitter.on('scanner:scanned', (scanCount) => {
      state.scanner.scanned = scanCount
      emitter.emit('render')
    })
    emitter.on('scanner:progress', (progress) => {
      state.scanner.progress = progress
      emitter.emit('render')
    })
    emitter.on('scanner:done', (data) => {
      // console.log("got scanned data:", data)
      const messages = nvivnEncoding.decodeAll(data)
      console.log("messages", messages)
      state.importData = messages
      emitter.emit('importMessages')
      emitter.emit('hideModal')
    })
    emitter.on('importMessages', async () => {
      console.log(`importing ${state.importData} messages`)
      state.imported = await hub.postMany({ messages: state.importData })
      console.log('import result:', state.imported)
      state.importData = null
      if (state.rpcPromise) {
        state.rpcPromise.resolve(state.imported)
        state.rpcPromise = null
      }
      emitter.emit('render')
    })
    emitter.on('hideModal', () => {
      state.showModal = false
      state.importData = null
      state.exportData = null
      state.status = null
      state.error = null
      emitter.emit('render')
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
      console.log("hiding modal...")
      emit('hideModal')
    }

    function trap(evt) {
      evt.stopPropagation()
    }

    function parseJsonLines(evt) {
      const data = evt.target.value
      state.pastedData = data
      // console.log("parsing:", data)
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

    async function importMessages() {
      emit('importMessages')
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
        const img = state.exportData.qrImages[state.exportData.currentFrame]
        content = html`
        <div>${img ? html`<img id="animated-qr" src="${img}">` : ''}</div>
        `
        setTimeout(async () => {
          // console.log("total frames:", state.exportData.frames.length)
          if (!state.exportData) return
          state.exportData.currentFrame++
          if (state.exportData.currentFrame === state.exportData.frames.length) {
            state.exportData.currentFrame = 0
          }
          let img = state.exportData.qrImages[state.exportData.currentFrame]
          let f = state.exportData.frames[state.exportData.currentFrame]
          if (!img) {
            // console.log("creating image")
            img = await QRCode.toString(f).then(svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
            state.exportData.qrImages[state.exportData.currentFrame] = img
          } else {
            // console.log("using cached image")
          }
          // QRCode.toString(f).then(svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
          emit('render')
        }, state.exportData.delay)
      }
    } else if (state.modalType = IMPORT_QR) {
      content = html`
      <div>
        ${state.cache(Scanner, 'scanner').render({ scan: true, style: 'width:250px;height:250px;' })}
        <div>scanned: ${this.state.scanner.scanned || 0}</div>
        <div>progress: ${this.state.scanner.progress || 0}</div>
      </div>
      `
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
  // iframe.style.border = 0
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms')
  iframe.src = '/iframe.html'+window.location.hash
  document.body.appendChild(iframe)
}

setup()