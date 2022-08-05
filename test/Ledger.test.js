const { inspect } = require('util')
const multibase = require('jlinx-util/multibase')
const { test, createTestnet } = require('./helpers/test.js')
const Ledger = require('../Ledger')

test('Ledger', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)
  const client = await createJlinxClient(host1.url)
  const doc1 = await client.create()

  const ledger1 = new Ledger(doc1)

  t.is(ledger1.length, 0)
  t.is(ledger1.writable, true)

  await ledger1.init()
  t.is(ledger1.length, 1)

  const expectedHeader = {
    contentType: 'application/json',
    host: client.host.url,
    signingKey: multibase.encode(doc1.ownerSigningKeys.publicKey)
  }
  t.alike(
    await ledger1.header(),
    expectedHeader
  )
  t.alike(
    await ledger1.get(0),
    expectedHeader
  )

  await ledger1.append([
    { event: 'one', index: 1 },
    { event: 'two', index: 2 }
  ])

  t.is(ledger1.length, 3)

  t.alike(await ledger1.get(0, true), expectedHeader)
  t.alike(await ledger1.get(1, true), { event: 'one', index: 1 })
  t.alike(await ledger1.get(2, true), { event: 'two', index: 2 })

  t.alike(
    await ledger1.entries(),
    [
      expectedHeader,
      { event: 'one', index: 1 },
      { event: 'two', index: 2 }
    ]
  )

  t.alike(
    inspect(ledger1),
    (
      'Ledger(\n' +
      `  id: ${ledger1.id}\n` +
      '  writable: true\n' +
      '  length: 3\n' +
      '  contentType: application/json\n' +
      `  host: ${client.host.url}\n` +
      `  signingKey: ${ledger1.signingKey}\n` +
      ')'
    )
  )

  const client2 = await createJlinxClient(host2.url)
  const copyOfDoc1 = await client2.get(doc1.id)

  const copyOfLedger1 = new Ledger(copyOfDoc1)
  await copyOfLedger1.ready()
  t.is(copyOfLedger1.length, 3)
  t.is(copyOfLedger1.writable, false)

  t.alike(
    inspect(copyOfLedger1),
    (
      'Ledger(\n' +
      `  id: ${ledger1.id}\n` +
      '  writable: false\n' +
      '  length: 3\n' +
      '  contentType: application/json\n' +
      `  host: ${client.host.url}\n` +
      `  signingKey: ${ledger1.signingKey}\n` +
      ')'
    )
  )

  t.alike(await copyOfLedger1.get(0, true), expectedHeader)
  t.alike(await copyOfLedger1.get(1, true), { event: 'one', index: 1 })
  t.alike(await copyOfLedger1.get(2, true), { event: 'two', index: 2 })

  t.alike(
    await copyOfLedger1.entries(),
    [
      expectedHeader,
      { event: 'one', index: 1 },
      { event: 'two', index: 2 }
    ]
  )
})
