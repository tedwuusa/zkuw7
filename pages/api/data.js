export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' })
    return
  }
 
  // expect req.body to be like {chainId, address, signature}
  const chainId = ((req.body.chainId == 1666900000) ? 1666700000 : req.body.chainId)
  const address = req.body.address

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
    address: address,
    creationTime: creationTime,
    transactionCount: transactionCount,
    balanceAmount: balanceAmount,
    signature: req.body.signature,
  }
  console.log(result)
  
  res.status(200).json(result)
}