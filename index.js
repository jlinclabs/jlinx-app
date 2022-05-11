import Debug from 'debug'
import Path from 'path'
import fs from 'fs/promises'

import fetch from 'node-fetch'
import KeyStore from 'jlinx-core/KeyStore.js'
import DidStore from 'jlinx-core/DidStore.js'
import { fsExists } from 'jlinx-core/util.js'

import JlinxRemoteAgent from 'jlinx-client/JlinxRemoteAgent.js'
import JlinxAgent from 'jlinx-server/JlinxAgent.js'
import Config from './Config.js'
import generateDidDocument from './generateDidDocument.js'

const debug = Debug('jlinx:app')

const DEFAULT_SERVERS = [
  {
    host: 'https://dids.jlinx.io',
    // publicKey: '9rFz9zIvdUtM9bMQuqnnL0gKNNOSozfVtsvjT6mx88Q', // TODO replace with real public key
  },
]

export default class JlinxApp {

  constructor(opts = {}){
    this.storagePath = opts.storagePath
    if (!this.storagePath) throw new Error(`${this.constructor.name} requires 'storagePath'`)
    this.remote = opts.remote /// <--- ???? :/
    this.config = new Config(Path.join(this.storagePath, 'config.json'), async () => {
      if (!(await fsExists(this.storagePath))) await fs.mkdir(this.storagePath)
      debug('initializing jlinx storage at', this.config.path)
      const keyPair = await this.keys.createSigningKeyPair()
      debug('AGENT KEY', keyPair)
      return {
        agentPublicKey: keyPair.publicKeyAsString,
        servers: [...DEFAULT_SERVERS],
      }
    })
    this.keys = new KeyStore(Path.join(this.storagePath, 'keys'))
    this.dids = new DidStore(Path.join(this.storagePath, 'dids'))
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, opts){
    let indent = ''
    if (typeof opts.indentationLvl === 'number')
      while (indent.length < opts.indentationLvl) indent += ' '
    return this.constructor.name + '(\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      indent + ')'
  }

  ready(){
    if (!this._ready) this._ready = (async () => {
      debug(`config: ${this.storagePath}`)
      const config = await this.config.read()
      this.agent = this.remote // TODO maybe change agent depending on config
        ? new JlinxRemoteAgent(this.remote)
        : new JlinxAgent({
          publicKey: config.agentPublicKey,
          storagePath: this.storagePath,
          keys: this.keys,
          dids: this.dids,
        })

      await this.agent.ready()
    })()
    return this._ready
  }

  async connected(){
    await this.ready()
    await this.agent.connected()
  }

  async destroy(){
    debug('DESTROUOING KLIXN APP', this)
    // if (this.agent && this.agent.destroy)
    if (this.agent) await this.agent.destroy()
  }

  async resolveDid(did){
    await this.ready()
    return this.agent.resolveDid(did)
  }

  async createDid(){
    await this.ready()
    const { did, secret } = await this.agent.createDid()
    await this.dids.track(did)
    debug({ did, secret })
    debug(`creating did=${did}`)
    const signingKeyPair = await this.keys.createSigningKeyPair()
    const encryptingKeyPair = await this.keys.createEncryptingKeyPair()
    const value = generateDidDocument({
      did, signingKeyPair, encryptingKeyPair,
    })
    debug(`updating did=${did}`, value)
    await this.agent.amendDid({did, secret, value})
    // return await this.agent.resolveDid(did)
    await this.agent.resolveDid(did)
    return value
  }

  async getDidReplicationUrls(did){
    await this.ready()
    const servers = await this.config.getServers()
    return servers.map(server => `${server.host}/${did}`)
  }

  async replicateDid(did){
    // TODO make this less of a mess
    await this.ready()
    await this.agent.ready()
    await this.agent.hypercore.ready() // await for hypercore peers
    await this.agent.hypercore.hasPeers() // await for hypercore peers

    const servers = await this.getDidReplicationUrls(did)
    if (servers.length === 0)
      throw new Error(`unable to replicate. no servers listed in config ${this.config.path}`)
    const results = await Promise.all(
      servers.map(url => replicateDid(did, url))
    )
    // const successes = results.map(r => r && r.id === did)
    debug('replicateion results', results)
    // results.sortBy('created')[0]
    if (results.every(success => !success))
      throw new Error(`replication failed`)
  }
}


async function replicateDid(did, url){
  debug(`replicating did=${did} at ${url}`)
  async function attempt(){
    // const url = `${server.host}/${did}`
    debug(`attempting to replicating did=${did} at ${url}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    debug('RESPONSE?', response)
    debug('response.ok?', response.ok)
    const didDocument = response.ok ? await response.json() : null
    debug('response.json()', didDocument)
    if (didDocument && didDocument.id === did) return didDocument
    debug('replication failed')
  }
  const start = Date.now()
  while (Date.now() - start < 20000){
    const didDocument = await attempt()
    debug('wtf🐼', didDocument)
    if (didDocument) return didDocument
  }
}
