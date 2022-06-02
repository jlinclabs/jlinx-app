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

    this.keys = opts.keys

    this.host = new RemoteHost({
      url: opts.hostUrl
    })

    this._ready = this._open()
  }

  ready () { return this._ready }

  async _open () {
    // await this.vault.ready()
    await this.host.ready()
  }

  async destroy () {
    // await this.vault.close()
    // await this.host.destroy()
  }

  async create () {
    await this.ready()
    // create new owner signing keys
    const ownerSigningKey = await this.keys.create()
    // const ownerKeyPair = createSigningKeyPair()
    // debug({ ownerKeyPair })

    const ownerSigningKeyProof = await this.keys.sign(
      keyToBuffer(this.host.publicKey),
      ownerSigningKey
    )
    // const ownerSigningKeyProof = sign(
    //   keyToBuffer(this.host.publicKey),
    //   ownerKeyPair.secretKey
    // )
    // debug('creating', {
    //   ownerSigningKey: keyToString(ownerKeyPair.publicKey)
    // })
    debug({
      ownerSigningKey,
      ownerSigningKeyProof
    })
    const id = await this.host.create({
      ownerSigningKey,
      ownerSigningKeyProof
    })
    debug('created', { id })
    return id
    // await this.docs.set(id, {
    //   ownerSigningKey: keyToString(ownerSigningKey),
    // })
    // await this.keys.set(ownerKeyPair.publicKey, ownerKeyPair.secretKey)

    // const doc = new Document(this, id, ownerKeyPair)
    // doc.length = 0
    // return doc
  }

  async get (id, ownerKeyPair) {
    debug('get', { id, ownerKeyPair })
    const doc = new Document(this, id, ownerKeyPair)
    return doc
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
    // this._opening = this._open()
  }

  // get key () { return this.core.key }
  // get publicKey () { return keyToBuffer(this.core.key) }
  // get writable () { return this.core.writable }
  // get length () { return this.length }
  // async _open () {
  //   const info = await this.client.host.getInfo(this.id)
  //   debug('Client.Document#_loadInfo', this, info)
  //   this.length = info.length
  // }

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
