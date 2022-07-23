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
