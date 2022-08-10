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
  get contractUrl () { return this.state?.contractUrl }
  get offerer () { return this.state?.offerer }
  get signatureDropoffUrl () { return this.state?.signatureDropoffUrl }

  get isOffered () { return !!this.state?.offered }
  get isSigned () { return !!this.state?.signed }

  // getInitialState () {
  //   return {
  //     contractId: this.id,
  //     contractUrl: this
  //   }
  // }

  async offerContract (options = {}) {

    const {
      offerer,
      contractUrl,
      signatureDropoffUrl
    } = options
    if (!offerer) throw new Error('offerer is required')
    if (!contractUrl) throw new Error('contractUrl is required')
    if (this.state.offeredTo) throw new Error('already offered')
    await this.appendEvent('Offered Contract', {
      offerer,
      contractUrl,
      signatureDropoffUrl,
      // jlinxHost: this._contracts.jlinx.host.url
    })
  }

  async reject (opts) { return await this._resolve('reject', opts) }
  async sign (opts) { return await this._resolve('sign', opts) }

  async _resolve (move, opts) {
    // TODO ensure this is called by a read-only party, AKA not offered
    const contractParty = await this.doc.client.create({ class: ContractParty })
    await contractParty[`${move}Contract`]({ ...opts, contract: this })
    return contractParty
    // create a new ledgers for the current user's write steam
    // const doc = await this._contracts.jlinx.create(opts)
    // const contractParty = await ContractParty.create(doc, this._contracts)
    // await contractParty[move]({ ...opts, contract: this })
    // return contractParty

    // ????
  }

  async ackSignerResponse (contractResponseId) {
    await this.update()
    const contractResponse = await this.doc.client.get(contractResponseId, { class: ContractParty })
    await contractResponse.update()
    debug({ contractResponse }, contractResponse.state)
    // if (this.isOffered) {
    // if (this.isOffered && !this.isSigned) {
    //   throw new Error('cannot acknowledge response. contract.state !== \'offered\'')
    // }
    // const contractResponse = new ContractParty(
    //   await this._contracts.jlinx.get(contractResponseId),
    //   this._contracts
    // )
    // console.log({ contractResponse })
    // // TODO ensure right contract ID +more
    await this.appendEvent('Acknowledged Signer Response', {
      contractResponseId
    })
  }
}

Contract.events = {
  'Offered Contract': {
    schema: {
      type: 'object',
      properties: {
        offerer: { type: 'string' },
        contractUrl: { type: 'string' },
        signatureDropoffUrl: { type: 'string' },
      },
      required: [
        'offerer',
        'contractUrl',
        'signatureDropoffUrl',
      ],
      additionalProperties: false
    },
    validate (state, event) {
      if (!state.offered) 'contract already offered'
      if (state.signed) 'contract already signed'
    },
    apply (state, event) {
      state = { ...state }
      state.offered = true
      state.offerer = event.offerer
      state.contractUrl = event.contractUrl
      state.signatureDropoffUrl = event.signatureDropoffUrl
      return state
    }
  },
  'Acknowledged Signer Response': {
    schema: {
      type: 'object',
      properties: {
        contractResponseId: { type: 'string' },
      },
      required: [
        'contractResponseId',
      ],
      additionalProperties: false
    },
    validate (state, event, contract) {
      // if (state.signed || state.rejected) return 'signed response already acknowledged'
      if (state.contractResponseId) return 'signed response already acknowledged'
    },
    async apply (state, event, contract) {
      // this is not a long-term way to merge event logs :(
      const contractResponse = await contract.doc.client.get(event.contractResponseId, {
        class: ContractParty
      })
      await contractResponse.update()
      const { contractId, ...contractResponseState } = contractResponse.state
      Object.assign(state, contractResponseState)
      delete state.signatureDropoffUrl
      // state.contractResponseId = event.contractResponseId
      return state
    },
  },
  'Signed Contract': {

  }
}


class ContractParty extends Ledger {

  async signContract({ contract, identifier, ...opts }){
    await this.appendEvent('Signed Contract', {
      contractId: contract.id,
      identifier,
    })
  }

  async rejectContract(){
    await this.appendEvent('Rejected Contract', {
      contractId: contract.id,
      identifier,
    })
  }
}

ContractParty.events = {
  'Signed Contract': {
    schema: {
      type: 'object',
      properties: {
        contractId: { type: 'string' },
        identifier: { type: 'string' },
      },
      required: [
        'contractId',
        'identifier',
      ],
      additionalProperties: false
    },
    validate (state, event) {
      // if (state.signed || state.rejected) return 'signed response already acknowledged'
      // if (state.signed) return 'signed response already acknowledged'
    },
    apply (state, event) {
      state.signed = true
      state.contractId = event.contractId
      state.signer = event.identifier
      return state
    },
  },
  'Rejected Contract': {

  },
}
