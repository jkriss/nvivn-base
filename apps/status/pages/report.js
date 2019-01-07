const html = require('choo/html')
const layout = require('../layout')

module.exports = (state, emit) => {
  return layout(html`<div>this is the report page</div>`, { currentPage: 'report' })
}