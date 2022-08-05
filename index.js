const Debug = require('debug')
const multibase = require('jlinx-util/multibase')
const Vault = require('jlinx-vault')

const RemoteHost = require('./RemoteHost')
const Document = require('./Document')

const debug = Debug('jlinx:client')

module.exports = class JlinxClient {
  constructor (opts) {
    debug(opts)

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

  async connected () { return this.host.connected() }

  async create (opts = {}) {
    debug('create')
    await this.ready()

    const ownerSigningKeys =
      opts.ownerSigningKeys ||
      await this.vault.keys.createSigningKeyPair()
    const ownerSigningKey = ownerSigningKeys.publicKey
    const ownerSigningKeyProof = await ownerSigningKeys.sign(
      this.host.publicKey
    )
    const id = await this.host.create({
      ownerSigningKey,
      ownerSigningKeyProof
    })
    await this.vault.docs.put(id, {
      ownerSigningKey: multibase.encode(ownerSigningKey),
      writable: true,
      length: 0
    })
    const doc = await Document.open({
      host: this.host,
      id,
      ownerSigningKeys,
      length: 0
    })
    return doc
    // const instance = new TypeClass(doc, this)
    // if (instance.init) await instance.init(initOpts)
    // else await instance.ready()
    // debug('created', instance)
    // return instance
  }

  async get (id) {
    debug('get', { id })
    const docRecord = await this.vault.docs.get(id)
    debug('get', { id, docRecord })
    const ownerSigningKeys = (docRecord && docRecord.ownerSigningKey)
      ? await this.vault.keys.get(multibase.toBuffer(docRecord.ownerSigningKey))
      : undefined
    debug('get', { id, ownerSigningKeys })
    const doc = await Document.open({
      host: this.host,
      id,
      ownerSigningKeys
    })
    const header = await doc.header()
    debug('get', { doc, header })

    // if (header && header.docType && this.docTypes[header.docType]) {
    //   const TypeClass = this.docTypes[header.docType]
    //   doc = new TypeClass(doc, this)
    // }
    // debug('get ->', doc)
    return doc
  }

  async all () {
    // this.vault.myDocIds
    const ids = await this.vault.docs.ids()
    const docs = await Promise.all(
      ids.map(id => this.get(id))
    )
    return docs
  }

  // // METHODS BELOW HERE SHOULD BE MOVED TO PLUGINS

  // async createAppUser (opts) {
  //   const appUser = await this.create({
  //     docType: 'AppUser'
  //   })
  //   debug('createAppUser created', appUser)
  //   await appUser.offerAccount({
  //     followupUrl: opts.followupUrl
  //   })
  //   debug('createAppUser offered account', appUser)
  //   return appUser
  // }

  // async createAppAccount ({ appUserId }) {
  //   debug('createAppAccount', { appUserId })
  //   const appUser = await this.get(appUserId)
  //   await appUser.update()
  //   debug('createAppAccount', { appUser })
  //   // const appUserValue = await appUser.value()
  //   // debug('createAppAccount', { appUserValue })
  //   const { followupUrl, signupSecret } = appUser
  //   debug('createAppAccount', { followupUrl, signupSecret })

  //   const appAccount = await this.create({
  //     docType: 'AppAccount',
  //     appUserId,
  //     signupSecret
  //   })

  //   const appUserUpdated = appUser.waitForUpdate() // await below

  //   // post AppAccount.id to followupUrl
  //   const response = await postJSON(followupUrl, {
  //     appAccountId: appAccount.id
  //   })
  //   debug({ response })

  //   debug('waiting for appUser to be updated')
  //   await appUserUpdated
  //   debug('appUser updated!')
  //   await appUser.update()
  //   // console.log({ appUser })
  //   // const appUserE2 = await appUser.getJson(1)
  //   // debug('accounts.add', { appUserE2 })

  //   return appAccount
  // }
}

// class Identifiers {
//   constructor(client){
//     this.client = client
//   }

//   async create(){
//     // this.client.vault.
//   }
// }

// class Contracts {
//   constructor(client){
//     this.client = client
//   }

// }
