const { test } = require('./helpers/test.js')

const {
  didToPublicKey,
  publicKeyToDid,
} = require('../Identifiers')

test.only('did <-> publicKey', async (t, createClient) => {
  const client = await createClient()

  const { did } = await client.identifiers.create()
  console.log({ did })

  const publicKey = didToPublicKey(did)
  console.log({ did, publicKey })
  t.equal(did, publicKeyToDid(publicKey))
  t.equal(publicKey, publicKeyToDid(did))

})

test('identifiers', async (t, createClient) => {
  const client1 = await createClient(t.jlinxHosts[0].url)
  const client2 = await createClient(t.jlinxHosts[1].url)
  t.notEquals(client1.host.url, client2.host.url)

  const identifierA = await client1.identifiers.create()
  console.log({ identifierA })

  const identifierA1 = await client1.identifiers.get(identifierA.did)

  console.log({ identifierA1 })

  // await client2.contracts.sign(contractId)
  t.end()
})
