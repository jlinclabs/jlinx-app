const { test } = require('./helpers/test.js')
const Identifiers = require('../Identifiers')
const Contracts = require('../Contracts')

test('Contracts', async (t, createClient) => {
  const alice = { client: await createClient(t.jlinxHosts[0].url) }
  const bob = { client: await createClient(t.jlinxHosts[1].url) }
  for (const actor of [alice, bob]) {
    actor.client.identifiers = new Identifiers(actor.client)
    actor.client.contracts = new Contracts(actor.client)
  }

  t.notEquals(alice.client.host.url, bob.client.host.url)

  alice.identifier = await alice.client.identifiers.create()
  bob.identifier = await bob.client.identifiers.create()

  bob.contract = await bob.client.contracts.create()
  await bob.contract.update()
  const contractId = bob.contract.id

  t.same(await bob.contract.events(), [])
  t.same(bob.contract.value, {
    contractId
  })

  /**  BOB CREATES A CONTRACT  **/
  await bob.contract.offerContract({
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  t.deepEqual(bob.contract.value, {
    state: 'offered',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md',
    jlinxHost: bob.client.host.url,
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  /**  BOB PASSES ALICE THE CONTRACT ID  **/
  alice.contract = await alice.client.contracts.get(contractId)

  t.equals(alice.contract.id, contractId)
  t.equals(alice.contract.length, bob.contract.length)

  /**  ALICE SIGNED THE CONTRACT  **/
  alice.contractResponse = await alice.contract.sign({
    identifier: alice.identifier.did
  })
  const aliceSignatureId = alice.contractResponse.id

  /**  ALICE PASSES BACK THE SIGNATURE ID  **/

  await bob.contract.update()
  t.deepEqual(bob.contract.value, {
    state: 'offered',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md',
    jlinxHost: bob.client.host.url,
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  await bob.contract.ackSignerResponse(aliceSignatureId)
  await bob.contract.update()
  t.deepEqual(bob.contract.value, {
    state: 'signed',
    offerer: bob.identifier.did,
    contractId,
    contractUrl: 'https://contracts.io/freemoney.md',
    jlinxHost: bob.client.host.url,
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures',
    signer: alice.identifier.did,
    signatureId: aliceSignatureId
  })

  t.end()
})
