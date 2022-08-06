const { inspect } = require('util')
const multibase = require('jlinx-util/multibase')
const { test, createTestnet } = require('./helpers/test.js')
const Ledger = require('../Ledger')

test('subclassing', async (t) => {
  class Box extends Ledger {}
  Box.events = {
    'Opened Box': {
      schema: {},
      apply(){}
    },
  }

  t.alike(Box.events, {
    ...Ledger.events,
    'Opened Box': Box.events['Opened Box']
  })
  t.exception(
    () => { Box.events = {} },
    `events for Box already locked in. Subclass to extend`
  )

  class Chest extends Box {}
  Chest.events = {
    'Locked Chest': {
      schema: {},
      apply(){}
    },
  }

  t.alike(Chest.events, {
    ...Box.events,
    'Locked Chest': Chest.events['Locked Chest']
  })

  t.exception(
    () => { Chest.events = {} },
    `events for Chest already locked in. Subclass to extend`
  )
})

test('Ledger', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)
  const client = await createJlinxClient(host1.url)
  const ledger = await client.create({ class: Ledger })

  t.is(ledger.length, 1)
  t.is(ledger.writable, true)
  t.is(ledger.signingKey, multibase.encode(ledger.doc.ownerSigningKeys.publicKey))


  t.alike(
    inspect(ledger),
    (
      'Ledger(\n' +
      `  id: ${ledger.id}\n` +
      '  writable: true\n' +
      '  length: 1\n' +
      '  contentType: application/json\n' +
      `  host: ${client.host.url}\n` +
      `  signingKey: ${ledger.signingKey}\n` +
      ')'
    )
  )

  const expectedHeader = {
    contentType: 'application/json',
    host: client.host.url,
    signingKey: ledger.signingKey
  }
  t.alike(
    await ledger.header(),
    expectedHeader
  )
  t.alike(
    JSON.parse(await ledger.doc.get(0)),
    expectedHeader
  )
  t.alike(await ledger.events(), [])

  await ledger.openDocument()
  t.is(ledger.length, 2)

  t.alike(await ledger.events(), [
    { '@event': 'Opened Document' }
  ])

  t.is(ledger.length, 2)

  t.alike(await ledger.getEvent(0, true), expectedHeader)
  t.alike(await ledger.getEvent(1, true), { '@event': 'Opened Document' })

  const client2 = await createJlinxClient(host2.url)
  const ledgerCopy = await client2.get(ledger.id, { class: Ledger })

  t.alike(
    inspect(ledgerCopy),
    (
      'Ledger(\n' +
      `  id: ${ledger.id}\n` +
      '  writable: false\n' +
      '  length: 2\n' +
      '  contentType: application/json\n' +
      `  host: ${client.host.url}\n` +
      `  signingKey: ${ledger.signingKey}\n` +
      ')'
    )
  )

  t.is(copyOfLedger.length, 3)
  t.is(copyOfLedger.writable, false)

  t.alike(await copyOfLedger.get(0, true), expectedHeader)
  t.alike(await copyOfLedger.get(1, true), { '@event': 'Opened Document' })
  t.alike(await copyOfLedger.events(), [
    { '@event': 'Opened Document' }
  ])

  await ledger.closeDocument()
})


test('Chest as EventMachine', async (t) => {
  class Chest extends Ledger {
    initialState () {
      return {
        open: false,
        items: []
      }
    }

    async open (...__passingJustToTestErrorCase) {
      await this.events.append('opened', ...__passingJustToTestErrorCase)
    }

    async close () {
      await this.events.append('closed')
    }

    async addItem (item) {
      await this.events.append('itemAdded', { item })
    }

    async removeItem (itemId) {
      await this.events.append('itemRemoved', { itemId })
    }
  }

  // console.log({ Chest })

  Chest.extendEvents({
    opened: {
      schema: null,
      validate (state) {
        if (state.open) return 'cannot open already open chest'
      },
      apply (state) {
        return { ...state, open: true }
      }
    },
    closed: {
      schema: null,
      validate (state) {
        if (!state.open) return 'cannot close unopen chest'
      },
      apply (state) {
        return { ...state, open: false }
      }
    },
    itemAdded: {
      schema: {
        type: 'object',
        properties: {
          item: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              desc: { type: 'string' },
              magic: { type: 'boolean' }
            },
            required: ['id', 'desc'],
            additionalProperties: true
          }
        },
        required: ['item'],
        additionalProperties: false
      },
      validate (state, event) {
        if (!state.open) { return 'cannot add item to closed chest' }
        if (state.items.find(item => item.id === event.item.id)) { return 'item is already in the chest' }
      },
      apply (state, event) {
        state = { ...state }
        state.items = [...state.items]
        state.items.push(event.item)
        return state
      }
    },
    itemRemoved: {
      schema: {
        type: 'object',
        properties: {
          itemId: { type: 'string' }
        },
        required: ['itemId'],
        additionalProperties: false
      },
      validate (state, event) {
        if (!state.open) { return 'cannot remove item from closed chest' }
        if (!state.items.find(item => item.id === event.itemId)) { return 'item is not in the chest' }
      },
      apply (state, event) {
        state = { ...state }
        state.items = state.items.filter(item => item.id !== event.itemId)
        return state
      }
    }
  })


  const client = await createJinxClient(t)

  const chest = await client.create({
    class: Chest
  })
  // const chest = await Chest.create(doc)
  console.log({ chest })

  t.alike(await chest.events(), [

  ])

  t.alike(chest.state, {
    open: false,
    items: []
  })

  await t.exception(
    async () => {
      await chest.open({ bad: 'payload' })
    },
    /invalid event payload: must be null or undefined/
  )

  await chest.open()

  t.alike(chest.state, {
    open: true,
    items: []
  })

  await t.exception(
    async () => {
      await chest.addItem()
    },
    /invalid event payload: must have required property 'item'/
  )

  await chest.addItem({
    id: 'sword123456',
    desc: 'Iron Sword',
    magic: false
  })

  t.alike(chest.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  await chest.close()

  t.alike(chest.state, {
    open: false,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  await t.exception(
    async () => {
      await chest.addItem({
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false
      })
    },
    /cannot add item to closed chest/
  )

  await chest.open()

  await t.exception(
    async () => {
      await chest.addItem({})
    },
    /invalid event payload: \/item must have required property 'id'/
  )
  await t.exception(
    async () => {
      await chest.addItem({
        id: 'shield9876'
      })
    },
    /invalid event payload: \/item must have required property 'desc'/
  )

  await chest.addItem({
    id: 'shield9876',
    desc: 'Iron Sheild',
    magic: false
  })

  t.alike(chest.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      },
      {
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false
      }
    ]
  })

  await chest.close()

  await t.exception(
    async () => {
      await chest.removeItem('shield9876')
    },
    /cannot remove item from closed chest/
  )

  await chest.open()
  await chest.removeItem('shield9876')

  t.alike(chest.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  t.alike(chest.events, [
    {
      '@event': 'opened'
    },
    {
      '@event': 'itemAdded',
      item: {
        desc: 'Iron Sword',
        id: 'sword123456',
        magic: false
      }
    },
    {
      '@event': 'closed'
    },
    {
      '@event': 'opened'
    },
    {
      '@event': 'itemAdded',
      item: {
        desc: 'Iron Sheild',
        id: 'shield9876',
        magic: false
      }
    },
    {
      '@event': 'closed'
    },
    {
      '@event': 'opened'
    },
    {
      '@event': 'itemRemoved',
      itemId: 'shield9876'
    }
  ])
})
