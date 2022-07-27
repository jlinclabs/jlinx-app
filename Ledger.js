const Debug = require('debug')
const b4a = require('b4a')
const jsonCanonicalize = require('canonicalize')
const { verify, keyToBuffer } = require('jlinx-util')
const debug = Debug('jlinx:client:Ledger')

module.exports = class Ledger {
  constructor (doc) {
    debug({ doc })
    this.doc = doc
  }

  get id () { return this.doc.id }
  get length () { return this.doc.length }
  get writable () { return this.doc.writable }
  get contentType () { return this.doc._header?.contentType }
  get host () { return this.doc._header?.host }
  get signingKey () { return this.doc._header?.signingKey }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + '  contentType: ' + opts.stylize(this.contentType, 'string') + '\n' +
      indent + '  host: ' + opts.stylize(this.host, 'string') + '\n' +
      indent + '  signingKey: ' + opts.stylize(this.signingKey, 'string') + '\n' +
      indent + ')'
  }

  async header () {
    if (!this._header) {
      this._header = await this.doc.header()
      if (
        this._header.length > 0 &&
        this.doc.ownerSigningKeys &&
        !b4a.equals(
          keyToBuffer(this._header.signingKey),
          this.doc.ownerSigningKeys.publicKey
        )
      ) throw new Error(`owner signing key mismatch! id=${this.id}`)
    }
    return this._header
  }

  async ready () {
    await this.doc.ready()
    await this.header()
  }

  update () { return this.doc.update() }

  async init (header = {}) {
    debug('Ledger INIT', this)
    await this.update()
    if (this.doc.length > 0) {
      throw new Error(
        `cannot initialize ${this} ` +
        'in non-empty document. ' +
        `id="${this.doc.id}" ` +
        `length=${this.doc.length}`
      )
    }
    await this.doc.setHeader({
      contentType: 'application/json',
      ...header
    })
    debug('Ledger INIT done', this)
  }

  async _verify (entry) {
    await this.header()
    const { __signature, ...signed } = entry
    return await verify(
      b4a.from(jsonCanonicalize(signed)),
      b4a.from(__signature, 'hex'),
      keyToBuffer(this.signingKey)
    )
  }

  async get (index, verify = false) {
    if (index > this.length - 1) return
    const buffer = await this.doc.get(index)
    const entry = JSON.parse(buffer)
    if (index > 0 && verify) {
      const valid = await this._verify(entry)
      if (!valid) {
        throw new Error(
          `ledger event signature invalid. index=${index}`
        )
      }
    }
    delete entry.__signature
    debug('get', { index, entry })
    return entry
  }

  async append (events) {
    const signedEvents = []
    for (const event of events) {
      const json = b4a.from(jsonCanonicalize(event))
      const signature = await this.doc.ownerSigningKeys.sign(json)
      const signedEvent = JSON.stringify({
        ...JSON.parse(json),
        __signature: signature.toString('hex')
      })
      signedEvents.push(b4a.from(signedEvent))
    }
    await this.doc.append(signedEvents)
  }

  waitForUpdate () { return this.doc.waitForUpdate() }

  async entries () {
    // debug('entries', this.id, { length: this.length })
    // await this.update()
    const { id, length } = this
    debug('entries', { id, length })
    if (this.length === 0) return []
    debug('entries getting', { id, length })
    const entries = await Promise.all(
      Array(this.length).fill()
        .map((_, i) => this.get(i))
    )
    debug('GOT entries', {
      id, length, entries
    })
    if (entries.length !== length) {
      throw new Error('Ledger fucked up')
    }
    return entries
  }

}
