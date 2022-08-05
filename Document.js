const Debug = require('debug')
const b4a = require('b4a')
const multibase = require('jlinx-util/multibase')

const debug = Debug('jlinx:client:document')

module.exports = class Document {
  static async open (opts) {
    const doc = new Document(opts)
    await doc.ready()
    return doc
  }

  constructor (opts) {
    this.host = opts.host
    this.id = opts.id
    this.ownerSigningKeys = opts.ownerSigningKeys
    this.writable = !!opts.ownerSigningKeys
    // set on create if loaded from cache
    this.length = opts.length
    this._cache = opts._cache || []
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

  async header () {
    if (!this._header) { this._header = await this.host.getHeader(this.id) }
    return this._header
  }

  async update () {
    delete this._header
    const header = await this.header()
    if (typeof header.length !== 'number') {
      console.error('length missing from header', header)
      throw new Error('length missing from header')
    }
    this.length = header.length || 0
  }

  async _open () {
    debug('open', this)
    if (typeof this.length !== 'number') await this.update()
  }

  async setHeader (header = {}) {
    await this.update()
    if (this.length > 0) {
      throw new Error(
        'cannot set header for non-empty document. ' +
        `id="${this.doc.id}" ` +
        `length=${this.doc.length}`
      )
    }
    header = JSON.stringify({
      contentType: 'application/octet-stream',
      ...header,
      host: this.host.url,
      signingKey: multibase.encode(this.ownerSigningKeys.publicKey)
    })
    this._header = JSON.parse(header)
    await this.append([b4a.from(header)])
    return this._header
  }

  async get (index) {
    // await this.host.ready() // ???
    // await this.ready() // READY uses get lol
    if (index > this.length - 1) return
    let entry = this._cache[index]
    if (!entry) {
      entry = await this.host.getEntry(this.id, index)
      debug('get', { index, entry })
      this._cache[index] = entry
    }
    debug('get', index, entry)
    return entry
  }

  async append (blocks) {
    debug('append', blocks)
    if (!this.writable) {
      throw new Error('jlinx document is not writable')
    }
    // sign each block
    for (let block of blocks) {
      if (!b4a.isBuffer(block)) block = b4a.from(block)
      const signature = await this.ownerSigningKeys.sign(block)
      const newLength = await this.host.append(
        this.id,
        block,
        signature
      )
      this.length = newLength
    }
  }

  sub (/* handler */) {
    // throw new Error('now supported yet')
    // // this._subs.add(handler)
    // // return () => { this._subs.delete(handler) }
    // this.host.waitForUpdate()
  }

  async waitForUpdate () {
    await this.ready()
    await this.host.waitForUpdate(this.id, this.length)
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

  // toJSON () {
  //   return {
  //     id: this.id,
  //     length: this.length,
  //     writable: this.writable
  //   }
  // }

  // // appendJson is TEMP until we make real document subscalles
  // async appendJson (json) {
  //   await this.append([b4a.from(JSON.stringify(json))])
  // }

  // // getJson is TEMP until we make real document subscalles
  // async getJson (index) {
  //   return JSON.parse(await this.get(index))
  // }

  //   // getJson is TEMP until we make real document subscalles
  // async allJson (index) {
  //   const all = await this.all()
  //   return all.map(JSON.parse)
  // }
}
