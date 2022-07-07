
module.exports = class Contract {
  constructor (doc, client) {
    this.doc = doc
    this.client = client
    // this._state = new MultiledgerStateMachine({
    //   doc, client
    // })
  }
}
