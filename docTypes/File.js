const Debug = require('debug')
const b4a = require('b4a')

const debug = Debug('jlinx:client:File')

module.exports = class File {

  constructor (doc) {
    this.doc = doc
  }

  get docType () { return 'File' }
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
      // indent + '  contentType: ' + opts.stylize(this.contentType, 'string') + '\n' +
      indent + ')'
  }

}
