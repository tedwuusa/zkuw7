// This script is similar to unit test, except it can be run on any network
// npx hardhat run scripts/network_test.js --network <network>

require("dotenv")
const hre = require("hardhat")
const groth16 = require("snarkjs").groth16
const input = require("../test/inputs/input1.json")

async function test() {
  const result = await groth16.fullProve(input,
    "public/zk/FusionScoreV1.wasm",
    "public/zk/FusionScoreV1.zkey",
  )

  console.log("FusionCredit Contract: " + process.env.NEXT_PUBLIC_FUSION_CREDIT_CONTRACT)
  const contractFactory = await hre.ethers.getContractFactory("FusionCredit");
  const contract = await contractFactory.attach(process.env.NEXT_PUBLIC_FUSION_CREDIT_CONTRACT)

  const proof = [
    result.proof.pi_a[0],
    result.proof.pi_a[1],
    result.proof.pi_b[0][1],
    result.proof.pi_b[0][0],
    result.proof.pi_b[1][1],
    result.proof.pi_b[1][0],
    result.proof.pi_c[0],
    result.proof.pi_c[1],
  ]

  // console.log(result.proof)
  // console.log(result.publicSignals)
  await contract.setScore(
    result.publicSignals[0], 
    result.publicSignals[1], 
    result.publicSignals[2], 
    proof)

  const score = await contract.getScore(contract.signer.address)
  console.log("score = " + score)    

  // const verifierFactory = await hre.ethers.getContractFactory("FusionScoreV1Verifier");
  // const verifier = await verifierFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3")

  // const pi_a = [result.proof.pi_a[0], result.proof.pi_a[1]]
  // const pi_b = [
  //   [result.proof.pi_b[0][1], result.proof.pi_b[0][0]],
  //   [result.proof.pi_b[1][1], result.proof.pi_b[1][0]]
  // ]
  // const pi_c = [result.proof.pi_c[0], result.proof.pi_c[1]]
  // const v_input = ['210', result.publicSignals[1], result.publicSignals[2], result.publicSignals[3]]
  // const success = await verifier.verifyProof(pi_a, pi_b, pi_c, v_input)
  // console.log("result = " + success)
}


test()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

