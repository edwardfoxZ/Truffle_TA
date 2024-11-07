// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Faucet {
    uint public userFunders;
    uint public userDonators;

    // Modifier to limit withdraw amount to a max of 0.1 ETH
    modifier limitedAmount(uint _amount) {
        require(_amount <= 0.1 ether, "The withdraw amount must be less than or equal to 0.1 ETH!");
        _;
    } 

    // Events
    event Donate(address indexed _addr, uint _amount);

    mapping(uint => address) private funders;
    mapping(uint => address) private donators;

    // Function for users to add funds
    function addFunds() public payable {
        uint index = userFunders++;
        funders[index] = msg.sender;
    }

    // Function for users to donate a specified amount
    function donate(uint _amount) public payable {
        require(msg.value >= _amount, "Sent value does not match the specified amount.");
        require(_amount >= 0.001 ether, "Your donation must be greater than 0.001 ETH!");

        uint index = userDonators++;
        donators[index] = msg.sender;

        emit Donate(msg.sender, _amount);
    }

    // Function to withdraw funds with limited withdrawal amount
    function withdraw(uint _withdrawAmount) public limitedAmount(_withdrawAmount) {
        require(address(this).balance >= _withdrawAmount, "Insufficient contract balance");
        payable(msg.sender).transfer(_withdrawAmount);
    }

    // Get the address of a funder by index
    function getFunder(uint _index) public view returns(address) {
        require(_index < userFunders, "Funder out of bounds");
        return funders[_index];
    }

    // Get the address of a donator by index
    function getDonator(uint _index) public view returns(address) {
        require(_index < userDonators, "Donator out of bounds");
        return donators[_index];
    }
}
