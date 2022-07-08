const b4a = require('b4a')
const { test } = require('./helpers/test.js')

test.only('smoke test', async (t, createClient) => {
  console.lof('HOSTS', t.jlinxHosts)

  // const [client1, client2] = await Promise.all([
  //   await createClient(),
  //   await createClient()
  // ])
  // await Promise.all([
  //   await client1.connected(),
  //   await client2.connected()
  // ])
})

// test('sync same host', async (t, createClient) => {
//   const client = await createClient()
//   await client.connected()

//   const doc1 = await client.create()

//   t.equal(doc1.length, 0)
//   t.equal(doc1.writable, true)
//   t.equal(doc1.host, client.host)
//   t.ok(doc1.ownerSigningKeys)

//   const doc2 = await client.get(doc1.id)

//   t.equal(doc1.id, doc2.id)
//   t.equal(doc2.length, 0)
//   t.equal(doc2.writable, true)
//   t.equal(doc2.host, client.host)
//   t.ok(doc2.ownerSigningKeys)

//   await doc1.append([
//     b4a.from('block one'),
//     b4a.from('block two')
//   ])

//   t.equal(doc1.length, 2)
//   t.equal(doc2.length, 0)

//   await doc2.update()
//   t.equal(doc2.length, 2)

//   await doc2.append([
//     b4a.from('block three'),
//     b4a.from('block four')
//   ])
//   t.equal(doc1.length, 2)
//   t.equal(doc2.length, 4)
//   await doc1.update()
//   t.equal(doc1.length, 4)

//   for (const doc of [doc1, doc2]) {
//     t.deepEqual(
//       (await doc.get(0)).toString(),
//       'block one'
//     )
//     t.deepEqual(
//       (await doc.get(1)).toString(),
//       'block two'
//     )
//     t.deepEqual(
//       (await doc.get(2)).toString(),
//       'block three'
//     )
//     t.deepEqual(
//       (await doc.get(3)).toString(),
//       'block four'
//     )
//   }

//   t.end()
// })

// test('sync diff host', async (t, createClient) => {
//   const client1 = await createClient(t.jlinxHosts[0].url)
//   const client2 = await createClient(t.jlinxHosts[1].url)
//   const doc1 = await client1.create()

//   t.equal(doc1.length, 0)
//   t.equal(doc1.writable, true)
//   t.equal(doc1.host, client1.host)
//   t.ok(doc1.ownerSigningKeys)

//   const doc2 = await client2.get(doc1.id)
//   t.equal(doc2.length, 0)
//   t.equal(doc2.writable, false)
//   t.equal(doc2.host, client2.host)
//   t.ok(!doc2.ownerSigningKeys)

//   t.equal(doc1.id, doc2.id)
//   t.equal(doc1.length, doc2.length)

//   await doc1.append([
//     b4a.from('block one'),
//     b4a.from('block two')
//   ])

//   t.equal(doc1.length, 2)
//   t.equal(doc2.length, 0)

//   console.log('\n\n\n\n\n?? WTF PANDA ???\n\n\n')
//   await doc2.update()
//   t.equal(doc2.length, 2)

//   await doc1.append([
//     b4a.from('block three'),
//     b4a.from('block four')
//   ])
//   t.equal(doc1.length, 4)
//   t.equal(doc2.length, 2)
//   await doc2.update()
//   t.equal(doc2.length, 4)

//   for (const doc of [doc1, doc2]) {
//     t.deepEqual(
//       (await doc.get(0)).toString(),
//       'block one'
//     )
//     t.deepEqual(
//       (await doc.get(1)).toString(),
//       'block two'
//     )
//     t.deepEqual(
//       (await doc.get(2)).toString(),
//       'block three'
//     )
//     t.deepEqual(
//       (await doc.get(3)).toString(),
//       'block four'
//     )
//   }

//   t.end()
// })
