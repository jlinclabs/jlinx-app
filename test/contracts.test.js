const { test } = require('./helpers/test.js')

test('contracts', async (t, createClient) => {
  const alice = {}
  const bob = {}
  alice.client = await createClient(t.jlinxHosts[0].url)
  bob.client = await createClient(t.jlinxHosts[1].url)

  t.notEquals(alice.client.host.url, bob.client.host.url)

  alice.identifier = await alice.client.identifiers.createDidKey()
  bob.identifier = await bob.client.identifiers.createDidKey()

  bob.contract = await bob.client.contracts.create()

  /**  BOB CREATES A CONTRACT  **/
  await bob.contract.offerContract({
    identifier: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md'
  })

  const contractId = bob.contract.id
  t.deepEqual(bob.contract.value, {
    state: 'offered',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md'
  })


  /**  BOB PASSES ALICE THE CONTRACT ID  **/
  alice.contract = await alice.client.contracts.get(contractId)

  t.equals(alice.contract.id, contractId)
  t.equals(alice.contract.length, bob.contract.length)

  /**  ALICE SIGNED THE CONTRACT  **/
  alice.contractResponse = await alice.contract.sign({
    identifier: alice.identifier.did,
  })
  const aliceSignatureId = alice.contractResponse.id

  /**  ALICE PASSES BACK THE SIGNATURE ID  **/

  await bob.contract.update()
  t.deepEqual(bob.contract.value, {
    state: 'offered',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md'
  })

  await bob.contract.ackSignerResponse(aliceSignatureId)
  await bob.contract.update()
  t.deepEqual(bob.contract.value, {
    state: 'signed',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md',
    signer: alice.identifier.did,
  })

  t.end()
})
