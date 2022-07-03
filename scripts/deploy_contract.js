require("dotenv")
const hre = require('hardhat')

async function deploy(contractName, ...args) {
  const Factory = await hre.ethers.getContractFactory(contractName)
  const instance = await Factory.deploy(...args)
  const result = await instance.deployed()
  
  console.log(contractName + ' deployed at: ' + result.address)

  return result
}

async function main() {
  const verifierName = (process.env.NEXT_PUBLIC_MOCK_PROOF == 1) ? 'FusionScoreMockVerifier' : 'FusionScoreV1Verifier'
  const verifier = await deploy(verifierName)
  const fusionCredit = await deploy('FusionCredit', verifier.address, 
    [process.env.NEXT_PUBLIC_DATA_PUBKEY1, process.env.NEXT_PUBLIC_DATA_PUBKEY2])

  return fusionCredit
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
