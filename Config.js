import Debug from 'debug'
import fs from 'fs/promises'
import { fsExists, } from 'jlinx-core/util.js'

const debug = Debug('jlinx:app:config')

export default class Config {
  constructor(path, init){
    this.path = path
    this.init = init
  }

  async exists(){
    return await fsExists(this.path)
  }

  async read(){
    debug('reading config at', this.path)
    try{
      const source = await fs.readFile(this.path, 'utf-8')
      this.value = JSON.parse(source)
    }catch(error){
      if (error.code === 'ENOENT') await this.write(await this.init())
      else throw error
    }
    return this.value
  }

  async write(newValue){
    await fs.writeFile(this.path, JSON.stringify(newValue, null, 2))
    return this.value = newValue
  }

  async patch(patch){
    await this.read()
    await this.write({
      ...this.value,
      ...patch,
    })
  }

  async getServers(){
    const { servers } = await this.read()
    return servers || []
  }

  async setServers(servers){
    await this.patch({ servers })
  }

  async addServer(server){
    if (!server.host) throw new Error(`host is required`)
    const servers = await this.getServers()
    await this.setServers([...servers, server])
  }

  async removeServer(host){
    if (!host) throw new Error(`host is required`)
    const servers = await this.getServers()
    await this.setServers(
      servers.filter(server => server.host !== host)
    )
  }

}

