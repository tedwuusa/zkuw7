#!/bin/bash
CIRCUIT=FusionScoreV1
SRC_DIR=circuits
OUT_DIR=circuits/artifacts
CONTRACT_DIR=contracts
CLIENT_DIR=public/zk
TEST_DIR=test/inputs
POWERS_OF_TAU=18

if [ ! -z $1 ]; then
    CIRCUIT=$1
fi
if [ ! -f $SRC_DIR/$CIRCUIT.circom ]; then
    tput setaf 1 #Set red color
    echo "Input file $SRC_DIR/$CIRCUIT.circom not found!"
    exit
fi

mkdir -p $OUT_DIR
if [ ! -f $OUT_DIR/ptau$POWERS_OF_TAU.ptau ]; then
    echo "Downloading powers of tau file"
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_$POWERS_OF_TAU.ptau -o $OUT_DIR/ptau$POWERS_OF_TAU.ptau
fi

circom --r1cs --wasm --sym -o $OUT_DIR $SRC_DIR/$CIRCUIT.circom

# Phase 1 trusted setup (either use this or the downloaded ptau file)
# npx snarkjs powersoftau new bn128 $POWERS_OF_TAU $OUT_DIR/ptau${POWERS_OF_TAU}_0000.ptau -v
# npx snarkjs powersoftau contribute $OUT_DIR/ptau${POWERS_OF_TAU}_0000.ptau $OUT_DIR/ptau${POWERS_OF_TAU}_0001.ptau \
#     --name="First contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)"
# npx snarkjs powersoftau beacon $OUT_DIR/ptau${POWERS_OF_TAU}_0001.ptau $OUT_DIR/ptau${POWERS_OF_TAU}_0002.ptau \
#     0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -name="Final Beacon Phase 1"
# npx snarkjs powersoftau prepare phase2 $OUT_DIR/ptau${POWERS_OF_TAU}_0002.ptau $OUT_DIR/ptau${POWERS_OF_TAU}.ptau -v

npx snarkjs groth16 setup $OUT_DIR/$CIRCUIT.r1cs $OUT_DIR/ptau${POWERS_OF_TAU}.ptau $OUT_DIR/${CIRCUIT}_0000.zkey
npx snarkjs zkey contribute $OUT_DIR/${CIRCUIT}_0000.zkey $OUT_DIR/${CIRCUIT}_0001.zkey -v -e="FusionScoreContribution"
npx snarkjs zkey beacon $OUT_DIR/${CIRCUIT}_0001.zkey $OUT_DIR/${CIRCUIT}_final.zkey \
    0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -name="Final Beacon Phase 2"
npx snarkjs zkey export verificationkey $OUT_DIR/${CIRCUIT}_final.zkey $OUT_DIR/${CIRCUIT}_key.json
npx snarkjs zkey export solidityverifier $OUT_DIR/${CIRCUIT}_final.zkey $CONTRACT_DIR/${CIRCUIT}Verifier.sol
sed -i "" "s/contract Verifier/contract ${CIRCUIT}Verifier/g" $CONTRACT_DIR/${CIRCUIT}Verifier.sol
sed -i "" "s/solidity ^0.6.11/solidity ^0.8.4/g" $CONTRACT_DIR/${CIRCUIT}Verifier.sol

echo -e "\nCircuit Info:"
npx snarkjs info $OUT_DIR/$CIRCUIT.r1cs

mkdir -p $CLIENT_DIR
cp $OUT_DIR/${CIRCUIT}_final.zkey $CLIENT_DIR/$CIRCUIT.zkey
cp $OUT_DIR/${CIRCUIT}_js/$CIRCUIT.wasm $CLIENT_DIR/$CIRCUIT.wasm

# Make sure proofs can be generated and verified
npx snarkjs groth16 fullprove $TEST_DIR/input2.json $CLIENT_DIR/$CIRCUIT.wasm $CLIENT_DIR/$CIRCUIT.zkey \
    $OUT_DIR/output-proof.json $OUT_DIR/output-public.json
npx snarkjs groth16 verify $OUT_DIR/${CIRCUIT}_key.json $OUT_DIR/output-public.json $OUT_DIR/output-proof.json
