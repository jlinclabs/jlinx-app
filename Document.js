const Debug = require('debug')
const b4a = require('b4a')

const debug = Debug('jlinx:client:document')

module.exports = class Document {
  static async open (opts) {
    const DocumentClass = Document
    // if opts changes type
    const doc = new DocumentClass(opts)
    await doc.ready()
    return doc
  }

  constructor (opts) {
    this.host = opts.host
    this.id = opts.id
    this.ownerSigningKeys = opts.ownerSigningKeys
    this.writable = !!opts.ownerSigningKeys
    // set on create of loaded from cache
    this.length = opts.length
    this._entries = opts._entries || []
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
    // if (this.length > 0){
    //   const header = await this.get(0)
    //   debug('Client.Document#_open', this, { header })
    //   // TODO read the header
    //   // get the encoding
    //   // decode/parse entries
    // }
    debug('open', this)
  }

  async update () {
    this.length = await this.host.getLength(this.id)
  }

  async get (index) {
    // await this.host.ready() // ???
    // await this.ready() // READY uses get lol
    if (index > this.length - 1) return
    let entry = this._entries[index]
    if (!entry) {
      entry = await this.host.getEntry(this.id, index)
      this._entries[index] = entry
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
    for (const block of blocks) {
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

  toJSON () {
    return {
      id: this.id,
      length: this.length,
      writable: this.writable
    }
  }

  // appendJson is TEMP until we make real document subscalles
  async appendJson (json) {
    await this.append([b4a.from(JSON.stringify(json))])
  }

  // getJson is TEMP until we make real document subscalles
  async getJson (index) {
    return JSON.stringify(await this.get(index))
  }
}
