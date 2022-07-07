const Debug = require('debug')
const b4a = require('b4a')
const {
  base58, keyToString, keyToBuffer
} = require('jlinx-util')

const debug = Debug('jlinc:client:identifiers')

module.exports = class Identifiers {
  constructor(jlinx){
    this.jlinx = jlinx
    this.keys = jlinx.vault.keyStore('identifiers')
  }

  async create(){
    const signingKeyPair = await this.keys.createSigningKeyPair()
    debug( 'CREATE', {signingKeyPair} )

    const { publicKey } = signingKeyPair
    console.log('\n\n\n???', {
      publicKey,
      publicKeyAsString: keyToString(publicKey),
      publicKeyFromString: keyToBuffer(keyToString(publicKey)),
      publicKeyB58: base58.encode(publicKey),
      publicKeyFromB58: b4a.from(base58.decode(base58.encode(publicKey))),
    })


    return new Identifier(signingKeyPair)
    // const didDocument = signingKeyToDidDocument(keyBox.publicKey)
    // console.log({ didDocument })
    // return didDocument.id
  }

  async get(did){
    debug('get', { did })
    // if (typeof publicKey === 'string' && publicKey.startsWith('did:key:'))
    const publicKey = did.split('did:key:')[1]
    const publicKeyBuffer = base58.decode(publicKey)
    console.log({
      did,
      publicKey,
      pkb: publicKeyBuffer,
    })
    const signingKeyPair = await this.keys.get(base58.decode(publicKey))
    console.log({ signingKeyPair })
    if (signingKeyPair) return new Identifier(signingKeyPair)
  }
}


class Identifier {

  constructor(signingKeyPair){
    this.signingKeyPair = signingKeyPair
    this.publicKey = signingKeyPair.publicKey
    // this.did = this.didDocument.id
    this.did = publicKeyToDid(this.publicKey)
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
      indent + ')'
  }

  get didDocument(){
    return signingKeyToDidDocument(this.publicKey)
  }
}

Object.assign(module.exports, {
  didToPublicKey,
  publicKeyToDid,
  signingKeyToDidDocument,
})

function didToPublicKeyBuffer(did){
  const publicKey = did.split('did:key:')[1]
  return b4a.from(base58.decode(publicKey))
}

function didToPublicKey(did){
  console.log('\n\n\ndidToPublicKey', { did })
  const pkb = didToPublicKeyBuffer(did)
  const publicKeyAsBuffer = keyToBuffer(pkb)
  const publicKeyAsString = keyToString(pkb)
  console.log('didToPublicKey', { did, pkb, publicKeyAsBuffer, publicKeyAsString })
  return publicKeyAsString
}

function publicKeyToDid(publicKey){
  console.log('publicKeyToDid', {publicKey})
  // if (!Buffer.isBuffer(publicKey)) publicKey = base58.decode(publicKey)
  const base68EncodedPK = base58.encode(publicKey)
  const publicKeyMultibase = `z6mk${base68EncodedPK}`
  return `did:key:${publicKeyMultibase}`
}

function signingKeyToDidDocument(publicKey){
  console.log('signingKeyToDidDocument', publicKey)
  // if (!Buffer.isBuffer(publicKey)) publicKey = b64.decode(key)
  // console.log('signingKeyToDidDocument', publicKey)
  // const base68EncodedPK = base58.encode(publicKey)
  // const publicKeyMultibase = `z6mk${base68EncodedPK}`
  // const did = `did:key:${publicKeyMultibase}`
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
