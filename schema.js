const Ajv2020 = require("ajv/dist/2020")
const ajv = new Ajv2020()

module.exports = {
  compileSchemaSerializer(schema){
    return ajv.compileSerializer(schema)
  },
  compileSchemaParser(schema){
    return ajv.compileParser(schema)
  },
}
