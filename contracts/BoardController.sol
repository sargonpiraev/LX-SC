/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 */

pragma solidity ^0.4.18;


import './adapters/StorageAdapter.sol';
import './adapters/MultiEventsHistoryAdapter.sol';
import './adapters/Roles2LibraryAdapter.sol';
import './base/BitOps.sol';


contract BoardController is StorageAdapter, MultiEventsHistoryAdapter, Roles2LibraryAdapter, BitOps {

    uint constant BOARD_CONTROLLER_SCOPE = 11000;
    uint constant BOARD_CONTROLLER_JOB_IS_ALREADY_BINDED = BOARD_CONTROLLER_SCOPE + 1;
    uint constant BOARD_CONTROLLER_USER_IS_ALREADY_BINDED = BOARD_CONTROLLER_SCOPE + 2;
    uint constant BOARD_CONTROLLER_BOARD_IS_CLOSED = BOARD_CONTROLLER_SCOPE + 3;

    /* struct Board {
        uint boardId;
        bytes32 name;
        bytes32 boardDescription;
        address creator;
        uint boardTags;
        uint boardTagsArea;
        uint boardTagsCategory;
        bool status;
    } */

    event BoardCreated(
        address indexed self,
        uint indexed boardId,
        bytes32 name,
        bytes32 boardDescription,
        address creator,
        uint boardTags,
        uint boardTagsArea,
        uint boardTagsCategory,
        bytes32 boardIpfsHash,
        bool status
    );
    event JobBinded(address indexed self, uint indexed boardId, uint jobId, bool status);
    event UserBinded(address indexed self, uint indexed boardId, address user, bool status);
    event BoardClosed(address indexed self, uint indexed boardId, bool status);

    StorageInterface.UInt boardsCount;

    StorageInterface.UIntAddressMapping boardCreator;
    StorageInterface.UIntBytes32Mapping boardDescription;
    StorageInterface.UIntBytes32Mapping boardIpfsHash;
    StorageInterface.UIntBytes32Mapping boardName;

    StorageInterface.UIntUIntMapping boardTagsArea;
    StorageInterface.UIntUIntMapping boardTagsCategory;
    StorageInterface.UIntUIntMapping boardTags;

    StorageInterface.UIntBoolMapping boardStatus;
    StorageInterface.UIntUIntBoolMapping jobBinding;
    StorageInterface.UIntUIntMapping jobsBoard;
    StorageInterface.UintAddressBoolMapping userBinding;

    modifier notBindedJobYet(uint _boardId, uint _jobId) {
        if (store.get(jobsBoard, _jobId) != 0) {
            uint _resultCode = _emitErrorCode(BOARD_CONTROLLER_JOB_IS_ALREADY_BINDED);
            assembly {
                mstore(0, _resultCode)
                return(0, 32)
            }
        }
        _;
    }

    modifier notBindedUserYet(uint _boardId, address _user) {
        if (store.get(userBinding, _boardId, _user) == true) {
            uint _resultCode = _emitErrorCode(BOARD_CONTROLLER_USER_IS_ALREADY_BINDED);
            assembly {
                mstore(0, _resultCode)
                return(0, 32)
            }
        }
        _;
    }

    modifier notClosed(uint _boardId) {
        if (store.get(boardStatus, _boardId) == false) {
            uint _resultCode = _emitErrorCode(BOARD_CONTROLLER_BOARD_IS_CLOSED);
            assembly {
                mstore(0, _resultCode)
                return(0, 32)
            }
        }
        _;
    }

    function BoardController(
        Storage _store,
        bytes32 _crate,
        address _roles2Library
    )
    StorageAdapter(_store, _crate)
    Roles2LibraryAdapter(_roles2Library)
    public
    {
        boardsCount.init('boardsCount');

        boardDescription.init('boardDescription');
        boardCreator.init('boardCreator');
        boardName.init('boardName');

        boardTagsArea.init('boardTagsArea');
        boardTagsCategory.init('boardTagsCategory');
        boardTags.init('boardTags');

        jobBinding.init('jobBinding');
        jobsBoard.init('jobsBoard');
        userBinding.init('userBinding');
        boardStatus.init('boardStatus');
        boardIpfsHash.init("boardIpfsHash");
    }

    function setupEventsHistory(address _eventsHistory) auth external returns (uint) {
        require(_eventsHistory != 0x0);

        _setEventsHistory(_eventsHistory);
        return OK;
    }

    function getBoardsCount() public view returns (uint) {
        return store.get(boardsCount);
    }

    function getBoardStatus(uint _boardId) public view returns (bool) {
        return store.get(boardStatus, _boardId);
    }

    function getJobStatus(uint _boardId, uint _jobId) public view returns (bool) {
        return store.get(jobBinding, _boardId, _jobId);
    }

    function getUserStatus(uint _boardId, address _user) public view returns (bool) {
        return store.get(userBinding, _boardId, _user);
    }

    function getJobsBoard(uint _jobId) public view returns (uint) {
        return store.get(jobsBoard, _jobId);
    }

    function getJobsIpfsHash(uint _jobId) public view returns (bytes32) {
        return store.get(boardIpfsHash, _jobId);
    }

    /* function getBoards(uint _fromId, uint _maxLen, address _bindedUser)
    public
    view
    returns (Board[] boards)
    {
        boards = new Board[](_maxLen);
        for (uint _idx = _fromId; _idx < _fromId + _maxLen; ++_idx) {
            if (_bindedUser == address(0) || getUserStatus(_idx, _bindedUser)) {
                uint boardId = _idx;
                boards[_idx] = Board(boardId,
                                     store.get(boardName, boardId),
                                     store.get(boardDescription, boardId),
                                     store.get(boardCreator, boardId),
                                     store.get(boardTags, boardId),
                                     store.get(boardTagsArea, boardId),
                                     store.get(boardTagsCategory, boardId),
                                     getBoardStatus(boardId));
            }
        }
    } */

    function getBoards(uint _fromId, uint _maxLen, address _bindedUser)
    public
    view
    returns (uint[] ids,
        bytes32[] names,
        bytes32[] descriptions,
        uint[] tags,
        uint[] tagsAreas,
        uint[] tagsCategories,
        bool[] status)
    {
        ids = new uint[](_maxLen);
        names = new bytes32[](_maxLen);
        descriptions = new bytes32[](_maxLen * 2);
        tags = new uint[](_maxLen);
        tagsAreas = new uint[](_maxLen);
        tagsCategories = new uint[](_maxLen);
        status = new bool[](_maxLen);

        uint idx = 0;
        for (uint _id = _fromId; _id < _fromId + _maxLen; ++_id) {
            if (_bindedUser == address(0) || getUserStatus(_id, _bindedUser)) {
                ids[idx] = _id;
                names[idx] = store.get(boardName, _id);
                descriptions[idx * 2] = store.get(boardDescription, _id);
                descriptions[idx * 2 + 1] = store.get(boardIpfsHash, _id);
                tags[idx] = store.get(boardTags, _id);
                tagsAreas[idx] = store.get(boardTagsArea, _id);
                tagsCategories[idx] = store.get(boardTagsCategory, _id);
                status[idx] = getBoardStatus(_id);
                idx++;
            }
        }
    }

    function createBoard(
        bytes32 _name,
        bytes32 _boardDescription,
        uint _tags,
        uint _tagsArea,
        uint _tagsCategory,
        bytes32 _ipfsHash
    )
    auth
    singleOddFlag(_tagsArea)
    singleOddFlag(_tagsCategory)
    hasFlags(_tags)
    external
    returns (uint)
    {
        uint boardId = store.get(boardsCount) + 1;
        store.set(boardsCount, boardId);
        store.set(boardName, boardId, _name);
        store.set(boardCreator, boardId, msg.sender);
        store.set(boardTagsArea, boardId, _tagsArea);
        store.set(boardTagsCategory, boardId, _tagsCategory);
        store.set(boardTags, boardId, _tags);
        store.set(boardStatus, boardId, true);
        store.set(boardDescription, boardId, _boardDescription);
        store.set(boardIpfsHash, boardId, _ipfsHash);
        _emitBoardCreated(boardId, _name, _boardDescription, msg.sender, _tags, _tagsArea, _tagsCategory, _ipfsHash, true);
        return OK;
    }

    function bindJobWithBoard(
        uint _boardId,
        uint _jobId
    )
    notBindedJobYet(_boardId, _jobId)
    notClosed(_boardId)
    public
    returns (uint)
    {
        store.set(jobsBoard, _jobId, _boardId);
        store.set(jobBinding, _boardId, _jobId, true);
        _emitJobBinded(_boardId, _jobId, true);
        return OK;
    }

    function bindUserWithBoard(
        uint _boardId,
        address _user
    )
    notBindedUserYet(_boardId, _user)
    notClosed(_boardId)
    public
    returns (uint)
    {
        store.set(userBinding, _boardId, _user, true);
        _emitUserBinded( _boardId, _user, true);
        return OK;
    }

    function closeBoard(
        uint _boardId
    )
    auth
    notClosed(_boardId)
    external
    returns (uint)
    {
        store.set(boardStatus, _boardId, false);
        _emitBoardClosed( _boardId, false);
        return OK;
    }

    function _emitBoardCreated(
        uint _boardId,
        bytes32 _name,
        bytes32 _boardDescription,
        address _creator,
        uint _tags,
        uint _tagsArea,
        uint _tagsCategory,
        bytes32 _ipfsHash,
        bool _boardStatus
    )
    internal
    {
        BoardController(getEventsHistory()).emitBoardCreated(
            _boardId,
            _name,
            _boardDescription,
            _creator,
            _tags,
            _tagsArea,
            _tagsCategory,
            _ipfsHash,
            _boardStatus
        );
    }

    function emitBoardCreated(
        uint _boardId,
        bytes32 _name,
        bytes32 _boardDescription,
        address _creator,
        uint _tags,
        uint _tagsArea,
        uint _tagsCategory,
        bytes32 _ipfsHash,
        bool _boardStatus
    )
    public
    {
        BoardCreated(
            _self(),
            _boardId,
            _name,
            _boardDescription,
            _creator,
            _tags,
            _tagsArea,
            _tagsCategory,
            _ipfsHash,
            _boardStatus
        );
    }

    function emitJobBinded(uint _boardId, uint _jobId, bool _status) public {
        JobBinded(_self(), _boardId, _jobId, _status);
    }

    function emitUserBinded(uint _boardId, address _user, bool _status) public {
        UserBinded(_self(), _boardId, _user, _status);
    }

    function emitBoardClosed(uint _boardId, bool _status) public {
        BoardClosed(_self(), _boardId, _status);
    }

    /* INTERNAL */

    function _emitJobBinded(uint _boardId, uint _jobId, bool _status) internal {
        BoardController(getEventsHistory()).emitJobBinded(_boardId, _jobId, _status);
    }

    function _emitUserBinded(uint _boardId, address _user, bool _status) internal {
        BoardController(getEventsHistory()).emitUserBinded(_boardId, _user, _status);
    }

    function _emitBoardClosed(uint _boardId, bool _status) internal {
        BoardController(getEventsHistory()).emitBoardClosed(_boardId, _status);
    }
}
