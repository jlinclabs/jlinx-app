const Path = require('path')
const Debug = require('debug')

const debug = Debug('jlinx:client:remotehost')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

module.exports = class RemoteHost {
  constructor (opts) {
    debug('RemoteHost', opts)
    this.url = opts.url || 'https://testnet1.jlinx.test'
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  url: ' + opts.stylize(this.url, 'string') + '\n' +
      indent + ')'
  }

  _url (...parts) {
    let url = `${this.url}`.replace(/\/+$/, '')
    if (parts.length > 0){
      url += '/' + Path.join(...parts)
    }
    return url
  }

  async ready () {
    const response = await fetch(this.url, {
      method: 'get',
      headers: {
        Accept: 'application/json'
      },
    })
    const json = await response.json()
    debug(json)
    const { publicKey } = json
    if (!publicKey) {
      throw new Error(`failed to get public key from ${this.url}`)
    }
    this.publicKey = publicKey
    debug('ready')
  }

  async create ({
    ownerSigningKey,
    ownerSigningKeyProof
  }) {
    const url = this._url('create')
    const response = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        ownerSigningKey: ownerSigningKey.toString('hex'),
        ownerSigningKeyProof: ownerSigningKeyProof.toString('hex')
      })
    })
    const { id } = await response.json()
    debug('created', { id })
    return id
  }

  async getLength (id) {
    // TODO validate id
    // /^\/([A-Za-z0-9\-_]{43})$/
    const url = this._url(id)
    const response = await fetch(url, {
      method: 'get',
      headers: {
        Accept: 'application/json'
      },
    })
    const { length } = await response.json()
    debug({ length })
    return length
  }

  async getEntry (id, index) {
    const url = this._url(id, `${index}`)
    const response = await fetch(url, {
      method: 'get',
      headers: {
        Accept: 'application/octet-stream'
      },
    })
    const block = await response.arrayBuffer()
    debug({ id, block })
    return block
  }

  async append (id, block, signature) {
    const url = this._url(id)
    const response = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': block.length,
        'jlinx-signature': signature.toString('hex'),
        Accept: 'application/json'
      },
    })
    const { length } = response.json()
    return length
  }
}

async function fetch (url, options = {}) {
  const { default: fetch } = await import('node-fetch')
  debug('fetch', { url, options })
  const response = await fetch(url, options)
  if (response.status >= 500) {
    debug({
      url,
      status: response.status,
      statusText: response.statusText
    })
    throw new Error(`request failed url="${url}"`)
  }
  debug('fetch', { url, options, status: response.status })
  return response
}
