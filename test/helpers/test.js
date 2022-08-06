const debug = require('debug')('jlinx-client.test')
const helpers = require('jlinx-host/test/helpers/index.js')
const Vault = require('jlinx-vault')
const JlinxClient = require('../..')

const {
  createTestnet: _createTestnet
} = helpers

helpers.createTestnet = async function (...args) {
  const testnet = await _createTestnet(...args)
  testnet.createJlinxClient = async (hostUrl) => {
    if (!hostUrl) hostUrl = testnet.hosts.values()[0].url
    const jlinxClient = new JlinxClient({
      vaultPath: await testnet.newTmpDir(),
      hostUrl,
      vaultKey: Vault.generateKey()
    })
    debug('created jlinxClient', jlinxClient)
    // jlinxClients.push(jlinxClient)
    await jlinxClient.ready()
    return jlinxClient
  }
  return testnet
}

helpers.createJlinxClient = async function (t) {
  let firsttime
  if (!t.testnet) {
    firsttime = true
    t.testnet = await helpers.createTestnet(t)
  }
  const { createHttpServers, createJlinxClient } = t.testnet
  const [host] = await createHttpServers(firsttime ? 2 : 1)
  const client = await createJlinxClient(host.url)
  return client
}

module.exports = helpers
