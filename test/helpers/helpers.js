module.exports = {
  getSig: (callData) => web3.sha3(callData).slice(0, 10),
}
