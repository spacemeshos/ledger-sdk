import "babel-polyfill";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import AppSmesh, { utils } from "../../lib/Smesh"; //"@spacemeshos/ledger-sdk";

const makeExamples = appSmesh => ({
  getVersion: async () => {
    console.log("getVersion");
    console.log(await appSmesh.getVersion());
  },

  getExtendedPublicKey: async () => {
    console.log("getExtendedPublicKey");
    console.log(
      await appSmesh.getExtendedPublicKey([
        utils.HARDENED + 44,
        utils.HARDENED + 540,
        utils.HARDENED + 0,
        0,
        utils.HARDENED + 0
      ])
    );
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

  signTx: async () => {
    console.log("signTx");
    const tx = Buffer.concat([
      utils.uint8_to_buf(1), // type
      utils.uint32_to_buf(0), utils.uint32_to_buf(1), // nonce
      utils.hex_to_buf("0000000000000000000000000000000000000000"), // recepient
      utils.uint32_to_buf(0), utils.uint32_to_buf(1000000), // gas limit
      utils.uint32_to_buf(0), utils.uint32_to_buf(1000), // gas price
      utils.uint32_to_buf(0xE8), utils.uint32_to_buf(0xD4A51000) // amount
    ]);
    console.log(
      await appSmesh.signTx(utils.str_to_path("44'/540'/0'/0/0'"), tx.toString("hex"))
    );
  }
});

async function example() {
  console.log("Running SMH examples");
  const transport = await TransportNodeHid.create(5000);
  //transport.setDebugMode(true);
  const appSmesh = new AppSmesh(transport);

  const examples = makeExamples(appSmesh);

  try {
//      await examples.getVersion();
//      await examples.getExtendedPublicKey();
//      await examples.getAddress();
//      await examples.showAddress();
      await examples.signTx();
  } catch (error) {
    console.log(error);
  }
}

example();
