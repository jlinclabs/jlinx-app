const Debug = require('debug')
const b4a = require('b4a')

const debug = Debug('jlinx:client:appuser')

module.exports = class AppUser {

  static async init (doc) {
    doc.update()
    if (doc.length > 0){
      throw new Error(`cannot initialize Ledger in non-empty document. legnth=${doc.length}`)
    }
    this.ledger = new Ledger(doc)
    // ledger.append({
    //   contentType: 'application/json',
    //   host: this.doc.host.url,
    // })
  }

  get type () { return 'AppUser' }


  constructor (doc) {
    this.doc = doc
    this._cache = []
  }



}

