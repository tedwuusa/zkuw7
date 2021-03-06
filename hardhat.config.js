require("@nomiclabs/hardhat-waffle")
require("dotenv").config()

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    "hardhat": {
      chainId: 1337
    },
    "ethereum-mainnet": {
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
    "ethereum-kovan": {
      url: "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
    "harmony-mainnet": {
      url: `https://api.harmony.one`,
      accounts: [process.env.DEPLOYER_ADDRESS]
    },    "harmony-testnet": {
      url: `https://api.s0.b.hmny.io`,
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
    "harmony-devnet": {
      url: `https://api.s0.ps.hmny.io`,
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
    "polygon-mainnet": {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
    "polygon-mumbai": {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.DEPLOYER_ADDRESS]
    },
  }
};
