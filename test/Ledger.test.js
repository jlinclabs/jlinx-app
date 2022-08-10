const { inspect } = require('util')
const multibase = require('jlinx-util/multibase')
const { test, createJlinxClient } = require('./helpers/test.js')
const Ledger = require('../Ledger')

test('subclassing', async (t) => {
  class Box extends Ledger {}
  Box.events = {
    'Opened Box': {
      schema: {},
      apply () {}
    }
  }

  t.alike(Box.events, {
    ...Ledger.events,
    'Opened Box': Box.events['Opened Box']
  })
  t.exception(
    () => { Box.events = {} },
    'events for Box already locked in. Subclass to extend'
  )

  class Chest extends Box {}
  Chest.events = {
    'Locked Chest': {
      schema: {},
      apply () {}
    }
  }

  t.alike(Chest.events, {
    ...Box.events,
    'Locked Chest': Chest.events['Locked Chest']
  })

  t.exception(
    () => { Chest.events = {} },
    'events for Chest already locked in. Subclass to extend'
  )

  class MagicChest extends Chest {}
  t.exception(
    () => {
      MagicChest.events = {
        'Moved Document': {}
      }
    },
    'refusing to override Ledger event "Moved Document"'
  )
})

test('Ledger', async (t) => {
  const client = await createJlinxClient(t)
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

  const expectedEvents = []
  {
    const events = await ledger.events()
    t.is(events.length, 1)
    t.alike(events[0], {
      '@event': 'Opened Document',
      '@eventId': events[0]['@eventId'],
      "@eventCause": []
    })
    expectedEvents.push(events[0])
  }

  const client2 = await createJlinxClient(t)
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

  t.is(ledgerCopy.id, ledger.id)
  t.is(ledgerCopy.length, 2)
  t.is(ledgerCopy.writable, false)

  t.alike(
    await ledgerCopy.header(),
    expectedHeader
  )
  t.alike(await ledgerCopy.events(), expectedEvents)

  await ledger.closeDocument()
  t.is(ledger.length, 3)
  {
    const events = await ledger.events()
    t.is(events.length, 2)
    t.alike(events[1], {
      '@event': 'Closed Document',
      '@eventId': events[1]['@eventId'],
      "@eventCause": []
    })
    expectedEvents.push(events[1])
  }

  t.alike(await ledger.events(), expectedEvents)

  t.is(ledgerCopy.length, 2)
  await ledgerCopy.update()
  t.is(ledgerCopy.length, 3)
  t.alike(await ledgerCopy.events(), expectedEvents)
})

