EVENT API IDEAS


```js

class AppUser extends MultiLedgerEventMachine {
  offerAccount(options){
    this.appendEvent('accountOffered', {
      ...options
    })
  }
}

// problems
// event storting
// event state projection

AppUser.event('accountOffered', {
  // hook to ensure this event can be emitted
  validate(event){
    return true
  },
  create(event){
    event.event === 'accountOffered'
    return event
  },
  mutateState(state, event){

  },
  // used to sort events while merging streams
  sort(eventA, eventB, allEvents){

  }
})

```
