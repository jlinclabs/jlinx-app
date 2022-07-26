const Ajv = require('ajv')
const ajv = new Ajv()

module.exports = {
  compileSchemaValidator(schema){
    return ajv.compile(schema)
  },
}
