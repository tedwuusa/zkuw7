// This file is used to generate the signatures used in the input test file
// npx hardhat run scripts/gen_test_sig.js

require("dotenv")
const buildEddsa = require("circomlibjs").buildEddsa
const buildMimc7 = require("circomlibjs").buildMimc7
const wasm_tester = require("circom_tester").wasm

// const fromHexString = (hexString) =>
//   Uint8Array.from(hexString.padStart(64, '0').match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

// const toHexString = (bytes) =>
//   bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

async function gen() {
  const eddsa = await buildEddsa()
  const mimc7 = await buildMimc7()
  const F = mimc7.F

  // const input = [
  //   1337,
  //   BigInt("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
  //   BigInt("1639362239"),
  //   100,
  //   330,
  // ]
  const input = [
    42,
    BigInt("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
    BigInt("1639362240"),
    999,
    1000,
  ]

  const hash = mimc7.multiHash(input)
  //const hash = F.fromObject(BigInt("4693883787057640897410274470539056011455290739552735156139509029429449214218"))
  console.log("msg = " + F.toObject(hash).toString())

  const prvKey = Buffer.from(process.env.EDDSA_PRIV_KEY, "hex")

  const pubKey = eddsa.prv2pub(prvKey)
  console.log('pubKey = ["' + F.toObject(pubKey[0]).toString() + '",\n    "' + F.toObject(pubKey[1]).toString() + '"]')

  const signature = eddsa.signMiMC(prvKey, hash)
  console.log('signature = ["' + F.toObject(signature.R8[0]).toString() + '",\n    "' + F.toObject(signature.R8[1]).toString() + 
    '",\n    "' + signature.S.toString() + '"]')

  // Run through verify javascript
  const result = eddsa.verifyMiMC(hash, signature, pubKey)
  console.log("JS result = " + result)

  // Run through verify circuit
  const circuit = await wasm_tester("node_modules/circomlib/test/circuits/eddsamimc_test.circom");
  const w = await circuit.calculateWitness({
    enabled: 1,
    Ax: F.toObject(pubKey[0]),
    Ay: F.toObject(pubKey[1]),
    R8x: F.toObject(signature.R8[0]),
    R8y: F.toObject(signature.R8[1]),
    S: signature.S,
    M: F.toObject(hash)
  }, true)
  await circuit.checkConstraints(w)
  console.log("WASM result = true") // previous statement will through exception on failure
}

gen()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

