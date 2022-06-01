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

  _url (...parts) { return Path.join(this.url, ...parts) }

  async ready () {
    const json = await getJson(this.url)
    debug(json)
    const { publicKey } = json
    if (!publicKey) {
      throw new Error(`failed to get public key from ${this.url}`)
    }
    this.publicKey = publicKey
    debug('ready')
  }

  async create (opts) {
    const {
      ownerSigningKey,
      ownerSigningKeyProof
    } = opts
    const postBody = {
      ownerSigningKey: ownerSigningKey.toString('hex'),
      ownerSigningKeyProof: ownerSigningKeyProof.toString('hex')
    }
    debug({ postBody })
    const { id } = await postJson(this._url('create'), postBody)
    debug('created', { id })
    return { id }
    // return new Document(this, id, 0)
    // return await this.get(id)
    // return new Document(this, id)
  }

  async getInfo (id) {
    // TODO validate id
    // /^\/([A-Za-z0-9\-_]{43})$/
    const info = await getJson(this._url(id))
    debug({ id, info })
    return info
  }

  async getEntry (id, index) {
    const response = await fetch(this._url(id, index))
    const body = response.body
    debug({ id, body })
    return body
  }

  async append (id, block, signature) {

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
    throw new Error('request failed')
  }
  debug('fetch', { url, options, status: response.status })
  return response
}

async function getJson (url, options = {}) {
  const response = await fetch(
    url,
    {
      ...options,
      headers: {
        ...options.headers,
        Accept: 'application/json'
      }
    }
  )
  if (response.status < 300) {
    return await response.json()
  }
}

async function postJson (url, body, options = {}) {
  const response = await fetch(
    url,
    {
      ...options,
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      }
    }
  )
  return await response.json()
}
