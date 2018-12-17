#!/usr/bin/env node

const st = require('st')
const fs = require('fs')
const url = require('url')

const mount = st({ path: __dirname + '/dist', url: '/dist', index: 'index.html' })
const apps = st({ path: __dirname + '/apps', url: '/apps' })

const handler = (req, res) => {
  let stHandled = mount(req, res)
  if (!stHandled) stHandled = apps(req, res)
  if (!stHandled) {
    console.log("req.url:", req.url)
    if (req.url === '/favicon.ico') {
      res.statusCode = 404
      return res.end()
    }
    const reqUrl = url.parse(req.url)
    const pathParts = reqUrl.pathname.split('/')
    const appName = pathParts[1]
    console.log("app name:", appName)
    if (appName) {
      fs.createReadStream(__dirname+'/dist/index.html', 'utf8').pipe(res)
    } else {
      // TODO show the app selection page, or redirect to a default
      return res.end('apps go here')
    }
  }
}

module.exports = handler

if (require.main === module) {
  const http = require('http')
  const server = http.createServer(handler)
  const port = process.env.PORT || 4000
  server.listen(port, () => {
    console.log(`listening at http://localhost:${port}`)
  })
}