const Debug = require('debug')

const debug = Debug('jlinx:fetch')


async function fetch (url, options = {}) {
  const { default: fetch } = await import('node-fetch')
  debug('fetch req', { url, options })
  const response = await fetch(url, options)
  debug('fetch res', {
    url,
    status: response.status,
    statusText: response.statusText
  })
  if (response.status >= 400) {
    debug('fetch failed', {
      url,
      status: response.status,
      statusText: response.statusText
    })
    throw new Error(`request failed url="${url}"`)
  }
  debug('fetch res', { url, options, status: response.status })
  return response
}

async function postJSON(url, body){
  const response = await fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  })
  return await response.json()
}

module.exports = {
  fetch,
  postJSON,
}
