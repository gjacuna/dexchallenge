import { Button, Card, Col, Input, Menu, Row, Space } from "antd";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Balance,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
  TokenBalance,
  Events,
  Swap,
  DexSwapper,
  DexSwapperLP,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const vendorAddress = readContracts && readContracts.KoyweVendor && readContracts.KoyweVendor.address;

  const vendorTokenBalance = useContractReader(readContracts, "KoyweToken", "balanceOf", [vendorAddress]);
  console.log("🏵 vendorTokenBalance:", vendorTokenBalance ? ethers.utils.formatEther(vendorTokenBalance) : "...");

  const tokensPerEth = useContractReader(readContracts, "KoyweVendor", "tokensPerEth");
  console.log("🏦 tokensPerEth:", tokensPerEth ? tokensPerEth.toString() : "...");

  const [tokenBuyAmount, setTokenBuyAmount] = useState();
  const [tokenSellAmount, setTokenSellAmount] = useState();
  
  const [isSellAmountApproved, setIsSellAmountApproved] = useState();
  const ethCostToPurchaseTokens =
    tokenBuyAmount && tokensPerEth && ethers.utils.parseEther("" + tokenBuyAmount / parseFloat(tokensPerEth));
  const ethCostToSellTokens =
    tokenSellAmount && tokensPerEth && ethers.utils.parseEther("" + tokenSellAmount / parseFloat(tokensPerEth));

  const vendorApproval = useContractReader(readContracts, "KoyweToken", "allowance", [
    address, vendorAddress
  ]);

  useEffect(()=>{
    const tokenSellAmountBN = tokenSellAmount && ethers.utils.parseEther("" + tokenSellAmount)
    setIsSellAmountApproved(vendorApproval && tokenSellAmount && vendorApproval.gte(tokenSellAmountBN))
  },[tokenSellAmount, readContracts])

  const [buying, setBuying] = useState();
  const [selling, setSelling] = useState();

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />
      <Menu style={{ textAlign: "center", marginTop: 40 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">DEX ♻️</Link>
        </Menu.Item>
        <Menu.Item key="/lp">
          <Link to="/lp">LPs Only 💎</Link>
        </Menu.Item>
        <Menu.Item key="/trades">
          <Link to="/trades">Trade History 📜</Link>
        </Menu.Item>
        <Menu.Item key="/vendor">
          <Link to="/vendor">Token Vendor 🪤</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug Contracts 🪲</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}
          {/* <Home yourLocalBalance={yourLocalBalance} readContracts={readContracts} /> */}
          {/* <Swap selectedProvider={mainnetProvider} address={address}/> */}
          <div style={{ width: 500, margin: "auto"}}>
              <h1 style={{ padding: 8, marginTop: 32 }}>Koywe's Decentralized Exchange</h1>
              <p>Check it out, you can now exchange 🌳  Koywe Tokens for ETH in a decentralized way. Cool.</p>
              <p>Go to the 🪤  Vendor Machine as well, which is a little more centralized (not evil though).</p>
              <p>Do you think you can manipulate the DEX to take advantage of the Vendor or vice versa?</p>
          </div>
          <DexSwapper 
            localProvider={localProvider}
            address={address}
            readContracts={readContracts}
            writeContracts={writeContracts}
            tx={tx}
          />
        </Route>
        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

          <Contract
            name="Dex"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
          <Contract
            name="KoyweToken"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
          <Contract
            name="KoyweVendor"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/lp">
          <DexSwapperLP 
            localProvider={localProvider}
            address={address}
            readContracts={readContracts}
            writeContracts={writeContracts}
            tx={tx}
          />
        </Route>
        <Route path="/trades">
          <Events
            contracts={readContracts}
            contractName="Dex"
            eventName="SwapTokens"
            localProvider={localProvider}
            mainnetProvider={mainnetProvider}
            startBlock={1}
          />
          <Events
            contracts={readContracts}
            contractName="Dex"
            eventName="DepositLiquidity"
            localProvider={localProvider}
            mainnetProvider={mainnetProvider}
            startBlock={1}
          />
          <Events
            contracts={readContracts}
            contractName="Dex"
            eventName="WithdrawLiquidity"
            localProvider={localProvider}
            mainnetProvider={mainnetProvider}
            startBlock={1}
          />
          {/* <ExampleUI
            address={address}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            localProvider={localProvider}
            yourLocalBalance={yourLocalBalance}
            price={price}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            purpose={purpose}
          /> */}
        </Route>
        <Route path="/vendor">
        <Space>
              <div style={{ padding: 8 }}>
                <div>Available Supply to Buy:</div>
                <TokenBalance balance={vendorTokenBalance} fontSize={64} />
              </div>
            </Space>
            <div style={{ padding: 8 }}>{tokensPerEth && tokensPerEth.toNumber()} tokens per ETH</div>
            <Space>
              <div style={{ padding: 8, marginTop: 32, width: 300, margin: "auto" }}>
                <Card title="Buy Tokens" >
                  

                  <div style={{ padding: 8 }}>
                    <Input
                      style={{ textAlign: "center" }}
                      placeholder={"amount of tokens to buy"}
                      value={tokenBuyAmount}
                      onChange={e => {
                        setTokenBuyAmount(e.target.value);
                      }}
                    />
                    <Balance balance={ethCostToPurchaseTokens} dollarMultiplier={price} />
                  </div>

                  <div style={{ padding: 8 }}>
                    <Button
                      type={"primary"}
                      loading={buying}
                      onClick={async () => {
                        setBuying(true);
                        await tx(writeContracts.KoyweVendor.buyTokens({ value: ethCostToPurchaseTokens }));
                        setBuying(false);
                      }}
                    >
                      Buy Tokens
                    </Button>
                  </div>
                </Card>
              </div>
              <div style={{ padding: 8, marginTop: 32, width: 300, margin: "auto" }}>
                <Card title="Sell Tokens">
                  
                  <div style={{ padding: 8 }}>
                    <Input
                      style={{ textAlign: "center" }}
                      placeholder={"amount of tokens to sell"}
                      value={tokenSellAmount}
                      onChange={e => {
                        setTokenSellAmount(e.target.value);
                      }}
                    />
                    <Balance balance={ethCostToSellTokens} dollarMultiplier={price} />
                  </div>
                  {isSellAmountApproved?

                    <div style={{ padding: 8 }}>
                      <Button
                        type={"primary"}
                        loading={selling}
                        onClick={async () => {
                          setSelling(true);
                          await tx(writeContracts.KoyweVendor.sellTokens(tokenSellAmount && ethers.utils.parseEther(tokenSellAmount)));
                          setSelling(false);
                        }}
                      >
                        Sell Tokens
                      </Button>
                    </div>
                    :
                    <div style={{ padding: 8 }}>
                      <Button
                        type={"primary"}
                        loading={selling}
                        onClick={async () => {
                          setSelling(true);
                          await tx(writeContracts.KoyweToken.approve(readContracts.KoyweVendor.address, tokenSellAmount && ethers.utils.parseEther(tokenSellAmount)));
                          setSelling(false);
                        }}
                      >
                        Approve Tokens
                      </Button>
                    </div>
                  }


                </Card>
              </div>
            </Space>
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          {USE_NETWORK_SELECTOR && (
            <div style={{ marginRight: 20 }}>
              <NetworkSwitch
                networkOptions={networkOptions}
                selectedNetwork={selectedNetwork}
                setSelectedNetwork={setSelectedNetwork}
              />
            </div>
          )}
          <Account
            useBurner={USE_BURNER_WALLET}
            address={address}
            localProvider={localProvider}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            price={price}
            web3Modal={web3Modal}
            loadWeb3Modal={loadWeb3Modal}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            blockExplorer={blockExplorer}
          />
        </div>
        🌳<TokenBalance
            contracts = {readContracts}
            name = {"KoyweToken"}
            address = {address}
        />
        {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
          <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
        )}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
