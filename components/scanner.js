const html = require('choo/html')
const Component = require('choo/component')
const Instascan = require('instascan')
const {
  parseFramesReducer,
  areFramesComplete,
  framesToData,
  progressOfFrames
} = require("qrloop/importer")


module.exports = class Scanner extends Component {
  constructor(id, state, emit) {
    super(id)
    this.local = state.components[id] = {
      scanCount: 0,
      frames: null
    }
    this.emit = emit
  }
  handleData(data) {
    try {
      this.local.frames = parseFramesReducer(this.local.frames, data)
      if (areFramesComplete(this.local.frames)) {
        this.emit('scanner:done', framesToData(this.local.frames))
        this.scanner.stop()
        this.local.frames = 0
        this.local.scanCount = 0
        this.emit('scanner:progress', 0)
        this.emit('scanner:scanned', 0)
      } else {
        this.emit('scanner:progress', progressOfFrames(this.local.frames))
      }
    } catch (e) {
      console.warn(e); // a qrcode might fail. maybe the data is corrupted or you scan something that is not relevant.
    }
  };

  load(element) {
    console.log("loading scanner")
    this.scanner = new Instascan.Scanner({ video: element.querySelector('video') })
    this.scanner.addListener('scan', (content) => {
      console.log('got data', content);
      this.handleData(content)
      this.local.scanCount++
      this.emit('scanner:scanned', this.local.scanCount)
    })
    if (this.local.autoScan) this.start()
  }
  async start() {
    const cameras = await Instascan.Camera.getCameras()
    if (cameras.length > 0) {
      const cam = cameras[cameras.length-1]
      console.log("trying camera:", cam)
      this.scanner.start(cam)
      this.scanning = true
    } else {
      console.error('No cameras found.');
    }
  }
  unload() {
    this.scanner.stop()
  }
  update({ scan }={}) {
    if (scan && !this.scanning) this.start()
    return false
  }
  createElement({ scan, style }) {
    this.local.autoScan = scan
    return html`<div>
      <video playsinline style="${style}"></video>
    </div>`
  }
}