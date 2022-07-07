
const {
  signingKeyToDidDocument,
  keyToBuffer

} = require('jlinx-util')

const base58 = require('jlinx-util/base58')

module.exports = class Identifiers {
  constructor(jlinx){
    this.jlinx = jlinx
    this.keys = jlinx.vault.keyStore('identifiers')
  }

  async create(){
    const signingKeyPair = await this.keys.createSigningKeyPair()
    return new Identifier(signingKeyPair)
    // const didDocument = signingKeyToDidDocument(keyBox.publicKey)
    // console.log({ didDocument })
    // return didDocument.id
  }

  async get(did){
    // if (typeof publicKey === 'string' && publicKey.startsWith('did:key:'))
    const publicKey = did.split('did:key:')[1]
    console.log({ did, publicKey, pkb: keyToBuffer(publicKey) })
    const signingKeyPair = await this.keys.get(keyToBuffer(publicKey))
    console.log({ signingKeyPair })
    if (signingKeyPair) return new Identifier(signingKeyPair)
  }
}


class Identifier {

  constructor(signingKeyPair){
    this.signingKeyPair = signingKeyPair
    this.publicKey = signingKeyPair.publicKey
    this.did = this.didDocument.id
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

module.exports.didToPublicKey = did => {
  const publicKey = did.split('did:key:')[1]
  return base58.decode(publicKey)
}

module.exports.publicKeyToDid = publicKey => {
  console.log('publicKeyToDid', {publicKey})
  if (!Buffer.isBuffer(publicKey)) publicKey = b64.decode(key)
  const base68EncodedPK = base58.encode(publicKey)
  const publicKeyMultibase = `z6mk${base68EncodedPK}`
  const did = `did:key:${publicKeyMultibase}`
}
