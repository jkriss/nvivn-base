const md5 = require('md5')

const normalizePhone = function(phone) {
  return phone.replace(/[^0-9]/g,'')
}

const normalizeEmail = function(email) {
  return email.replace(/\s/g,'').toLowerCase()
}

const normalizeName = function(name) {
  return name.toLowerCase()
}

const hash = function(input) {
  return md5(input)
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  normalizeName,
  hash
}
