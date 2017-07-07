pragma solidity 0.4.8;

import './Roles2LibraryAdapter.sol';
import './StorageAdapter.sol';
import './MultiEventsHistoryAdapter.sol';

contract UserLibraryInterface {
    function hasSkills(address _user, uint _area, uint _category, uint _skills) constant returns(bool);
}

contract PaymentProcessorInterface {
    function lockPayment(bytes32 _operationId, address _from, uint _value, address _contract) returns(bool);
    function releasePayment(bytes32 _operationId, address _to, uint _value, address _change, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
}

contract JobController is StorageAdapter, MultiEventsHistoryAdapter, Roles2LibraryAdapter {
    PaymentProcessorInterface public paymentProcessor;
    UserLibraryInterface public userLibrary;
    StorageInterface.UIntAddressMapping jobClient;
    StorageInterface.UIntUIntMapping jobSkillsArea;
    StorageInterface.UIntUIntMapping jobSkillsCategory;
    StorageInterface.UIntUIntMapping jobSkills;
    StorageInterface.UIntBytes32Mapping jobDetailsIPFSHash;
    StorageInterface.UInt jobsCount;
    StorageInterface.UIntAddressAddressMapping jobOfferERC20Contract; // Paid with.
    StorageInterface.UIntAddressUIntMapping jobOfferRate; // Per minute.
    StorageInterface.UIntAddressUIntMapping jobOfferEstimate; // In minutes.
    StorageInterface.UIntAddressUIntMapping jobOfferOntop; // Getting to the workplace, etc.
    StorageInterface.UIntAddressMapping jobWorker;
    StorageInterface.UIntUIntMapping jobState;
    StorageInterface.UIntUIntMapping jobStartTime;
    StorageInterface.UIntUIntMapping jobFinishTime;

    StorageInterface.UIntUIntMapping jobAdditionalRequestedTime;

    StorageInterface.UIntBoolMapping jobPaused;
    StorageInterface.UIntUIntMapping jobPausedAt;
    StorageInterface.UIntUIntMapping jobPausedFor;


    enum JobState { NOT_SET, CREATED, ACCEPTED, PENDING_START, STARTED, PENDING_FINISH, FINISHED, FINALIZED }

    event JobPosted(address indexed self, uint indexed jobId, address client, uint skillsArea, uint skillsCategory, uint skills, bytes32 detailsIPFSHash);

    modifier onlyClient(uint _jobId) {
        if (store.get(jobClient, _jobId) != msg.sender) {
            return;
        }
        _;
    }

    modifier onlyWorker(uint _jobId) {
        if (store.get(jobWorker, _jobId) != msg.sender) {
            return;
        }
        _;
    }

    modifier onlyJobState(uint _jobId, JobState _jobState) {
        if (store.get(jobState, _jobId) != uint(_jobState)) {
            return;
        }
        _;
    }

    function JobController(Storage _store, bytes32 _crate, address _roles2Library)
        StorageAdapter(_store, _crate)
        Roles2LibraryAdapter(_roles2Library)
    {
        jobClient.init('jobClient');
        jobSkillsArea.init('jobSkillsArea');
        jobSkillsCategory.init('jobSkillsCategory');
        jobSkills.init('jobSkills');
        jobDetailsIPFSHash.init('jobDetailsIPFSHash');
        jobsCount.init('jobsCount');
        jobOfferERC20Contract.init('jobOfferERC20Contract');
        jobOfferRate.init('jobOfferRate');
        jobOfferEstimate.init('jobOfferEstimate');
        jobOfferOntop.init('jobOfferOntop');
        jobWorker.init('jobWorker');
        jobState.init('jobState');
        jobStartTime.init('jobStartTime');
        jobFinishTime.init('jobFinishTime');

        jobAdditionalRequestedTime.init('jobAdditionalRequestedTime');

        jobPaused.init('jobPaused');
        jobPausedAt.init('jobPausedAt');
        jobPausedFor.init('jobPausedFor');
    }

    function setupEventsHistory(address _eventsHistory) auth() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setPaymentProcessor(PaymentProcessorInterface _paymentProcessor) auth() returns(bool) {
        paymentProcessor = _paymentProcessor;
        return true;
    }

    function setUserLibrary(UserLibraryInterface _userLibrary) auth() returns(bool) {
        userLibrary = _userLibrary;
        return true;
    }


    function calculateLockAmount(uint _jobId) constant returns(uint) {
        address worker = store.get(jobWorker, _jobId);
        // Lock additional 10%, and additional working hour.
        return
            (
                (
                    store.get(jobOfferRate, _jobId, worker) * (60 + store.get(jobOfferEstimate, _jobId, worker)) +
                    store.get(jobOfferOntop, _jobId, worker)
                ) * 11
            ) / 10;
    }

    function calculatePaycheck(uint _jobId) constant returns(uint) {
        address worker = store.get(jobWorker, _jobId);
        return (store.get(jobFinishTime, _jobId) - store.get(jobStartTime, _jobId) - store.get(jobPausedFor, _jobId)) *
        store.get(jobOfferRate, _jobId, worker) / 60 +
        store.get(jobOfferOntop, _jobId, worker);
    }


    function postJob(uint _area, uint _category, uint _skills, bytes32 _detailsIPFSHash) returns(uint) {
        uint jobId = store.get(jobsCount) + 1;
        store.set(jobsCount, jobId);
        store.set(jobClient, jobId, msg.sender);
        store.set(jobSkillsArea, jobId, _area);
        store.set(jobSkillsCategory, jobId, _category);
        store.set(jobSkills, jobId, _skills);
        store.set(jobDetailsIPFSHash, jobId, _detailsIPFSHash);
        store.set(jobState, jobId, uint(JobState.CREATED));
        _emitJobPosted(jobId, msg.sender, _area, _category, _skills, _detailsIPFSHash);
        return jobId;
    }

    function postJobOffer(uint _jobId, address _erc20Contract, uint _rate, uint _estimate, uint _ontop)
        onlyJobState(_jobId, JobState.CREATED)
    returns(bool) {
        if (_rate == 0 || _estimate == 0) {
            return false;
        }
        if (!userLibrary.hasSkills(
                msg.sender,
                store.get(jobSkillsArea, _jobId),
                store.get(jobSkillsCategory, _jobId),
                store.get(jobSkills, _jobId)
            )
        ) {
            return false;
        }
        store.set(jobOfferERC20Contract, _jobId, msg.sender, _erc20Contract);
        store.set(jobOfferRate, _jobId, msg.sender, _rate);
        store.set(jobOfferEstimate, _jobId, msg.sender, _estimate);
        store.set(jobOfferOntop, _jobId, msg.sender, _ontop);
        return true;
    }

    function acceptOffer(uint _jobId, address _worker) onlyJobState(_jobId, JobState.CREATED) onlyClient(_jobId) returns(bool) {
        if (store.get(jobOfferRate, _jobId, _worker) == 0) {
            return false;
        }
        if (!paymentProcessor.lockPayment(
                bytes32(_jobId),
                msg.sender,
                calculateLockAmount(_jobId),
                store.get(jobOfferERC20Contract, _jobId, _worker)
            )
        ) {
            return false;
        }
        // Maybe incentivize by locking some money from worker?
        store.set(jobWorker, _jobId, _worker);
        store.set(jobState, _jobId, uint(JobState.ACCEPTED));
        return true;
    }


    function startWork(uint _jobId) onlyJobState(_jobId, JobState.ACCEPTED) onlyWorker(_jobId) returns(bool) {
        store.set(jobState, _jobId, uint(JobState.PENDING_START));
        return true;
    }

    function confirmStartWork(uint _jobId) onlyJobState(_jobId, JobState.PENDING_START) onlyClient(_jobId) returns(bool) {
        store.set(jobState, _jobId, uint(JobState.STARTED));
        store.set(jobStartTime, _jobId, now);
        return true;
    }


    function pauseWork(uint _jobId) onlyJobState(_jobId, JobState.STARTED) onlyWorker(_jobId) returns(bool) {
        if (store.get(jobPaused, _jobId)) {
            return false;
        }
        store.set(jobPaused, _jobId, true);
        store.set(jobPausedAt, _jobId, now);
        // Pause event
        return true;
    }

    function resumeWork(uint _jobId) onlyJobState(_jobId, JobState.STARTED) onlyWorker(_jobId) returns(bool) {
        return _resumeWork(_jobId);
    }

    function _resumeWork(uint _jobId) internal returns(bool) {
        if (!store.get(jobPaused, _jobId)) {
            return false;
        }
        store.set(jobPausedFor, _jobId, store.get(jobPausedFor, _jobId) + (now - store.get(jobPausedAt, _jobId)));
        store.set(jobPaused, _jobId, false);
        // Resume event
        return true;
    }


    function requestMoreTime(uint _jobId, uint _minutes, bool _pauseNeeded)
        onlyJobState(_jobId, JobState.STARTED)
        onlyWorker(_jobId)
    returns(bool) {
        if (store.get(jobAdditionalRequestedTime, _jobId) > 0 || _minutes > store.get(jobOfferEstimate, _jobId, msg.sender)) {
            return false;
        }
        if (_pauseNeeded) {
            pauseWork(_jobId);
        }
        store.set(jobAdditionalRequestedTime, _jobId, _minutes);
        // Request more time event
        return true;
    }

    function confirmMoreTime(uint _jobId) onlyJobState(_jobId, JobState.STARTED) onlyClient(_jobId) returns(bool) {
        if (store.get(jobAdditionalRequestedTime, _jobId) == 0) {
            return false;
        }
        _resumeWork(_jobId);

        uint jobPaymentLocked = calculateLockAmount(_jobId);
        store.set(
            jobOfferEstimate,
            _jobId,
            store.get(jobWorker, _jobId),
            store.get(jobOfferEstimate, _jobId, store.get(jobWorker, _jobId)) + store.get(jobAdditionalRequestedTime, _jobId)
        );
        store.set(jobAdditionalRequestedTime, _jobId, 0);

        if (!paymentProcessor.lockPayment(
                bytes32(_jobId),
                msg.sender,
                calculateLockAmount(_jobId) - jobPaymentLocked,
                store.get(jobOfferERC20Contract, _jobId, store.get(jobWorker, _jobId))
            )
        ) {
            throw;
        }
        // Confirm more time event
        return true;
    }


    function endWork(uint _jobId) onlyJobState(_jobId, JobState.STARTED) onlyWorker(_jobId) returns(bool) {
        _resumeWork(_jobId);  // In case worker have forgotten about paused timer
        store.set(jobState, _jobId, uint(JobState.PENDING_FINISH));
        return true;
    }

    function confirmEndWork(uint _jobId) onlyJobState(_jobId, JobState.PENDING_FINISH) onlyClient(_jobId) returns(bool) {
        store.set(jobState, _jobId, uint(JobState.FINISHED));
        store.set(jobFinishTime, _jobId, now);
        return true;
    }


    function releasePayment(uint _jobId) onlyJobState(_jobId, JobState.FINISHED) returns(bool) {
        uint payCheck = calculatePaycheck(_jobId);
        address worker = store.get(jobWorker, _jobId);
        if (!paymentProcessor.releasePayment(
            bytes32(_jobId),
            worker,
            payCheck,
            store.get(jobClient, _jobId),
            payCheck,
            0,
            store.get(jobOfferERC20Contract, _jobId, worker)
            )
        ) {
            return false;
        }
        store.set(jobState, _jobId, uint(JobState.FINALIZED));
        return true;
    }


    function getJobClient(uint _jobId) constant returns(address) {
        return store.get(jobClient, _jobId);
    }

    function getJobWorker(uint _jobId) constant returns(address) {
        return store.get(jobWorker, _jobId);
    }

    function getJobSkillsArea(uint _jobId) constant returns(uint) {
        return store.get(jobSkillsArea, _jobId);
    }

    function getJobSkillsCategory(uint _jobId) constant returns(uint) {
        return store.get(jobSkillsCategory, _jobId);
    }

    function getJobSkills(uint _jobId) constant returns(uint) {
        return store.get(jobSkills, _jobId);
    }

    function getJobDetailsIPFSHash(uint _jobId) constant returns(bytes32) {
        return store.get(jobDetailsIPFSHash, _jobId);
    }

    function getJobState(uint _jobId) constant returns(uint) {
        return uint(store.get(jobState, _jobId));
    }

    function _emitJobPosted(uint _jobId, address _client, uint _skillsArea, uint _skillsCategory, uint _skills, bytes32 _detailsIPFSHash) internal {
        JobController(getEventsHistory()).emitJobPosted(_jobId, _client, _skillsArea, _skillsCategory, _skills, _detailsIPFSHash);
    }

    function emitJobPosted(uint _jobId, address _client, uint _skillsArea, uint _skillsCategory, uint _skills, bytes32 _detailsIPFSHash) {
        JobPosted(_self(), _jobId, _client, _skillsArea, _skillsCategory, _skills, _detailsIPFSHash);
    }
}
