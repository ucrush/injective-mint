import { getNetworkInfo, Network } from "@injectivelabs/networks";
import {
  TxClient,
  PrivateKey,
  TxGrpcClient,
  ChainRestAuthApi,
  createTransaction,
} from "@injectivelabs/sdk-ts";
import { MsgSend } from "@injectivelabs/sdk-ts";
import { BigNumberInBase, DEFAULT_STD_FEE } from "@injectivelabs/utils";
import * as dotenv from "dotenv";
dotenv.config();

// mint 次数
const mint_count = parseInt(process.env.mint_count||"1");
// 钱包私钥
const privateKeyHash = process.env.privateKeyHash || "";
// const network = getNetworkInfo(Network.Testnet);
const network = getNetworkInfo(Network.Mainnet);

const privateKey = PrivateKey.fromHex(privateKeyHash);
const injectiveAddress = privateKey.toBech32();

console.log(`address:${injectiveAddress}`);

async function send() {

  const publicKey = privateKey.toPublicKey().toBase64();

  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress
  );

  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(0.03).toWei().toFixed(),
    denom: "inj",
  };

  const msg = MsgSend.fromJSON({
    amount,
    srcInjectiveAddress: injectiveAddress,
    dstInjectiveAddress: "inj15jy9vzmyy63ql9y6dvned2kdat2994x5f4ldu4",
  });

  /** Prepare the Transaction **/
  const { signBytes, txRaw } = createTransaction({
    message: msg,
    memo: "ZGF0YToseyJwIjoiaW5qcmMtMjAiLCJvcCI6Im1pbnQiLCJ0aWNrIjoiSU5KUyIsImFtdCI6IjIwMDAifQ==",
    fee: DEFAULT_STD_FEE,
    pubKey: publicKey,
    sequence: parseInt(accountDetails.account.base_account.sequence, 10),
    accountNumber: parseInt(
      accountDetails.account.base_account.account_number,
      10
    ),
    chainId: network.chainId,
  });

  /** Sign transaction */
  const signature = await privateKey.sign(Buffer.from(signBytes));

  /** Append Signatures */
  txRaw.signatures = [signature];

  /** Calculate hash of the transaction */
  console.log(`Transaction Hash: ${TxClient.hash(txRaw)}`);

  const txService = new TxGrpcClient(network.grpc);

  /** Simulate transaction */
  const simulationResponse = await txService.simulate(txRaw);
  console.log(
    `Transaction simulation response: ${JSON.stringify(
      simulationResponse.gasInfo
    )}`
  );

  /** Broadcast transaction */
  const txResponse = await txService.broadcast(txRaw);

  if (txResponse.code !== 0) {
    console.log(`Transaction failed: ${txResponse.rawLog}`);
  } else {
    console.log(
      `Broadcasted transaction hash: ${JSON.stringify(txResponse.txHash)}`
    );
  }
}

async function main() {
  for (let i = 0; i < mint_count; ) {
    try {
      const tx = await send();
      console.log("mint 次数:", i++);
      //   console.log(i, "success tx:", tx);
      i++;
    } catch (error) {
      console.log("error:" + error);
    }
  }
  console.log("完成");
}
main();
