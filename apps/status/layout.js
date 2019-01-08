const html = require('choo/html')
// const makeRoute = require('./make-route')

const pages = [
  { name: 'Report', href: '#' },
  { name: 'Search', href: '#search' },
  { name: 'Sync', href: '#sync' },
]

// inject our styles
// document.head.innerHTML += `<link rel="stylesheet" href="static/styles.css" type="text/css">`
require('./styles.css')

module.exports = function (body, { currentPage }={}) {
  return html`
<div>
  <nav>
    <h1>status</h1>
    <ul>
      ${pages.map(p => html`
          <li class="${p.name.toLowerCase() === currentPage ? 'active': ''}">
            <a href="${p.href}">${p.name}</a>
          </li>`
        )}
    </ul>
  </nav>
  ${body}
</div>
`
}