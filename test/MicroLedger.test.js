const { test, createJinxClient } = require('./helpers/test.js')

const MicroLedger = require('../MicroLedger')

test('Chest as EventMachine', async (t) => {
  class Chest extends MicroLedger {
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

  console.log({ Chest })

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
