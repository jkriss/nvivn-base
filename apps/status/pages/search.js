const html = require('choo/html')
const fecha = require('fecha')
const humanize = require('tiny-human-time')
const layout = require('../layout')

const {
  normalizeEmail,
  normalizePhone,
  normalizeName,
  hash
} = require('../hashes')

const df = (ms, format='D MMM YYYY h:mma') => {
  if (!ms) return ''
  const d = new Date(ms)
  return fecha.format(d, format)
}

const ef = (ms) => {
  if (!ms) return ''
  return `expires in ${humanize(ms-Date.now())}`
}


module.exports = (state, emit) => {
  async function search(evt) {
    evt.preventDefault()
    const q = document.querySelector('#q').value.trim()
    state.q = q
    console.log("searching for", q)
    let identifier
    if (q.includes('@')) {
      identifier = normalizeEmail(q)
    } else if (q.match(/[a-z]{2}/i)) {
      // not a phone
      identifier = normalizeName(q)
    } else {
      identifier = normalizePhone(q)
    }
    identifier = hash(identifier)
    const results = await nvivn.list({ type: 'status', about: identifier }).then(async items => {
      for (const r of items) {
        r.signedName = await nvivn.readableKey(r.meta.signed[0].publicKey)
      }
      return items

    })
    state.searchResults = results
    evt.target.querySelector('#q').blur()
    emit('render')
  }

  const results = state.searchResults

  return layout(html`
    <div>
      <h2>Reported so far: ${state.statusCount > state.maxFetch ? state.maxFetch+'+' : state.statusCount}</h2>
      <form onsubmit=${search}>
        <input type="text" id="q" value="${state.q || ''}">
        <input type="submit" value="Search">
      </form>
      ${ results && html`
        <div>
          <h3>Found ${results.length} result${results.length !== 1 ? 's' : ''}</h3>
          <ul>
          ${results.map(r => {
            return html`
            <li>
              ${df(r.t)}
              ${r.note}
              ${ef(r.expr)}
              signed by ${r.signedName}
            </li>
            `
          })}
          </ul>
        </div>
        `}
    </div>
  `, { currentPage: 'search' })
}