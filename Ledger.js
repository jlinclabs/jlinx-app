const Debug = require('debug')
const b4a = require('b4a')

const debug = Debug('jlinx:client:ledger')

module.exports = class Ledger {

  // static async open (opts) {
  //   const DocumentClass = Document
  //   // if opts changes type
  //   const doc = new DocumentClass(opts)
  //   await doc.ready()
  //   return doc
  // }

  constructor (doc) {
    this.doc = doc
    this._cache = []
  }

  get type () { return 'ledger' }
  get id () { return this.doc.id }
  get length () { return this.doc.length }
  get writable () { return this.doc.writable }
  get contentType () { return this._contentType }

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

  async ready () {
    await this.doc.ready()
    const header = await this.doc.header()
    this._contentType = header.contentType
  }

  update () { return this.doc.update() }

  encode (event) {
    return b4a.from(JSON.stringify(event))
  }

  decode (buffer) {
    return JSON.parse(buffer)
  }

  async init () {
    this.update()
    if (this.doc.length > 0){
      throw new Error(`cannot initialize Ledger in non-empty document. legnth=${doc.length}`)
    }
    await this.append([
      {
        type: this.type,
        // docVersion: '1.0.0',
        contentType: 'application/json',
        host: this.doc.host.url,
      }
    ])
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

  async all () {
    await this.ready()
    if (this.length === 0) return []
    return await Promise.all(
      Array(this.length).fill()
        .map(async (_, i) => this.get(i))
    )
  }

  async value(){
    return await this.all()
  }

}


function parseJson(json){
  return JSON.parse(json)
}
