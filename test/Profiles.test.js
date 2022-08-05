const { test, createTestnet } = require('./helpers/test.js')
const Profiles = require('../Profiles.js')

test('Profiles', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)
  const client = await createJlinxClient(host1.url)
  client.profiles = new Profiles(client)

  const profile = await client.profiles.create({
    header: ({ id }) => (
      {
        serviceEndpoint: `http://jlinxprofile.me/jlinx/profiles/${id}`
      }
    )
  })

  const expectedServiceEndpoint = `http://jlinxprofile.me/jlinx/profiles/${profile.id}`
  t.is(
    profile.serviceEndpoint,
    expectedServiceEndpoint
  )
  t.alike(profile._header, {
    id: profile.id,
    length: 1,
    contentType: 'application/json',
    serviceEndpoint: expectedServiceEndpoint,
    host: client.host.url,
    signingKey: profile.signingKey
  })

  await profile.set({
    name: 'Paul Pravenza',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })

  t.alike(profile.state, {
    name: 'Paul Pravenza',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })

  await profile.set({
    name: 'Paul P.',
    favoriteColor: '#33d2f1'
  })

  t.alike(profile.state, {
    name: 'Paul P.',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza',
    favoriteColor: '#33d2f1'
  })

  await profile.set({
    name: undefined,
    favoriteColor: undefined
  })

  t.alike(profile.state, {
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })

  // t.is(
  //   JSON.stringify(profile),
  //   JSON.stringify({
  //     id: profile.id,
  //     header: profile.header,
  //     writable: profile.writable,
  //     signingKey: profile.signingKey,
  //     state: {
  //       avatar: 'http://gravatar.com/@paulpravenza',
  //       preferredUsername: 'paulpravenza'
  //     },
  //     events: profile.events
  //   })
  // )

  const client2 = await createJlinxClient(host2.url)
  client2.profiles = new Profiles(client2)

  const profile2 = await client2.profiles.get(profile.id)
  t.is(profile2.writable, false)
  t.alike(profile.state, profile2.state)
  t.alike(profile.events, profile2.events)
})
