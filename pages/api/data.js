import { ethers } from "ethers";
import { buildEddsa, buildMimc7 } from "circomlibjs"

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' })
    return
  }
 
  // expect req.body to be like {chainId, chainAddress, signature}
  const chainId = ([1666900000, 1337].includes(req.body.chainId)) ? 1666700000 : req.body.chainId
  const address = req.body.chainAddress

  let balanceAmount = 0
  let transactionCount = 1
  let creationTime = Date.now() - 3600 * 24 * 2
  try {
    let url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/`
		let res = await fetch(url, {
      headers: {'Authorization': 'Basic '+btoa(process.env.COVALENT_APIKEY + ':')},
    })
		let data = await res.json()
    if (!data.error) {
      const balances = data.data.items.map(item => 
        Number(BigInt(item.balance)) / Number(BigInt(10 ** item.contract_decimals)) * item.quote
      )
      balanceAmount = balances.reduce((a, b) => a + b, 0)
    } else {
      console.log(data)
    }
		
    url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/transactions_v2/`
		res = await fetch(url, {
      headers: {'Authorization': 'Basic '+btoa(process.env.COVALENT_APIKEY + ':')},
    })
    data = await res.json()
    if (!data.error) {
      transactionCount = data.data.items.length
      const ts = data.data.items[data.data.items.length-1].block_signed_at
      creationTime = Math.floor(new Date(ts).getTime() / 1000)
    } else {
      console.log(data)
    }

	} catch (err) {
		console.log(err);
    // res.status(500).send({ message: err })
    // return
	}

  const result = {
    chainId: chainId,
    chainAddress: address,
    creationTime: creationTime,
    transactionCount: transactionCount,
    balanceAmount: balanceAmount,
  }

  // Only generate data signature if account ownership is confirmed
  let signature = [0, 0, 0]
  if (await verifySignature(address, req.body.signature)) 
    signature = await genSignature(result)
  result.signature = signature

  console.log(result)
  res.status(200).json(result)
}

async function verifySignature(address, signature) {
  const message = "Fusion Credit: Sign this message to prove you own this account!"
  const signer = await ethers.utils.verifyMessage(message, signature)
  return address == signer
}

async function genSignature(data) {
  const eddsa = await buildEddsa()
  const mimc7 = await buildMimc7()
  const F = mimc7.F;

  const input = [
    data.chainId,
    BigInt(data.chainAddress),
    data.creationTime,
    data.transactionCount,
    data.balanceAmount,
  ]
  
  const hash = mimc7.multiHash(input)
  const prvKey = Buffer.from(process.env.EDDSA_PRIV_KEY, "hex")
  const signature = eddsa.signMiMC(prvKey, hash)

  return [F.toObject(signature.R8[0]).toString(), F.toObject(signature.R8[1]).toString(), signature.S.toString()]
}