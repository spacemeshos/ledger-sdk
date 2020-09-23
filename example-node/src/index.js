import "babel-polyfill";
import ed25519 from "ed25519";
import crypto from 'crypto';
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import AppSmesh, { utils } from "../../lib/Smesh"; //"@spacemeshos/ledger-sdk";

//const publicKey = utils.hex_to_buf('8eb640bb3c0b63923637e07e4bc82ea032e2cceec59ada068dd5849d971bd099');

const makeExamples = appSmesh => ({
  getVersion: async () => {
    console.log("getVersion");
    console.log(await appSmesh.getVersion());
  },

  getExtendedPublicKey: async () => {
    console.log("getExtendedPublicKey");
    const response = await appSmesh.getExtendedPublicKey(utils.str_to_path("44'/540'/0'/0/0'"));
    console.log(response);
    appSmesh.publicKey = response.publicKey;
  },

  getAddress: async () => {
    console.log("getAddress");
    console.log(
      await appSmesh.getAddress(utils.str_to_path("44'/540'/0'/0/0'"))
    );
  },

  showAddress: async () => {
    console.log("showAddress");
    console.log(
      await appSmesh.showAddress(utils.str_to_path("44'/540'/0'/0/1'"))
    );
  },

  signCoinTx: async () => {
    console.log("signCoinTx");
    const tx = Buffer.concat([
      utils.hex_to_buf("0000000000000000000000000000000000000000000000000000000000000000"), // network id
      utils.uint8_to_buf(0), // // coin transaction with ed
      utils.uint64_to_buf(1), // nonce
      utils.hex_to_buf("0000000000000000000000000000000000000000"), // recepient
      utils.uint64_to_buf(1000000), // gas limit
      utils.uint64_to_buf(1000), // gas price
      utils.uint64_to_buf(1000000000000), // amount
      appSmesh.publicKey
    ]);
    var hash = crypto.createHash('sha512').update(tx).digest();

    const response = await appSmesh.signTx(utils.str_to_path("44'/540'/0'/0/0'"), tx);
    const signature = response.slice(1, 65);
    console.log(signature.length, signature);

    console.log("Verify coin tx:", ed25519.Verify(hash, signature, appSmesh.publicKey));
  },

  signAppTx: async () => {
    console.log("signAppTx");
    const tx = Buffer.concat([
      utils.hex_to_buf("0000000000000000000000000000000000000000000000000000000000000000"), // network id
      utils.uint8_to_buf(2), // exec app transaction with ed
      utils.uint64_to_buf(1), // nonce
      utils.hex_to_buf("0000000000000000000000000000000000000000"), // app address
      utils.uint64_to_buf(1000000), // gas limit
      utils.uint64_to_buf(1000), // gas price
      utils.uint64_to_buf(1000000000000) // amount
      // call data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , appSmesh.publicKey
    ]);
    var hash = crypto.createHash('sha512').update(tx).digest(); //returns a buffer

    const response = await appSmesh.signTx(utils.str_to_path("44'/540'/0'/0/0'"), tx);
    const signature = response.slice(1, 65);
    console.log(signature.length, signature);

    console.log("Verify app tx:", ed25519.Verify(hash, signature, appSmesh.publicKey));
  },

  signSpawnTx: async () => {
    console.log("signSpawnTx");
    const tx = Buffer.concat([
      utils.hex_to_buf("0000000000000000000000000000000000000000000000000000000000000000"), // network id
      utils.uint8_to_buf(4), // spawn app + ed
      utils.uint64_to_buf(1), // nonce
      utils.hex_to_buf("0000000000000000000000000000000000000000"), // template address
      utils.uint64_to_buf(1000000), // gas limit
      utils.uint64_to_buf(1000), // gas price
      utils.uint64_to_buf(1000000000000) // amount
      // call data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , utils.hex_to_buf("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") // bin data
      , appSmesh.publicKey
    ]);
    var hash = crypto.createHash('sha512').update(tx).digest(); //returns a buffer

    const response = await appSmesh.signTx(utils.str_to_path("44'/540'/0'/0/0'"), tx);
    const signature = response.slice(1, 65);
    console.log(signature.length, signature);

    console.log("Verify spawn tx:", ed25519.Verify(hash, signature, appSmesh.publicKey));
  }
});

async function example() {
  console.log("Running SMH examples");
  const transport = await TransportNodeHid.create(5000);
  //transport.setDebugMode(true);
  const appSmesh = new AppSmesh(transport);

  const examples = makeExamples(appSmesh);

  try {
      await examples.getVersion();
      await examples.getExtendedPublicKey();
      await examples.getAddress();
      await examples.showAddress();
      await examples.signCoinTx();
      await examples.signAppTx();
      await examples.signSpawnTx();
  } catch (error) {
    console.log(error);
  }
}

example();