test('Chest as subclass of Ledger', async (t) => {
  class Chest extends Ledger {
    getInitialState () {
      return {
        open: false,
        items: []
      }
    }

    async open (...__passingJustToTestErrorCase) {
      await this.appendEvent('Opened Chest', ...__passingJustToTestErrorCase)
    }

    async close () {
      await this.appendEvent('Closed Chest')
    }

    async addItem (item) {
      await this.appendEvent('Added Item', { item })
    }

    async removeItem (itemId) {
      await this.appendEvent('Removed Item', { itemId })
    }
  }

  Chest.events = {
    'Opened Chest': {
      validate (state) {
        if (state.open) return 'cannot open already open chest'
      },
      apply (state) {
        return { ...state, open: true }
      }
    },
    'Closed Chest': {
      validate (state) {
        if (!state.open) return 'cannot close unopen chest'
      },
      apply (state) {
        return { ...state, open: false }
      }
    },
    'Added Item': {
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
    'Removed Item': {
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

  const client = await createJlinxClient(t)

  const chest = await client.create({ class: Chest })

  t.alike(
    inspect(chest),
    (
      'Chest(\n' +
      `  id: ${chest.id}\n` +
      '  writable: true\n' +
      '  length: 1\n' +
      '  contentType: application/json\n' +
      `  host: ${client.host.url}\n` +
      `  signingKey: ${chest.signingKey}\n` +
      ')'
    )
  )

  await chest.update()
  t.is(chest.length, 1)
  t.alike(await chest.events(), [])

  t.alike(chest.state, {
    open: false,
    items: []
  })

  await t.exception(
    async () => {
      await chest.open({ bad: 'payload' })
    },
    /invalid event payload: must NOT have additional properties/
  )

  await chest.open()
  t.is(chest.length, 2)

  const expectedEvents = []
  {
    const events = await chest.events()
    t.is(events.length, 1)
    t.alike(events[0], {
      '@event': 'Opened Chest',
      '@eventId': events[0]['@eventId'],
      "@eventCause": []
    })
    expectedEvents.push(events[0])
  }

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

  t.is(chest.length, 2)
  t.alike(chest.state, {
    open: true,
    items: []
  })

  await chest.addItem({
    id: 'sword123456',
    desc: 'Iron Sword',
    magic: false
  })

  t.is(chest.length, 3)
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

  {
    const events = await chest.events()
    t.alike(await chest.events(), [
      {
        '@event': 'Opened Chest',
        '@eventId': events[0]['@eventId'],
        "@eventCause": []
      },
      {
        '@event': 'Added Item',
        '@eventId': events[1]['@eventId'],
        "@eventCause": [],
        item: {
          desc: 'Iron Sword',
          id: 'sword123456',
          magic: false
        }
      },
      {
        '@event': 'Closed Chest',
        '@eventId': events[2]['@eventId'],
        "@eventCause": []
      },
      {
        '@event': 'Opened Chest',
        '@eventId': events[3]['@eventId'],
        "@eventCause": []
      },
      {
        '@event': 'Added Item',
        '@eventId': events[4]['@eventId'],
        "@eventCause": [],
        item: {
          desc: 'Iron Sheild',
          id: 'shield9876',
          magic: false
        }
      },
      {
        '@event': 'Closed Chest',
        '@eventId': events[5]['@eventId'],
        "@eventCause": []
      },
      {
        '@event': 'Opened Chest',
        '@eventId': events[6]['@eventId'],
        "@eventCause": []
      },
      {
        '@event': 'Removed Item',
        '@eventId': events[7]['@eventId'],
        "@eventCause": [],
        itemId: 'shield9876'
      }
    ])
  }
})



// I THINK WE SHOULD GIVE UP ON MOVING A LEDGER RIGHT NOW!!!
// merging streams will be hard enough
test.solo('moving a ledger', async (t) => {

  class TwitterFeed extends Ledger {
    getInitialState(){
      return { tweets: [] }
    }
    async tweet(message){
      this.appendEvent('Tweeted', { message })
    }
  }
  TwitterFeed.events = {
    'Tweeted': {
      schema: {},
      apply (state, tweet) {
        state.tweets.push(tweet)
        return state
      }
    }
  }

  const client1 = await createJlinxClient(t)
  const client2 = await createJlinxClient(t)

  const feed1 = await client1.create({ class: TwitterFeed })
  await logLedger('feed1', feed1)
  await feed1.openDocument({ something: 'special' })
  await logLedger('feed1 after open', feed1)

  await feed1.tweet('this is my first post')
  await feed1.tweet('this is my 2nd post')

  const feed2 = await client2.create({ class: TwitterFeed })
  await logLedger('feed2', feed2)
  await feed2.becomeDocument({ id: feed1.id })
  await logLedger('feed2 after feed2.becomeDocument', feed2)
  await logLedger('feed1 after feed2.becomeDocument (no change)', feed1)
  await feed1.moveDocument({ id: feed2.id })
  await logLedger('feed1 after feed1.moveDocument', feed1)
  await feed2.update()
  await logLedger('feed2 after feed1.moveDocument', feed2)

  await feed2.tweet('this is my third post')
  await logLedger('feed1 after feed2.tweet (no change)', feed1)
  await logLedger('feed2 after feed2.tweet (no change)', feed2)

  /**
   * THIS IS HARD!!
   *
   * how do we track state across multiple hypercores?
   * is like we need some state for each individual hypercore stream
   * and then combined state on top of that
   *
   * thing.events() should be able to pull events from a thrise moved
   * document and transparently give you events, excluding the document
   * events. those are almost meta events?
   *
   *
   */

  const client3 = await createJlinxClient(t)
})


const logLedger = async (desc, ledger) => {
  await ledger.update()
  console.log(desc, '\n', ledger, {
    header: await ledger.header(),
    events: await ledger.events(),
    state: ledger.state,
  })
}
