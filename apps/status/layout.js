const html = require('choo/html')
// const makeRoute = require('./make-route')

const pages = [
  { name: 'Report', href: '#' },
  { name: 'Search', href: '#search' },
  { name: 'Sync', href: '#sync' },
]

module.exports = function (body, { currentPage }={}) {
  return html`
<div>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }
    nav ul {
      padding: 0;
    }
    nav ul, nav li {
      display: inline-block;
    }
    nav li {
      margin-right: 10px;
    }
    nav li.active a {
      font-weight: bold;
      text-decoration: none;
      color: #333;
    }
  </style>
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