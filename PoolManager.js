const ethers = require('ethers')
const poolABI = require('./utils/uniswapPairV2ABI.json')
const v3poolABI = require('./utils/uniswapPairV3ABI.json')
const factoryABI = require('./utils/uniswapFactoryV2ABI.json')
const V3factoryABI = require('./utils/uniswapFactoryV3ABI.json')
const config = require('./utils/config.json')
const MULTICALLABI = require('./utils/multicallABI.json')
const { Multicall } = require('ethereum-multicall');
const DEFAULTFEES = [500, 3000, 10000]


class PoolManager {

    constructor(_provider) {
        this.provider = _provider
        
        this.UniswapFactoryAddress = config.mainnetUniswapFactoryAddress
        this.SushiFactoryAddress = config.mainnetSushiFactoryAddress
        this.WETHAddress = config.mainnetWETHAddress        
        this.UniswapV3FactoryAddress = config.mainnetUniswapV3FactoryAddress

        this.UniswapV3FactoryContract = new ethers.Contract(config.mainnetUniswapV3FactoryAddress, V3factoryABI, this.provider)
        this.SushiFactoryContract = new ethers.Contract(config.mainnetSushiFactoryAddress, factoryABI, this.provider)
        this.UniswapFactoryContract = new ethers.Contract(config.mainnetUniswapFactoryAddress, factoryABI, this.provider)

        this.Multicallcontract = new ethers.Contract(config.MULTICALLAddress, MULTICALLABI, this.provider)

        this.multicall = new Multicall({
            ethersProvider: _provider,
            tryAggregate: true,
        });
    }

    async get_multicall_result(aggregatedCallData){
        let aggregatedCall = [];
        let toReturn = []
        for(let i = 0; i < aggregatedCallData.length; i++){
            aggregatedCall.push({
                reference: 'result'+i.toString(),
                contractAddress: aggregatedCallData[i].address,
                abi: aggregatedCallData[i].abi,
                calls: aggregatedCallData[i].calls
            })
        }

        let resp = await this.multicall.call(aggregatedCall)
        for(let i = 0; i < aggregatedCallData.length; i++){
            let results = resp.results['result'+i.toString()].callsReturnContext;
            for(let j = 0; j < results.length; j++){
                toReturn.push(results[j].returnValues[0])
            }
        }
        return toReturn
    }

    async checkV2Pool(_address) {
        // Create an ethers contract object for the pool
        console.log("Pool contract created, getting tokens")
        // const v2poolContract = new ethers.Contract(_address, poolABI, this.provider) 
        // const token0 = await v2poolContract.token0()
        // const token1 = await v2poolContract.token1()  
        // const factory = await v2poolContract.factory()
        let calls = [
            {
                methodName: 'token0',
                methodParameters: [],
            },
            {
                methodName: 'token1',
                methodParameters: [],
            },
            {
                methodName: 'factory',
                methodParameters: [],
            }
        ]
        let aggregatedCallData = {
            address: _address,
            abi:     poolABI,
            calls:   calls
        }
        const [token0, token1, factory] = await this.get_multicall_result([aggregatedCallData])
        console.log("Token0:", token0)
        console.log("Token1:", token1)
        console.log("Factory:", factory)
        
        if (token0 == this.WETHAddress || token1 == this.WETHAddress) {
            const otherpools = await this.get_other_pools_info(factory, token0, token1, DEFAULTFEES, 0)
            // console.log('other pools:', otherpools)
            return [token0, token1, ...otherpools]
        } else {
            console.log("Pool is not WETH pair, WETH address is:", this.WETHAddress)
            return []
        }
    }

    async checkV3pool(_address){
        // const v3poolContract = new ethers.Contract(_address, v3poolABI, this.provider)
        // const token0 = await v3poolContract.token0()
        // const token1 = await v3poolContract.token1()  
        // const fee = await v3poolContract.fee()
        // const [token0, token1, fee] = await this.get_pool_data(_address, 'v3')
        // console.log("Token0:", token0)
        // console.log("Token1:", token1)
        // console.log("fee:", fee)
        let calls = [
            {
                methodName: 'token0',
                methodParameters: [],
            },
            {
                methodName: 'token1',
                methodParameters: [],
            },
            {
                methodName: 'fee',
                methodParameters: [],
            }
        ]
        let aggregatedCallData = {
            address: _address,
            abi:     v3poolABI,
            calls:   calls
        }
        const [token0, token1, fee] = await this.get_multicall_result([aggregatedCallData])
        // console.log("Token0:", token0)
        // console.log("Token1:", token1)
        // console.log("fee:", fee)

        if (token0 == this.WETHAddress || token1 == this.WETHAddress) {
            // console.log("Pool is WETH pair")
            const otherpools = await this.get_other_pools_info(null, token0, token1, DEFAULTFEES, 0)
            return [token0, token1, ...otherpools]
        } else {
            // console.log("Pool is not WETH pair, WETH address is:", this.WETHAddress)
            return []
        }
    }

