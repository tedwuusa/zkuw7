require("dotenv")
const { ethers, waffle } = require('hardhat')
const { expect, assert } = require('chai')

const groth16 = require("snarkjs").groth16

describe('ZK Tests', function () {
  async function deploy(contractName, ...args) {
    const Factory = await ethers.getContractFactory(contractName)
    const instance = await Factory.deploy(...args)
    return instance.deployed()
  }

  async function fixture() {
    const verifier = await deploy('FusionScoreV1Verifier')
    const fusionCredit = await deploy('FusionCredit', verifier.address,
      [process.env.NEXT_PUBLIC_DATA_PUBKEY1, process.env.NEXT_PUBLIC_DATA_PUBKEY2])
    return { verifier, fusionCredit }
  }

  it('Verifier Contract', async () => {
    const { verifier, fusionCredit } = await waffle.loadFixture(fixture)

    // Generate proof
    const input = require("./inputs/input2.json")
    const { proof, publicSignals } = await groth16.fullProve(input,
      "public/zk/FusionScoreV1.wasm",
      "public/zk/FusionScoreV1.zkey"
    )

    // Old way of generating prove data
    // const calldata = await groth16.exportSolidityCallData(
    //   proof,
    //   publicSignals
    // );

    // const argv = calldata
    // .replace(/["[\]\s]/g, "")
    // .split(",")
    // .map((x) => BigInt(x).toString());

    // const a = [argv[0], argv[1]];
    // const b = [
    //   [argv[2], argv[3]],
    //   [argv[4], argv[5]],
    // ];
    // const c = [argv[6], argv[7]];
    // const Input = [];
  
    // for (let i = 8; i < argv.length; i++) {
    //   Input.push(argv[i]);
    // }

    // Verify Proof with Verifier Contract
    const pi_a = [proof.pi_a[0], proof.pi_a[1]]
    const pi_b = [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ]
    const pi_c = [proof.pi_c[0], proof.pi_c[1]]

    assert(await verifier.verifyProof(pi_a, pi_b, pi_c, publicSignals))
  })

  it('FusionCredit Contract', async () => {
    const { verifier, fusionCredit } = await waffle.loadFixture(fixture)

    // Generate proof
    const input = require("./inputs/input1.json")
    const result = await groth16.fullProve(input,
      "public/zk/FusionScoreV1.wasm",
      "public/zk/FusionScoreV1.zkey"
    )

    // Call SetScore which does proof verification
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
    const tx = await fusionCredit.setScore(
      result.publicSignals[0], 
      result.publicSignals[1], 
      result.publicSignals[2], 
      proof)
    const receipt = await tx.wait()

    // Check stored score
    const data = await fusionCredit.getScore(fusionCredit.signer.address)
    assert(data.score == result.publicSignals[0])
  })

})
