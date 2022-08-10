const { test, createTestnet } = require('./helpers/test.js')
const Identifiers = require('../Identifiers')
const Contracts = require('../Contracts')

test('Contracts', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)

  const alice = { client: await createJlinxClient(host1.url) }
  const bob = { client: await createJlinxClient(host2.url) }
  for (const actor of [alice, bob]) {
    actor.client.identifiers = new Identifiers(actor.client)
    actor.client.contracts = new Contracts(actor.client)
  }

  t.not(alice.client.host.url, bob.client.host.url)

  alice.identifier = await alice.client.identifiers.create()
  bob.identifier = await bob.client.identifiers.create()

  bob.contract = await bob.client.contracts.create()
  await bob.contract.update()
  const contractId = bob.contract.id
  t.alike(await bob.contract.events(), [])
  t.alike(bob.contract.state, {})

  /**  BOB CREATES A CONTRACT  **/
  await bob.contract.offerContract({
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  {
    const events = await bob.contract.events()
    t.is(events.length, 1)
    t.alike(events, [
      {
        "@event": 'Offered Contract',
        "@eventId": events[0]["@eventId"],
        offerer: bob.identifier.did,
        contractUrl: 'https://contracts.io/freemoney.md',
        signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
      }
    ])
  }

  t.alike(bob.contract.state, {
    offered: true,
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  /**  BOB PASSES ALICE THE CONTRACT ID  **/
  alice.contract = await alice.client.contracts.get(contractId)
  await alice.contract.update()
  t.is(alice.contract.id, contractId)
  t.is(alice.contract.length, bob.contract.length)
  t.alike(await alice.contract.events(), await bob.contract.events())
  t.alike(alice.contract.state, bob.contract.state)

  /**  ALICE SIGNED THE CONTRACT  **/
  alice.contractResponse = await alice.contract.sign({
    identifier: alice.identifier.did
  })
  const aliceSignatureId = alice.contractResponse.id

  /**  ALICE PASSES BACK THE SIGNATURE ID  **/

  await bob.contract.update()
  t.alike(bob.contract.state, {
    offered: true,
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signatureDropoffUrl: 'https://example.com/jlinx/contracts/signatures'
  })

  await bob.contract.ackSignerResponse(aliceSignatureId)
  // await bob.contract.update()
  t.alike(bob.contract.state, {
    offered: true,
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signed: true,
    signer: alice.identifier.did,
  })

  /**  ALICE SEES HER SIGNATURE WAS ACKNOWLEDGED  **/
  await alice.contract.update()
  t.alike(alice.contract.state, {
    offered: true,
    offerer: bob.identifier.did,
    contractUrl: 'https://contracts.io/freemoney.md',
    signed: true,
    signer: alice.identifier.did,
  })
})
