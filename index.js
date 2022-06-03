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

    this.vault = opts.vault
    if (!this.vault){
      throw new Error()
    }

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
    await this.vault.close()
    await this.host.destroy()
  }

  async create (opts = {}) {
    await this.ready()
    const ownerSigningKeys = opts.ownerSigningKey
      ? await this.vault.keys.get(opts.ownerSigningKey)
      : await this.vault.keys.createSigningKeyPair()
    const ownerSigningKey = ownerSigningKeys.publicKey
    const ownerSigningKeyProof = await ownerSigningKeys.sign(
      keyToBuffer(this.host.publicKey),
      ownerSigningKey
    )
    const id = await this.host.create({
      ownerSigningKey,
      ownerSigningKeyProof
    })
    await this.vault.ownerSigningKeys.set(id, ownerSigningKey)

    debug('created', { id })
    // return id
    const doc = new Document(this.host, id, ownerSigningKeys)
    doc.length = 0
    return doc
  }

  async get (id) {
    debug('get', { id })
    const ownerSigningKey = await this.vault.ownerSigningKeys.get(id)
    const ownerSigningKeys = await this.vault.keys.get(ownerSigningKey)
    const doc = new Document(this.host, id, ownerSigningKeys)
    debug('get', doc)
    return doc
  }
}

class Document {
  constructor (host, id, ownerSigningKeys) {
    this.host = host
    this.id = id
    this.ownerSigningKeys = ownerSigningKeys
    this.writable = !!ownerSigningKeys
    this._entries = []
    this._opening = this._open()
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

  ready () { return this._opening }

  async _open () {
    if (typeof this.length !== 'number') await this.update()
    if (this.length > 0){
      const header = await this.host.getEntry(this.id, 0)
      debug('Client.Document#_open', this, { header })
    }
  }

  async update () {
    this.length = await this.host.getLength(this.id)
  }

  async get (index) {
    await this.ready()
    if (index > this.length - 1) return
    let entry = this._entries[index]
    if (!entry) {
      entry = await this.host.getEntry(this.id, index)
      this._entries[index] = entry
    }
    return entry
  }

  async append (blocks) {
    if (!this.writable) {
      throw new Error('jlinx document is not writable')
    }
    // sign each block
    for (const block of blocks) {
      const signature = await this.ownerSigningKeys.sign(block)
      // const signatureValid = await this.ownerSigningKeys.verify(block, signature)
      // debug({ block, signature, signatureValid })
      // if (!signatureValid){
      //   throw new Error(`unable to sign block`)
      // }
      const newLength = await this.host.append(
        this.id,
        block,
        signature
      )
      this.length = newLength
    }
  }

  sub (/* handler */) {
    throw new Error('now supported yet')
    // this._subs.add(handler)
    // return () => { this._subs.delete(handler) }
  }

  async all () {
    await this.ready()
    if (this.length === 0) return []
    return await Promise.all(
      Array(this.length).fill()
        .map(async (_, i) => this.get(i))
    )
  }

  async value () {
    return this.all()
  }

  toJSON () {
    return {
      id: this.id,
      length: this.length,
      writable: this.writable,
    }
  }

}
