// const { test } = require('./helpers/test.js')

// const Identifiers = require('../Identifiers')
// const Chat = require('../Chat')

// test('Chat', async (t, createClient) => {
//   async function createActor () {
//     const client = await createClient()
//     client.identifiers = new Identifiers(client)
//     client.chat = new Chat(client)
//     client.identifier = await client.identifiers.create()
//     return client
//   }

//   const bob = await createActor()

//   bob.chatRoom1 = await bob.chat.createChatRoom()
//   const chatRoom1Id = bob.chatRoom1.id
//   t.same(bob.chatRoom1.writable, true)
//   console.log(bob.chatRoom1)
//   console.log(bob.chatRoom1.state)

//   bob.chatRoom1Membership = await bob.chatRoom1.createMembership(bob.identifier)
//   await bob.chatRoom1.addMember(bob.chatRoom1Membership.id)

//   await bob.chatRoom1Membership.createMessage('huh looks like nobody is here')

//   t.same(bob.chatRoom1.state, {
//     memberIds: new Set([bob.chatRoom1Membership.id]),
//     messages: [
//       {
//         author: bob.chatRoom1Membership.id,
//         content: 'huh looks like nobody is here'
//       }
//     ]
//   })

//   const alice = await createActor()
//   alice.chatRoom1 = await alice.chat.getChatRoom(chatRoom1Id)
//   t.same(alice.chatRoom1.writable, false)
//   alice.chatRoom1Membership = await alice.chatRoom1.createMembership(alice.identifier)

//   // PRETEND ALICE SENT BOB HER NEW MEMBERSHIP ID
//   // BOB ADMITS HER IN
//   await bob.chatRoom1.addMember(alice.chatRoom1Membership.id)

//   console.log('bob.chatRoom1', {
//     state: bob.chatRoom1.state,
//     events: bob.chatRoom1.events
//   })
// })
