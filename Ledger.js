const Debug = require('debug')
const b4a = require('b4a')
const jsonCanonicalize = require('canonicalize')
const multibase = require('jlinx-util/multibase')
const jtil = require('jlinx-util')
const { compileEvents } = require('./events')
const debug = Debug('jlinx:client:Ledger')

/**
 * Ledger
 *
 * generally deals with one stream unless that stream
 * was moved in-which-case it deals with multiple streams
 * in linear/sequential order
 */
class Ledger {
  static get events () {
    return this === Ledger
      ? BASE_EVENTS
      : (this._events || BASE_EVENTS)
  }

  static set events (events) {
    if (this === Ledger || this.hasOwnProperty('_events')){
      throw new Error(`events for ${this.name} already locked in. Subclass to extend`)
    }
    this._events = safeAssign(
      {},
      Object.getPrototypeOf(this).events,
      compileEvents(events)
    )
  }

  getInitialState () { return {} }

  constructor (doc) {
    debug({ doc })
    this.doc = doc
  }

  get id () { return this.doc.id }
  get length () { return this.doc.length }
  get writable () { return this.doc.writable }
  get contentType () { return this.doc._header?.contentType }
  get host () { return this.doc._header?.host }
  get signingKey () {
    return (
      this.doc._header?.signingKey ||
      this.doc.ownerSigningKeys && multibase.encode(this.doc.ownerSigningKeys.publicKey)
    )
  }

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
          multibase.toBuffer(this._header.signingKey),
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

  async create (opts = {}) {
    debug('Ledger create', this, opts)
    let header = {
      contentType: 'application/json'
    }
    if (typeof opts.header === 'function') {
      header = { ...header, ...opts.header(this) }
    } else if (opts.header) {
      header = { ...header, ...opts.header }
    }
    await this.doc.create({ ...opts, header })
    debug('Ledger created', this)
  }

  async _verify (event) {
    await this.ready()
    const { '@signature': signature, ...signed } = event
    return await jtil.verify(
      b4a.from(jsonCanonicalize(signed)),
      b4a.from(signature, 'hex'),
      multibase.toBuffer(this.signingKey)
    )
  }

  async _unpackEvent (buffer, verify = false) {
    const event = JSON.parse(buffer)
    if (verify) {
      const valid = await this._verify(event)
      if (!valid) {
        debug('INVALID EVENT SIGNATURE', event)
        throw new Error(
          `ledger event signature invalid. index=${index}`
        )
      }
    }
    const {
      '@event': eventName,
      '@eventId': eventId,
      '@signature': signature,
      ...payload
    } = event

    const eventSpec = this._getEventSpec(eventName)
    if (!eventSpec || !eventSpec.schemaValidate(payload)) {
      const errors = eventSpec.schemaValidate.errors
      debug('INVALID EVENT: doesnt match schema', { event, payload, errors })

      throw new Error(
        `ledger event doesnt match schema ${eventId}: ` +
        errors.map(e =>
          (e.instancePath ? `${e.instancePath} ` : '') + e.message
        ).join(', ')
      )
    }

    delete event['@signature']
    return event
  }

  // // TODO only check signature on first get
  // async getEvent (index, verify = false) {
  //   if (index > this.length - 1) return
  //   const buffer = await this.doc.get(index)
  //   const event = await this._unpackEvent(buffer, index > 0 && verify)
  //   debug('getEvent', { index, event })
  //   return event
  // }

  _getEventSpec (eventName) {
    return this.constructor.events[eventName]
  }

  async appendEvent (eventName, payload = {}) {
    const eventSpec = this._getEventSpec(eventName)
    if (!eventSpec) throw new Error(`invalid event "${eventName}"`)
    // console.log({ eventSpec })
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

    const event = {
      ...payload,
      '@event': eventName,
      '@eventId': jtil.createRandomString(5)
    }
    const json = b4a.from(jsonCanonicalize(event))
    const signature = await this.doc.ownerSigningKeys.sign(json)
    const signedEvent = JSON.stringify({
      ...JSON.parse(json),
      '@signature': signature.toString('hex')
    })

    await this.doc.append([signedEvent])
    await this.update()
  }

