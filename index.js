const Debug = require('debug')

const {
  keyToBuffer,
  keyToString,
  sign,
  createSigningKeyPair,
  validateSigningKeyPair
} = require('jlinx-util')

const Vault = require('jlinx-vault')
const RemoteHost = require('./RemoteHost')

const debug = Debug('jlinx:client')

module.exports = class JlinxClient {
  constructor (opts) {
    debug(opts)

    this.vault = new Vault({
      path: opts.vaultPath,
      key: opts.vaultKey
    })
    this.keys = this.vault.namespace('keys', 'raw')
    this.docs = this.vault.namespace('docs', 'json')

    this.host = new RemoteHost({
      url: opts.hostUrl
    })

    this._ready = this._open()
  }

  ready () { return this._ready }

  async _open () {
    await this.vault.ready()
    await this.host.ready()
  }

  async destroy () {
    // await this.vault.close()
    // await this.host.destroy()
  }

  async create () {
    // create new owner signing keys
    const ownerKeyPair = createSigningKeyPair()

    debug({ ownerKeyPair })
    const ownerSigningKeyProof = sign(
      keyToBuffer(this.host.publicKey),
      ownerKeyPair.secretKey
    )
    debug('creating', {
      ownerSigningKey: keyToString(ownerKeyPair.publicKey)
    })
    const { id } = await this.host.create({
      ownerSigningKey: ownerKeyPair.publicKey,
      ownerSigningKeyProof
    })
    debug('created', { id })
    this.docs.set(id, {
      ownerSigningKey: keyToString(ownerKeyPair.publicKey),
      host: this.host.url
    })
    this.keys.set(ownerKeyPair.publicKey, ownerKeyPair.secretKey)

    return new Document(this, id, ownerKeyPair)
  }

  async get (id) {
    const record = await this.docs.get(id)
    debug('get', { id, record })
    let ownerKeyPair
    if (record) {
      ownerKeyPair = {
        publicKey: keyToBuffer(record.ownerSigningKey)
      }
      ownerKeyPair.secretKey = await this.keys.get(ownerKeyPair.publicKey)
    }
    return new Document(this, id, ownerKeyPair)
  }
}

class Document {
  constructor (client, id, ownerKeyPair) {
    if (!validateSigningKeyPair(ownerKeyPair)) {
      throw new Error('invalid ownerKeyPair')
    }
    this.client = client
    this.id = id
    this.ownerKeyPair = ownerKeyPair
    this.writable = !!ownerKeyPair
    this._opening = this._open()
  }

  // get key () { return this.core.key }
  // get publicKey () { return keyToBuffer(this.core.key) }
  // get writable () { return this.core.writable }
  // get length () { return this.length }
  async _open () {
    const info = await this.client.host.getInfo(this.id)
    debug('Client.Document#_loadInfo', this, info)
    this.length = info.length
  }

  ready () { return this._opening }

  async get (index) {
    // TODO local entry caching
    const entry = this.client.host.getEntry(this.id, index)
    return entry
  }

  async append (blocks) {
    if (!this.writable) {
      throw new Error('jlinx document is not writable')
    }
    // sign each block
    for (const block of blocks) {
      await this.client.host.append(
        this.id,
        block,
        sign(
          block,
          this.ownerKeyPair.secretKey
        )
      )
    }
  }

  sub (/* handler */) {
    throw new Error('now supported yet')
    // this._subs.add(handler)
    // return () => { this._subs.delete(handler) }
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + ')'
  }
}
