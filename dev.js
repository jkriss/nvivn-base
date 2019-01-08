#!/usr/bin/env node

const budo = require('budo')
const browserifyCss = require('browserify-css')
const babelify = require('babelify')
const uglifyify = require('uglifyify')
const path = require('path')
const fs = require('fs-extra')

const args = process.argv.slice(2)

if (args[0] === 'build') {
  const browserify = require('browserify');
  const b = browserify()
  const outputFile = './dist/index.js'
  const Terser = require('terser')
  b.add('./index.js')
  b.transform(browserifyCss, { minify: true, autoInject: true })
  b.transform(babelify)
  b.transform(uglifyify)
  fs.ensureDir('./dist').then(() => {
    const outStream = fs.createWriteStream(outputFile)
    b.bundle().pipe(outStream)
    outStream.on('close', () => {
      console.log("browserify finished, minifying")
      const result = Terser.minify(fs.readFileSync(outputFile, 'utf8'))
      if (result.error) {
        console.error("error minifying:", result.error)
      } else {
        fs.writeFileSync(outputFile, result.code)
      }
    })
  })
} else {
  budo('./index.js', {
    // live: true,             // live reload
    // stream: process.stdout, // log to stdout
    // port: 8000,             // use this as the base port
    pushstate: true,
    dir: [path.join(__dirname, 'dev'), path.join(__dirname, 'dist'), '.'],
    browserify: {
      transform: [
        babelify,   // use ES6
        [browserifyCss, { minify: true, autoInject: true }]
      ]

    },
    // middleware: [
    //   appBootstrapHandler
    // ]
  }).on('connect', evt => {
    console.log(`Listening at ${evt.uri}`)
  })
}