import { groth16 } from "snarkjs";

async function genMockProof(input) {
  const cap300 = (val) => (val > 300) ? 300 : Math.floor(val)

  const scores = input.accounts.map(account => 
    cap300((input.evalTime - account.creationTime) / 3600 / 24 / 2) +
    cap300(account.transactionCount) + 
    cap300(account.balanceAmount / 33)
  )

  const scoreInfo = scores.reduce((acc, curr) => {
    const score_mapped = 1000 + (1000 - curr); // mapping score to [1000, 2000] in reverse
    const accumulator_new = Math.floor(acc.accumulator * score_mapped / 1000); // use signal for quadratic limitation
    const scale_new = acc.scale * 2;
    return {accumulator: accumulator_new, scale: scale_new}
  }, {accumulator: 1000, scale: 1})

  const factor = scoreInfo.scale - 1;
  const mapped = scoreInfo.accumulator - 1000;
  const score = 1000 - Math.floor(mapped / factor);

  return {
    score: score,
    version: 1,
    timestamp: input.evalTime,
    senderAddress: BigInt(input.senderAddress),
    proof: [0,0,0,0,0,0,0,0],
  }
}

async function genV1Proof(input) {
  const count = input.accounts.length
  if (count > 20)
    throw new Error("Too many accounts")
  const filler =  new Array(20-count).fill(0)

  const circuitInput = {
    evalTime: input.evalTime,
    senderAddress: input.senderAddress,
    creationTime: input.accounts.map(account => account.creationTime).concat(filler),
    transactionCount: input.accounts.map(account => account.transactionCount).concat(filler),
    balanceAmount: input.accounts.map(account => account.balanceAmount).concat(filler),
  }
  //console.log(circuitInput)
  const result = await groth16.fullProve(circuitInput,
    "zk/FusionScoreV1.wasm",
    "zk/FusionScoreV1.zkey",
  )

  console.log(result.publicSignals)
  console.log(result.proof)
  console.log(typeof result.publicSignals[0])

  return {
    score: result.publicSignals[0],
    version: result.publicSignals[1],
    timestamp: result.publicSignals[2],
    senderAddress: result.publicSignals[3],
    proof: [result.proof.pi_a[0], result.proof.pi_a[1], 
      result.proof.pi_b[0][1], result.proof.pi_b[0][0], result.proof.pi_b[1][1], result.proof.pi_b[1][0],
      result.proof.pi_c[0], result.proof.pi_c[1]],
  }
}

export async function genProof(input) {
  if (process.env.NEXT_PUBLIC_MOCK_PROOF == 1)
    return await genMockProof(input)
  else
    return await genV1Proof(input)
}
