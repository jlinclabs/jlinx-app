const multibase = require('jlinx-util/multibase')
const { test, createJlinxClient } = require('./helpers/test.js')

// test('smoke test', async (t) => {
//   const { createHttpServers, createJlinxClient } = await createTestnet(t)
//   const [host1, host2] = await createHttpServers(2)
//   const client1 = await createJlinxClient(host1.url)
//   const client2 = await createJlinxClient(host2.url)

//   const doc1 = await client1.create()
//   await doc1.append(['hello', 'world'])
//   await timeout(100)

//   const doc1copy = await client2.get(doc1.id)
//   const copyUpdated = t.test('copyUpdated')
//   copyUpdated.plan(1)

//   {
//     const update = async () => {
//       await doc1copy.update()
//       if (doc1copy.length === 0) {
//         await timeout(100)
//         return update()
//       }
//       copyUpdated.pass()
//     }
//     update()
//   }

//   await copyUpdated
//   t.alike(doc1copy.length, doc1.length)
//   t.alike(await doc1copy.get(0), await doc1.get(0))
//   t.alike(await doc1copy.get(1), await doc1.get(1))
// })

// test('sync same host', async (t) => {
//   const { createHttpServers, createJlinxClient } = await createTestnet(t)
//   const [host1] = await createHttpServers(2)
//   const client = await createJlinxClient(host1.url)

//   const doc1 = await client.create()

//   t.alike(doc1.length, 0)
//   t.alike(doc1.writable, true)
//   t.alike(doc1.host, client.host)
//   t.ok(doc1.ownerSigningKeys)

//   const doc2 = await client.get(doc1.id)

//   t.alike(doc1.id, doc2.id)
//   t.alike(doc2.length, 0)
//   t.alike(doc2.writable, true)
//   t.alike(doc2.host, client.host)
//   t.ok(doc2.ownerSigningKeys)

//   await doc1.append([
//     'block one',
//     'block two'
//   ])

//   t.alike(doc1.length, 2)
//   t.alike(doc2.length, 0)

//   await doc2.update()
//   t.alike(doc2.length, 2)

//   await doc2.append([
//     'block three',
//     'block four'
//   ])
//   t.alike(doc1.length, 2)
//   t.alike(doc2.length, 4)
//   await doc1.update()
//   t.alike(doc1.length, 4)

//   for (const doc of [doc1, doc2]) {
//     t.alike(
//       (await doc.get(0)).toString(),
//       'block one'
//     )
//     t.alike(
//       (await doc.get(1)).toString(),
//       'block two'
//     )
//     t.alike(
//       (await doc.get(2)).toString(),
//       'block three'
//     )
//     t.alike(
//       (await doc.get(3)).toString(),
//       'block four'
//     )
//   }

//   t.end()
// })

test('sync diff host', async (t) => {
  const client1 = await createJlinxClient(t)
  const client2 = await createJlinxClient(t)

  const doc1 = await client1.create()

  t.alike(doc1.length, 1)
  t.alike(await doc1.header(), {
    contentType: 'application/octet-stream',
    host: client1.host.url,
    signingKey: multibase.encode(doc1.ownerSigningKeys.publicKey),
  })
  t.alike(doc1.writable, true)
  t.alike(doc1.host, client1.host)
  t.ok(doc1.ownerSigningKeys)

  const doc2 = await client2.get(doc1.id)
  t.alike(doc2.length, 1)

  t.alike(doc2.writable, false)
  t.alike(doc2.host, client2.host)
  t.ok(!doc2.ownerSigningKeys)

  t.alike(doc1.id, doc2.id)
  t.alike(doc1.length, doc2.length)

  await doc1.append([
    'block one',
    'block two'
  ])

  t.alike(doc1.length, 3)
  t.alike(doc2.length, 1)

  // await
  await doc2.update()
  t.alike(doc2.length, 3)

  await doc1.append([
    'block three',
    'block four'
  ])
  t.alike(doc1.length, 5)
  t.alike(doc2.length, 3)
  await doc2.update()
  t.alike(doc2.length, 5)

  for (const doc of [doc1, doc2]) {
    t.alike(
      JSON.parse(await doc.get(0)),
      {
        contentType: 'application/octet-stream',
        host: client1.host.url,
        signingKey: multibase.encode(doc1.ownerSigningKeys.publicKey),
      }
    )
    t.alike(
      (await doc.get(1)).toString(),
      'block one'
    )
    t.alike(
      (await doc.get(2)).toString(),
      'block two'
    )
    t.alike(
      (await doc.get(3)).toString(),
      'block three'
    )
    t.alike(
      (await doc.get(4)).toString(),
      'block four'
    )
  }
})
