const Debug = require('debug')
const Ledger = require('./docTypes/Ledger')

const debug = Debug('jlinx:client:contracts')
module.exports = class Contracts {
  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create (opts = {}) {
    const doc = await this.jlinx.create()
    debug('create', { doc })
    return await Contract.open(doc, this)
  }

  async get (id) {
    debug('get', { id })
    const doc = await this.jlinx.get(id)
    return await Contract.open(doc, this)
  }
}

class Contract {
  static async open (doc, contracts) {
    const contract = new Contract(doc, contracts)
    await contract.update()
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

  async update () {
    await this._ledger.update()
    const value = {}
    value.contractId = this._ledger.id
    let entries = await this._ledger.entries()
    // for (const entry of entries){
    while (entries.length > 0) {
      const entry = entries.shift()
      if (entry.event === 'offered') {
        value.state = 'offered'
        value.contractUrl = entry.contractUrl
        value.offerer = entry.offerer
        value.jlinxHost = entry.jlinxHost
      } else if (entry.event === 'signerResponded') {
        const contractResponse = new ContractParty(
          await this._contracts.jlinx.get(entry.contractResponseId),
          this._contracts
        )
        const _moreEntries = await contractResponse._ledger.entries()
        entries = [...entries, ..._moreEntries]
      } else if (entry.event === 'signed') {
        // if (entry.event.contractId )
        value.state = 'signed'
        value.signer = entry.signer
      } else {
        console.warn('ignoring unknown entry', entry)
      }
    }
    this._value = value
  }

  async offerContract ({ identifier, contractUrl }) {
    if (this.length > 0) throw new Error('already offered')
    await this._ledger.append([
      {
        event: 'offered',
        offerer: identifier,
        contractUrl,
        jlinxHost: this._contracts.jlinx.host.url,
      }
    ])
    await this.update()
  }

  async reject (opts) { return await this._resolve('reject', opts) }
  async sign (opts) { return await this._resolve('sign', opts) }
  async _resolve (move, opts) {
    const doc = await this._contracts.jlinx.create()
    const contractParty = new ContractParty(doc, this._contracts)
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
  constructor (doc, contracts) {
    this._ledger = new Ledger(doc)
    this._contracts = contracts
  }

  get id () { return this._ledger.id }
  get value () { return this._value }
  get state () { return this._value?.state }
  get contractUrl () { return this._value?.contractUrl }
  get offerer () { return this._value?.offerer }

  async update () {
    await this._ledger.update()
    const value = {}
    const entries = await this._ledger.entries()
    for (const entry of entries) {
      if (
        entry.event === 'rejected' ||
        entry.event === 'signed'
      ) {
        value.state = entry.event
        value.contractId = entry.contractId
        value.signer = entry.signer
      } else {
        console.warn('ignoring unknown entry', entry)
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
