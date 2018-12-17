#!/usr/bin/env node

const budo = require('budo')
const babelify = require('babelify')
const path = require('path')

// TODO if there's a build argument, do that

budo('./index.js', {
  // live: true,             // live reload
  // stream: process.stdout, // log to stdout
  // port: 8000,             // use this as the base port
  pushstate: true,
  dir: [path.join(__dirname, 'dist'), '.'],
  browserify: {
    transform: babelify   // use ES6
  }
}).on('connect', evt => {
  console.log(`Listening at ${evt.uri}`)
})