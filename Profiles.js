const Debug = require('debug')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:profiles')
module.exports = class Profiles {
  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create (opts = {}) {
    await this.jlinx.connected()
    const doc = await this.jlinx.create()
    debug('create', { doc })
    return new Profile(doc, this)
  }

  async get (id) {
    debug('get', { id })
    const doc = await this.jlinx.get(id)
    const profile = new Profile(doc, this)
    await profile.update()
    return profile
  }
}

class Profile {
  constructor (doc, contracts) {
    this._ledger = new Ledger(doc)
    this._contracts = contracts
  }
}
