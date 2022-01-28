pragma solidity >=0.8.0 <0.9.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./KoyweToken.sol";

contract KoyweVendor is Ownable{

  KoyweToken koyweToken;
  uint256 public tokensPerEth = 50;
  event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
  event SellTokens(address seller, uint256 amountOfETH, uint256 amountOfTokens);

  constructor(address tokenAddress) {
    koyweToken = KoyweToken(tokenAddress);
  }

  function setPrice(uint256 _newPrice) public onlyOwner{
    tokensPerEth = _newPrice;
  }

  function buyTokens() public payable {
    require(msg.value > 0, "Can't buy 0 tokens.");
    require(koyweToken.balanceOf(address(this)) >= tokensPerEth * msg.value, "Vendor doesn't have enough tokens to sell.");
    koyweToken.transfer(msg.sender, tokensPerEth * msg.value);
    emit BuyTokens(msg.sender, msg.value, tokensPerEth * msg.value);
  }

  function withdraw() public onlyOwner {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Failed to send Ether");
  }
  
  // ToDo: create a sellTokens() function:
  function sellTokens(uint256 amount) public {
    require(amount > 0, "Can't sell 0 tokens.");
    require(koyweToken.balanceOf(address(msg.sender)) >= amount, "You don't have enough tokens to sell.");
    require(address(this).balance >= amount / tokensPerEth, "Vendor ran out of ETH to buy tokens.");
    (bool success, ) = msg.sender.call{value: amount / tokensPerEth}("");
    require(success, "Failed to send Ether");
    koyweToken.transferFrom(msg.sender, address(this), amount);
    emit SellTokens(msg.sender, amount / tokensPerEth, amount);
  }
}
