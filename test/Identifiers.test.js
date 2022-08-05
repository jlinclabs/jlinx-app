const { test, createTestnet } = require('./helpers/test.js')
const { createSigningKeyPair } = require('./helpers/crypto.js')

const Identifiers = require('../Identifiers')
const { didToPublicKey, publicKeyToDidKey } = require('../Identifiers')

test('didToPublicKey', async (t) => {
  const { publicKey } = await createSigningKeyPair('to_and_from_public_keys')
  const did = publicKeyToDidKey(publicKey)
  console.log({ did })
})

test('creating a did document', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)
  const client = await createJlinxClient(host1.url)

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

  t.is(identifier.did, publicKeyToDidKey(identifier._header.signingKey))
  // t.is(didToPublicKey(identifier.did), identifier._header.signingKey)
  t.is(identifier._ledger.doc.ownerSigningKeys, ownerSigningKeys)
  t.ok(identifier.writable)
  const copy = await client.identifiers.get(identifier.id)
  t.alike(identifier.id, copy.id)
  t.alike(identifier.host, copy.host)
  t.alike(identifier.did, copy.did)
  t.alike(identifier.signingKey, copy.signingKey)

  t.alike(identifier.state, { services: [] })

  const expectedDidDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3id.org/security/suites/x25519-2020/v1'
    ],
    id: 'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1',
    verificationMethod: [{
      id: 'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1',
      publicKeyMultibase: '8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    }],
    authentication: [
      'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    ],
    assertionMethod: [
      'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    ],
    capabilityDelegation: [
      'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    ],
    capabilityInvocation: [
      'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    ],
    keyAgreement: [{
      id: 'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1#8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap',
      type: 'X25519KeyAgreementKey2020',
      controller: 'did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1',
      publicKeyMultibase: '8E2UukTTnT2yxRTXNFXbCxt4TMCKbKgUB1G9WprxZjap'
    }],
    services: []
  }

  t.alike(
    identifier.asDidDocument(),
    expectedDidDocument
  )

  t.is(identifier.events, [])

  await identifier.addService({
    id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
    type: 'jlinx.profile',
    serviceEndpoint: 'http://example.com'
  })

  t.is(identifier.state, {
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

  t.is(identifier.events, [
    {
      '@event': 'serviceAdded',
      service: {
        id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
        serviceEndpoint: 'http://example.com',
        type: 'jlinx.profile'
      }
    }
  ])

  await identifier.addService({
    id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
    type: 'medicaldata.controller',
    serviceEndpoint: 'http://kaiser.com'
  })

  await identifier.addService({
    id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
    type: 'inbox',
    serviceEndpoint: 'http://openinbox.com'
  })

  await identifier.removeService('6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05')
  await identifier.addService({
    id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
    type: 'jlinx.profile',
    serviceEndpoint: 'http://profilerator.me'
  })

  t.is(identifier.state, {
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

  t.is(identifier.events, [
    {
      '@event': 'serviceAdded',
      service: {
        id: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05',
        serviceEndpoint: 'http://example.com',
        type: 'jlinx.profile'
      }
    },
    {
      '@event': 'serviceAdded',
      service: {
        id: 'c23a5415df0bff723ff056e9832b2034619a25941f27ebea08a5cf044a525133',
        serviceEndpoint: 'http://kaiser.com',
        type: 'medicaldata.controller'
      }
    },
    {
      '@event': 'serviceAdded',
      service: {
        id: '44a5251332b2034615df0bff723ff056e9837ebea08a5cf09a25941f2c23a541',
        serviceEndpoint: 'http://openinbox.com',
        type: 'inbox'
      }
    },
    {
      '@event': 'serviceRemoved',
      serviceId: '6e9837ebea08a5cf044a5251332b2034619a25941f2c23a5415df0bff723ff05'
    },
    {
      '@event': 'serviceAdded',
      service: {
        id: '37eb6e98ea08a5cf0442034619a25941f2ca5251332b23a5415df0bff72ff053',
        serviceEndpoint: 'http://profilerator.me',
        type: 'jlinx.profile'
      }
    }
  ])
})

// test('did <-> publicKey', async (t, createClient) => {
//   const client = await createClient()
//   const { did } = await client.identifiers.createDidKey()
//   const publicKey = didToPublicKey(did)
//   t.alike(did, publicKeyToDid(publicKey))
//   t.alike(
//     publicKey.toString('hex'),
//     didToPublicKey(did).toString('hex')
//   )
// })

// test('jlinx.identifiers.createDidKey', async (t, createClient) => {
//   const client1 = await createClient(t.jlinxHosts[0].url)
//   const client2 = await createClient(t.jlinxHosts[1].url)
//   t.notEquals(client1.host.url, client2.host.url)

//   const identifierA = await client1.identifiers.createDidKey()
//   t.alikes(identifierA.constructor.name, 'Identifier')
//   t.ok(identifierA.did.startsWith('did:key:'))
//   t.ok(identifierA.canSign)

//   const identifierA1 = await client2.identifiers.get(identifierA.did)
//   t.alike(identifierA1.did, identifierA.did)
//   t.ok(!identifierA1.canSign)

//   t.alikes(
//     identifierA.publicKey.toString('hex'),
//     identifierA1.publicKey.toString('hex')
//   )

//   const identifierB = await client2.identifiers
//     .get('did:key:fff4d22a13100c6050c7d5542511b0154759740a825715d17d2daf402c0a8f9cf8ae1')

//   t.end()
// })
