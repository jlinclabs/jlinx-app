const { inspect } = require('util')
const multibase = require('jlinx-util/multibase')
const { test, createJlinxClient } = require('./helpers/test.js')
const { createSigningKeyPair } = require('./helpers/crypto.js')

const Identifiers = require('../Identifiers')
const { didToPublicKey, publicKeyToDidKey } = require('../Identifiers')

test('did:key:xxxx <-> publicKey', async (t) => {
  const { publicKey } = await createSigningKeyPair('to_and_from_public_keys')
  const did = publicKeyToDidKey(publicKey)
  t.is(did, 'did:key:f1539dae87f24f2cd71bce16b5fba4eeb46e3e7597d6958c3f7a71d73ac608f58')
  t.alike(didToPublicKey(did), publicKey)
})

test('creating a did document', async (t) => {
  const client = await createJlinxClient(t)
  client.identifiers = new Identifiers(client)

  const ownerSigningKeys = await createSigningKeyPair('identifiers_test')
  // TODO: make this hack less hacky
  await client.vault.keys._store.set(ownerSigningKeys.publicKey, ownerSigningKeys.secretKey)

  t.is(
    ownerSigningKeys.publicKey.toString('hex'),
    '6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
  )

  const identifier = await client.identifiers.create({
    ownerSigningKeys
  })

  t.alike(
    inspect(identifier),
    (
      'Identifier(\n' +
      `  id: ${identifier.id}\n` +
      '  writable: true\n' +
      `  host: ${client.host.url}\n` +
      `  did: ${publicKeyToDidKey(ownerSigningKeys.publicKey)}\n` +
      `  signingKey: ${identifier.signingKey}\n` +
      ')'
    )
  )

  t.is(identifier.did, 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1')
  t.is(identifier.did, publicKeyToDidKey(identifier.signingKey))
  t.alike(didToPublicKey(identifier.did), multibase.toBuffer(identifier.signingKey))
  t.is(identifier.doc.ownerSigningKeys, ownerSigningKeys)
  t.ok(identifier.writable)
  const copy = await client.identifiers.get(identifier.id)
  t.alike(identifier.id, copy.id)
  t.alike(identifier.host, copy.host)
  t.alike(identifier.did, copy.did)
  t.alike(identifier.signingKey, copy.signingKey)

  await identifier.update()
  t.alike(identifier.state, { services: [] })

  const expectedDidDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3id.org/security/suites/x25519-2020/v1'
    ],
    id: 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1',
    verificationMethod: [{
      id: 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1',
      publicKeyMultibase: 'f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    }],
    authentication: [
      'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    ],
    assertionMethod: [
      'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    ],
    capabilityDelegation: [
      'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    ],
    capabilityInvocation: [
      'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    ],
    keyAgreement: [{
      id: 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1#f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1',
      type: 'X25519KeyAgreementKey2020',
      controller: 'did:key:f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1',
      publicKeyMultibase: 'f6b5808a6fdba1b9ae4d2fbc43f4bf56fc24aec6c2ddc9d82e77c50a8f9cf8ae1'
    }],
    services: []
  }

  t.alike(
    identifier.asDidDocument(),
    expectedDidDocument
  )

  t.alike(await identifier.events(), [])

  await identifier.addService({
    id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
    type: 'jlinx.profile',
    serviceEndpoint: 'http://example.com'
  })

  t.is(identifier.length, 2)
  const expectedEvents = []
  {
    const events = await identifier.events()
    t.is(events.length, 1)
    t.alike(events[0], {
      '@event': 'Added Service',
      '@eventId': events[0]['@eventId'],
      service: {
        id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
        type: 'jlinx.profile',
        serviceEndpoint: 'http://example.com'
      }
    })
    expectedEvents.push(events[0])
  }

  t.alike(identifier.state, {
    services: [
      {
        id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
        type: 'jlinx.profile',
        serviceEndpoint: 'http://example.com'
      }
    ]
  })

  t.alike(
    identifier.asDidDocument(),
    {
      ...expectedDidDocument,
      services: [
        {
          id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
          type: 'jlinx.profile',
          serviceEndpoint: 'http://example.com'
        }
      ]
    }
  )


  // t.alike(identifier.events, [
  //   {
  //     '@event': 'serviceAdded',
  //     service: {
  //       id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
  //       serviceEndpoint: 'http://example.com',
  //       type: 'jlinx.profile'
  //     }
  //   }
  // ])

  await identifier.addService({
    id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
    type: 'medicaldata.controller',
    serviceEndpoint: 'http://kaiser.com'
  })
  t.is(identifier.length, 3)
  {
    const events = await identifier.events()
    t.is(events.length, 2)
    t.alike(events[1], {
      '@event': 'Added Service',
      '@eventId': events[1]['@eventId'],
      service: {
        id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
        type: 'medicaldata.controller',
        serviceEndpoint: 'http://kaiser.com'
      }
    })
    expectedEvents.push(events[1])
  }

  await identifier.addService({
    id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
    type: 'inbox',
    serviceEndpoint: 'http://openinbox.com'
  })
  t.is(identifier.length, 4)
  {
    const events = await identifier.events()
    t.is(events.length, 3)
    t.alike(events[2], {
      '@event': 'Added Service',
      '@eventId': events[2]['@eventId'],
      service: {
        id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
        type: 'inbox',
        serviceEndpoint: 'http://openinbox.com'
      }
    })
    expectedEvents.push(events[2])
  }

  await identifier.removeService('6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05')
  t.is(identifier.length, 5)
  {
    const events = await identifier.events()
    t.is(events.length, 4)
    t.alike(events[3], {
      '@event': 'Removed Service',
      '@eventId': events[3]['@eventId'],
      serviceId: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
    })
    expectedEvents.push(events[3])
  }

  await identifier.addService({
    id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
    type: 'jlinx.profile',
    serviceEndpoint: 'http://profilerator.me'
  })
  t.is(identifier.length, 6)
  {
    const events = await identifier.events()
    t.is(events.length, 5)
    t.alike(events[4], {
      '@event': 'Added Service',
      '@eventId': events[4]['@eventId'],
      service: {
        id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
        type: 'jlinx.profile',
        serviceEndpoint: 'http://profilerator.me'
      }
    })
    expectedEvents.push(events[4])
  }

  t.alike(identifier.state, {
    services: [
      {
        id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
        type: 'medicaldata.controller',
        serviceEndpoint: 'http://kaiser.com'
      },
      {
        id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
        type: 'inbox',
        serviceEndpoint: 'http://openinbox.com'
      },
      {
        id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
        type: 'jlinx.profile',
        serviceEndpoint: 'http://profilerator.me'
      }
    ]
  })

  t.alike(
    identifier.asDidDocument(),
    {
      ...expectedDidDocument,
      services: [
        {
          id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
          type: 'medicaldata.controller',
          serviceEndpoint: 'http://kaiser.com'
        },
        {
          id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
          type: 'inbox',
          serviceEndpoint: 'http://openinbox.com'
        },
        {
          id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
          type: 'jlinx.profile',
          serviceEndpoint: 'http://profilerator.me'
        }
      ]
    }
  )

  await identifier.update()
  t.alike(await identifier.events(), expectedEvents)
})
