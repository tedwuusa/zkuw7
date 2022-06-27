<img src="public/fusion-credit-wb.png" width="300">

# Fusion Credit
Fusion Credit creates a FusionScore that will represent a universal reputation score with privacy in mind for the #DeFi markets.

FusionScore is based on data from multiple addresses and chains while keeping the account information private. Digital signatures are used to ensure account ownership, and zero knowledge proof is used to hide the account information and ensure the credit score calculation is done correctly. 

## Setup

### For development
```
$ npm install
$ npm run dev
```

### To build circuit and compile smart contract
```
bash scripts/build_circuit.sh
npm run compile
```

### To deploy smart contract
```
npm run deploy-harmony-dev
```