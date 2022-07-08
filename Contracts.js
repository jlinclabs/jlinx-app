
const Contract = require('./Contract')

module.exports = class Contracts {

  constructor (jlinx) {
    this.jlinx = jlinx
  }

  async create () {
    const doc = await this.jlinx.create({
      docType: 'Contract'
    })
  }

  async sign () {

  }
}
