// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ArcGuestbook} from "../ArcGuestbook.sol";

contract ArcGuestbookTest is Test {
    ArcGuestbook internal guestbook;

    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");

    /// Max bytes allowed by the contract.
    uint256 internal constant MAX_LEN = 280;

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// Build a string of exactly `n` ASCII 'x' bytes.
    function _repeat(uint256 n) internal pure returns (string memory s) {
        bytes memory b = new bytes(n);
        for (uint256 i; i < n; ++i) b[i] = "x";
        s = string(b);
    }

    // -----------------------------------------------------------------------
    // setUp — fresh instance before every test
    // -----------------------------------------------------------------------

    function setUp() public {
        guestbook = new ArcGuestbook();
    }

    // =========================================================================
    // 1. Deployment & initialisation
    // =========================================================================

    function test_DeployStartsWithZeroMessages() public view {
        assertEq(guestbook.getMessageCount(), 0, "count should start at 0");
        assertEq(guestbook.getMessages().length, 0, "messages array should be empty");
    }

    // =========================================================================
    // 2. signMessage — happy paths
    // =========================================================================

    function test_SignMessage_StoresEntry() public {
        vm.prank(alice);
        guestbook.signMessage("Hello guestbook!");

        assertEq(guestbook.getMessageCount(), 1);

        ArcGuestbook.Entry[] memory msgs = guestbook.getMessages();
        assertEq(msgs.length, 1);
        assertEq(msgs[0].sender,    alice,            "sender mismatch");
        assertEq(msgs[0].text,      "Hello guestbook!", "text mismatch");
        assertEq(msgs[0].timestamp, block.timestamp,  "timestamp mismatch");
    }

    function test_SignMessage_AtExactlyMaxLength() public {
        string memory maxMsg = _repeat(MAX_LEN);   // exactly 280 bytes — must succeed
        vm.prank(alice);
        guestbook.signMessage(maxMsg);

        assertEq(guestbook.getMessageCount(), 1);
        assertEq(bytes(guestbook.getMessages()[0].text).length, MAX_LEN);
    }

    function test_SignMessage_MultipleSigners_OrderPreserved() public {
        vm.prank(alice);
        guestbook.signMessage("Alice was here");

        vm.prank(bob);
        guestbook.signMessage("Bob too");

        assertEq(guestbook.getMessageCount(), 2);

        ArcGuestbook.Entry[] memory msgs = guestbook.getMessages();
        assertEq(msgs[0].sender, alice);
        assertEq(msgs[0].text,   "Alice was here");
        assertEq(msgs[1].sender, bob);
        assertEq(msgs[1].text,   "Bob too");
    }

    function test_SignMessage_SingleByte() public {
        vm.prank(alice);
        guestbook.signMessage("A");          // smallest valid message (1 byte)
        assertEq(guestbook.getMessageCount(), 1);
    }

    function test_SignMessage_TimestampUsesBlockTimestamp() public {
        uint256 ts = 1_700_000_000;
        vm.warp(ts);

        vm.prank(alice);
        guestbook.signMessage("warped time");

        assertEq(guestbook.getMessages()[0].timestamp, ts);
    }

    // =========================================================================
    // 3. signMessage — revert paths
    // =========================================================================

    function test_SignMessage_RevertsOnEmptyMessage() public {
        vm.prank(alice);
        vm.expectRevert(ArcGuestbook.EmptyMessage.selector);
        guestbook.signMessage("");
    }

    function test_SignMessage_RevertsOnMessageTooLong() public {
        string memory tooLong = _repeat(MAX_LEN + 1);   // 281 bytes
        vm.prank(alice);
        vm.expectRevert(ArcGuestbook.MessageTooLong.selector);
        guestbook.signMessage(tooLong);
    }

    function test_SignMessage_RevertsOnVeryLongMessage() public {
        string memory huge = _repeat(1_000);
        vm.prank(alice);
        vm.expectRevert(ArcGuestbook.MessageTooLong.selector);
        guestbook.signMessage(huge);
    }

    // =========================================================================
    // 4. signMessage — event emission
    // =========================================================================

    function test_SignMessage_EmitsMessageSigned() public {
        uint256 ts = block.timestamp;

        vm.prank(alice);
        // Check indexed sender (topic1=true), non-indexed text (data=true),
        // non-indexed timestamp (data=true), and the emitter address.
        vm.expectEmit(true, false, false, true, address(guestbook));
        emit ArcGuestbook.MessageSigned(alice, "Hello event!", ts);
        guestbook.signMessage("Hello event!");
    }

    function test_SignMessage_EmitContainsCorrectTimestamp() public {
        uint256 ts = 1_710_000_000;
        vm.warp(ts);

        vm.prank(bob);
        vm.expectEmit(true, false, false, true, address(guestbook));
        emit ArcGuestbook.MessageSigned(bob, "timestamped", ts);
        guestbook.signMessage("timestamped");
    }

    // =========================================================================
    // 5. getMessageCount / getMessages views
    // =========================================================================

    function test_GetMessageCount_IncreasesWithEachSign() public {
        for (uint256 i = 1; i <= 5; i++) {
            vm.prank(alice);
            guestbook.signMessage(_repeat(i));
            assertEq(guestbook.getMessageCount(), i);
        }
    }

    function test_GetMessages_ReturnsAllEntries() public {
        vm.prank(alice);
        guestbook.signMessage("first");
        vm.prank(bob);
        guestbook.signMessage("second");

        ArcGuestbook.Entry[] memory msgs = guestbook.getMessages();
        assertEq(msgs.length, 2);
        assertEq(msgs[0].text, "first");
        assertEq(msgs[1].text, "second");
    }

    function test_GetMessages_DoesNotMutateStorage() public view {
        // Calling the view repeatedly returns the same result (idempotency).
        ArcGuestbook.Entry[] memory a = guestbook.getMessages();
        ArcGuestbook.Entry[] memory b = guestbook.getMessages();
        assertEq(a.length, b.length);
    }

    // =========================================================================
    // 6. Fuzz — valid message length (1..280 bytes)
    // =========================================================================

    function testFuzz_SignMessage_ValidLength(uint256 len) public {
        // Constrain: [1, 280] — all should succeed
        len = bound(len, 1, MAX_LEN);
        string memory msg_ = _repeat(len);

        vm.prank(alice);
        guestbook.signMessage(msg_);

        assertEq(guestbook.getMessageCount(), 1);
        assertEq(bytes(guestbook.getMessages()[0].text).length, len);
    }

    function testFuzz_SignMessage_TooLong_AlwaysReverts(uint256 len) public {
        // Constrain: [281, 10_000] — all should revert with MessageTooLong
        len = bound(len, MAX_LEN + 1, 10_000);
        string memory msg_ = _repeat(len);

        vm.prank(alice);
        vm.expectRevert(ArcGuestbook.MessageTooLong.selector);
        guestbook.signMessage(msg_);
    }

    function testFuzz_SignMessage_CountGrowsMonotonically(
        string memory msg1,
        string memory msg2
    ) public {
        // Only proceed when both messages are within valid bounds
        vm.assume(bytes(msg1).length > 0 && bytes(msg1).length <= MAX_LEN);
        vm.assume(bytes(msg2).length > 0 && bytes(msg2).length <= MAX_LEN);

        vm.prank(alice);
        guestbook.signMessage(msg1);
        uint256 countAfterFirst = guestbook.getMessageCount();

        vm.prank(bob);
        guestbook.signMessage(msg2);
        uint256 countAfterSecond = guestbook.getMessageCount();

        assertGt(countAfterSecond, countAfterFirst, "count must grow after each sign");
    }

    // =========================================================================
    // 7. Invariant — count always equals length of messages array
    // =========================================================================

    function invariant_CountEqualsMessagesLength() public view {
        assertEq(
            guestbook.getMessageCount(),
            guestbook.getMessages().length,
            "getMessageCount must always equal getMessages().length"
        );
    }
}
