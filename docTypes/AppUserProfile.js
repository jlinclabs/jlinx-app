const Debug = require('debug')
const isPlainObject = require('lodash.isplainobject')

const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:AppUser')

// an app's account for a user
module.exports = class AppUserProfile {
  constructor (doc, jlinx) {
    debug({ doc, jlinx })
    this.ledger = new Ledger(doc)
    this.jlinx = jlinx
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    const value = this._value || {}
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  version: ' + opts.stylize(this.version, 'number') + '\n' +
      indent + '  host: ' + opts.stylize(value.host, 'string') + '\n' +
      // indent + '  state: ' + opts.stylize(value.state, 'string') + '\n' +
      // indent + '  followupUrl: ' + opts.stylize(value.followupUrl, 'string') + '\n' +
      // indent + '  signupSecret: ' + opts.stylize(value.signupSecret, 'string') + '\n' +
      // indent + '  appAccountId: ' + opts.stylize(value.appAccountId, 'string') + '\n' +
      indent + ')'
  }

  get docType () { return 'AppUserProfile' }
  get id () { return this.ledger.id }
  get version () { return this.ledger.length }
  get writable () { return this.ledger.writable }

  waitForUpdate () { return this.ledger.waitForUpdate() }

  async init (opts = {}) {
    await this.ledger.init({
      docType: this.docType
    })
    await this.update()
  }

  async update () {
    await this.ledger.update()
    if (
      !this._value ||
      this._value.version < this.version
    ) {
      this._value = await this._update()
    }
  }

  ready () { return this.update() }

  async _update () {
    const entries = await this.ledger.entries()
    const value = {}
    entries.forEach((entry, index) => {
      if (index === 0) {
        value._header = entry
      } else {
        Object.assign(value, entry)
      }
    })
    return {
      ...value,
      version: this.version,
      id: this.id,
      __entries: entries // DEBUG
    }
  }

  // STATE
  get state () { return this._value?.state }
  get host () { return this._value?.host }

  async value () {
    await this.update()
    return { ...this._value } // TODO deep clone
  }

  // set({ key: value })
  async set (values) {
    if (!isPlainObject(values)) { throw new Error('values must be a plain object') }
    await this.ledger.append([values])
  }

  async get (key) {
    await this.update()
    return this._value[key]
  }
}
