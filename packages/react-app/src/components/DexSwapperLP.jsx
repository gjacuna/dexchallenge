import { RetweetOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  InputNumber,
  Input,
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
import { Balance, TokenBalance } from "../components";
import { BigNumber, ethers } from "ethers";
import {
  useBalance,
  useContractReader,
  usePoller
} from "eth-hooks";

function DexSwapperLP({ localProvider, readContracts, writeContracts, address, tx }) {
  
  const lpPosition = useContractReader(readContracts, "Dex", "getLiquidity", [address]);
  const [ethToDeposit, setEthToDeposit] = useState();
  const [liquidityToWithdraw, setLiquidityToWithdraw] = useState();
  // const [depositAllowanceNeeded, setDepositAllowanceNeeded] = useState();
  const [isSellAmountApproved, setIsSellAmountApproved] = useState();
  const [depositing, setDepositing] = useState();
  const [withdrawing, setWithdrawing] = useState();

  const balanceETH = useBalance(localProvider, address);
  const balanceToken = useContractReader(readContracts, "KoyweToken", "balanceOf", [address]);
  
  const dexAddress = readContracts && readContracts.Dex ? readContracts.Dex.address : null;
  const contractTokenBalance = useContractReader(readContracts, "KoyweToken", "balanceOf", [dexAddress]);
  const contractEthBalance = useBalance(localProvider, dexAddress);
  const contractTotalLiquidity = useContractReader(readContracts, "Dex", "totalLiquidity", []);;
  const tokenAllowance = useContractReader(readContracts, "KoyweToken", "allowance", [address,dexAddress]);

  const getDepositAllowance = (inputAmount) =>
  {
    if(contractEthBalance && contractTokenBalance){
      const bigInput = BigNumber.from(ethers.utils.parseEther(inputAmount));
      const allowance = bigInput.mul(contractTokenBalance).div(contractEthBalance).add(1);
      console.log(allowance.toString());
      return ethers.utils.formatEther(allowance);
    }
  };

  const getWihdrawToken = (inputAmount) =>
  {
    if(contractEthBalance && contractTokenBalance && contractTotalLiquidity){
      const bigInput = BigNumber.from(ethers.utils.parseEther(inputAmount));
      const tokenAmount = bigInput.mul(contractTokenBalance).div(contractTotalLiquidity);
      console.log(tokenAmount.toString());
      return ethers.utils.formatEther(tokenAmount);
    }
  };

  const depositAllowanceNeeded = ethToDeposit && getDepositAllowance(ethToDeposit);

  useEffect(()=>{
    const depositAllowanceNeededBN = depositAllowanceNeeded && ethers.utils.parseEther("" + depositAllowanceNeeded)
    setIsSellAmountApproved(tokenAllowance && depositAllowanceNeeded && tokenAllowance.gte(depositAllowanceNeededBN))
  },[depositAllowanceNeeded, readContracts])

  return (
    <div>
      <div style={{ width: 500, margin: "auto"}}>
          <h1 style={{ padding: 8, marginTop: 32 }}>Liquidity Parntners Only</h1>
          <p>So, you wanna be a partner or just want to check your holdings.</p>
          <p>This is the right place!</p>
          <p>Deposit or Withdraw your liquidity, try to game the <i>evil</i> Vendor.</p>
          <p>To <b>deposit</b>, input the ETH amount. We'll automagically take care of the Token amount and approval.</p>
          <p>To <b>withdraw</b>, input your liquidity amount. Be careful not to put more!</p>
      </div>
      <h2>TVL</h2>
      <h3>Total Liquidity:<TokenBalance balance={contractTotalLiquidity} /> | KOY:<TokenBalance balance={contractTokenBalance} /> | ETH:<TokenBalance balance={contractEthBalance} /></h3>
      <h3>Your Current Liquidity: <TokenBalance balance={lpPosition} /></h3>
      <Space>
        <div style={{ padding: 8, marginTop: 32, width: 300, margin: "auto" }}>
          <Card title="Add Liquidity">
            
            <div style={{ padding: 8 }}>
              <Input
                style={{ textAlign: "center" }}
                placeholder={"ETH to deposit"}
                value={ethToDeposit}
                onChange={e => {
                  setEthToDeposit(e.target.value);
                }}
              />
              Koywe Tokens to Deposit: <TokenBalance balance={depositAllowanceNeeded && ethers.utils.parseEther(depositAllowanceNeeded)} />
            </div>
            {isSellAmountApproved?

              <div style={{ padding: 8 }}>
                <Button
                  type={"primary"}
                  loading={depositing}
                  onClick={async () => {
                    setDepositing(true);
                    await tx(writeContracts.Dex.deposit({ value: ethers.utils.parseEther(ethToDeposit) }));
                    setDepositing(false);
                  }}
                >
                  Deposit Liquidity
                </Button>
              </div>
              :
              <div style={{ padding: 8 }}>
                <Button
                  type={"primary"}
                  loading={depositing}
                  onClick={async () => {
                    setDepositing(true);
                    await tx(writeContracts.KoyweToken.approve(dexAddress, depositAllowanceNeeded && ethers.utils.parseEther(depositAllowanceNeeded)));
                    setDepositing(false);
                  }}
                >
                  Approve Koywe Tokens
                </Button>
              </div>
            }
          </Card>
        </div>
        <div style={{ padding: 8, marginTop: 32, width: 300, margin: "auto" }}>
          <Card title="Withdraw Liquidity" >
            <div style={{ padding: 8 }}>
              <Input
                style={{ textAlign: "center" }}
                placeholder={"Liquidity to Withdraw"}
                value={liquidityToWithdraw}
                onChange={e => {
                  setLiquidityToWithdraw(e.target.value);
                }}
              />
              Koywe Tokens to Receive <TokenBalance balance={liquidityToWithdraw && ethers.utils.parseEther(getWihdrawToken(liquidityToWithdraw))} />
            </div>
            <div style={{ padding: 8 }}>
              <Button
                type={"primary"}
                loading={withdrawing}
                onClick={async () => {
                  setWithdrawing(true);
                  await tx(writeContracts.Dex.withdraw(liquidityToWithdraw && ethers.utils.parseEther(liquidityToWithdraw)));
                  setWithdrawing(false);
                }}
              >
                Withdraw Liquidity
              </Button>
            </div>
          </Card>
        </div>
      </Space>
    </div>
  );
}

export default DexSwapperLP;
