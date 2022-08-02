# jlinx-client

- has a keyPair identity
- takes a keystore
- stores keypairs locally
- takes a jlinx-node or jlinx-http-node to talk to


```
|- Contract
  |- eventStore
    |- document
      |- core || RemoteCore
```


## Micro Ledgers


to header or not to header?


- always has a plain text header
  - content-type
  - host
  - 
- serialized events as json
- signs each block
- adds ids to events
- adds previous event references?
- json-ld or json-schema



## EventMachine

how do we use objects to compose mutlitple streams together

- an object needs to
  - istself be an event stream 
  - project a view that uses other event streams

Ledger -> EventMachine -> EventBraid



WE ARE MISSING A WAY TO DO THESE PROJECTSIONS WHERE WE CAN CACHES AND
NOT HAVE TO RE-PROCESS. 

!!! Our projections need to be locally cached event streams !!!


the client needs to manage public and private hypercores so we can cache
our projections and hydrate them so out projections can be slow. 



okay so public cachine and sharing of event stream projections is kind of like consensus making. 

- one event stream is the start
- it can reference and dereference other event streams
- a projection algorith is defined and published so anyone can determin the value that projection for that steam at any given version
- multiple parties can calculate that projection 
- disperate pojection values can be compared for accuracy


implementation idea: since we want all streams to have some set of basic features it seemes we need a default/core set of events. events like:
- `stream:moved`
- `stream:arrived`
- `stream:includedStream` { streamId }
- `stream:excludedStream` { streamId }

so subclasses can emit events for membership and another event for stream stuff? :/ ??






## Braiding Streams

- A main stream is the start
- each participant has their own stream
- streams are added when referenced by the main stream or a previously referenced stream
- secondary streams must reference their main stream in their header?


in order for a class to have an API like this

```js
// bob creates a chat room
const chatRoom = await chatRooms.create()
const chatRoomId = chatRoom.id


// alice joins it
const chatRoom = await chatRooms.create(chatRoomId)
const chatRoomMembershipId = await chatRoom.join(identifier)
// chatRoom.join creates a new stream owned by the joininer
// that other steam needs to be sent to the chatRoom creator
// so they can append a main-stream event to add the sub-stream
const chatRoomMembershipId = await chatRoom.leave(identifier)
```


I think I need a way to create local, unshared, hypercores so I can
process events from multiple streams into a local cache?

if I give a storage API object to the client maybe documents like ChatRoom
can store data on-stream and also off-stream "private data" in the developer
can choose where to store it. That way as we process events we have a place to write our state snapshot.

I think we need to move all the event definitions to the main class and not have sub-documents having their own event definitions. 


Two stream types? main-stream and sub-stream?



*FRUSTRATING* im reinventing Autobase because I dont want to upgrade to hypercore 10 or learn how to use Autobase
