const Debug = require('debug')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:contracts')
module.exports = class Contracts {
  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create (opts = {}) {
    return await this.jlinx.create({
      ...opts,
      class: Contract
    })
  }

  async get (id, opts = {}) {
    debug('get', { id })
    return await this.jlinx.get(id, {
      ...opts,
      class: Contract
    })
  }
}

class Contract extends Ledger {
  constructor (doc, contracts) {
    super(doc)
    this._contracts = contracts
  }

  get id () { return this.doc.id }
  get value () { return this._value }
  get state () { return this._value?.state }
  get contractUrl () { return this._value?.contractUrl }
  get offerer () { return this._value?.offerer }
  get signatureDropoffUrl () { return this._value?.signatureDropoffUrl }

  async offerContract (options = {}) {
    const {
      offerer,
      contractUrl,
      signatureDropoffUrl
    } = options
    if (!offerer) throw new Error('offerer is required')
    if (!contractUrl) throw new Error('contractUrl is required')
    if (this.length > 0) throw new Error('already offered')
    await this.appendEvent('Offered Contract', {
      offerer,
      contractUrl,
      signatureDropoffUrl,
      jlinxHost: this._contracts.jlinx.host.url
    })
  }

  async reject (opts) { return await this._resolve('reject', opts) }
  async sign (opts) { return await this._resolve('sign', opts) }

  async _resolve (move, opts) {
    // create a new ledgers for the current user's write steam
    // const doc = await this._contracts.jlinx.create(opts)
    // const contractParty = await ContractParty.create(doc, this._contracts)
    // await contractParty[move]({ ...opts, contract: this })
    // return contractParty

    // ????
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
    await this.appendEvent('Signer Responded', {
      contractResponseId
    })
  }
}

Contract.events = {
  'Offered Contract': {

  },
  'Signer Responded': {

  },
  'Signed Contract': {

  }
}

// class ContractParty {
//   static async create (doc, contracts) {
//     const cp = new ContractParty(doc, contracts)
//     await cp._ledger.init()
//     return cp
//   }

//   constructor (doc, contracts) {
//     this._ledger = new Ledger(doc)
//     this._contracts = contracts
//   }

//   get id () { return this._ledger.id }
//   get value () { return this._value }
//   get state () { return this._value?.state }
//   get contractId () { return this._value?.contractId }
//   get contractUrl () { return this._value?.contractUrl }
//   get offerer () { return this._value?.offerer }

//   async events () {
//     const events = await this._ledger.entries()
//     return events.slice(1)
//   }

//   async update () {
//     await this._ledger.update()
//     const value = {}
//     const events = await this.events()
//     for (const event of events) {
//       if (
//         event.event === 'rejected' ||
//         event.event === 'signed'
//       ) {
//         value.state = event.event
//         value.contractId = event.contractId
//         value.signer = event.signer
//       } else {
//         console.warn('ignoring event', event)
//       }
//     }
//     this._value = value
//   }

//   async contract () {
//     const { contractId } = await this._ledger.get(0)
//     return await this._contracts.get(contractId)
//   }

//   async reject ({ identifier, contractUrl }) {

//   }

//   async sign ({ identifier, contract }) {
//     await contract.update()
//     // todo if (contract.state !== 'offered')
//     await this._ledger.append([
//       {
//         event: 'signed',
//         signer: identifier,
//         contractId: contract.id
//       }
//     ])
//     // await this.update()
//   }
// }
