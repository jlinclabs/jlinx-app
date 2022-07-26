const { test } = require('./helpers/test.js')

const {
  didToPublicKey,
  publicKeyToDid
} = require('../Identifiers')

test('did <-> publicKey', async (t, createClient) => {
  const client = await createClient()
  const { did } = await client.identifiers.createDidKey()
  const publicKey = didToPublicKey(did)
  t.equal(did, publicKeyToDid(publicKey))
  t.equal(
    publicKey.toString('hex'),
    didToPublicKey(did).toString('hex')
  )
})

test('jlinx.identifiers.createDidKey', async (t, createClient) => {
  const client1 = await createClient(t.jlinxHosts[0].url)
  const client2 = await createClient(t.jlinxHosts[1].url)
  t.notEquals(client1.host.url, client2.host.url)

  const identifierA = await client1.identifiers.createDidKey()
  t.equals(identifierA.constructor.name, 'Identifier')
  t.ok(identifierA.did.startsWith('did:key:'))
  t.ok(identifierA.canSign)

  const identifierA1 = await client2.identifiers.get(identifierA.did)
  t.equal(identifierA1.did, identifierA.did)
  t.ok(!identifierA1.canSign)

  t.equals(
    identifierA.publicKey.toString('hex'),
    identifierA1.publicKey.toString('hex')
  )

  const identifierB = await client2.identifiers
    .get('did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ')

  t.deepEquals(
    identifierB.didDocument,
    {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/security/suites/x25519-2020/v1'
      ],
      id: 'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ',
      verificationMethod: [{
        id: 'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ',
        publicKeyMultibase: 'Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      }],
      authentication: [
        'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      ],
      assertionMethod: [
        'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      ],
      capabilityDelegation: [
        'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      ],
      capabilityInvocation: [
        'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      ],
      keyAgreement: [{
        id: 'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ#Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ',
        type: 'X25519KeyAgreementKey2020',
        controller: 'did:key:z6mkCv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ',
        publicKeyMultibase: 'Cv9axPQLFr1x8MjRohA4ftmUAqbvytLBT4V12EeGJGYJ'
      }]
    }
  )

  t.end()
})


test.only('jlinx.identifiers.createDidDocument', async (t, createClient) => {
  const client = await createClient(t.jlinxHosts[0].url)

  const ownerSigningKeys = await client.vault.keys.createSigningKeyPair()
  const didDocument = await client.identifiers.create({
    ownerSigningKeys
  })
  t.same(didDocument._ledger.doc.ownerSigningKeys, ownerSigningKeys)
  console.log(didDocument)
  console.log(didDocument.value)
  console.log(await didDocument.didDocument())
})
