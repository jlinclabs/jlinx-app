const Debug = require('debug')
const { compileSchemaValidator } = require('./schema')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:EventMachine')

module.exports = class EventMachine {
  static set events (events) {
    if (this._events) throw new Error(`unable to redefine events for ${this}`)
    this._events = compileEvents(events)
    debug('EventMachine events defined', this)
  }

  static get events () { return this._events }

  static async create (doc, ...args) {
    const i = new this(doc, ...args)
    await i.init()
    await i.ready()
    return i
  }

  static async open (doc, ...args) {
    const i = new this(doc, ...args)
    await i.ready()
    return i
  }

  constructor (doc) {
    this._ledger = new Ledger(doc)
  }

  get _header () { return this._ledger.doc._header }
  get id () { return this._ledger.id }
  get host () { return this._header?.host }
  get writable () { return this._ledger.writable }
  get signingKey () { return this._header?.signingKey }
  get state () { return this._state }
  get events () { return this._events }

  toJSON () {
    return {
      id: this.id,
      header: this._header,
      writable: this.writable,
      signingKey: this.signingKey,
      state: this.state,
      events: this.events,
    }
  }

  async init (header) {
    debug({ header })
    if (typeof header === 'function') header = header(this)
    debug({ header })
    await this._ledger.init(header)
  }

  async ready () {
    await this.update()
  }

  _getEventSpec (eventName) {
    return this.constructor.events[eventName]
  }

  async appendEvent (eventName, payload) {
    const eventSpec = this._getEventSpec(eventName)
    if (!eventSpec) throw new Error(`invalid event "${eventName}"`)
    if (!eventSpec.schemaValidate(payload)) {
      const errors = eventSpec.schemaValidate.errors
      // console.error(`invalid event payload`, {eventName, payload, errors})
      throw new Error(
        'invalid event payload: ' +
        errors.map(e =>
          (e.instancePath ? `${e.instancePath} ` : '') + e.message
        ).join(', ')
      )
      // throw new Error(`invalid event payload: ${JSON.stringify(errors)}`)
    }
    if (eventSpec.validate) {
      // TODO: consider this.update() here?
      const errorMessage = eventSpec.validate(this.state, payload)
      if (errorMessage) throw new Error(`${errorMessage}`)
    }
    await this._ledger.append([
      { ...payload, '@event': eventName }
    ])
    await this.update()
  }

  initialState () {
    return {}
  }

  async update () {
    await this._ledger.update()
    const [, ...events] = await this._ledger.entries()
    let state = this.initialState()

    this._events = [...events]

    while (events.length > 0) {
      const { '@event': eventName, ...payload } = events.shift()
      const eventSpec = this._getEventSpec(eventName)
      if (!eventSpec) {
        console.error('\n\nBAD EVENT!\nignoring unexpected event', eventName, '\n\n')
        continue
      }
      state = eventSpec.apply(state, payload)
    }

    this._state = state
    return state
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  host: ' + opts.stylize(this.host, 'string') + '\n' +
      indent + '  signingKey: ' + opts.stylize(this.signingKey, 'string') + '\n' +
      indent + '  version: ' + opts.stylize(this._ledger.doc.length, 'number') + '\n' +
      indent + ')'
  }
}

function compileEvents (events) {
  const cEvents = {}
  for (const eventName in events) {
    const spec = cEvents[eventName] = { ...events[eventName] }
    try {
      spec.schemaValidate = spec.schema === null
        ? makeNullSchemaValidator()
        : compileSchemaValidator(spec.schema)
    } catch (error) {
      throw new Error(`invalid EventMachine schema: ${error}`)
    }
    cEvents[eventName] = spec
  }
  return cEvents
}

function makeNullSchemaValidator () {
  function nullSchemaValidator (value) {
    if (
      typeof value === 'undefined' ||
      value === null
    ) return true
    nullSchemaValidator.errors = [
      {
        message: 'must be null or undefined'
      }
    ]
    return false
  }
  return nullSchemaValidator
}
