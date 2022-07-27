const { test } = require('./helpers/test.js')
const Profiles = require('../Profiles.js')

test('Profiles', async (t, createClient) => {
  const client = await createClient()
  client.profiles = new Profiles(client)

  const profile = await client.profiles.create({
    serviceEndpoint: 'http://jlinxprofile.me/@paulpravenza'
  })

  t.same(profile.serviceEndpoint, 'http://jlinxprofile.me/@paulpravenza')
  t.same(profile._header, {
    id: profile.id,
    length: 1,
    contentType: 'application/json',
    serviceEndpoint: 'http://jlinxprofile.me/@paulpravenza',
    host: client.host.url,
    signingKey: profile.signingKey
  })

  await profile.set({
    name: 'Paul Pravenza',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })

  t.same(profile.state, {
    name: 'Paul Pravenza',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })

  await profile.set({
    name: 'Paul P.',
    favoriteColor: '#33d2f1'
  })

  t.same(profile.state, {
    name: 'Paul P.',
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza',
    favoriteColor: '#33d2f1'
  })

  await profile.set({
    name: undefined,
    favoriteColor: undefined
  })

  t.same(profile.state, {
    avatar: 'http://gravatar.com/@paulpravenza',
    preferredUsername: 'paulpravenza'
  })
})
