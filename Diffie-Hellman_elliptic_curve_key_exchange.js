const crypto = require('crypto')
// const b64 = require('urlsafe-base64')

// Alice and Bob agree in advance on a curve
// available curves can be viewed with crypto.getCurves()
// we'll use secp521r1

// Alice generates her keys...
const aliceECDH = crypto.createECDH('secp521r1')
const aliceKey = aliceECDH.generateKeys()

// Bob generates his keys...
const bobECDH = crypto.createECDH('secp521r1')
const bobKey = bobECDH.generateKeys()

// Alice and Bob exchange keys (maybe using their DID keys
// and sodium.crypto_box() to encrypt them for added protection)
// b64.encode(aliceKey) crypto_box--> Bob
// b64.encode(bobKey) crypto_box--> Alice

// then they each decrypt and decode the other's key and generate the secret...
const aliceSecret = aliceECDH.computeSecret(bobKey)

const bobSecret = bobECDH.computeSecret(aliceKey)

// they are the same secret!
// but without the privately held aliceECDH or bobECDH
// it cannot be derived by eavesdropper Eve
console.log(aliceSecret.equals(bobSecret))

// Then Alice and Bob can use sodium.crypto_secretbox()
// with the shared secret key for ongoing data exchange session.
