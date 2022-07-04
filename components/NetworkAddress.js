import React from "react"
import styles from "../styles/Home.module.css"
import { useWeb3React } from "@web3-react/core"

const NetworkAddress = ({ account, onDelete }) => {
  const web3React = useWeb3React()

  return <div className={styles.card}>
    <p>Network: {account.network}</p>
    <p>Address: {account.address}</p>

    { web3React.chainId == account.chainId && web3React.account == account.address && <>
      { process.env.NEXT_PUBLIC_FUSION_CREDIT_CHAIN == account.chainId &&
        <p className={styles.accounttgt}>Fusion Score will be attached to this address</p>
      }
      { process.env.NEXT_PUBLIC_FUSION_CREDIT_CHAIN != account.chainId &&
        <p className={styles.errcolor}>Smart Contract not deployed on this chain</p>
      }
      </>
    }
  </div>
}

export default NetworkAddress