const Debug = require('debug')
const b4a = require('b4a')
const {
  base58,
  keyToString,
  keyToBuffer
} = require('jlinx-util')
const EventMachine = require('./EventMachine')

const debug = Debug('jlinx:client:identifiers')

module.exports = class Identifiers {
  constructor (jlinx) {
    this.jlinx = jlinx
    this.keys = jlinx.vault.keyStore('identifiers')
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
    return await Identifier.create(doc, this)
  }

  async get (id) {
    debug('get', { id })
    const doc = await this.jlinx.get(id)
    debug('get', { doc })
    return await Identifier.open(doc, this)
  }
}


// class IdentifierEvents extends EventMachine {
//   static events = {

//   }
// }

class Identifier extends EventMachine {

  constructor (doc, identifiers) {
    super(doc)
    this._identifiers = identifiers
    const { publicKey } = this._ledger.doc.ownerSigningKeys
    this._signingKey = keyToString(publicKey)
    this._did = publicKeyToDid(publicKey)
  }

  get id () { return this._ledger.id }
  get value () { return this._value }
  get host () { return this._ledger._header?.host }
  get writable () { return this._ledger.writable }
  get did () { return this._did }
  get signingKey () { return this._signingKey }

  initialState(){
    return {
      services: []
    }
  }

  get services () { return this.state?.services }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  host: ' + opts.stylize(this.host, 'string') + '\n' +
      indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
      indent + '  signingKey: ' + opts.stylize(this.signingKey, 'string') + '\n' +
      indent + ')'
  }

  async addService (service) {
    await this.appendEvent('serviceAdded', { service })
  }

  async removeService (serviceId) {
    await this.appendEvent('removeAdded', { serviceId })
  }

  toJSON () {
    return signingKeyToDidDocument(this.signingKey, {
      services: this.services,
    })
  }
}

Identifier.initialState = {
  services: [],
}

Identifier.events = {

  seriviceAdded: {
    schema: {
      type: 'object',
      properties: {
        service: {
          type: 'object',
          properties: {
            id: { type: 'string' }, //"did:example:123#linked-domain",
            type: { type: 'string' }, // "LinkedDomains",
            serviceEndpoint: { type: 'string' }, // "https://bar.example.com"
          },
          required: ['id', 'type', 'serviceEndpoint'],
          additionalProperties: true
        }
      },
      required: ['service'],
      additionalProperties: false
    },
    validate (state, event) {
      if (!state.services) { return 'cannot add item to closed chest' }
      if (
        state.services.find(services =>
          services.id === event.services.id
        )
      ){
        return `service already referenced by did document: ${event.services.id}`
      }
    },
    apply (state, event) {
      return {
        ...state,
        services: [...state.services, event.service]
      }
    }
  },

  seriviceRemoved: {
    schema: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' }
      },
      required: ['serviceId'],
      additionalProperties: false
    },
    validate (state, { serviceId }) {
      const service = state.services.find(service => service.id === serviceId)
      if (!service) { return `service is references by the did document: ${serviceId}` }
    },
    apply (state, { serviceId }) {
      return {
        ...state,
        services: state.services.filter(service => service.id !== serviceId)
      }
    }
  },
}

function signingKeyToDidDocument (publicKey) {
  const did = publicKeyToDid(publicKey)
  const publicKeyMultibase = did.split(DID_PREFIX)[1]
  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3id.org/security/suites/x25519-2020/v1'
    ],
    id: `${did}`,
    verificationMethod: [{
      id: `${did}#${publicKeyMultibase}`,
      type: 'Ed25519VerificationKey2020',
      controller: `${did}`,
      publicKeyMultibase: `${publicKeyMultibase}`
    }],
    authentication: [
      `${did}#${publicKeyMultibase}`
    ],
    assertionMethod: [
      `${did}#${publicKeyMultibase}`
    ],
    capabilityDelegation: [
      `${did}#${publicKeyMultibase}`
    ],
    capabilityInvocation: [
      `${did}#${publicKeyMultibase}`
    ],
    keyAgreement: [{
      id: `${did}#${publicKeyMultibase}`,
      type: 'X25519KeyAgreementKey2020',
      controller: `${did}`,
      publicKeyMultibase: `${publicKeyMultibase}`
    }]
  }

  return didDocument
}

// class Identifier {
//   constructor (signingKeyPair) {
//     this.signingKeyPair = signingKeyPair
//     this.publicKey = signingKeyPair.publicKey
//     this.did = publicKeyToDid(this.publicKey)
//   }

//   [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
//     let indent = ''
//     if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
//     return this.constructor.name + '(\n' +
//       indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
//       indent + '  canSign: ' + opts.stylize(this.canSign, 'boolean') + '\n' +
//       indent + ')'
//   }

//   get canSign () { return !!this.signingKeyPair.sign }

//   get didDocument () {
//     return signingKeyToDidDocument(this.publicKey)
//   }
// }

Object.assign(module.exports, {
  didToPublicKey,
  publicKeyToDid,
  signingKeyToDidDocument
})

const DID_PREFIX = 'did:key:z6mk'

function didToPublicKey (did) {
  const matches = did.match(/^did:([^:]+):(.+)$/)
  if (!matches) {
    throw new Error(`invalid did "${did}"`)
  }
  const [, method, id] = matches
  if (method === 'key') {
    if (!id.startsWith('z6mk')) {
      throw new Error(`invalid key encoding format "${did}"`)
    }
    return b4a.from(base58.decode(id.slice(4)))
  }
  if (method === 'jlinx') {
    throw new Error('did:jlinx support not done yet')
  }
}

function publicKeyToDid (publicKey) {
  return `${DID_PREFIX}${base58.encode(keyToBuffer(publicKey))}`
}

function signingKeyToDidDocument (publicKey, opts = {}) {
  const did = publicKeyToDid(publicKey)
  const publicKeyMultibase = did.split(DID_PREFIX)[1]
  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3id.org/security/suites/x25519-2020/v1'
    ],
    id: `${did}`,
    verificationMethod: [{
      id: `${did}#${publicKeyMultibase}`,
      type: 'Ed25519VerificationKey2020',
      controller: `${did}`,
      publicKeyMultibase: `${publicKeyMultibase}`
    }],
    authentication: [
      `${did}#${publicKeyMultibase}`
    ],
    assertionMethod: [
      `${did}#${publicKeyMultibase}`
    ],
    capabilityDelegation: [
      `${did}#${publicKeyMultibase}`
    ],
    capabilityInvocation: [
      `${did}#${publicKeyMultibase}`
    ],
    keyAgreement: [{
      id: `${did}#${publicKeyMultibase}`,
      type: 'X25519KeyAgreementKey2020',
      controller: `${did}`,
      publicKeyMultibase: `${publicKeyMultibase}`
    }],
  }

  if (opts.services) didDocument.services = opts.services

  return didDocument
}
