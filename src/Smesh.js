/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
// @flow

import type Transport from "@ledgerhq/hw-transport";
import { TransportStatusError } from "@ledgerhq/hw-transport";

import utils, { Precondition, Assert } from "./utils";

const CLA = 0x30;

const INS = {
  GET_VERSION: 0x00,

  GET_EXT_PUBLIC_KEY: 0x10,
  GET_ADDRESS: 0x11,

  SIGN_TX: 0x20
};

export type BIP32Path = Array<number>;

export type Flags = {|
  isDebug: boolean
|};

export type GetVersionResponse = {|
  major: string,
  minor: string,
  patch: string,
  flags: Flags
|};

export type GetAddressResponse = {|
  address: string
|};

export type GetExtendedPublicKeyResponse = {|
  publicKeyHex: string,
  chainCodeHex: string
|};

export type Witness = {|
  path: BIP32Path,
  // Note: this is *only* a signature
  // you need to add proper extended public key
  // to form a full witness
  witnessSignatureHex: string
|};

export type SignTransactionResponse = {|
  txHashHex: string,
  signature: string
|};

// It can happen that we try to send a message to the device
// when the device thinks it is still in a middle of previous ADPU stream.
// This happens mostly if host does abort communication for some reason
// leaving ledger mid-call.
// In this case Ledger will respond by ERR_STILL_IN_CALL *and* resetting its state to
// default. We can therefore transparently retry the request.
// Note though that only the *first* request in an multi-APDU exchange should be retried.
const wrapRetryStillInCall = fn => async (...args: any) => {
  try {
    return await fn(...args);
  } catch (e) {
    if (e && e.statusCode && e.statusCode === ErrorCodes.ERR_STILL_IN_CALL) {
      // Do the retry
      return await fn(...args);
    }
    throw e;
  }
};

const wrapConvertError = fn => async (...args) => {
  try {
    return await fn(...args);
  } catch (e) {
    if (e && e.statusCode) {
      // keep HwTransport.TransportStatusError
      // just override the message
      e.message = `Ledger device: ${e.statusCode}`;
    }
    throw e;
  }
};
/**
 * Spacemesh SMH API
 *
 * @example
 * import Smesh from "@ledgerhq/hw-app-smh";
 * const smesh = new Smesh(transport);
 */

type SendFn = (number, number, number, number, Buffer) => Promise<Buffer>;

export default class Smesh {
  transport: Transport<*>;
  methods: Array<string>;
  send: SendFn;

  constructor(transport: Transport<*>, scrambleKey: string = "SMH") {
    this.transport = transport;
    this.methods = [
      "getVersion",
      "getExtendedPublicKey",
      "signTransaction",
      "getAddress",
      "showAddress"
    ];
    this.transport.decorateAppAPIMethods(this, this.methods, scrambleKey);
    this.send = wrapConvertError(this.transport.send);
  }

  /**
   * Returns an object containing the app version.
   *
   * @returns {Promise<GetVersionResponse>} Result object containing the application version number.
   *
   * @example
   * const { major, minor, patch, flags } = await smesh.getVersion();
   * console.log(`App version ${major}.${minor}.${patch}`);
   *
   */
  async getVersion(): Promise<GetVersionResponse> {
    const _send = (p1, p2, data) =>
      this.send(CLA, INS.GET_VERSION, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );
    const P1_UNUSED = 0x00;
    const P2_UNUSED = 0x00;
    const response = await wrapRetryStillInCall(_send)(
      P1_UNUSED,
      P2_UNUSED,
      utils.hex_to_buf("")
    );
    Assert.assert(response.length == 4);
    const [major, minor, patch, flags_value] = response;

    const FLAG_IS_DEBUG = 1;

    const flags = {
      isDebug: (flags_value & FLAG_IS_DEBUG) == FLAG_IS_DEBUG
    };
    return { major, minor, patch, flags };
  }

  /**
   * @description Get a public key from the specified BIP 32 path.
   *
   * @param {BIP32Path} indexes The path indexes. Path must begin with `44'/540'/n'`, and shuld be 5 indexes long.
   * @return {Promise<GetExtendedPublicKeyResponse>} The public key with chaincode for the given path.
   *
   * @example
   * const { publicKey, chainCode } = await smesh.getExtendedPublicKey([ HARDENED + 44, HARDENED + 540, HARDENED + 1 ]);
   * console.log(publicKey);
   *
   */
  async getExtendedPublicKey(
    path: BIP32Path
  ): Promise<GetExtendedPublicKeyResponse> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.GET_EXT_PUBLIC_KEY, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_UNUSED = 0x00;
    const P2_UNUSED = 0x00;

    const data = utils.path_to_buf(path);

    const response = await wrapRetryStillInCall(_send)(
      P1_UNUSED,
      P2_UNUSED,
      data
    );

    const [publicKey, chainCode, rest] = utils.chunkBy(response, [32, 32]);
    Assert.assert(rest.length == 0);

    return {
      publicKeyHex: publicKey.toString("hex"),
      chainCodeHex: chainCode.toString("hex")
    };
  }

  /**
   * @description Gets an address from the specified BIP 32 path.
   *
   * @param {BIP32Path} indexes The path indexes. Path must begin with `44'/540'/0'/0/i`
   * @return {Promise<GetAddressResponse>} The address for the given path.
   *
   * @throws 5001 - The path provided does not have the first 3 indexes hardened or 4th index is not 0
   * @throws 5002 - The path provided is less than 5 indexes
   * @throws 5003 - Some of the indexes is not a number
   *
   * @example
   * const { address } = await smesh.getAddress([ HARDENED + 44, HARDENED + 540, HARDENED + 0, 0, 2 ]);
   *
   */
  async getAddress(path: BIP32Path): Promise<GetAddressResponse> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.GET_ADDRESS, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_RETURN = 0x01;
    const P2_UNUSED = 0x00;
    const data = utils.path_to_buf(path);
    const response = await _send(P1_RETURN, P2_UNUSED, data);

    return {
      address: response
    };
  }

  async showAddress(path: BIP32Path): Promise<void> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.GET_ADDRESS, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_DISPLAY = 0x02;
    const P2_UNUSED = 0x00;
    const data = utils.path_to_buf(path);
    const response = await _send(P1_DISPLAY, P2_UNUSED, data);
    Assert.assert(response.length == 0);
  }

  async signTx(path: BIP32Path, tx: string): Promise<void> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.SIGN_TX, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_UNUSED = 0x00;
    const P2_UNUSED = 0x00;
    const data = Buffer.concat([
      utils.path_to_buf(path),
      utils.hex_to_buf(tx)
    ]);

    const response = await wrapRetryStillInCall(_send)(
      P1_UNUSED,
      P2_UNUSED,
      data
    );

    const [signature, pubKey, rest] = utils.chunkBy(response, [64, 32]);
    Assert.assert(rest.length == 0);

    return {
      tx,
      signature: signature.toString("hex"),
      pubKey: pubKey.toString("hex")
    };
  }
}

export {
  utils // reexport
};
