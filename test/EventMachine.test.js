const { test } = require('./helpers/test.js')

const EventMachine = require('../EventMachine')

console.log({ EventMachine })

class Chest extends EventMachine {
  static initialState = {
    open: false,
    items: [],
  }

  static events = {
    opened: {
      schema: {},
      apply (state, event){
        return {...state, open: true}
      }
    },
    closed: {
      schema: {},
      apply (state, event){
        return {...state, open: false}
      }
    },
    itemAdded: {
      schema: {},
      validate (state, event){
        if (!state.open)
          return `cannot add item to closed chest`
        if (state.items.find(item => item.id === event.item.id))
          return `item is already in the chest`
      },
      apply (state, event){
        state = {...state}
        state.items = [...state.items]
        state.items.push(event.item)
        return state
      }
    },
    itemRemoved: {
      schema: {
        itemId: {
          type: 'String',
          required: true,
        }
      },
      validate (state, event){
        if (!state.open)
          return `cannot remove item from closed chest`
        if (!state.items.find(item => item.id === event.itemId))
          return `item is not in the chest`

      },
      apply (state, event){
        state = {...state}
        state.items = state.items.filter(item => item.id !== event.itemId)
        return state
      }
    },
  }

  async open () {
    await this.appendEvent('opened')
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

test('Chest as EventMachine', async (t, createClient) => {
  const client = await createClient()
  const doc = await client.create()
  const chest1 = await Chest.create(doc)

  t.same(chest1.state, {
    open: false,
    items: [],
  })

  await chest1.open()

  t.same(chest1.state, {
    open: true,
    items: [],
  })

  await chest1.addItem({
    id: 'sword123456',
    desc: 'Iron Sword',
    magic: false,
  })

  t.same(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false,
      }
    ],
  })

  await chest1.close()

  t.same(chest1.state, {
    open: false,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false,
      }
    ],
  })

  await t.rejects(
    async () => {
      await chest1.addItem({
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false,
      })
    },
    { message: 'cannot add item to closed chest' }
  )

  await chest1.open()
  await chest1.addItem({
    id: 'shield9876',
    desc: 'Iron Sheild',
    magic: false,
  })


  t.same(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false,
      },
      {
        id: 'shield9876',
        desc: 'Iron Sheild',
        magic: false,
      }
    ],
  })

  await chest1.close()

  await t.rejects(
    async () => {
      await chest1.removeItem({
        id: 'shield9876',
      })
    },
    { message: 'cannot remove item from closed chest' }
  )

  await chest1.open()
  await chest1.removeItem('shield9876')

  console.log(chest1.events)
  t.same(chest1.state, {
    open: true,
    items: [
      {
        id: 'sword123456',
        desc: 'Iron Sword',
        magic: false,
      },
    ],
  })


  // const publicKey = didToPublicKey(did)
  // t.equal(did, publicKeyToDid(publicKey))
  // t.equal(
  //   publicKey.toString('hex'),
  //   didToPublicKey(did).toString('hex')
  // )
})
