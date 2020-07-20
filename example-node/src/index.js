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
      await appAda.getExtendedPublicKey([
        utils.HARDENED + 44,
        utils.HARDENED + 540,
        utils.HARDENED + 0
      ])
    );
  },

  getAddress: async () => {
    console.log("getAddress");
    console.log(
      await appSmesh.getAddress(utils.str_to_path("44'/540'/0'/0/0"))
    );
  },

  showAddress: async () => {
    console.log("showAddress");
    console.log(
      await appSmesh.showAddress(utils.str_to_path("44'/540'/0'/0/1"))
    );
  }
});

async function example() {
  console.log("Running SMH examples");
  const transport = await TransportNodeHid.create(5000);
  //transport.setDebugMode(true);
  const appSmesh = new AppSmesh(transport);

  const examples = makeExamples(appSmesh);

  await examples.getVersion();
  await examples.getExtendedPublicKey();
  await examples.getAddress();
  await examples.showAddress();
}

example();
