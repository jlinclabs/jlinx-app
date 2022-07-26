const b4a = require('b4a')
const sodium = require('sodium-universal')
const {
  createSigningKeyPair,
  sign,
  verify,
} = require('jlinx-util')

exports.createSigningKeyPair = (seed) => {
  if (!seed) seed = `${Math.random()}`
  if (!b4a.isBuffer(seed)) seed = b4a.from(seed)
  const _seed = b4a.allocUnsafe(32)
  sodium.crypto_generichash_batch(_seed, [seed])
  const { publicKey, secretKey } = createSigningKeyPair(_seed)
  return exports.constructSigningKeyPair({ publicKey, secretKey })
}

exports.constructSigningKeyPair = ({ publicKey, secretKey }) => {
  return {
    type: 'signing',
    publicKey,
    async sign(message){
      return sign(message, secretKey)
    },
    async verify(message, signature){
      return verify(message, signature, publicKey)
    },
    secretKey // exposed for test
  }
}

