const { test, createTestnet } = require('./helpers/test.js')

const EventMachine = require('../EventMachine')

class Chest extends EventMachine {
  initialState () {
    return {
      open: false,
      items: []
    }
  }

  async open (...__passingJustToTestErrorCase) {
    await this.appendEvent('opened', ...__passingJustToTestErrorCase)
  }

  async close () {
    await this.appendEvent('closed')
  }

  async addItem (item) {
    await this.appendEvent('itemAdded', { item })
  }

  async removeItem (itemId) {
    await this.appendEvent('itemRemoved', { itemId })
  }
}

Chest.events = {
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
}

test('Chest as EventMachine', async (t) => {
  const { createHttpServers, createJlinxClient } = await createTestnet(t)
  const [host1, host2] = await createHttpServers(2)
  const client = await createJlinxClient(host1.url)
  const doc = await client.create()
  const chest1 = await Chest.create(doc)

  t.alike(chest1.state, {
    open: false,
    items: []
  })

  await t.exception(
    async () => {
      await chest1.open({ bad: 'payload' })
    },
    /invalid event payload: must be null or undefined/
  )

  await chest1.open()

  t.alike(chest1.state, {
    open: true,
    items: []
  })

  await t.exception(
    async () => {
      await chest1.addItem()
    },
    /invalid event payload: must have required property 'item'/
  )

  await chest1.addItem({
    id: 'sword123456',
    desc: 'Iron Sword',
    magic: false
  })

  t.alike(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  await chest1.close()

  t.alike(chest1.state, {
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
      await chest1.addItem({
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false
      })
    },
    /cannot add item to closed chest/
  )

  await chest1.open()

  await t.exception(
    async () => {
      await chest1.addItem({})
    },
    /invalid event payload: \/item must have required property 'id'/
  )
  await t.exception(
    async () => {
      await chest1.addItem({
        id: 'shield9876'
      })
    },
    /invalid event payload: \/item must have required property 'desc'/
  )

  await chest1.addItem({
    id: 'shield9876',
    desc: 'Iron Sheild',
    magic: false
  })

  t.alike(chest1.state, {
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

  await chest1.close()

  await t.exception(
    async () => {
      await chest1.removeItem('shield9876')
    },
    /cannot remove item from closed chest/
  )

  await chest1.open()
  await chest1.removeItem('shield9876')

  t.alike(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  t.alike(chest1.events, [
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
