pragma solidity 0.4.8;

// For testing purposes.
contract FakeCoin {
    mapping(address => uint) public balanceOf;
    uint public fee;
    bool public feeFromPayer;

    function mint(address _to, uint _value) {
        balanceOf[_to] += _value;
    }

    function transfer(address _to, uint _value) returns(bool) {
        return transferFrom(msg.sender, _to, _value);
    }

    function transferFrom(address _from, address _to, uint _value) returns(bool) {
        if (balanceOf[_from] < _value) {
            return false;
        }
        balanceOf[_from] -= feeFromPayer ? _value + fee : _value;
        balanceOf[_to] += feeFromPayer ? _value : _value - fee;
        return true;
    }

    function setFee(uint _value) {
        fee = _value;
    }

    function setFeeFromPayer() {
        feeFromPayer = true;
    }
}
