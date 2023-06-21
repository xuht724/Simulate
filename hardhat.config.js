require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/hLp2x4EfEzDvMd-VsxYUvTV9AhalxNzi",
        //target trx blockNumber - 1
        blockNumber: 17361576
      }
    }
  }
};
