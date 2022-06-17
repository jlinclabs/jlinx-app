const Debug = require('debug')
const b4a = require('b4a')

const debug = Debug('jlinx:client:Ledger')

module.exports = class Ledger {

  constructor (doc) {
    this.doc = doc
    this._cache = []
  }

  get docType () { return 'Ledger' }
  get id () { return this.doc.id }
  get length () { return this.doc.length }
  get writable () { return this.doc.writable }
  get contentType () { return this.doc._header?.contentType }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + '  contentType: ' + opts.stylize(this.contentType, 'string') + '\n' +
      indent + ')'
  }

  async header () {
    if (!this._header)
      this._header = await this.doc.header()
    return this._header
  }

  async ready () {
    await this.doc.ready()
    await this.header()
  }

  update () { return this.doc.update() }

  encode (event) {
    return b4a.from(JSON.stringify(event))
  }

  decode (buffer) {
    return JSON.parse(buffer)
  }

  async init (header = {}) {
    debug('Ledger INIT', this)
    await this.update()
    if (this.doc.length > 0){
      throw new Error(
        `cannot initialize ${this.docType} ` +
        `in non-empty document. ` +
        `id="${doc.id}" ` +
        `length=${doc.length}`
      )
    }
    await this.doc.setHeader({
      docType: this.docType,
      contentType: 'application/json',
      ...header
    })
    debug('Ledger INIT done', this)
  }

  async get (index) {
    if (index > this.length - 1) return
    let entry = this._cache[index]
    if (!entry) {
      const buffer = await this.doc.get(index)
      entry = this.decode(buffer)
      this._cache[index] = entry
    }
    debug('get', { index, entry })
    return entry
  }

  async append(events){
    await this.doc.append(
      events.map(event =>
        this.encode(event)
      )
    )
  }

  waitForUpdate(){ return this.doc.waitForUpdate() }

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
    if (entries.length !== length){
      throw new Error(`Ledger fucked up`)
    }
    return entries
  }

  // async value(){
  //   return await this.all()
  // }

}


function parseJson(json){
  return JSON.parse(json)
}
