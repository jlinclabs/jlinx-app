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
