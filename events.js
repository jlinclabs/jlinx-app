const Debug = require('debug')
const { compileSchemaValidator } = require('./schema')
const Ledger = require('./Ledger')

const debug = Debug('jlinx:client:events')

exports.compileEvents = function compileEvents (events) {
  const cEvents = {}
  for (const eventName in events) {
    const spec = cEvents[eventName] = { ...events[eventName] }
    try {
      spec.schemaValidate = spec.schema === null
        ? makeNullSchemaValidator()
        : compileSchemaValidator(spec.schema)
    } catch (error) {
      throw new Error(`invalid schema for event "${eventName}": ${error}`)
    }
    cEvents[eventName] = spec
  }
  // TODO deep freeze
  return Object.freeze(cEvents)
}

function makeNullSchemaValidator () {
  function nullSchemaValidator (value) {
    if (
      typeof value === 'undefined' ||
      value === null
    ) return true
    nullSchemaValidator.errors = [
      {
        message: 'must be null or undefined'
      }
    ]
    return false
  }
  return nullSchemaValidator
}

function mergeEvents (events, newEvents) {
  // find the first newEvent that references an existing event
  // join an order new events into existing events
  //

}

function purgeEvents () {

}
