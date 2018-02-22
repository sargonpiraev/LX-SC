const errorScope = {
    boardController: 11000,
    erc20library: 12000,
}

const errorCodes = {

    BOARD_CONTROLLER_JOB_IS_ALREADY_BINDED: errorScope.boardController + 1,
    BOARD_CONTROLLER_USER_IS_ALREADY_BINDED: errorScope.boardController + 2,
    BOARD_CONTROLLER_BOARD_IS_CLOSED: errorScope.boardController + 3,

    ERC20_LIBRARY_CONTRACT_EXISTS: errorScope.erc20library + 1,
    ERC20_LIBRARY_CONTRACT_DOES_NOT_EXIST: errorScope.erc20library + 2,
}

module.exports = errorCodes
