pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol"; 
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

contract Dex {
  using SafeMath for uint256;
  IERC20 token;

  uint256 public totalLiquidity;
  mapping (address => uint256) public liquidity;

  event SwapTokens(address swapper, string trade, uint256 amountIn, uint256 amountOut);
  event DepositLiquidity(address lp, uint256 liquidityMinted, uint256 ehtIn, uint256 tokenIn);
  event WithdrawLiquidity(address withdrawer, uint256 liquidityWithdrawn, uint256 ehtOut, uint256 tokenOut);

  constructor (address _token_addr) {
    token = IERC20(_token_addr);
  }

  function init(uint256 tokens) public payable returns (uint256) {
    require(totalLiquidity==0,"DEX:init - already has liquidity");
    totalLiquidity = address(this).balance;
    liquidity[msg.sender] = totalLiquidity;
    require(token.transferFrom(msg.sender, address(this), tokens));
    return totalLiquidity;
  }
  
  function price(uint256 input_amount, uint256 input_reserve, uint256 output_reserve) public pure returns (uint256) {
    uint256 input_amount_with_fee = input_amount.mul(997);
    uint256 numerator = input_amount_with_fee.mul(output_reserve);
    uint256 denominator = input_reserve.mul(1000).add(input_amount_with_fee);
    return numerator / denominator;
  }

  function ethToToken() public payable returns (uint256) {
    uint256 token_reserve = token.balanceOf(address(this));
    uint256 tokens_bought = price(msg.value, address(this).balance.sub(msg.value), token_reserve);
    require(token.transfer(msg.sender, tokens_bought));
    emit SwapTokens(msg.sender, "ETH to KOY", msg.value, tokens_bought);
    return tokens_bought;
  }

  function tokenToEth(uint256 tokens) public returns (uint256) {
    uint256 token_reserve = token.balanceOf(address(this));
    uint256 eth_bought = price(tokens, token_reserve, address(this).balance);
    (bool success, ) = msg.sender.call{value: eth_bought}("");
    require(success, "Failed to send Ether");
    require(token.transferFrom(msg.sender, address(this), tokens));
    emit SwapTokens(msg.sender, "KOY to ETH", tokens, eth_bought);
    return eth_bought;
  }

  function deposit() public payable returns (uint256) {
    uint256 eth_reserve = address(this).balance.sub(msg.value);
    uint256 token_reserve = token.balanceOf(address(this));
    uint256 token_amount = (msg.value.mul(token_reserve) / eth_reserve).add(1);
    uint256 liquidity_minted = msg.value.mul(totalLiquidity) / eth_reserve;
    liquidity[msg.sender] = liquidity[msg.sender].add(liquidity_minted);
    totalLiquidity = totalLiquidity.add(liquidity_minted);
    require(token.transferFrom(msg.sender, address(this), token_amount));
    emit DepositLiquidity(msg.sender, liquidity_minted, msg.value, token_amount);
    return liquidity_minted;
  }

  function getAllowanceDeposit(uint256 amount) public view returns (uint256) {
    uint256 eth_reserve = address(this).balance;
    uint256 token_reserve = token.balanceOf(address(this));
    uint256 token_amount = (amount.mul(token_reserve) / eth_reserve).add(1);
    return token_amount;
  }

  function withdraw(uint256 amount) public returns (uint256, uint256) {
    require(liquidity[msg.sender]>=amount,"Sender does not have enough liquidity to withdraw.");
    uint256 token_reserve = token.balanceOf(address(this));
    uint256 eth_amount = amount.mul(address(this).balance) / totalLiquidity;
    uint256 token_amount = amount.mul(token_reserve) / totalLiquidity;
    liquidity[msg.sender] = liquidity[msg.sender].sub(amount);
    totalLiquidity = totalLiquidity.sub(amount);
    (bool success, ) = msg.sender.call{value: eth_amount}("");
    require(success, "Failed to send Ether");
    require(token.transfer(msg.sender, token_amount));
    emit WithdrawLiquidity(msg.sender, amount, eth_amount, token_amount);
    return (eth_amount, token_amount);
  }
}
