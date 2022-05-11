import JlinxDid from 'jlinx-did'
import b64 from 'urlsafe-base64'

export default function generateDidDocument({
  did, signingKeyPair, encryptingKeyPair,
}){
  return JlinxDid.createDidDoc({
    did,
    keys: {
      signingPublicKey: b64.encode(signingKeyPair.publicKey),
      signingPrivateKey: signingKeyPair.secretKey,
      encryptingPublicKey: b64.encode(encryptingKeyPair.publicKey),
      encryptingPrivateKey: encryptingKeyPair.secretKey,
    },
  })
}
