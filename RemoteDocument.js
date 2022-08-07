const Debug = require('debug')
const b4a = require('b4a')
const multibase = require('jlinx-util/multibase')

const debug = Debug('jlinx:client:RemoteDocument')

/**
 * Should match API with jlinx-node/Document
 */
module.exports = class RemoteDocument {
  constructor (opts) {
    this.client = opts.client
    this.host = opts.host
    this.id = opts.id
    this.ownerSigningKeys = opts.ownerSigningKeys
    this.writable = !!opts.ownerSigningKeys
    // set on create if loaded from cache
    this.length = opts.length
    this._cache = opts._cache || []
    this._opening = opts._opening || this._open()
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
    debug('open', this)
    if (typeof this.length !== 'number') await this.update()
  }

  async header () {
    if (!this._header) await this.update()
    return this._header
  }

  async update () {
    const fullHeader = await this.host.getHeader(this.id)
    debug('UPDATE', this, fullHeader)
    const { id, length, ...header } = fullHeader
    // TODO restore this after fixing bug in host/http-server
    // if (id !== this.id) {
    //   console.error('id mismatch')
    //   throw new Error('id mismatch')
    // }
    if (typeof length !== 'number') {
      console.error('length missing from header')
      throw new Error('length missing from header')
    }
    this.length = length
    this._header = header
  }

  async create (opts = {}) {
    await this.update()
    if (this.length > 0) {
      throw new Error(
        'cannot create for non-empty document. ' +
        `id="${this.doc.id}" ` +
        `length=${this.doc.length}`
      )
    }
    const header = JSON.stringify({
      contentType: 'application/octet-stream',
      ...opts.header,
      host: this.host.url,
      signingKey: multibase.encode(this.ownerSigningKeys.publicKey)
    })
    debug('creating', this, { header })
    await this.append([b4a.from(header)])
    this._header = JSON.parse(header)
  }

  async get (index) {
    // await this.host.ready() // ???
    // await this.ready() // READY uses get lol
    if (index > this.length - 1) return
    let entry = this._cache[index]
    let cached
    if (!entry) {
      entry = await this.host.getEntry(this.id, index)
      this._cache[index] = entry
    }else {
      cached = true
    }
    debug('get', index, cached ? 'CACHED' : '')
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
      this._cache[newLength - 1] = block
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
