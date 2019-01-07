const html = require('choo/html')
const layout = require('../layout')

module.exports = (state, emit) => {
  return layout(html`<div>this is the sync page</div>`, { currentPage: 'sync' })
}