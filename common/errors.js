const errorScope = {
    boardController: 11000,
}

const errorCodes = {

    BOARD_CONTROLLER_JOB_IS_ALREADY_BINDED: errorScope.boardController + 1,
    BOARD_CONTROLLER_USER_IS_ALREADY_BINDED: errorScope.boardController + 2,
    BOARD_CONTROLLER_BOARD_IS_CLOSED: errorScope.boardController + 3,
}

module.exports = errorCodes
