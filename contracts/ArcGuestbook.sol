// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

contract ArcGuestbook is Context {
    error EmptyMessage();
    error MessageTooLong();

    struct Entry {
        address sender;
        string text;
        uint256 timestamp;
    }

    Entry[] private _entries;

    /// @notice Emitted when a guest signs the guestbook.
    /// @param sender The address that signed the message.
    /// @param text The signed message text.
    /// @param timestamp The block timestamp when the message was signed.
    event MessageSigned(address indexed sender, string text, uint256 timestamp);

    /// @notice Sign the guestbook with a message.
    /// @param text The message text to sign.
    function signMessage(string calldata text) public {
        uint256 length = bytes(text).length;

        if (length == 0) {
            revert EmptyMessage();
        }
        if (length > 280) {
            revert MessageTooLong();
        }

        uint256 timestamp = block.timestamp;
        address sender = _msgSender();

        _entries.push(Entry({sender: sender, text: text, timestamp: timestamp}));

        emit MessageSigned(sender, text, timestamp);
    }

    /// @notice Return all guestbook messages.
    /// @return messages The full list of signed entries.
    function getMessages() public view returns (Entry[] memory messages) {
        return _entries;
    }

    /// @notice Return the total number of signed messages.
    /// @return count The number of stored guestbook entries.
    function getMessageCount() public view returns (uint256 count) {
        return _entries.length;
    }
}
