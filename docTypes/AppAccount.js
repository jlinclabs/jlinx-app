const Debug = require('debug')
const b4a = require('b4a')

const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:AppAccount')

// A user's account on an app
module.exports = class AppAccount {

  constructor (doc, jlinx) {
    this.ledger = new Ledger(doc)
    this.jlinx = jlinx
    this.id = doc.id
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  version: ' + opts.stylize(this.version, 'number') + '\n' +
      // indent + '  followupUrl: ' + opts.stylize(this.followupUrl, 'string') + '\n' +
      // indent + '  signupSecret: ' + opts.stylize(this.signupSecret, 'string') + '\n' +
      indent + ')'
  }

  get docType () { return 'AppAccount' }
  get id () { return this.ledger.id }
  get version () { return this.ledger.length }
  get writable () { return this.ledger.writable }

  waitForUpdate(){ return this.ledger.waitForUpdate() }

  async init () {
    await this.ledger.init({
      docType: this.docType,
    })
  }

  async update(){
    await this.leger.ready()
    await this.ledger.update()
    if (
      !this._value ||
      this._value.version < this.version
    ){
      this._value = this._update()
    }
  }

  async ready () {
    await this.ledger.ready()
  }
  async _update() {
    const entries = await this.ledger.entries()
    const value = {
      version: this.version,
      id: this.id,
    }
    entries.forEach((entry, index) => {
      if (index === 0){
        value._header = entry
      }else if (entry.event === 'accountOffered'){
        value.state = 'offered'
        value.followupUrl = entry.followupUrl
        value.signupSecret = entry.signupSecret
      }else if (entry.event === 'accountOpened'){
        value.state = 'opened'
      }else if (entry.event === 'accountOfferRescinded'){
        value.state = 'closed'
      }else if (entry.event === 'accountClosed'){
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

  // async update(){
  //   await this.ledger.update()
  //   const entries = await this.ledger.entries()
  //   entries.forEach((entry, index) => {
  //     if (!entry.event){ return }
  //     if (entry.event === 'AccountAccepted'){
  //       this.appUserId = entry.appUserId
  //       this.signupSecret = entry.signupSecret
  //     }
  //   })
  //   return this
  // }

  async acceptAccount (opts = {}) {
    const {
      appUserId,
      signupSecret,
    } = opts
    if (!appUserId){
      throw new Error(`AppAccount#init requires appUserId`)
    }
    await this.ledger.append({
      event: 'AccountAccepted',
      appUserId,
      signupSecret,
    })
  }
  async rejectAccount (opts = {}) {
  }



  // async getFollowupUrl(){
  //   await this.ledger.update()
  // }

  // async events(){
  //   const userEvents = await this.ledger.all()
  //   const { appUserId } = header
  //   const appUser = await this.jlinx.get(appUserId)
  //   const appEvents = appUser.ledger.all()

  //   const events = [
  //     ...userEvents,
  //     ...appEvents,
  //   ]
  //   // TODO sort
  //   debug({ events })
  //   return events
  // }

  // async value(){
  //   const header = await this.ledger.header()
  //   const { appUserId } = header
  //   const appUser = await this.jlinx.get(appUserId)
  //   const appUserValue = await appUser.value()
  //   const value = {
  //     appUserValue,
  //   }
  //   const events = await this.ledger.all()
  //   events.forEach((event, index) => {
  //     if (index === 0){
  //       value.followupUrl = event.followupUrl
  //       value.signupSecret = event.signupSecret
  //     }
  //   })

  //   value.__events = events
  //   return value
  // }

}

