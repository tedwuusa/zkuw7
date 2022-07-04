import Head from "next/head"
import React from "react"
import styles from "../styles/Home.module.css"
import EthAccount from "../components/EthAccount"
import NetworkAddress from "../components/NetworkAddress"
import ScoreCard from "../components/ScoreCard"
import MsgPopup from "../components/MsgPopup"

import FusionCredit from "../public/FusionCredit.json"
import { useWeb3React } from "@web3-react/core"
import { Contract } from "ethers"
import { genProof } from "../utils/zkproof"

export default function Home() {
  const web3React = useWeb3React()
  const [chains, setChains] = React.useState([]) // list of supported chains to add account / retrieve data from
  const [scoreTimestamp, setScoreTimestamp] = React.useState(Math.floor(Date.now()/1000)) // timestamp used to generate socre
  const [accounts, setAccounts] = React.useState([]) // list of accounts used to generate socre
  const [score, setScore] = React.useState(null) // the calculated score information and ZK proof
  const [popupState, setPopupState] = React.useState({msg:"", showClose: false}) // show the popup window
  const [showPopup, setShowPopup] = React.useState(false) // show the popup window

  const currChainIndex = findChain(web3React.chainId)
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

  function isValidChain() {
    if (currChainIndex == -1)
      return false    
    if (process.env.NEXT_PUBLIC_PROD_CHAIN_ONLY == 1 && chains[currChainIndex].is_testnet)
      return false
    return true
  }

  function getChainName() {
    if (currChainIndex == -1)
      return <span className={styles.errcolor}>Unsupported chain! Please select another with your wallet!</span>
    if (process.env.NEXT_PUBLIC_PROD_CHAIN_ONLY == 1 && chains[currChainIndex].is_testnet)
      return <span className={styles.errcolor}>This is a test chain. Please select a production chain!</span>
    return <span className={styles.accounttgt}>{chains[currChainIndex].label}</span>
  }

  async function addAccount() {
    if (currAccountIndex != -1) { // an existing account is selected
      setPopupState({msg: "This account is already added!", showClose: true})
      setShowPopup(true)
      return
    }
    const chainIndex = findChain(web3React.chainId)
    if (chainIndex == -1) { // chain not supported
      setPopupState({msg: "This blockchain is not supported", showClose: true})
      setShowPopup(true)
      return
    }

    // get signature from the user to prove ownerhsip of the account    
    setPopupState({msg: "Please sign the message to prove you own this account", showClose: false})
    setShowPopup(true)
    const signer = web3React.library.getSigner()
    let signature;
    try {
      signature = await signer.signMessage("Fusion Credit: Sign this message to prove you own this account!")
    } catch (err) {
      setPopupState({msg: "Signing of message not successful", showClose: true})
      console.log(err)
      return     
    }

    // Fetch data from server side for account
    setPopupState({msg: "Retrieving account data...", showClose: false})
    let data
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId: web3React.chainId,
          chainAddress: web3React.account,
          signature: signature,        
        }),
      })
      data = await response.json()
      if (data.error) {
        setPopupState({msg: "Unable to retrieve data for account", showClose: true})
        console.log(data.error)
        return
      }
    } catch (err) {
      setPopupState({msg: "Retrieving data for account failed", showClose: true})
      console.log(err)
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
      dataChainId: data.chainId,
      dataSig: data.signature,
    }
    const newAccounts = accounts.concat(newAccount)
    setAccounts(newAccounts)

    setShowPopup(false)
  }

  async function makeFusion() {
    // Generate zero knowledge proof
    setPopupState({msg: "Generating zero knowledge proof (this can take 10-15 seconds)", showClose: false})
    setShowPopup(true)
    const signer = web3React.library.getSigner()
    let proofData
    try {
      const senderAddress = await signer.getAddress()
      proofData = await genProof({evalTime: scoreTimestamp, senderAddress, accounts})
    } catch (err) {
      setPopupState({msg: "Unable to generate proof, data may have been tempered", showClose: true})
      console.log(err)
      return
    }

    setPopupState({msg: "Generating transaction, please sign with wallet when ready", showClose: false})
    const contractAddress = process.env.NEXT_PUBLIC_FUSION_CREDIT_CONTRACT
    const contract = new Contract(contractAddress, FusionCredit.abi, signer)
    try {
      const tx = await contract.setScore(proofData.score, proofData.version, proofData.timestamp, proofData.proof)
      console.log(`setScore transaction submitted with hash ${tx.hash}`)
      setPopupState({msg: "Transaction submitted, waiting for it to be committed", showClose: false})
      await tx.wait();
      setScore({
        score: proofData.score,
        version: proofData.version,
        timestamp: proofData.timestamp,
        address: await signer.getAddress(),
      })
    }
    catch (err) {
      setPopupState({msg: "Unable to set Fusion Score", showClose: true})
      console.log(err)
      return
    }
    setShowPopup(false)
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
          <button className={styles.button} onClick={() => {
            setScoreTimestamp(Math.floor(Date.now()/1000))
            setAccounts([])
            setScore(null)
            web3React.deactivate()
            }}>Start Over</button>
        </>}

        { web3React.active && score === null && <>

          <p>{accounts.length} Account(s) Added. To add more, select a new account with your wallet</p>
          {accounts.map(account =>  
            <NetworkAddress key={"C"+account.chainId+"A"+account.address} account={account} />
          )}

          {currAccountIndex != -1 && web3React.chainId == process.env.NEXT_PUBLIC_FUSION_CREDIT_CHAIN ?
            <div className={styles.button} onClick={makeFusion}>Create Fusion Score</div> :
            accounts.length > 0 ?
            <p>To create Fusion Score, select or add an account on a chain with Fusion Credit smart contract<br/><br/></p> :
            <p></p>
          }

          {currAccountIndex == -1 && 
            <>
              <div>
                <p>Network within Wallet: {getChainName()}</p>
                <p>Address within Wallet: <span className={styles.accounttgt}>{web3React.account}</span></p>
              </div>
              <div>
                {isValidChain() &&
                  <button className={styles.button} onClick={addAccount}>Add This Account</button>
                }
              </div>
            </>
          }
        </>}
      </main>
      { showPopup && <MsgPopup popupState={popupState} onClose={() => setShowPopup(false)} /> }
    </div>
  )
}
