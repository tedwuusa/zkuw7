// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

contract FusionScoreMockVerifier {
    function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, 
        uint[6] memory input) public view returns (bool r) {
        return true;
    }
}