  waitForUpdate () { return this.doc.waitForUpdate() }

  // TODO return an streamable that fetches and verfies
  // events on-demand
  async events () {
    const { id, length } = this
    const entries = await this.doc.all()
    if (entries.length !== length) {
      throw new Error('Ledger fucked up')
    }
    if (entries.length < 2) return []
    const events = []
    entries.shift() // remove header
    while (entries.length) {
      const buffer = entries.shift()
      let event
      try {
        event = await this._unpackEvent(buffer, true)
      } catch (error) {
        debug('invalid event', { error })
        continue
      }
      events.push(event)
    }
    // let [header, ...events] = entries
    debug('GOT events', { id, length, events })
    return events
  }

  async update () {
    await this.doc.update()
    // TODO cache what event number our state was last built at and return it
    // if our length has not grown,
    // TODO only apply new events to cached state
    // TODO persist state in local-only hypercore
    const events = await this.events()
    let state = await this.getInitialState()
    while (events.length > 0) {
      const event = events.shift()
      const eventSpec = this._getEventSpec(event['@event'])
      if (eventSpec.apply) {
        state = eventSpec.apply(state, event)
      }
    }
    this._state = Object.freeze(state) // TODO deep freeze
    debug('updated', this, this._state)
    return state
  }

  get state () { return this._state }

  toJSON () {
    // TODO deep clone?
    return {
      id: this.id,
      length: this.length,
      writable: this.writable,
      contentType: this.contentType,
      host: this.host,
      signingKey: this.signingKey,
      state: this.state
    }
  }

  async openDocument () {
    await this.appendEvent('Opened Document', {})
  }

  async closeDocument () {
    await this.appendEvent('Closed Document', {})
  }

  async moveDocument () {
    await this.appendEvent('Moved Document', {})
  }
}

module.exports = Ledger

const BASE_EVENTS = compileEvents({
  /**
   * Opened Document
   */
  'Opened Document': {
    schema: {
      type: 'object',
      properties: {
        'document type': {
          type: 'string'
        },
        'cryptographic signing key': {
          type: 'string'
        },
        // "hyperswarm id" (optional) to get the latest more agressively
        'hyperswarm id': {
          type: 'string'
        },
        // "host url" (optional) to get the latest more agressively
        'host url': {
          type: 'string'
          // TODO pattern
        }
      },
      required: [
        // 'document type',
        // 'cryptographic signing key',
      ],
      additionalProperties: true
    },
    validate (state, doc) {
      if (doc.length > 0) { if (state.open) return 'cannot open already open chest' }
    },
    apply (state) {
      state = { ...state }
      state.open = true
      state.signingKey = state['cryptographic signing key']
      return state
    }
  },
  'Closed Document': {
    schema: {
      type: 'object',
      properties: {
      },
      required: [
      ],
      additionalProperties: true
    },
    validate (state, doc) {
    },
    apply (state) {
      // const state = { ...state }
      // state.open = true
      // state.signingKey = state['cryptographic signing key']
      return state
    }
  },
  'Moved Document': {
    schema: {
      type: 'object',
      properties: {
      },
      required: [
      ],
      additionalProperties: true
    },
    validate (state, doc) {
    },
    apply (state) {
      // const state = { ...state }
      // state.open = true
      // state.signingKey = state['cryptographic signing key']
      return state
    }
  }
})


function safeAssign(target, ...objects){
  for (const object of objects){
    if (object === undefined || object === null) continue
    for (const key in object){
      if (key in target){
        throw new Error(`refusing to override Ledger event "${key}"`)
      }
      target[key] = object[key]
    }
  }
  return target
}
