pragma circom 2.0.5;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";

// Return input if it is less than max, otherwise return max
template LimitMax(max) {
    assert(max<1024); // need to increase bits for LessThan for larger "max" value

    signal input in;
    signal output out;

    component lt = LessThan(15);
    lt.in[0] <== in;
    lt.in[1] <== max;

    out <== max + (in - max) * lt.out;
}

// Circuit for integer division
template IntegerDiv(n) {
    signal input in;
    signal input divisor;

    signal output out;

    out <-- in \ divisor;

    component lbound = GreaterEqThan(n+12);
    lbound.in[0] <== in;
    lbound.in[1] <== out * divisor;
    lbound.out === 1;

    component ubound = LessThan(n+12);
    ubound.in[0] <== in;
    ubound.in[1] <== (out + 1) * divisor;
    ubound.out === 1;
}

// Combine scores into accumulator by multiplying if account is valid (non zero score)
// Also tracks the scale to be adjusted at the end if account is valid
// If account is not used, previous accumulator and scale is returned
template CombineScore(n) {
    signal input score; // account credit score in range [0, 1000]
    signal input accumulator;
    signal input scale;
    signal input blank;

    signal output accumulator_out;
    signal output scale_out;

    var score_mapped = 1000 + (1000 - score); // mapping score to [1000, 2000] in reverse
    component scaled = IntegerDiv(n+12);
    scaled.in <== accumulator * score_mapped;
    scaled.divisor <== 1000;

    accumulator_out <== scaled.out + (accumulator - scaled.out) * blank;
    scale_out <== scale + scale * (1-blank);
}

// Calculate the final score by combining the accumulator and scale
template GetScore(n) {
    signal input accumulator;
    signal input scale;

    signal output score;

    component scaled = IntegerDiv(n+12);
    scaled.in <== accumulator - 1000;
    scaled.divisor <== scale - 1;
    score <== 1000 - scaled.out;
}

// Template parameter indicate number of accounts that can be combined
template FusionScoreV1(n) {
    assert(n<=20);

    signal input evalTime; // Time when score is calculated
    signal input senderAddress; // Address of the sender account
    signal input publicKey[2]; // Public key of server providing the data
    signal input chainId[n]; // ChainId of the account, only used for signature validation
    signal input chainAddress[n]; // Address of the account, only used for signature validation
    signal input creationTime[n]; // Timestamp of account creation
    signal input transactionCount[n]; // Number of transaction in last year
    signal input balanceAmount[n]; // Account balance
    signal input signature[n][3]; // Signature of data. R8x at 0, R8y at 1, S at 2

    signal output score; // Calculated Fusion Score
    signal output version; // Fusion Score Version

    version <== 1;

    component blank[n];
    component msgHash[n];
    component sigVerify[n];
    component longevity[n];
    component activity[n];
    component equity[n];
    component longevityDiv[n];
    component equityDiv[n];
    signal accountScore[n];
    component combine[n];

    for (var i=0; i<n; i++) {
        // check for unused slots
        blank[i] = IsZero();
        blank[i].in <== creationTime[i];

        //calculage message hash
        msgHash[i] = MultiMiMC7(5, 91);
        msgHash[i].in[0] <== chainId[i];
        msgHash[i].in[1] <== chainAddress[i];
        msgHash[i].in[2] <== creationTime[i];
        msgHash[i].in[3] <== transactionCount[i];
        msgHash[i].in[4] <== balanceAmount[i];
        msgHash[i].k <== 0;

        // check signature
        sigVerify[i] = EdDSAMiMCVerifier();
        sigVerify[i].enabled <== 1 - blank[i].out; // only verify if account is not blank
        sigVerify[i].Ax <== publicKey[0];
        sigVerify[i].Ay <== publicKey[1];
        sigVerify[i].R8x <== signature[i][0];
        sigVerify[i].R8y <== signature[i][1];
        sigVerify[i].S <== signature[i][2];
        sigVerify[i].M <== msgHash[i].out;

        // calculate longevity score
        longevityDiv[i] = IntegerDiv(n);
        longevityDiv[i].in <== evalTime - creationTime[i];
        longevityDiv[i].divisor <== 3600 * 24 * 2;
        longevity[i] = LimitMax(300);
        longevity[i].in <== longevityDiv[i].out;

        // calculate activity score
        activity[i] = LimitMax(300);
        activity[i].in <== transactionCount[i];

        // calculate equity score
        equityDiv[i] = IntegerDiv(n);
        equityDiv[i].in <== balanceAmount[i];
        equityDiv[i].divisor <== 33;
        equity[i] = LimitMax(300);
        equity[i].in <== equityDiv[i].out;

        // calculate total score for account
        accountScore[i] <== longevity[i].out + activity[i].out + equity[i].out;

        // log(i);
        // log(longevity[i].out);
        // log(activity[i].out);
        // log(equity[i].out);
        // log(accountScore[i]);

        // combine scores from multiple accounts
        combine[i] = CombineScore(n);
        if (i == 0) {
            assert(blank[i].out == 0); // Must have at least one valid account

            combine[i].blank <== blank[i].out;
            combine[i].score <== accountScore[i];
            combine[i].accumulator <== 1000;
            combine[i].scale <== 1;
        } else {
            combine[i].blank <== blank[i].out;
            combine[i].score <== accountScore[i];
            combine[i].accumulator <== combine[i-1].accumulator_out;
            combine[i].scale <== combine[i-1].scale_out;
        }
    }

    // calculate final score
    component score_final = GetScore(n);
    score_final.accumulator <== combine[n-1].accumulator_out;
    score_final.scale <== combine[n-1].scale_out;
    score <== score_final.score;
    //log(score);

    // ensure sender address is not changed
    signal dummy;
    dummy <== senderAddress * senderAddress;  
}

component main {public [evalTime, senderAddress, publicKey]} = FusionScoreV1(20);
