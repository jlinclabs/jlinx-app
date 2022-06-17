const Debug = require('debug')
const { URL } = require('url')
const { createRandomString } = require('jlinx-util')

const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:AppUser')

// an app's account for a user
module.exports = class AppUser {

  constructor (doc) {
    this.ledger = new Ledger(doc)
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
      indent + '  followupUrl: ' + opts.stylize(value.followupUrl, 'string') + '\n' +
      indent + '  signupSecret: ' + opts.stylize(value.signupSecret, 'string') + '\n' +
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
      this._value = this._update()
    }
  }

  ready () { return this.update() }

  async _update() {
    console.log('AppUser _update GETTING ENTRIES', {
      version: this.version,
      id: this.id,
      ledger: this.ledger,
    })
    const entries = await this.ledger.entries()

    console.log('AppUser _update GOT ENTRIES', {
      version: this.version,
      id: this.id,
      ledger: this.ledger,
      entries,
    })
    const value = {
      version: this.version,
      id: this.id,
      state: 'init',
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

  // STATE

  isOfferingAccount(){
    return this._value.state === 'opened'
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
        event: 'accountOffered',
        followupUrl,
        signupSecret: createRandomString(16)
      }
    ])
    // await this.update()
  }

}

