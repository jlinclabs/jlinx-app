const Debug = require('debug')
const tape = require('tape')
const tmp = require('tmp-promise')
const fs = require('node:fs/promises')
const HyperDHT = require('@hyperswarm/dht')
const Vault = require('jlinx-vault')
const { createSigningKeyPair } = require('jlinx-util')
const JlinxHost = require('jlinx-host')
const createJlinxHostHttpServer = require('jlinx-host/http-server')

const JlinxClient = require('../../index.js')

const debug = Debug('test')

module.exports.test = function (name, fn, _tape = tape) {
  return _tape(name, run)
  async function run (t) {
    const bootstrappers = []
    const nodes = []

    while (bootstrappers.length < 3) {
      bootstrappers.push(new HyperDHT({ ephemeral: true, bootstrap: [] }))
    }
    debug(`started ${bootstrappers.length} bootstrappers`)

    const bootstrap = []
    for (const node of bootstrappers) {
      await node.ready()
      bootstrap.push({ host: '127.0.0.1', port: node.address().port })
    }
    debug('bootstrappers ready')
    debug({ bootstrap })

    while (nodes.length < 3) {
      const node = new HyperDHT({ ephemeral: false, bootstrap })
      await node.ready()
      nodes.push(node)
    }
    debug('DHT Nodes ready')

    const tmpDirs = []
    const newTmpDir = async () => {
      const { path } = await tmp.dir()
      const destroy = () => fs.rm(path, { recursive: true })
      tmpDirs.push({ path, destroy })
      return path
    }

    const jlinxHosts = []
    const createHost = async () => {
      const jlinxHost = new JlinxHost({
        topic: Buffer.from('theoffline_jlinx_hypercore_topic'),
        storagePath: await newTmpDir(),
        bootstrap: [...bootstrap],
        url: `http://${Vault.generateKey().toString('hex')}.com`,
        keyPair: createSigningKeyPair(),
        vaultKey: Vault.generateKey()
      })
      debug('created jlinxHost', jlinxHost)
      jlinxHosts.push(jlinxHost)
      // await jlinxHost.ready()
      // debug('jlinxHost ready', jlinxHost)

      return jlinxHost
    }
    while (jlinxHosts.length < 2) await createHost()
    debug(`started ${jlinxHosts.length} jlinx hosts`)
    await Promise.all(
      jlinxHosts.map(jlinxHost => jlinxHost.connected())
    )
    if (
      jlinxHosts.some(host => host.node.peers.size === 0)
    ) { throw new Error('hosts failed to connect') }
    debug('jlinx hosts connected')

    const jlinxHostHttpServers = []
    for (const jlinxHost of jlinxHosts) {
      const httpServer = createJlinxHostHttpServer(jlinxHost)
      jlinxHostHttpServers.push(httpServer)
      await httpServer.start()
    }
    debug('jlinx host http servers up')

    const jlinxClients = []
    const createClient = async (
      hostUrl = jlinxHostHttpServers[0].url
    ) => {
      const jlinxClient = new JlinxClient({
        vaultPath: await newTmpDir(),
        hostUrl,
        vaultKey: Vault.generateKey()
      })
      debug('created jlinxClient', jlinxClient)
      jlinxClients.push(jlinxClient)
      await jlinxClient.ready()
      return jlinxClient
    }

    t.jlinxHosts = jlinxHosts
    t.jlinxHostHttpServers = jlinxHostHttpServers

    t.teardown(() => {
      debug('TEST TEARDOWN')
      destroy(jlinxClients)
      destroy(jlinxHostHttpServers)
      destroy(jlinxHosts)
      destroy(tmpDirs)
      destroy(bootstrappers)
      destroy(nodes)
    })

    await fn(t, createClient)
  }
}
exports.test.only = (name, fn) => exports.test(name, fn, tape.only)
exports.test.skip = (name, fn) => exports.test(name, fn, tape.skip)

function destroy (...nodes) {
  for (const node of nodes) {
    if (Array.isArray(node)) destroy(...node)
    else node.destroy()
  }
}
