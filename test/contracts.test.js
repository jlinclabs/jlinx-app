const { test } = require('./helpers/test.js')

test('contracts', async (t, createClient) => {
  const client1 = await createClient(t.jlinxHosts[0].url)
  const client2 = await createClient(t.jlinxHosts[1].url)

  t.notEquals(client1.host.url, client2.host.url)

  const contract = await client1.contracts.create({
    identifier: 'did:key:z6mkGkivMNMyaJHLaWm9d6RQmDUGvttNAsmJn1cKsXeYFRrN',
    contractUrl: 'https://contracts.io/freemoney.md'
  })

  const contractId = contract.id

  await client2.contracts.sign(contractId)
  t.end()
})
