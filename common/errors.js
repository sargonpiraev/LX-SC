const errorScope = {
    boardController: 11000,
    erc20library: 12000,
    jobcontroller: 13000,
    roles2libraryanderc20library: 14000,
    paymentgateway: 15000,
    paymentprocessor: 16000,
}

const errorCodes = {

    UNAUTHORIZED: 0,
    OK: 1,

    BOARD_CONTROLLER_JOB_IS_ALREADY_BINDED: errorScope.boardController + 1,
    BOARD_CONTROLLER_USER_IS_ALREADY_BINDED: errorScope.boardController + 2,
    BOARD_CONTROLLER_BOARD_IS_CLOSED: errorScope.boardController + 3,

    ERC20_LIBRARY_CONTRACT_EXISTS: errorScope.erc20library + 1,
    ERC20_LIBRARY_CONTRACT_DOES_NOT_EXIST: errorScope.erc20library + 2,

    JOB_CONTROLLER_INVALID_ESTIMATE: errorScope.jobcontroller + 1,
    JOB_CONTROLLER_INVALID_SKILLS: errorScope.jobcontroller + 2,
    JOB_CONTROLLER_INVALID_STATE: errorScope.jobcontroller + 3,
    JOB_CONTROLLER_WORKER_RATE_NOT_SET: errorScope.jobcontroller + 4,
    JOB_CONTROLLER_WORK_IS_ALREADY_PAUSED: errorScope.jobcontroller + 5,
    JOB_CONTROLLER_WORK_IS_NOT_PAUSED: errorScope.jobcontroller + 6,

    ROLES_2_LIBRARY_AND_ERC20_LIBRARY_ADAPTER_UNSUPPORTED_CONTRACT: errorScope.roles2libraryanderc20library + 1,

    PAYMENT_GATEWAY_INSUFFICIENT_BALANCE: errorScope.paymentgateway + 1,
    PAYMENT_GATEWAY_TRANSFER_FAILED: errorScope.paymentgateway + 2,
    PAYMENT_GATEWAY_NO_FEE_ADDRESS_DESTINATION: errorScope.paymentgateway + 3,

    PAYMENT_PROCESSOR_OPERATION_IS_NOT_APPROVED: errorScope.paymentprocessor + 1,
}

module.exports = errorCodes
