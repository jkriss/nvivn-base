const html = require('choo/html')
const choo = require('choo')

const report = require('./pages/report')
const search = require('./pages/search')
const sync = require('./pages/sync')
const makeRoute = require('./make-route')

const app = choo()
app.emitter.on('navigate', () => nvivn.setHash(window.location.hash))
app.use(store)
app.route(makeRoute('/'), report)
app.route(makeRoute('/search'), search)
app.route(makeRoute('/sync'), sync)
app.mount('#app')

function store (state, emitter) {
  state.statusCount = 0
  state.maxFetch = 100
  const countRecords = async () => {
    const records = await nvivn.list({ type: 'status', $limit: state.maxFetch+1 })
    // const records = await nvivn.list({ type: 'status' })
    console.log("got records", records)
    state.statusCount = records.length
    state.displayTotal = state.statusCount > state.maxFetch ? state.maxFetch+'+' : state.statusCount
    emitter.emit('render')
  }
  // initial nvivn load
  countRecords()
  emitter.on('record:added', countRecords)
}