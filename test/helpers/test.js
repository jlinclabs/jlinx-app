const debug = require('debug')('jlinx-client.test')
const helpers = require('jlinx-host/test/helpers/index.js')
const Vault = require('jlinx-vault')
const JlinxClient = require('../..')

const {
  createTestnet: _createTestnet,
} = helpers

helpers.createTestnet = async function(...args){
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

module.exports = helpers

// const test = require('brittle')
// const { timeout } = require('nonsynchronous')
// const _createTestnet = require('@hyperswarm/testnet')
// const tmp = require('tmp-promise')
// const b4a = require('b4a')
// const fs = require('node:fs/promises')
// const {
//   keyToString,
//   keyToBuffer,
//   createSigningKeyPair,
//   sign
// } = require('jlinx-util')
// const Vault = require('jlinx-vault')
// const JlinxHost = require('jlinx-host')
// const createJlinxHostHttpServer = require('jlinx-host/http-server')

// const JlinxClient = require('../..')

// Object.assign(exports, {
//   test,
//   timeout,
//   b4a,
//   keyToString,
//   keyToBuffer,
//   createSigningKeyPair,
//   sign,
//   createTestnet,
//   coreValues,
//   JlinxHost
// })

// async function createTestnet (t, size = 3) {
//   const testnet = await _createTestnet(size, t.teardown)

//   const newTmpDir = async () => {
//     const { path } = await tmp.dir()
//     t.teardown(() => {
//       fs.rm(path, { recursive: true })
//     })
//     return path
//   }

//   testnet.hosts = new Map()
//   testnet.createJlinxHosts = async (size = 2) => {
//     const hosts = []
//     while (hosts.length < size) {
//       const host = new JlinxHost({
//         topic: Buffer.from('_testing_jlinx_host_on_hypercore'),
//         storagePath: await newTmpDir(),
//         bootstrap: testnet.bootstrap,
//         url: `http://${Vault.generateKey().toString('hex')}.com`,
//         keyPair: createSigningKeyPair(),
//         vaultKey: Vault.generateKey()
//       })
//       t.teardown(() => { host.destroy() })
//       hosts.push(host)
//       testnet.hosts.set(host.node.id, host)
//     }
//     await Promise.all(
//       hosts.map(host => host.connected())
//     )
//     for (const host of hosts) {
//       for (const id of testnet.hosts.keys()) {
//         if (host.node.id !== id) {
//           t.ok(
//             host.node.swarm.peers.has(id),
//             `host ${host.node.id} should have peer ${id}`
//           )
//         }
//       }
//     }
//     return hosts
//   }

//   testnet.createHttpServers = async (size = 3) => {
//     const hosts = await testnet.createJlinxHosts(size)
//     const apps = hosts.map(createHttpServer)
//     t.teardown(() => {
//       apps.forEach(app => app.destroy())
//     })
//     return apps
//   }

//   return testnet
// }

// async function coreValues (core) {
//   const values = []
//   for (let n = 0; n < core.length; n++) {
//     values[n] = (await core.get(n)).toString()
//   }
//   return values
// }





// // const Debug = require('debug')
// // const tape = require('tape-promise').default(require('tape'))
// // const tmp = require('tmp-promise')
// // const fs = require('node:fs/promises')
// // const HyperDHT = require('@hyperswarm/dht')
// // const Vault = require('jlinx-vault')
// // const { createSigningKeyPair } = require('jlinx-util')
// // const JlinxHost = require('jlinx-host')
// // const createJlinxHostHttpServer = require('jlinx-host/http-server')

// // const JlinxClient = require('../..')

// // const debug = Debug('test')

// // module.exports.test = function (name, fn, _tape = tape) {
// //   return _tape(name, run)
// //   async function run (t) {
// //     const bootstrappers = []
// //     const nodes = []

// //     while (bootstrappers.length < 3) {
// //       bootstrappers.push(new HyperDHT({ ephemeral: true, bootstrap: [] }))
// //     }
// //     debug(`started ${bootstrappers.length} bootstrappers`)

// //     const bootstrap = []
// //     for (const node of bootstrappers) {
// //       await node.ready()
// //       bootstrap.push({ host: '127.0.0.1', port: node.address().port })
// //     }
// //     debug('bootstrappers ready')
// //     debug({ bootstrap })

// //     while (nodes.length < 3) {
// //       const node = new HyperDHT({ ephemeral: false, bootstrap })
// //       await node.ready()
// //       nodes.push(node)
// //     }
// //     debug('DHT Nodes ready')

// //     const tmpDirs = []
// //     const newTmpDir = async () => {
// //       const { path } = await tmp.dir()
// //       const destroy = () => fs.rm(path, { recursive: true })
// //       tmpDirs.push({ path, destroy })
// //       return path
// //     }

// //     const jlinxHosts = []
// //     const jlinxHostHttpServers = []

// //     const createHost = async () => {
// //       const port = await getPort()
// //       const url = `http://localhost:${port}`
// //       const jlinxHost = new JlinxHost({
// //         topic: Buffer.from('theoffline_jlinx_hypercore_topic'),
// //         storagePath: await newTmpDir(),
// //         bootstrap: [...bootstrap],
// //         // url: `http://${Vault.generateKey().toString('hex')}.com`,
// //         url,
// //         keyPair: createSigningKeyPair(),
// //         vaultKey: Vault.generateKey()
// //       })
// //       debug('created jlinxHost', jlinxHost)
// //       jlinxHosts.push(jlinxHost)
// //       const httpServer = createJlinxHostHttpServer(jlinxHost)
// //       jlinxHostHttpServers.push(httpServer)
// //       await httpServer.start({ port, url })
// //       return jlinxHost
// //     }
// //     while (jlinxHosts.length < 2) await createHost()
// //     debug(`started ${jlinxHosts.length} jlinx hosts`)
// //     await Promise.all(
// //       jlinxHosts.map(jlinxHost => jlinxHost.connected())
// //     )
// //     if (
// //       jlinxHosts.some(host => host.node.peers.size === 0)
// //     ) { throw new Error('hosts failed to connect') }
// //     debug('jlinx hosts connected')

// //     const jlinxClients = []
// //     const createClient = async (
// //       hostUrl = jlinxHostHttpServers[0].url
// //     ) => {
// //       const jlinxClient = new JlinxClient({
// //         vaultPath: await newTmpDir(),
// //         hostUrl,
// //         vaultKey: Vault.generateKey()
// //       })
// //       debug('created jlinxClient', jlinxClient)
// //       jlinxClients.push(jlinxClient)
// //       await jlinxClient.ready()
// //       return jlinxClient
// //     }

// //     t.jlinxHosts = jlinxHosts
// //     t.jlinxHostHttpServers = jlinxHostHttpServers

// //     t.teardown(() => {
// //       debug('TEST TEARDOWN')
// //       destroy(jlinxClients)
// //       destroy(jlinxHostHttpServers)
// //       destroy(jlinxHosts)
// //       destroy(tmpDirs)
// //       destroy(bootstrappers)
// //       destroy(nodes)
// //     })

// //     await fn(t, createClient)
// //   }
// // }
// // exports.test.only = (name, fn) => exports.test(name, fn, tape.only)
// // exports.test.skip = (name, fn) => exports.test(name, fn, tape.skip)

// // function destroy (...nodes) {
// //   for (const node of nodes) {
// //     if (Array.isArray(node)) destroy(...node)
// //     else node.destroy()
// //   }
// // }

// // let getPort = async (...args) => {
// //   getPort = (await import('get-port')).default
// //   return getPort(...args)
// // }
