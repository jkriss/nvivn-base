const makeRoute = (path, { hash }={}) =>  {
  const parts = [window.location.pathname]
  if (path) {
    if (path.length > 0 && path !== '/') parts.push(path.replace(/^\//,''))
  }
  const newPath = parts.join('/')
  return hash ? newPath.replace(/^\//,'#') : newPath
}

module.exports = makeRoute