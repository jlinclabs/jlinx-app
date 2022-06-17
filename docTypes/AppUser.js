const Debug = require('debug')
const { URL } = require('url')
const { createRandomString } = require('jlinx-util')

const { postJSON } = require('../util')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:AppUser')

// an app's account for a user
module.exports = class AppUser {

  constructor (doc, jlinx) {
    this.ledger = new Ledger(doc)
    this.jlinx = jlinx
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    const value = this._value || {}
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  version: ' + opts.stylize(this.version, 'number') + '\n' +
      indent + '  state: ' + opts.stylize(value.state, 'string') + '\n' +
      indent + '  host: ' + opts.stylize(value.host, 'string') + '\n' +
      indent + '  followupUrl: ' + opts.stylize(value.followupUrl, 'string') + '\n' +
      indent + '  signupSecret: ' + opts.stylize(value.signupSecret, 'string') + '\n' +
      indent + '  appAccountId: ' + opts.stylize(value.appAccountId, 'string') + '\n' +
      indent + ')'
  }

  get docType () { return 'AppUser' }
  get id () { return this.ledger.id }
  get version () { return this.ledger.length }
  get writable () { return this.ledger.writable }

  waitForUpdate(){ return this.ledger.waitForUpdate() }

  async init (opts = {}) {
    await this.ledger.init({
      docType: this.docType,
    })
    await this.update()
  }

  async update(){
    await this.ledger.update()
    if (
      !this._value ||
      this._value.version < this.version
    ){
      this._value = await this._update()
    }
  }

  ready () { return this.update() }

  async _update() {
    const entries = await this.ledger.entries()
    const value = {
      version: this.version,
      id: this.id,
      state: 'init',
    }

    entries.forEach((entry, index) => {
      if (index === 0){
        value._header = entry
      }else if (entry.event === 'AccountOffered'){
        value.state = 'offered'
        value.followupUrl = entry.followupUrl
        value.signupSecret = entry.signupSecret
      }else if (entry.event === 'AccountOpened'){
        value.state = 'open'
        value.appAccountId = entry.appAccountId
        value.userMetadata = entry.userMetadata
      }else if (entry.event === 'AccountOfferRescinded'){
        value.state = 'closed'
      }else if (entry.event === 'AccountClosed'){
        value.state = 'closed'
      }else {
        value._ignoredEntries = value._ignoredEntries || []
        value._ignoredEntries.push(entries)
      }
    })
    if (value.followupUrl){
      value.host = new URL(value.followupUrl).host
    }
    value.__entries = entries
    return value
  }

  // STATE
  get state () { return this._value?.state }
  get host () { return this._value?.host }
  get followupUrl () { return this._value?.followupUrl }
  get signupSecret () { return this._value?.signupSecret }
  get isOffered (){ return this._value?.state === 'offered' }
  get appAccountId () { return this._value?.appAccountId }
  get userMetadata () { return this._value?.userMetadata }

  async getSessionRequests(){
    const entries = await this.ledger.entries()
    const sessionRequests = {}
    for (const entry of entries){
      if (entry.event === 'SessionRequested'){
        sessionRequests[entry.sessionRequestId] = entry
      }
      // if (entry.event === 'Session??????'){
      //   delete sessionRequests[entry.sessionRequestId]
      // }
    }
    return Object.values(sessionRequests)
  }

  // MUTATORS

  async offerAccount (opts = {}) {
    const {
      followupUrl,
    } = opts
    if (!followupUrl){
      throw new Error(`AppUser#init requires followupUrl`)
    }
    await this.ledger.append([
      {
        event: 'AccountOffered',
        followupUrl,
        signupSecret: createRandomString(16)
      }
    ])
    // await this.update()
  }

  async acceptOffer () {
    if (!this.isOffered){
      throw new Error(`failed to accept app user offer`)
    }
    const appAccount = await this.jlinx.create({
      docType: 'AppAccount',
    })
    await appAccount.acceptAppUserOffer(this)

    const nextUpdate = this.waitForUpdate() // await below

    const response = await postJSON(this.followupUrl, {
      appAccountId: appAccount.id,
    })
    debug({ response })

    debug('waiting for appUser to be updated')
    await nextUpdate
    debug('appUser updated!')
    await this.update()
    return appAccount
  }

  async openAccount({ appAccountId, userMetadata }){
    await this.ledger.append([
      {
        event: 'AccountOpened',
        appAccountId,
        userMetadata
      }
    ])
  }

  async requestSession({ sourceInfo }){
    await this.ledger.append([
      {
        event: 'SessionRequested',
        sessionRequestId: createRandomString(),
        sourceInfo,
      }
    ])
  }
}

