// const Debug = require('debug')
// const b4a = require('b4a')
// const {
//   base58,
//   keyToString,
//   keyToBuffer
// } = require('jlinx-util')

// const EventMachine = require('./EventMachine')

// const debug = Debug('jlinx:client:chat')

// module.exports = class Chat {
//   constructor (jlinx) {
//     this.jlinx = jlinx
//   }

//   async createChatRoom (opts = {}) {
//     const doc = await this.jlinx.create()
//     return await ChatRoom.create(doc, this)
//   }

//   async getChatRoom (id) {
//     debug('get', { id })
//     const doc = await this.jlinx.get(id)
//     debug('get', { doc })
//     return await ChatRoom.open(doc, this)
//   }
// }

// class ChatRoom extends EventMachine {
//   constructor (doc, chat) {
//     super(doc)
//     this._chat = chat
//   }

//   initialState () {
//     return {
//       memberIds: new Set(),
//       messages: []
//     }
//   }

//   async addMember (memberId) {
//     await this.appendEvent('memberJoined', { memberId })
//   }

//   async kickMember (memberId) {
//     await this.appendEvent('memberKicked', { memberId })
//   }

//   async createMembership (identifier) {
//     const doc = await this._chat.jlinx.create()
//     return await ChatRoomMember.create(doc, this, identifier)
//   }
// }

// ChatRoom.events = {

//   memberJoined: {
//     schema: {
//       type: 'object',
//       properties: {
//         memberId: { type: 'string' }
//       },
//       required: ['memberId'],
//       additionalProperties: false
//     },
//     validate (state, { memberId }) {
//       // TODO validate memberId
//       if (state.memberIds.has(memberId)) return 'already a member'
//     },
//     apply (state, { memberId }) {
//       const memberIds = new Set(state.memberIds)
//       memberIds.add(memberId)
//       return { ...state, memberIds }
//     },
//     addEventStream ({ memberId }) {
//       const member = new ChatRoomMember('...')
//       return member
//     }
//   },

//   memberKicked: {
//     schema: {
//       type: 'object',
//       properties: {
//         memberId: { type: 'string' }
//       },
//       required: ['memberId'],
//       additionalProperties: false
//     },
//     validate (state, { memberId }) {
//       // TODO validate memberId
//       if (!state.members.has(memberId)) return 'not a member'
//     },
//     apply (state, { memberId }) {
//       const memberIds = new Set(state.memberIds)
//       memberIds.delete(memberId)
//       return { ...state, memberIds }
//     },
//     removeEventStream ({ memberId }) {
//       return memberId
//     }
//   }
// }

// class ChatRoomMember extends EventMachine {
//   constructor (doc, chatRoom, identifier) {
//     super(doc)
//     this.identifier = identifier
//     this._chatRoom = chatRoom
//   }

//   [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
//     let indent = ''
//     if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
//     return this.constructor.name + '(\n' +
//       indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
//       indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
//       indent + '  host: ' + opts.stylize(this.host, 'string') + '\n' +
//       indent + ')'
//   }

//   async createMessage (content) {
//     await this.appendEvent('createdMessage', { content })
//     await this._chatRoom.update()
//   }
// }

// ChatRoomMember.events = {

//   createdMessage: {
//     schema: {
//       type: 'object',
//       properties: {
//         content: { type: 'string' }
//       },
//       required: ['content'],
//       additionalProperties: false
//     },
//     validate (state, { content }) {
//       if (typeof content !== 'string') return 'content must be a string'
//       if (content.trim().length === 0) return 'cannot be blank'
//     }
//     // apply (state, message) {
//     //   const messages = [...state.messages]
//     //   messages.push(message)
//     //   return { ...state, messages }
//     // }
//   }

//   // updatedMessage: {

//   // },

//   // deletedMessage: {

//   // },

//   // reactedToMessage: {

//   // },

// }
