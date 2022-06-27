import Head from "next/head"
import React from "react"
import { useWeb3React } from "@web3-react/core"
import styles from "../styles/Home.module.css"
import EthAccount from "../components/EthAccount"
import NetworkAddress from "../components/NetworkAddress"
import { Contract } from "ethers"
import FusionCredit from "../public/FusionCredit.json"
import ScoreCard from "../components/ScoreCard"

export default function Home() {
  const web3React = useWeb3React()
  const [chains, setChains] = React.useState([]) // list of supported chains to add account / retrieve data from
  const [scoreTimestamp, setScoreTimestamp] = React.useState(Date.now()) // timestamp used to generate socre
  const [accounts, setAccounts] = React.useState([]) // list of accounts used to generate socre
  const [score, setScore] = React.useState(null) // the calculated score information and ZK proof
  
  const currChainIndex = findChain(web3React.chainId)
  const currChainName = (currChainIndex == -1) ? "Unsupported! Please select another Chain" : chains[currChainIndex].label
  const currAccountIndex = findAccount()

  React.useEffect(() => {
    fetch('/api/chain')
      .then(res => res.json())
      .then(data => setChains(data))    
  }, [])

  function findChain(chainId) {
    for (const [i, chain] of chains.entries()) {
      if (chain.chain_id == chainId) {
        return i
      }
    }
    return -1
  }

  function findAccount() {
    if (!web3React.active || !web3React.account) 
      return null
    for (const [i, account] of accounts.entries()) {
      if (account.chainId === web3React.chainId &&
          account.address === web3React.account) {
        return i
      }
    }
    return -1
  }

  function genProof(evalTime, accounts) {
    const cap300 = (val) => (val > 300) ? 300 : Math.floor(val)

    const scores = accounts.map(account => 
      cap300((evalTime - account.creationTime) / 3600 / 24 / 2) +
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
      timestamp: evalTime,
      proof: [0,0,0,0,0,0,0,0],
    }
  }

  async function addAccount() {
    if (currAccountIndex != -1) // an existing account is selected
      return
    const chainIndex = findChain(web3React.chainId)
    if (chainIndex == -1) // chain not supported
      return

    // get signature from the user to prove ownerhsip of the account
    const signer = web3React.library.getSigner()
    let signature;
    try {
      signature = await signer.signMessage("Fusion Credit: Sign this message to prove you own this account!")
    } catch (err) {
      // TODO: Add user notification UI
      console.log("Message not signed successfully.")
      console.log(err)
      return     
    }

    // Fetch data from server side for account
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId: web3React.chainId,
        address: web3React.account,
        signature: signature,        
      }),
    })
    const data = await response.json()
    if (data.error) {
      // TODO: Add user notification UI
      console.log(data.error)
      return
    }

    // Add account to list
    const newAccount = {
      chainId: web3React.chainId,
      address: web3React.account,
      network: chains[chainIndex].label,
      logo: chains[chainIndex].logo_url,
      isTest: chains[chainIndex].is_testnet,
      walletSig: signature,
      creationTime: data.creationTime,
      transactionCount: data.transactionCount,
      balanceAmount: data.balanceAmount,
      dataSig: data.signature,
    }
    const newAccounts = accounts.concat(newAccount)
    setAccounts(newAccounts)
  }

  async function makeFusion() {
    const contractAddress = process.env.NEXT_PUBLIC_FUSION_CREDIT_CONTRACT
    console.log(contractAddress)

    const signer = web3React.library.getSigner()
    const proofData = genProof(scoreTimestamp, accounts)
    const contract = new Contract(contractAddress, FusionCredit.abi, signer)

    try {
      const tx = await contract.setScore(proofData.score, proofData.version, proofData.timestamp, proofData.proof)
      console.log(`setScore transaction submitted with hash ${tx.hash}`)
      await tx.wait();
      setScore({
        score: proofData.score,
        version: proofData.version,
        timestamp: proofData.timestamp,
        address: await signer.getAddress(),
      })
    }
    catch (err) {
      // TODO: Add user notification UI
      console.log(err)
      return
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Fusion Credit Home</title>
        <meta name="description" content="Create your Fusion Credit" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <img src="/fusion-credit-wb.png" width="250"></img>
        <h1 className={styles.title}>
          Welcome to Fusion Credit!
        </h1>

        <p className={styles.description}>
          Add all the accounts you have access to create a more accurate Fusion Score.<br/>
          Fusion Credit uses Zero Knowledge Proof so added accounts are not made public.<br/>
          To check Fusion Score for any address, click <a href="score">here</a>.
        </p>

        <EthAccount showDisconnect={false}/>

        { score && <>
          <div className={styles.resulttitle}>Your Fusion Score is created successfully</div>
          <ScoreCard score={score}/>
        </>}

        { web3React.active && score === null && <>

          <p>{accounts.length} Account(s) Added. To add more, select a new account with your wallet</p>
          {accounts.map(account =>  
            <NetworkAddress key={"C"+account.chainId+"A"+account.address} account={account} />
          )}

          {currAccountIndex != -1 ?
            <div className={styles.button} onClick={makeFusion}>Create Fusion Score</div> :
            accounts.length > 0 ?
            <p>To create Fusion Score, select one of the added accounts or add current account<br/><br/></p> :
            <p></p>
          }

          {currAccountIndex == -1 && 
            <>
              <div>
                <p>Current Account: {currChainName}</p>
                <p>Address: {web3React.account}</p>
              </div>
              <div>
                {currChainIndex != -1 &&
                  <button className={styles.button} onClick={addAccount}>Add This Account</button>
                }
              </div>
            </>
          }
        </>}
      </main>
    </div>
  )
}
