const html = require('choo/html')
const layout = require('../layout')

const {
  normalizeEmail,
  normalizePhone,
  normalizeName,
  hash
} = require('../hashes')

const handlers = {
  name: normalizeName,
  email: normalizeEmail,
  phone: normalizePhone
}

module.exports = (state, emit) => {

  async function addStatus(evt) {
    console.log('submitted:', evt)
    evt.preventDefault()
    const data = {}
    const identifiers = []
    for (const field of ['name', 'phone', 'email', 'note']) {
      let val = document.getElementById(field).value
      if (val.trim() !== '') {
        if (handlers[field]) {
          identifiers.push(hash(handlers[field](val)))
        }
        data[field] = val
      }
    }
    const message = {
      type: 'status',
      about: identifiers,
      expr: 'now+30d'
    }
    if (data.note) message.note = data.note
    if (identifiers.length > 0) {
      console.log("saving message", message)
    }

    const m = await nvivn.create(message).then(nvivn.sign)
    console.log("signed message", m)

    await nvivn.post(m)
    emit('record:added')
    evt.target.reset()
  }

  return layout(html`
    <div>
      <h2>Reported so far: ${state.statusCount > state.maxFetch ? state.maxFetch+'+' : state.statusCount}</h2>
      <form class="report" onsubmit=${addStatus}>
        <label for="name">Name</label>
        <input type="text" id="name">
        <label for="phone">Phone</label>
        <input type="text" id="phone">
        <label for="email">Email</label>
        <input type="text" id="email">
        <label for="note">Note</label>
        <input type="text" id="note">
        <input type="submit" value="Save">
      </form>
    </div>
  `, { currentPage: 'report' })
}