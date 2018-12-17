#!/usr/bin/env node

const budo = require('budo')
const babelify = require('babelify')
const uglifyify = require('uglifyify')
const path = require('path')
const fs = require('fs-extra')

// TODO if there's a build argument, do that

const args = process.argv.slice(2)

if (args[0] === 'build') {
  const browserify = require('browserify');
  const b = browserify()
  b.add('./index.js')
  b.transform(babelify)
  b.transform(uglifyify)
  fs.ensureDir('./dist').then(() => {
    b.bundle().pipe(fs.createWriteStream('./dist/index.js'))
  })
} else {
  budo('./index.js', {
    // live: true,             // live reload
    // stream: process.stdout, // log to stdout
    // port: 8000,             // use this as the base port
    pushstate: true,
    dir: [path.join(__dirname, 'dev'), path.join(__dirname, 'dist'), '.'],
    browserify: {
      transform: babelify   // use ES6
    }
  }).on('connect', evt => {
    console.log(`Listening at ${evt.uri}`)
  })
}