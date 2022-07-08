const Debug = require('debug')
const b4a = require('b4a')
const {
  base58, keyToString, keyToBuffer
} = require('jlinx-util')

const debug = Debug('jlinx:client:identifiers')

module.exports = class Identifiers {
  constructor(jlinx){
    this.jlinx = jlinx
    this.keys = jlinx.vault.keyStore('identifiers')
  }

  async createDidKey(){
    const signingKeyPair = await this.keys.createSigningKeyPair()
    return new Identifier(signingKeyPair)
  }

  async createDidDocument(){
  }

  async get(did){
    debug('get', { did })
    const publicKey = didToPublicKey(did)
    debug('get', { publicKey })
    const signingKeyPair = await this.keys.get(publicKey)
    debug('get', { signingKeyPair })
    return new Identifier(signingKeyPair || { publicKey })
  }
}


class Identifier {

  constructor(signingKeyPair){
    this.signingKeyPair = signingKeyPair
    this.publicKey = signingKeyPair.publicKey
    this.did = publicKeyToDid(this.publicKey)
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
      indent + '  canSign: ' + opts.stylize(this.canSign, 'boolean') + '\n' +
      indent + ')'
  }

  get canSign(){ return !!this.signingKeyPair.sign }

  get didDocument(){
    return signingKeyToDidDocument(this.publicKey)
  }
}

Object.assign(module.exports, {
  didToPublicKey,
  publicKeyToDid,
  signingKeyToDidDocument,
})

const DID_PREFIX = 'did:key:z6mk'
function didToPublicKey(did){
  let matches = did.match(/^did:([^:]+):(.+)$/)
  console.log({ matches })
  if (!matches){
    throw new Error(`invalid did "${did}"`)
  }
  const [_, method, id] = matches
  if (method === 'key'){
    if (!id.startsWith('z6mk')){
      throw new Error(`invalid key encoding format "${did}"`)
    }
    return b4a.from(base58.decode(id.slice(4)))
  }
  if (method === 'jlinx'){

  }
}


function publicKeyToDid(publicKey){
  return `${DID_PREFIX}${base58.encode(keyToBuffer(publicKey))}`
}

function signingKeyToDidDocument(publicKey){
  const did = publicKeyToDid(publicKey)
  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://w3id.org/security/suites/x25519-2020/v1"
    ],
    "id": `${did}`,
    "verificationMethod": [{
      "id": `${did}#${publicKeyMultibase}`,
      "type": "Ed25519VerificationKey2020",
      "controller": `${did}`,
      "publicKeyMultibase": `${publicKeyMultibase}`
    }],
    "authentication": [
      `${did}#${publicKeyMultibase}`
    ],
    "assertionMethod": [
      `${did}#${publicKeyMultibase}`
    ],
    "capabilityDelegation": [
      `${did}#${publicKeyMultibase}`
    ],
    "capabilityInvocation": [
      `${did}#${publicKeyMultibase}`
    ],
    "keyAgreement": [{
      "id": `${did}#${publicKeyMultibase}`,
      "type": "X25519KeyAgreementKey2020",
      "controller": `${did}`,
      "publicKeyMultibase": `${publicKeyMultibase}`
    }]
  }

  return didDocument
}
