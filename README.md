# jlinx-client

- has a keyPair identity
- takes a keystore
- stores keypairs locally
- takes a jlinx-node or jlinx-http-node to talk to


## KeytSore API

```js

const keys = {
  async create(){
    return publicKey
  },
  async sign(){
    return signature
  },
  async verify(signable, signature, publicKey){
    return boolean
  }
}

const publicKey1 = await keys.create('signing')
const signature = await keys.sign(
  Buffer.from('hello world'), // any buffer
  publicKey1 // a signing public key
)
await keys.verify(
  Buffer.from('hello world'), 
  signature, 
  publicKey1
)

```
