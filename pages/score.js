import Head from "next/head"
import React from "react"
import { useWeb3React } from "@web3-react/core"
import styles from "../styles/Home.module.css"
import EthAccount from "../components/EthAccount"
import ScoreCard from "../components/ScoreCard"
import MsgPopup from "../components/MsgPopup"
import { Contract, utils } from "ethers"
import FusionCredit from "../public/FusionCredit.json"

export default function Score() {
  const web3React = useWeb3React()
  const [score, setScore] = React.useState({score: null, version: null, timestamp: null})
  const [popupState, setPopupState] = React.useState({msg:"", showClose: false}) // show the popup window
  const [showPopup, setShowPopup] = React.useState(false) // show the popup window

  async function getScore(event) {
    event.preventDefault()

    if (web3React.chainId != process.env.NEXT_PUBLIC_FUSION_CREDIT_CHAIN) 
      return
    
    try {
      const address = utils.getAddress(event.target.address.value)
      console.log("Getting score for address: " + address)

      const contractAddress = process.env.NEXT_PUBLIC_FUSION_CREDIT_CONTRACT
      const contract = new Contract(contractAddress, FusionCredit.abi, web3React.library)

      const res = await contract.getScore(address)
      setScore({address: address, score: parseInt(res.score), version: parseInt(res.version), timestamp: parseInt(res.timestamp)})
    } catch (err) {
      setPopupState({msg: "Unable to retrieve Fusion Score", showClose: true})
      setShowPopup(true)
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Fusion Credit Score</title>
        <meta name="description" content="Retrieve Fusion Credit Score" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <img src="/fusion-credit-wb.png" width="250"></img>
        <h1 className={styles.title}>
          Retrieve Fusion Credit Score
        </h1>

        <p className={styles.description}>
          Retrieve Fusion Credit Score by entering an address 🚀🚀🚀
        </p>

        <EthAccount showDisconnect={false}/>

        {web3React.active && <>

          { score.score > 0 && <ScoreCard score={score} /> }

          { score.score === 0 && <p>This address don&apos;t have a score</p> }

          { score.score === null && 
            <form className={styles.formctn} onSubmit={getScore}>
              <div>
                Address: <input name="address" className={styles.formfield} placeholder="Enter Address" />
              </div>

              {web3React.chainId == process.env.NEXT_PUBLIC_FUSION_CREDIT_CHAIN ?
                <div className={styles.formbuttonctn}>
                  <input className={styles.button} type="submit" value="Get Fusion Score" />
                </div>  :
                <p className={styles.errcolor}><br/>To check Fusion Score, select a chain with Fusion Credit smart contract<br/></p>
              }

            </form>
          }

        </>}
      </main>
      { showPopup && <MsgPopup popupState={popupState} onClose={() => setShowPopup(false)} /> }
    </div>
  )
}