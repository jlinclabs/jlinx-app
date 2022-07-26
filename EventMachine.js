const Debug = require('debug')
const b4a = require('b4a')
const {
  compileSchemaSerializer,
  compileSchemaParser,
} = require('./schema')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:identifiers')

module.exports = class EventMachine {

  static async create (doc) {
    const i = new this(doc)
    await i.init()
    await i.ready()
    return i
  }

  static async open (doc) {
    const i = new this(doc)
    await i.ready()
    return i
  }

  constructor (doc) {
    this._ledger = new Ledger(doc)
  }

  async ready () {
    await this.update()
  }

  get state () { return this._state }
  get events () { return this._events }

  async init (header) {
    await this._ledger.init(header)
  }

  _getEventSpec (eventName) {
    return this.constructor.events[eventName]
  }

  async update () {
    await this._ledger.update()
    const spec = this.constructor.events
    const [header, ...events] = await this._ledger.entries()
    let state = {...this.constructor.initialState} // TODO deepcopy

    this._events = [...events]

    while (events.length > 0){
      const event = events.shift()
      const eventSpec = this._getEventSpec(event.eventName)
      if (!eventSpec){
        console.error('\n\nBAD EVENT!\nignoring unexpected event', event, '\n\n')
        continue
      }
      state = eventSpec.apply(state, event.payload)
    }

    return this._state = state
  }

  async appendEvent(eventName, payload){
    // TODO validate event
    const eventSpec = this._getEventSpec(eventName)
    if (!eventSpec) throw new Error(`invalid event "${eventName}"`)
    if (eventSpec.validate) {
      // TODO: consider this.update() here?
      const errorMessage = eventSpec.validate(this.state, payload)
      if (errorMessage) throw new Error(`${errorMessage}`)
    }
    await this._ledger.append([
      {eventName, payload}
    ])
    await this.update()
  }
}
