const chai = require("chai")

const assert = chai.assert
const expect = chai.expect

const wasm_tester = require("circom_tester").wasm
const groth16 = require("snarkjs").groth16

describe("V1 Circuit Test", function () {
  let circuit

  before(async () => {
      circuit = await wasm_tester("circuits/FusionScoreV1.circom")
      await circuit.loadConstraints()
  })

  it("Should produce score from 1 account", async () => {
    const input = require("./inputs/input1.json")
    
    const witness = await circuit.calculateWitness(input, true)

    assert(witness[0] == 1) // success
    assert(witness[1] == 210) // score
    assert(witness[2] == 1) // version
    assert(witness[3] == input.evalTime) // timestamp
    assert(witness[4] == input.senderAddress) // sender address
  })

  it("Should produce score from 2 accounts", async () => {
    const input = require("./inputs/input2.json")
    
    const witness = await circuit.calculateWitness(input, true)

    assert(witness[0] == 1) // success
    assert(witness[1] == 396) // score
  })

  it("Should generate proof", async () => {
    const input = require("./inputs/input2.json")

    const { proof, publicSignals } = await groth16.fullProve(input,
      "public/zk/FusionScoreV1.wasm",
      "public/zk/FusionScoreV1.zkey"
    )

    assert(publicSignals[0] == 396) // score
    assert(publicSignals[1] == 1) // version
    assert(publicSignals[2] == input.evalTime) // timestamp
    assert(publicSignals[3] == BigInt(input.senderAddress)) // sender address
  })
})
