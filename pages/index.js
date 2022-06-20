import Head from "next/head"
import { useWeb3React } from "@web3-react/core"
import styles from "../styles/Home.module.css"
import EthAccount from "../components/EthAccount"

export default function Home() {
  const web3React = useWeb3React()

  return (
    <div className={styles.container}>
      <Head>
        <title>Fusion Credit Home</title>
        <meta name="description" content="Create your Fusion Credit" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Fusion Credit!
        </h1>

        <p className={styles.description}>
          Add all accounts you have access to create a more complete and accurate Fusion Score.<br/>
          Fusion Credit uses Zero Knowledge Proof so the accounts added are not made public.
        </p>

        <EthAccount showDisconnect={false}/>

      </main>
    </div>
  )
}
