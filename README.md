# LX-SC

# Installation

**NodeJS 6.x+ must be installed as a prerequisite.**
```
$ npm install
```

# Running tests

```
$ npm run testrpc
$ npm run test:all
```

# Structure

Smart contracts by their purpose are divided into several groups:

- [maintenance](#maintenance-contracts) - used to provide security functions, provide centralized access to resources and so on;
- [controllers](#controller-contracts) - define algorithms of how to manage different interactions between entities;
- [user management](#user-management-contracts) - provides a way to incapsulate different roles into the system;
- [payment-related](#payment-related-contracts) - define a flow of locking/releasing user balances during different actions;
- [helpers](#helper-contracts) - used to provide a support for other contracts/external systems, get an additional information.

## Maintenance contracts

#### [Roles2Library](https://github.com/ChronoBank/LX-SC/blob/master/contracts/Roles2Library.sol)

Managers roles inside the system; provides a tool to configure ACL based on roles. Across the system this library provides authorization for functions that could be protected by different roles.

#### [ContractsManager](https://github.com/ChronoBank/LX-SC/blob/master/contracts/ContractsManager.sol)

Registry that holds main contracts of the system. A user could get registered contract by associated key.

#### [MultiEventsHistory](https://github.com/ChronoBank/LX-SC/blob/master/contracts/MultiEventsHistory.sol)

Provides proxy gateway for system's events. Could filter/reject/accept events from any source.

#### [Storage](https://github.com/ChronoBank/LX-SC/blob/master/contracts/Storage.sol)

Contract that could keep its state in layout-independent way storing them in key:value manner. Every big or complex contract inherits from it.

#### [StorageManager](https://github.com/ChronoBank/LX-SC/blob/master/contracts/StorageManager.sol)

Manages read/write access into contracts' storage that inherits from Storage contract. Provides a way to divide common Storage into different sections (crates) and protects from unauthorized access.

#### [SkillsLibrary](https://github.com/ChronoBank/LX-SC/blob/master/contracts/SkillsLibrary.sol)

Database, provides functionality for managing user's skills, categories and areas. Stores allowed skills, areas, categories and their descriptions. Access to skills data, categories and areas of the system.


## Controller contracts

#### [BoardController](https://github.com/ChronoBank/LX-SC/blob/master/contracts/BoardController.sol)

Organizes boards that could join clients and jobs into separate spaces. Allows to create boards and manage jobs' and users' binding.

#### [JobController](https://github.com/ChronoBank/LX-SC/blob/master/contracts/JobController.sol)

Provides different flows of how a client could create a job, find a worker, negotiate, track and finish a job. JobController also provides instruments for workers to find a job, apply for it, do something and be rewarded. Create job market.


## User Management contracts

#### [RatingsAndReputationLibrary](https://github.com/ChronoBank/LX-SC/blob/master/contracts/RatingsAndReputationLibrary.sol)

Provides functionality of feedback from workers and clients. Helps to find more reliable positions in the future. Feedback after work was done.

#### [UserLibrary](https://github.com/ChronoBank/LX-SC/blob/master/contracts/UserLibrary.sol)

Holds users' data about their skills, areas and categories. Used by UserFactory or separately by authorized user.

#### [UserFactory](https://github.com/ChronoBank/LX-SC/blob/master/contracts/UserFactory.sol)

Factory to create a new users. Entry point in registration flow. Creates users with defined set of skills in specific areas and categories.

#### [UserProxy](https://github.com/ChronoBank/LX-SC/blob/master/contracts/UserProxy.sol)

Contract that will be created after user registration and that will be associated with skills, areas, categories. Proxy contract, any action should performed by calling forward function by User contract.

#### [User](https://github.com/ChronoBank/LX-SC/blob/master/contracts/User.sol)

Contract that a user after registration should interact with to perform actions with JobController and BoardController. Facade to interact with the system.

#### [Recovery](https://github.com/ChronoBank/LX-SC/blob/master/contracts/Recovery.sol)

Provides functionality to recover an access to a registered user when a user had lost his control over original account. Allows to recover control over a User contract.


## Payment-related contracts

#### [BalanceHolder](https://github.com/ChronoBank/LX-SC/blob/master/contracts/BalanceHolder.sol)

Holds balances of participants and allows to withdraw only for holders. Used by PaymentGateway as a wallet.

#### [PaymentGateway](https://github.com/ChronoBank/LX-SC/blob/master/contracts/PaymentGateway.sol)

Performs transfers between different accounts (client, worker, job), setup fees for transactions. Used by PaymentProcessor.

#### [PaymentProcessor](https://github.com/ChronoBank/LX-SC/blob/master/contracts/PaymentProcessor.sol)

High-order contract to manipulate balances of users. Able to lock balances and release them after specific actions. Could be turned into maintenance state that will not allow any payments except accepted one. Used by JobController to perform payments.


## Helper contracts

#### [JobsDataProvider](https://github.com/ChronoBank/LX-SC/blob/master/contracts/JobsDataProvider.sol)

Read-only contract, provides getters for JobController state


# Contract Interactions Diagram

![Contract Interactions][contract_interactions]

[contract_interactions]: ./docs/contract_interactions.png
