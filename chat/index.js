
// export const ChatRoom = EventMachine.define({

//   initialState: {},

//   events: {
//     opened: {
//       schema: {

//       },
//       create: function open () {

//       },
//       validate (state, event) {
//         return state.open
//       },
//       reduce (state, event) {
//         return state
//       }
//     },
//     closed: {

//     },
//     memberAdded: {

//     },
//     memberRemoved: {

//     }
//   },

//   actions: {
//     async open (opts = {}) {
//       await this.createEvent('opened', {
//         name: opts.name
//       })
//     }
//   }

// })

// export const ChatRoomMember = EventMachine.define({

// })