    async get_other_pools_info(factory, token0, token1, fees, remove){
        let anotherPair = config.zeroAddress
        if(factory == false || token0 == false || token1 == false){
            return [anotherPair]
        }
        let aggregatedCallDataList = []
        let aggregatedCallData = {}
        let aggregatedCallData0 = {}
        if(factory == this.UniswapFactoryAddress){
            // console.log('this is unipool')
            // anotherPair = await this.SushiFactoryContract.getPair(token0, token1)
            // addressList.push(this.SushiFactoryAddress)
            aggregatedCallData = {
                address:    this.SushiFactoryAddress,
                abi:        factoryABI,
                calls:      [
                    {
                        methodName: 'getPair',
                        methodParameters: [token0, token1],   
                    }
                ]
            }
        }
        else if (factory == this.SushiFactoryAddress){
            // console.log('this is sushi pool')
            aggregatedCallData = {
                address:    this.UniswapFactoryAddress,
                abi:        factoryABI,
                calls:      [
                    {
                        methodName: 'getPair',
                        methodParameters: [token0, token1],   
                    }
                ]
            }
            // addressList.push(this.UniswapFactoryAddress)
            // anotherPair = await this.UniswapFactoryContract.getPair(token0, token1)
        }        
        else{
            aggregatedCallData0 = {
                address:    this.UniswapFactoryAddress,
                abi:        factoryABI,
                calls:      [
                    {
                        methodName: 'getPair',
                        methodParameters: [token0, token1],   
                    }
                ]
            }
            aggregatedCallData = {
                address:    this.SushiFactoryAddress,
                abi:        factoryABI,
                calls:      [
                    {
                        methodName: 'getPair',
                        methodParameters: [token0, token1],   
                    }
                ]
            }
            aggregatedCallDataList.push(aggregatedCallData0)  
        }
        aggregatedCallDataList.push(aggregatedCallData)
        // const naiveCallRes = await this.UniswapFactoryContract.getPair(token1, token0)
        // console.log('naive call result:', naiveCallRes)
        // addressList.push(this.UniswapV3FactoryAddress)
        // abiList.push(V3factoryABI)
        let v3calldatas = []
        for(let fee of fees){
            if(fee == remove){continue}
            v3calldatas.push({
                methodName: 'getPool',
                methodParameters: [token0, token1, fee],
            })
            // const pool = await this.UniswapV3FactoryContract.getPool(token0, token1, fee)
            // v3pools.push(pool)
        }
        // callsList.push(v3calldatas)
        // console.log('addressList:', addressList)
        // console.log('abiList:',abiList)
        // console.log('calldata list:', callsList)
        aggregatedCallData = {
            address:    this.UniswapV3FactoryAddress,
            abi:        V3factoryABI,
            calls:      v3calldatas
        }
        aggregatedCallDataList.push(aggregatedCallData)
        // console.log("call data list:", aggregatedCallDataList)
        return this.get_multicall_result(aggregatedCallDataList)
    }

    async checkFactory(_factoryAddress, _token0, _token1) {
        if(_factoryAddress == false ||_token0 == false || _token1 == false){
            return false
        }
        // Create an ethers contract object for the factory
        const factoryContract = new ethers.Contract(_factoryAddress, factoryABI, this.provider)
        // console.log("Checking alternative factor for pair")

        const pair = await factoryContract.getPair(_token0, _token1)

        if (pair == config.zeroAddress){
            console.log("Pair does not exist on alternative factory, returning")
            return false
        } else {
            console.log("Alternate pair exists! Pair address:", pair)
            return pair
        } 
    }
}

module.exports = PoolManager