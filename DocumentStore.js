
module.exports = class DocumentStore {
  constructor (store) {
    this._store = store
  }

  async ids(){
    return (await this._store.get('ids')) || []
  }

}
