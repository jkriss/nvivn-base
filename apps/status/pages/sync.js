const html = require('choo/html')
const layout = require('../layout')

// TODO source this from nvivn
const types = [
  { name: 'qr', label: 'QR code' },
  { name: 'text', label: 'text' }
]

module.exports = (state, emit) => {

  async function query(evt) {
    const selected = evt.target.value
    const filter = { type: 'status', }
    if (selected !== 'all') {
      filter.since = selected
    }
    state.exportTime = selected
    state.exportSet = await nvivn.list(filter)
    emit('render')
  }

  function exportRecords(type) {
    return async () => {
      const records = state.exportSet || await nvivn.list({ type: 'status' })
      console.log(`exporting ${records.length} as ${type}`)
      nvivn.export({ type, records })
    }
  }

  function importRecords(type) {
    return () => {
      console.log(`importing ${type}`)
      nvivn.import({ type })
    }
  }

  const count = state.exportSet ? state.exportSet.length : state.displayTotal

  const makeOption = (value, label) => {
    return html`<option ${state.exportTime === value ? 'selected': ''} value=${value}>${label}</option>`
  }

  return layout(html`
    <div class="export-page">
      <h2>Import</h2>

      ${types.map(t => html`<button onclick=${importRecords(t.name)}>${t.label}</button>`)}

      <h2>
        Export ${count} record${count !== 1 ? 's':''}

        <select onchange=${query}>
          ${makeOption('all', 'all records')}
          ${makeOption('now-24h', 'last 24 hours')}
          ${makeOption('now-7d', 'last 7 days')}
        </select>
      </h2>

      ${types.map(t => html`<button onclick=${exportRecords(t.name)}>${t.label}</button>`)}

    </div>
  `, { currentPage: 'sync' })
}