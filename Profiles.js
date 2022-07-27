const Debug = require('debug')
const b4a = require('b4a')
const {
  base58,
  keyToString,
  keyToBuffer
} = require('jlinx-util')
const EventMachine = require('./EventMachine')

const debug = Debug('jlinx:client:profiles')

module.exports = class Profiles {
  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create (opts = {}) {
    const {
      ownerSigningKeys
    } = opts
    await this.jlinx.connected()
    const doc = await this.jlinx.create({
      ownerSigningKeys
    })
    debug('create', { doc })
    return await Profile.create(doc, this)
  }

  async get (id) {
    debug('get', { id })
    const doc = await this.jlinx.get(id)
    debug('get', { doc })
    return await Profile.open(doc, this)
  }
}

class Profile extends EventMachine {
  constructor (doc, profiles) {
    super(doc)
    this._profiles = profiles
  }

  async set (changes) {
    for (const key in changes)
      if (typeof changes[key] === 'undefined')
        changes[key] = null
    await this.appendEvent('update', changes)
  }

  get (key) {
    return this.value[key]
  }
}

Profile.events = {
  update: {
    schema: {
      type: 'object',
      additionalProperties: true
    },
    apply (state, changes) {
      state = { ...state, ...changes }
      for (const key in state)
        if (state[key] === null) delete state[key]
      return state
    }
  },
}
