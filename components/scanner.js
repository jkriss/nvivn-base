const html = require('choo/html')
const Component = require('choo/component')
const Instascan = require('instascan')
const {
  parseFramesReducer,
  areFramesComplete,
  framesToData,
  progressOfFrames
} = require("qrloop/importer")

const flipStyle = `-webkit-transform: scaleX(-1);transform: scaleX(-1);`

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
        this.setupScanner()
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

  setupScanner() {
    this.scanner = new Instascan.Scanner({
      video: this.local.element.querySelector('video'),
      scanPeriod: 1
     })
    this.scanner.addListener('scan', (content) => {
      console.log('got data', content);
      this.handleData(content)
      this.local.scanCount++
      this.emit('scanner:scanned', this.local.scanCount)
    })
  }

  load(element) {
    this.local.element = element
    console.log("loading scanner")
    this.setupScanner()
    if (this.local.autoScan) this.start()
  }
  async start() {
    let rearFacing = true
    let cameras = await Instascan.Camera.getCamerasWithConstraints({
      facingMode: 'environment'
    })
    // let cameras = await Instascan.Camera.getCameras()
    console.log("cameras:", cameras)
    // alert(`cameras: ${JSON.stringify(cameras)}`)
    if (cameras.length > 0) {
      let cam = cameras.find(c => c.name.match(/(back)|(rear)/i)) || cameras[0]
      // alert("first try camera:" + JSON.stringify(cam))
      try {
        await this.scanner.start(cam)
        this.scanning = true
      } catch (err) {
        // this.scanner.stop()
        this.setupScanner()
        // couldn't get an environment-facing camera
        rearFacing = false
        cameras = await Instascan.Camera.getCameras()
        cam = cameras.find(c => c.name.match(/(back)|(rear)/i))
        if (cam) rearFacing = true
        else cam = cameras[0]
        // alert("second try camera:" + JSON.stringify(cam))
        this.scanner.start(cam)
        this.scanning = true
      }
      if (rearFacing) {
        const video = this.local.element.querySelector('video')
        video.style = this.local.customStyle + ';max-width:100%;-webkit-transform: scaleX(1);transform: scaleX(1);'
      }
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
    this.local.customStyle = style || ''
    // <canvas style=${style}></canvas>
    return html`<div>
      <video playsinline style="${style}"></video>
    </div>`
  }
}