const Debug = require('debug')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:profiles')

class Profiles {
  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create (opts = {}) {
    return await this.jlinx.create({
      ...opts,
      class: Profile
    })
  }

  async get (id, opts = {}) {
    debug('get', { id })
    return await this.jlinx.get(id, {
      ...opts,
      class: Profile
    })
  }
}

class Profile extends Ledger {
  constructor (doc, profiles) {
    super(doc)
    this._profiles = profiles
  }

  get serviceEndpoint () { return this._header?.serviceEndpoint }

  async set (changes) {
    for (const key in changes) {
      if (typeof changes[key] === 'undefined') {
        changes[key] = null
      }
    }
    await this.appendEvent('Updated Profile', changes)
  }

  get (key) {
    return this.state[key]
  }

  toJSON () {
    // const data = super.toJSON()
    return {
      ...this.state,
      id: this.id,
      // meta: data,
      serviceEndpoint: this.serviceEndpoint
    }
  }
}

Profiles.Profile = Profile
module.exports = Profiles

Profile.events = {
  'Updated Profile': {
    schema: {
      type: 'object',
      additionalProperties: true
    },
    apply (state, changes) {
      state = { ...state, ...changes }
      for (const key in state) { if (state[key] === null) delete state[key] }
      return state
    }
  }
}
