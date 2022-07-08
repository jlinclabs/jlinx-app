const { test } = require('./helpers/test.js')

const {
  didToPublicKey,
  publicKeyToDid,
} = require('../Identifiers')

test('did <-> publicKey', async (t, createClient) => {
  const client = await createClient()
  const { did } = await client.identifiers.createDidKey()
  console.log({ did })
  const publicKey = didToPublicKey(did)
  t.equal(did, publicKeyToDid(publicKey))
  t.equal(
    publicKey.toString('hex'),
    didToPublicKey(did).toString('hex'),
  )
})

test('jlinx.identifiers.createDidKey', async (t, createClient) => {
  const client1 = await createClient(t.jlinxHosts[0].url)
  const client2 = await createClient(t.jlinxHosts[1].url)
  t.notEquals(client1.host.url, client2.host.url)

  const identifierA = await client1.identifiers.createDidKey()
  t.equals(identifierA.constructor.name, 'Identifier')
  t.ok(identifierA.did.startsWith('did:key:'))
  t.ok(identifierA.canSign)

  const identifierA1 = await client2.identifiers.get(identifierA.did)
  t.equal(identifierA1.did, identifierA.did)
  t.ok(!identifierA1.canSign)

  t.equals(
    identifierA.publicKey.toString('hex'),
    identifierA1.publicKey.toString('hex')
  )

  t.end()
})
