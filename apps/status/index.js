document.body.style.background = '#f1f1f1'

const html = `
  <input type="button" id="export" value="Export via QR code"></input>
`
document.body.innerHTML = html

document.querySelector('#export').addEventListener('click', () => {
  nvivn.export({ type: 'QR' })
})

console.log("nvivn:", nvivn)