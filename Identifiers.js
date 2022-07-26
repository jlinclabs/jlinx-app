const Debug = require('debug')
const b4a = require('b4a')
const {
  base58,
  keyToString,
  keyToBuffer
} = require('jlinx-util')
const Ledger = require('./Ledger')

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
    return await Identitfier.create(doc, this)
  }

  async get (did) {
    debug('get', { did })
    const publicKey = didToPublicKey(did)
    debug('get', { publicKey })
    const ownerSigningKeys = await this.keys.get(publicKey)
    debug('get', { ownerSigningKeys })
    // return new Identifier(ownerSigningKeys || { publicKey })
  }
}


// class IdentitfierEvents extends EventMachine {
//   static events = {

//   }
// }

class Identitfier {
  static async create (doc, identifiers) {
    const identitfier = new Identitfier(doc, identifiers)
    await identitfier._ledger.init()
    await identitfier.ready()
    return identitfier
  }

  constructor (doc, identifiers) {
    this._events = new IdentitfierEvents(doc, eventsSpec)
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
  get services () { return this._value?.services }

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

  async ready () {
    await this.update()
  }

  async events () {
    const events = await this._ledger.entries()
    return events.slice(1)
  }

  async update () {
    await this._ledger.update()
    const value = {
      did: this.did,
      services: {},
    }
    let events = await this.events()
    while (events.length > 0) {
      const event = events.shift()
      if (event.event === 'serviceAdded') {
        services[event.service.id] = event.service
      }

      if (event.event === 'serviceRemoved') {
        delete services[event.serviceId]
      }

      else {
        console.warn('ignoring event', event)
      }
    }
    this._value = value
  }


  async addService (service) {
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

  async removeService () {

  }
  // async offerContract (options = {}) {
  //   const {
  //     offerer,
  //     contractUrl,
  //     signatureDropoffUrl
  //   } = options
  //   if (!offerer) throw new Error('offerer is required')
  //   if (!contractUrl) throw new Error('contractUrl is required')
  //   if (this.length > 0) throw new Error('already offered')
  //   await this._ledger.append([
  //     {
  //       event: 'offered',
  //       offerer,
  //       contractUrl,
  //       signatureDropoffUrl,
  //       jlinxHost: this._contracts.jlinx.host.url
  //     }
  //   ])
  //   await this.update()
  // }

  async didDocument () {
    await this.update()
    return signingKeyToDidDocument(this.signingKey, {
      services: this.services,
    })
  }
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
