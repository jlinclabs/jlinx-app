const Debug = require('debug')

const {
  keyToString,
  keyToBuffer,
  createRandomString
} = require('jlinx-util')

const Vault = require('jlinx-vault')
const RemoteHost = require('./RemoteHost')
const Document = require('./Document')
const DOC_TYPES = require('./docTypes')


const debug = Debug('jlinx:client')

module.exports = class JlinxClient {

  constructor (opts) {
    debug(opts)

    this.docTypes = Object.create(DOC_TYPES)

    this.vault = new Vault({
      path: opts.vaultPath,
      key: opts.vaultKey
    })

    this.host = new RemoteHost({
      url: opts.hostUrl
    })

    this._ready = this._open()
  }

  ready () { return this._ready }

  async _open () {
    await this.vault.ready()
    await this.host.ready()
  }

  async destroy () {
    await this.vault.close()
    await this.host.destroy()
  }

  async create (opts = {}) {
    debug('create', opts)
    const { docType = 'Raw' } = opts
    const TypeClass = this.docTypes[docType]
    if (!TypeClass){
      throw new Error(`invalid doc type "${docType}"`)
    }
    await this.ready()
    const ownerSigningKeys = await this.vault.keys.createSigningKeyPair()
    const ownerSigningKey = ownerSigningKeys.publicKey
    const ownerSigningKeyProof = await ownerSigningKeys.sign(
      keyToBuffer(this.host.publicKey)
    )
    const id = await this.host.create({
      ownerSigningKey,
      ownerSigningKeyProof,
    })
    await this.vault.docs.put(id, {
      ownerSigningKey: keyToString(ownerSigningKey),
      writable: true,
      length: 0
    })
    const doc = await Document.open({
      host: this.host,
      id,
      ownerSigningKeys,
      length: 0
    })
    const instance = new TypeClass(doc)
    if (instance.init) await instance.init()
    else await instance.ready()
    debug('created', instance)
    return instance
  }

  async get (id) {
    debug('get', { id })
    const docRecord = await this.vault.docs.get(id)
    debug('get', { id, docRecord })
    const ownerSigningKeys = (docRecord && docRecord.ownerSigningKey)
      ? await this.vault.keys.get(keyToBuffer(docRecord.ownerSigningKey))
      : undefined
    debug('get', { id, ownerSigningKeys })
    let doc = await Document.open({
      host: this.host,
      id,
      ownerSigningKeys
    })
    const header = await doc.header()
    debug('get', {doc, header})

    if (header && header.docType && this.docTypes[header.docType]){
      const TypeClass = this.docTypes[header.docType]
      doc = new TypeClass(doc)
    }
    debug('get ->', doc)
    return doc
  }

  async all () {
    // this.vault.myDocIds
    const ids = await this.vault.docs.ids()
    console.log({ ids })
    const docs = await Promise.all(
      ids.map(id => this.get(id))
    )
    return docs
  }

  // METHODS BELOW HERE SHOULD BE MOVED TO PLUGINS

  async createLedger (opts) {
    const doc = await this.create()
    const ledger = await Ledger.init(doc)
    return ledger
  }

  async createVersionedFlatFile () {

  }

  async createAppUser (opts) {
    return await AppUser.create({
      followupUrl: opts.followupUrl,
    })
    // const ledger = await this.createLedger()
    // await ledger.append({
    //   type: 'JlinxAppUser',
    //   encoding: 'json',
    //   followupUrl: opts.followupUrl,
    //   signupSecret: createRandomString(16)
    //   // TODO signed by our public key
    // })
    // return doc
  }

  async createAppAccount ({ appUserId }) {
    debug('createAppAccount', { appUserId })
    const appUser = await this.get(appUserId)
    debug('createAppAccount', { appUser })
    const appUserE1 = await appUser.getJson(0)
    debug('createAppAccount', { appUserE1 })
    const { followupUrl, signupSecret } = appUserE1


    const ledger = await this.createLedger()

    await ledger.append({
      ...opts,
      // type: 'JlinxAppAccount',
      // encoding: 'json',
      // followupUrl: opts.followupUrl
      // TODO signed by our public key
    })
    return doc
  }
}
