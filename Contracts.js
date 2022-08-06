const Debug = require('debug')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:contracts')
module.exports = class Contracts {
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
    return await Contract.create(doc, this)
  }

  async get (id) {
    debug('get', { id })
    return await this._open(Contract, id)
  }

  async getParty (id) {
    debug('getParty', { id })
    return await this._open(ContractParty, id)
  }

  async _open (Class, id) {
    await this.jlinx.connected()
    const doc = await this.jlinx.get(id)
    const inst = new Class(doc, this)
    await inst.update()
    return inst
  }
}

class Contract {
  static async create (doc, contracts) {
    const contract = new Contract(doc, contracts)
    await contract._ledger.init()
    return contract
  }

  constructor (doc, contracts) {
    this._ledger = new Ledger(doc)
    this._contracts = contracts
  }

  get id () { return this._ledger.id }
  get value () { return this._value }
  get state () { return this._value?.state }
  get contractUrl () { return this._value?.contractUrl }
  get offerer () { return this._value?.offerer }
  get signatureDropoffUrl () { return this._value?.signatureDropoffUrl }

  async events () {
    let events = await this._ledger.entries()
    events = events.slice(1) // cut header
    for (const event of events) {
      if (event.event === 'signerResponded') {
        const contractResponse = await this._contracts.getParty(event.contractResponseId)
        const moreEvents = await contractResponse.events()
        events = [...events, ...moreEvents] // TODO some magic sorting
      }
    }
    return events
  }

  async update () {
    await this._ledger.update()
    const value = {}
    value.contractId = this.id
    const events = await this.events()
    while (events.length > 0) {
      const event = events.shift()
      if (event.event === 'offered') {
        value.state = 'offered'
        value.contractUrl = event.contractUrl
        value.offerer = event.offerer
        value.signatureDropoffUrl = event.signatureDropoffUrl
        value.jlinxHost = event.jlinxHost
      } else if (event.event === 'signerResponded') {
        // const contractResponse =
        //   await this._contracts.getParty(event.contractResponseId)
        // const moreEvents = await contractResponse.events()
        // events = [...events, ...moreEvents]
        value.state = 'signed'
        value.signatureId = event.contractResponseId
      } else if (event.event === 'signed') {
        value.signer = event.signer
      } else {
        console.warn('ignoring event', event)
      }
    }
    this._value = value
  }

  async offerContract (options = {}) {
    const {
      offerer,
      contractUrl,
      signatureDropoffUrl
    } = options
    if (!offerer) throw new Error('offerer is required')
    if (!contractUrl) throw new Error('contractUrl is required')
    if (this.length > 0) throw new Error('already offered')
    await this._ledger.append([
      {
        event: 'offered',
        offerer,
        contractUrl,
        signatureDropoffUrl,
        jlinxHost: this._contracts.jlinx.host.url
      }
    ])
    await this.update()
  }

  async reject (opts) { return await this._resolve('reject', opts) }
  async sign (opts) { return await this._resolve('sign', opts) }
  async _resolve (move, opts) {
    const doc = await this._contracts.jlinx.create(opts)
    const contractParty = await ContractParty.create(doc, this._contracts)
    await contractParty[move]({ ...opts, contract: this })
    return contractParty
  }

  async ackSignerResponse (contractResponseId) {
    await this.update()
    // if (this.length > 0) throw new Error('already offered')
    if (this.state !== 'offered') {
      throw new Error('cannot acknowledge response. contract.state !== \'offered\'')
    }
    // const contractResponse = new ContractParty(
    //   await this._contracts.jlinx.get(contractResponseId),
    //   this._contracts
    // )
    // console.log({ contractResponse })
    // // TODO ensure right contract ID +more
    await this._ledger.append([
      {
        event: 'signerResponded',
        contractResponseId
        // offerer: identifier,
        // contractUrl
      }
    ])
    await this.update()
  }
}

class ContractParty {
  static async create (doc, contracts) {
    const cp = new ContractParty(doc, contracts)
    await cp._ledger.init()
    return cp
  }

  constructor (doc, contracts) {
    this._ledger = new Ledger(doc)
    this._contracts = contracts
  }

  get id () { return this._ledger.id }
  get value () { return this._value }
  get state () { return this._value?.state }
  get contractId () { return this._value?.contractId }
  get contractUrl () { return this._value?.contractUrl }
  get offerer () { return this._value?.offerer }

  async events () {
    const events = await this._ledger.entries()
    return events.slice(1)
  }

  async update () {
    await this._ledger.update()
    const value = {}
    const events = await this.events()
    for (const event of events) {
      if (
        event.event === 'rejected' ||
        event.event === 'signed'
      ) {
        value.state = event.event
        value.contractId = event.contractId
        value.signer = event.signer
      } else {
        console.warn('ignoring event', event)
      }
    }
    this._value = value
  }

  async contract () {
    const { contractId } = await this._ledger.get(0)
    return await this._contracts.get(contractId)
  }

  async reject ({ identifier, contractUrl }) {

  }

  async sign ({ identifier, contract }) {
    await contract.update()
    // todo if (contract.state !== 'offered')
    await this._ledger.append([
      {
        event: 'signed',
        signer: identifier,
        contractId: contract.id
      }
    ])
    // await this.update()
  }
}
