const { ethers, network } = require("hardhat");
const web3 = require("Web3");
const PoolManager = require('./PoolManager.js');
const { rpcURL, wsURL } = require('./config.js');

async function send() {
    // const vitalik_address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    const yuqing_address = "0x3Cb23ccc26a1870eb9E79B7A061907BDaeF4F7D6";
    const addressTo = "0x73ed0c38bff20d27b8892b921cd9182fe816762b";

    const wsProvider = new ethers.WebSocketProvider(wsURL);
    const poolManager = new PoolManager(wsProvider);

    // Replay target transaction
    //需要有一个额外的Provider能够获取原链上的数据
    const mainnodeProvider = new web3.Web3(rpcURL);
    let targetTrx = await mainnodeProvider.eth.getTransaction("0xd791b3eec66e453e6fc731391f5f4da8b2db5518fdd68190548b7947d5b3f98c");
    // console.log(targetTrx);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [targetTrx.from],
    });
    const targetSigner = await ethers.getImpersonatedSigner(targetTrx.from);
    // const mySignaer = await ethers.getImpersonatedSigner(vitalik_address);

    const replayTx = {
        to: targetTrx.to,
        data: targetTrx.input,
        value: targetTrx.value,
        gasPrice: targetTrx.gasPrice,
        gasLimit: 2100000
    };
    console.log(replayTx);

    const response = await targetSigner.sendTransaction(replayTx);
    // Wait for the transaction to be mined and get the receipt
    const receipt = await response.wait();
    console.log("Transaction receipt:", receipt.logs);
    console.log(`Target Trx Replay Successfully`);

    for (const log of receipt.logs) {
        if (log.topics[0] == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") {
            const v2pool = ethers.getAddress(log.address);
            console.log("Transaction trading on Uniswap v2 pool detected! Pool address:", v2pool);
            //在这里会出一个Bug
            //Error: Network - 1 doesn't have a multicall contract address defined. Please check your network or deploy your own contract on it.
            const [token0, token1, anotherV2pool, v3pool1, v3pool2, v3pool3] = await poolManager.checkV2Pool(v2pool);
            console.log('token0:', token0, ' token1:', token1, ' anotherv2pool:', anotherV2pool);
            console.log('v3 pools 1:', v3pool1, ' 2:', v3pool2, ' 3:', v3pool3);
        }
    }

    //根据前面这一笔重放的交易我生成我自己的交易
    // await network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [yuqing_address],
    // });
    // const mySignaer = await ethers.getImpersonatedSigner(yuqing_address);


    // let targetBlock = await mainnodeProvider.eth.getBlock(17361577);
    // let transactions = targetBlock.transactions;
    // console.log(`区块内部的交易${transactions.length}`);
    // //replay 一些交易
    // for (const txHash of transactions) {
    //     const tx = await mainnodeProvider.eth.getTransaction(txHash);

    //     const receipt = await signer.provider.send("eth_sendRawTransaction", [tx]);
    //     console.log(receipt);
    // }

    // console.log(
    //     "Vitalik account before transaction",
    //     ethers.formatEther(await signer.provider.getBalance(signer.address))
    // );

    // //   create  transaction
    // const tx = {
    //     to: addressTo,
    //     value: ethers.parseEther("10"),
    // };

    // const recieptTx = await signer.sendTransaction(tx);

    // await recieptTx.wait();

    // console.log(`Transaction successful with hash: ${recieptTx.hash}`);
    // // console.log(recieptTx);
    // console.log(
    //     "Vitalik account after transaction",
    //     ethers.formatEther(await signer.provider.getBalance(signer.address))
    // );
}




send();
    // .then(() => process.exit(0))
    // .catch((error) => {
    //     console.error(error);
    //     process.exit(1);
    // });