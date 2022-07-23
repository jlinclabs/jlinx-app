const { inspect } = require('util')
const { keyToString } = require('jlinx-util')

const { test } = require('./helpers/test.js')
const Ledger = require('../Ledger')

test('Ledger', async (t, createClient) => {
  const client = await createClient()
  const doc1 = await client.create()

  const ledger1 = new Ledger(doc1)

  t.same(ledger1.length, 0)
  t.same(ledger1.writable, true)

  await ledger1.init()
  t.same(ledger1.length, 1)

  const expectedHeader = {
    contentType: 'application/json',
    host: client.host.url,
    signingKey: keyToString(doc1.ownerSigningKeys.publicKey)
  }
  t.same(
    await ledger1.header(),
    expectedHeader
  )
  t.same(
    await ledger1.get(0),
    expectedHeader
  )

  await ledger1.append([
    { event: 'one', index: 1 },
    { event: 'two', index: 2 }
  ])

  t.same(ledger1.length, 3)

  t.same(await ledger1.get(0, true), expectedHeader)
  t.same(await ledger1.get(1, true), { event: 'one', index: 1 })
  t.same(await ledger1.get(2, true), { event: 'two', index: 2 })

  t.deepEqual(
    await ledger1.entries(),
    [
      expectedHeader,
      { event: 'one', index: 1 },
      { event: 'two', index: 2 }
    ]
  )

  t.equal(
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

  const client2 = await createClient()
  await client2.connected()
  const copyOfDoc1 = await client2.get(doc1.id)

  const copyOfLedger1 = new Ledger(copyOfDoc1)
  await copyOfLedger1.ready()
  t.same(copyOfLedger1.length, 3)
  t.same(copyOfLedger1.writable, false)


  t.equal(
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


  t.same(await copyOfLedger1.get(0, true), expectedHeader)
  t.same(await copyOfLedger1.get(1, true), { event: 'one', index: 1 })
  t.same(await copyOfLedger1.get(2, true), { event: 'two', index: 2 })

  t.deepEqual(
    await copyOfLedger1.entries(),
    [
      expectedHeader,
      { event: 'one', index: 1 },
      { event: 'two', index: 2 }
    ]
  )

  t.end()
})
