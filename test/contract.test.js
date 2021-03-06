const { ethers, waffle } = require('hardhat')
const { expect } = require('chai')

describe('Contract Test (No ZK Verify)', function () {
  async function deploy(contractName, ...args) {
    const Factory = await ethers.getContractFactory(contractName)
    const instance = await Factory.deploy(...args)
    return instance.deployed()
  }

  async function fixture() {
    const verifier = await deploy('FusionScoreMockVerifier')
    const fusionCredit = await deploy('FusionCredit', verifier.address, [0, 0])
    return { fusionCredit }
  }

  it('Set/Get Score', async () => {
    const { fusionCredit } = await waffle.loadFixture(fixture)

    await fusionCredit.setScore(500, 1, 1655271464, [0,0,0,0,0,0,0,0])

    const [owner] = await ethers.getSigners();
    const score = await fusionCredit.getScore(owner.address)
    expect(score.score).to.equal(500)
    expect(score.version).to.equal(1)
    expect(score.timestamp).to.equal(1655271464)
  })

})
