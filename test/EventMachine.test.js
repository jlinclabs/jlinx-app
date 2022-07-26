const { test } = require('./helpers/test.js')

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

test('Chest as EventMachine', async (t, createClient) => {
  const client = await createClient()
  const doc = await client.create()
  const chest1 = await Chest.create(doc)

  t.same(chest1.state, {
    open: false,
    items: []
  })

  await t.rejects(
    async () => {
      await chest1.open({ bad: 'payload' })
    },
    { message: 'invalid event payload: must be null or undefined' }
  )

  await chest1.open()

  t.same(chest1.state, {
    open: true,
    items: []
  })

  await t.rejects(
    async () => {
      await chest1.addItem()
    },
    { message: 'invalid event payload: must have required property \'item\'' }
  )

  await chest1.addItem({
    id: 'sword123456',
    desc: 'Iron Sword',
    magic: false
  })

  t.same(chest1.state, {
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

  t.same(chest1.state, {
    open: false,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  await t.rejects(
    async () => {
      await chest1.addItem({
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false
      })
    },
    { message: 'cannot add item to closed chest' }
  )

  await chest1.open()

  await t.rejects(
    async () => {
      await chest1.addItem({})
    },
    { message: 'invalid event payload: /item must have required property \'id\'' }
  )
  await t.rejects(
    async () => {
      await chest1.addItem({
        id: 'shield9876'
      })
    },
    { message: 'invalid event payload: /item must have required property \'desc\'' }
  )

  await chest1.addItem({
    id: 'shield9876',
    desc: 'Iron Sheild',
    magic: false
  })

  t.same(chest1.state, {
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

  await t.rejects(
    async () => {
      await chest1.removeItem('shield9876')
    },
    { message: 'cannot remove item from closed chest' }
  )

  await chest1.open()
  await chest1.removeItem('shield9876')

  t.same(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false
      }
    ]
  })

  t.same(chest1.events, [
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
