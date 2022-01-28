import { RetweetOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  InputNumber,
  Modal,
  notification,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
  message
} from "antd";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  useBalance,
  useContractReader,
  usePoller
} from "eth-hooks";

const { Option } = Select;
const { Text } = Typography;

const tokenListToObject = array =>
  array.reduce((obj, item) => {
    obj[item.symbol] = {'name':item.name,'symbol':item.symbol};
    return obj;
  }, {});

function DexSwapper({ localProvider, readContracts, writeContracts, address, tx }) {
  
  const [swapping, setSwapping] = useState(false);
  const [approving, setApproving] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [tokenIn, setTokenIn] = useState("ETH");
  const [tokenOut, setTokenOut] = useState("KOY");
  const [exact, setExact] = useState();
  const [amountIn, setAmountIn] = useState();
  const [amountInMax, setAmountInMax] = useState();
  const [amountOut, setAmountOut] = useState();
  const [amountOutMin, setAmountOutMin] = useState();
  const [balanceIn, setBalanceIn] = useState();
  const [balanceOut, setBalanceOut] = useState();
  const [currentPrice, setCurrentPrice] = useState();
  const [invertPrice, setInvertPrice] = useState(false);
  // const [tokenAllowance, setTokenAllowance] = useState();

  const tokenList = [
    {"token":"Koywe Carbon Tokens", "symbol":"KOY", "contractAlias":"KoyweToken", "decimals":18},
    {"token":"Ether", "symbol":"ETH", "contractAlias":"ETHE", "decimals":18},
  ];

  const tokens = tokenListToObject(tokenList);

  const balanceETH = useBalance(localProvider, address);
  const balanceToken = useContractReader(readContracts, "KoyweToken", "balanceOf", [address]);
  
  const dexAddress = readContracts && readContracts.Dex ? readContracts.Dex.address : null;
  const contractTokenBalance = useContractReader(readContracts, "KoyweToken", "balanceOf", [dexAddress]);
  const contractEthBalance = useBalance(localProvider, dexAddress);
  const tokenAllowance = useContractReader(readContracts, "KoyweToken", "allowance", [address,dexAddress]);

  const getPrice = (inputAmount) =>
  {
    if(contractEthBalance && contractTokenBalance){
      var inputReserve = contractEthBalance;
      var outputReserve = contractTokenBalance;
      if (tokenIn !== "ETH"){
        inputReserve = contractTokenBalance;
        outputReserve = contractEthBalance;
      }
      
      const price = inputAmount*(10**18)*997*outputReserve/(inputReserve*1000+inputAmount*(10**18)*997);
      return parseFloat(ethers.utils.formatUnits(price.toString(), 18)).toPrecision(6);
    }
  };

  const setBalances = async () => {
    if (tokenIn === "ETH") {
      setBalanceIn(balanceETH);
      setBalanceOut(balanceToken);
    } else {
      setBalanceIn(balanceToken);
      setBalanceOut(balanceETH);
    }
  };

  usePoller(setBalances, 300);

  const inputIsToken = tokenIn !== "ETH";
  const insufficientAllowance = !inputIsToken
    ? false 
    : tokenAllowance/(10**18) < amountIn;

  const formattedBalanceIn = balanceIn
    ? parseFloat(ethers.utils.formatUnits(balanceIn, 18)).toPrecision(6)
    : null;
  const formattedBalanceOut = balanceOut
    ? parseFloat(ethers.utils.formatUnits(balanceOut, 18)).toPrecision(6)
    : null;

  const executeSwap = async () => {
    setSwapping(true);
    // message.info("Confirmado!");
    if (tokenIn === "ETH") {
      tx({
        to: writeContracts.Dex.address,
        value: ethers.utils.parseEther(amountIn.toString()),
        data: writeContracts.Dex.interface.encodeFunctionData("ethToToken()"),
      });
    }else{
      tx(
        writeContracts.Dex.tokenToEth(ethers.utils.parseEther(amountIn.toString()), {}),
      );
    }
    setSwapping(false);
  };

  const showSwapModal = () => {
    setSwapModalVisible(true);
  };

  const handleSwapModalOk = () => {
    executeSwap();
    setSwapModalVisible(false);
  };

  const handleSwapModalCancel = () => {
    setSwapModalVisible(false);
  };

  const updateTokenAllowance = async newAllowance => {
    try{
      setApproving(true);
      tx(writeContracts.KoyweToken.approve(dexAddress,newAllowance));
      setApproving(false);
      return true;
    } catch (e) {
      notification.open({
        message: "Approval unsuccessful",
        description: `Error: ${e.message}`,
      });
    }
  };

  const approveToken = async () => {
    const approvalAmount = 
      exact === "in"
        ? ethers.utils.hexlify(ethers.utils.parseUnits(amountIn.toString(), tokens[tokenIn].decimals))
        : amountInMax.raw.toString();
    console.log(approvalAmount);
    const approval = updateTokenAllowance(approvalAmount);
    if (approval) {
      notification.open({
        message: "Token transfer approved",
        description: `You can now swap up to ${amountIn} ${tokenIn}`,
      });
    }
  };

  const insufficientBalance = balanceIn
    ? parseFloat(ethers.utils.formatUnits(balanceIn, 18)) < amountIn
    : null;

  const rawPrice = amountIn ? getPrice(amountIn)/amountIn : getPrice(1);
  
  const priceDescription = rawPrice
    ? invertPrice
      ? `${1/rawPrice} ${tokenIn} per ${tokenOut}`
      : `${rawPrice} ${tokenOut} per ${tokenIn}`
    : null;

  const priceWidget = (
    <Space>
      <Text type="secondary">{priceDescription}</Text>
      <Button
        type="text"
        onClick={() => {
          setInvertPrice(!invertPrice);
        }}
      >
        <RetweetOutlined />
      </Button>
    </Space>
  );

  const swapModal = (
    <Modal title="Confirm swap" visible={swapModalVisible} onOk={handleSwapModalOk} onCancel={handleSwapModalCancel}>
      <Row>
        <Space>
          {/* <img src={logoIn} alt={tokenIn} width="30" /> */}
          {amountIn}
          {tokenIn}
        </Space>
      </Row>
      <Row justify="center" align="middle" style={{ width: 30 }}>
        <span>↓</span>
      </Row>
      <Row>
        <Space>
          {/* <img src={logoOut} alt={tokenOut} width="30" /> */}
          {amountOut}
          {tokenOut}
        </Space>
      </Row>
      <Divider />
      <Row>{priceWidget}</Row>
      <Row>
        {((amountOutMin && exact === "in") || (amountInMax && exact === "out"))
          ? exact === "in"
            ? `Output is estimated. You will receive at least ${amountOutMin.toSignificant(
                6,
              )} ${tokenOut} or the transaction will revert.`
            : `Input is estimated. You will sell at most ${amountInMax.toSignificant(
                6,
              )} ${tokenIn} or the transaction will revert.`
          : null}
      </Row>
    </Modal>
  );

  return (
    <Card
      title={
        <Space>
          <Typography>DexSwapper</Typography>
        </Space>
      }
      extra={
        <Button
          type="text"
          onClick={() => {
            setSettingsVisible(true);
          }}
        >
          <SettingOutlined />
        </Button>
      }
    >
      <Space direction="vertical">
        <Row justify="center" align="middle">Current DEX Price: {priceWidget}</Row>
        <Row justify="center" align="middle">
          <Card
            size="small"
            type="inner"
            title={`From${exact === "out" && tokenIn && tokenOut ? " (estimate)" : ""}`}
            extra={
              <>
                {/* <img src={logoIn} alt={tokenIn} width="30" /> */}
                <Button
                  type="link"
                  onClick={() => {
                    setAmountOut(getPrice(balanceIn));
                    setAmountIn(ethers.utils.formatUnits(balanceIn, 18));
                    setAmountOutMin();
                    setAmountInMax();
                    setExact("in");
                  }}
                >
                  {formattedBalanceIn}
                </Button>
              </>
            }
            style={{ width: 400, textAlign: "left" }}
          >
            <InputNumber
              style={{ width: "160px" }}
              min={0}
              size="large"
              value={amountIn}
              onChange={e => {
                setAmountOut(getPrice(e));
                setAmountIn(e);
                setExact("in");
              }}
            />
            <Select
              value={tokenIn}
              style={{ width: "120px" }}
              size="large"
              bordered={false}
              defaultValue={"ETH"}
              onChange={value => {
                console.log(value);
                if (value === tokenOut) {
                  console.log("switch!", tokenIn);
                  setTokenOut(tokenIn);
                  setAmountOut(amountIn);
                  setBalanceOut(balanceIn);
                }
                setTokenIn(value);
                setAmountIn();
                setExact("out");
                setBalanceIn();
              }}
              filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              optionFilterProp="children"
            >
              {tokenList.map(token => (
                <Option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </Option>
              ))}
            </Select>
          </Card>
        </Row>
        <Row justify="center" align="middle">
          <Tooltip title={"Direct->"}>
            <span>↓</span>
          </Tooltip>
        </Row>
        <Row justify="center" align="middle">
          <Card
            size="small"
            type="inner"
            title={`To${exact === "in" && tokenIn && tokenOut ? " (estimate)" : ""}`}
            extra={
              <>
                {/* <img src={logoOut} width="30" alt={tokenOut} /> */}
                <Button type="text">{formattedBalanceOut}</Button>
              </>
            }
            style={{ width: 400, textAlign: "left" }}
          >
            <InputNumber
              style={{ width: "160px" }}
              size="large"
              min={0}
              value={amountOut}
              onChange={e => {
                setAmountOut(e);
                setAmountIn();
                setExact("out");
              }}
            />
            <Select
              showSearch
              value={tokenOut}
              style={{ width: "120px" }}
              size="large"
              bordered={false}
              onChange={value => {
                console.log(value, tokenIn, tokenOut);
                if (value === tokenIn) {
                  console.log("switch!", tokenOut);
                  setTokenIn(tokenOut);
                  setAmountIn(amountOut);
                  setBalanceIn(balanceOut);
                }
                setTokenOut(value);
                setExact("in");
                setAmountOut();
                setBalanceOut();
              }}
              filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              optionFilterProp="children"
            >
              {tokenList.map(token => (
                <Option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </Option>
              ))}
            </Select>
          </Card>
        </Row>
        <Row justify="center" align="middle">
          {/* {priceDescription ? priceWidget : null} */}
        </Row>
        <Row justify="center" align="middle">
          <Space>
            {inputIsToken ? (
              <Button size="large" loading={approving} disabled={!insufficientAllowance} onClick={approveToken}>
                {!insufficientAllowance && amountIn && amountOut ? "Approved" : "Approve"}
              </Button>
            ) : null}
            <Button
              size="large"
              loading={swapping}
              disabled={insufficientAllowance || insufficientBalance || !amountIn || !amountOut}
              onClick={showSwapModal}
            >
              {insufficientBalance ? "Insufficient balance" : "Swap!"}
            </Button>
            {swapModal}
          </Space>
        </Row>
      </Space>
      <Drawer
        visible={settingsVisible}
        onClose={() => {
          setSettingsVisible(false);
        }}
        width={500}
      >
        <Descriptions title="Details" column={1} style={{ textAlign: "left" }}>
          <Descriptions.Item label="futurePlace">Future place for settings</Descriptions.Item>
        </Descriptions>
      </Drawer>
    </Card>
  );
}

export default DexSwapper;
