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
const MAX_PACKET_LENGTH = 240;

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
  address: Buffer
|};

export type GetExtendedPublicKeyResponse = {|
  publicKey: Buffer,
  chainCode: Buffer
|};

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
/*
const printApdu = (a1, a2, a3, a4, data) => {
    console.log('APDU:', Buffer.concat([
      utils.uint8_to_buf(a1),
      utils.uint8_to_buf(a2),
      utils.uint8_to_buf(a3),
      utils.uint8_to_buf(a4),
      utils.uint8_to_buf(data.length),
      data
    ]).toString('hex'));
}
*/
export default class Smesh {
  transport: Transport<*>;
  methods: Array<string>;
  send: SendFn;

  constructor(transport: Transport<*>, scrambleKey: string = "SMH") {
    this.transport = transport;
    this.methods = [
      "getVersion",
      "getExtendedPublicKey",
      "signTx",
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

    // printApdu(CLA, INS.GET_VERSION, P1_UNUSED, P2_UNUSED, utils.hex_to_buf(""));
    const response = await _send(P1_UNUSED, P2_UNUSED, utils.hex_to_buf(""));
    // console.log("Response:", response.toString('hex'));

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
   * @throws 0x6E07 - Some part of request data is invalid
   * @throws 0x6E09 - User rejected the action
   * @throws 0x6E11 - Pin screen
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

    // printApdu(CLA, INS.GET_EXT_PUBLIC_KEY, P1_UNUSED, P2_UNUSED, data);
    const response = await _send(P1_UNUSED, P2_UNUSED, data);
    // console.log("Response:", response.toString('hex'));

    const [publicKey, chainCode, privateKey, rest] = utils.chunkBy(response, [32, 32, 64]);
    Assert.assert(rest.length == 0);

    return {
      publicKey: publicKey,
      chainCode: chainCode
    };
  }

  /**
   * @description Gets an address from the specified BIP 32 path.
   *
   * @param {BIP32Path} indexes The path indexes. Path must begin with `44'/540'/0'/0/i`
   * @return {Promise<GetAddressResponse>} The address for the given path.
   *
   * @throws 0x6E07 - Some part of request data is invalid
   * @throws 0x6E09 - User rejected the action
   * @throws 0x6E11 - Pin screen
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

    // printApdu(CLA, INS.GET_ADDRESS, P1_RETURN, P2_UNUSED, data);
    const response = await _send(P1_RETURN, P2_UNUSED, data);
    // console.log("Response:", response.toString('hex'));

    return {
      address: response
    };
  }

  /**
   * @description Show an address from the specified BIP 32 path for verify.
   *
   * @param {BIP32Path} indexes The path indexes. Path must begin with `44'/540'/0'/0/i`
   * @return {Promise<void>} No return.
   *
   * @throws 0x6E07 - Some part of request data is invalid
   * @throws 0x6E11 - Pin screen
   *
   * @example
   * await smesh.showAddress([ HARDENED + 44, HARDENED + 540, HARDENED + 0, 0, HARDENED + 2 ]);
   *
   */
  async showAddress(path: BIP32Path): Promise<void> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.GET_ADDRESS, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_DISPLAY = 0x02;
    const P2_UNUSED = 0x00;
    const data = utils.path_to_buf(path);

    // printApdu(CLA, INS.GET_ADDRESS, P1_DISPLAY, P2_UNUSED, data);
    const response = await _send(P1_DISPLAY, P2_UNUSED, data);
    // console.log("Response:", response.toString('hex'));
    Assert.assert(response.length == 0);
  }

  /**
   * @description Sign an transaction by the specified BIP 32 path account address.
   *
   * @param {BIP32Path} indexes The path indexes. Path must begin with `44'/540'/0'/0/i`
   * @param {Buffer} tx The XDR encoded transaction data, include transaction type
   * @return {Promise<Buffer>} Signed transaction.
   *
   * @throws 0x6E05 - P1, P2 or payload is invalid
   * @throws 0x6E06 - Request is not valid in the context of previous calls
   * @throws 0x6E07 - Some part of request data is invalid
   * @throws 0x6E09 - User rejected the action
   * @throws 0x6E11 - Pin screen
   *
   * @example
   * const { signature } = await smesh.signTx([ HARDENED + 44, HARDENED + 540, HARDENED + 0, 0, 2 ], txData);
   *
   */
  async signTx(path: BIP32Path, tx: Buffer): Promise<SignTransactionResponse> {
    Precondition.checkIsValidPath(path);

    const _send = (p1, p2, data) =>
      this.send(CLA, INS.SIGN_TX, p1, p2, data).then(
        utils.stripRetcodeFromResponse
      );

    const P1_HAS_HEADER  = 0x01;
    const P1_HAS_DATA    = 0x02;
    const P1_IS_LAST     = 0x04;
    const P2_UNUSED = 0x00;

    let response = null;

    const data = Buffer.concat([
      utils.path_to_buf(path),
      tx
    ]);

    if (data.length <= MAX_PACKET_LENGTH) {
      // printApdu(CLA, INS.SIGN_TX, P1_HAS_HEADER | P1_IS_LAST, P2_UNUSED, data);
      response = await _send(P1_HAS_HEADER | P1_IS_LAST, P2_UNUSED, data);
      // console.log("Response:", response.toString('hex'));
    } else {
      let dataSize = data.length;
      let chunkSize = MAX_PACKET_LENGTH;
      let offset = 0;
      // Send tx header + tx data
      // printApdu(CLA, INS.SIGN_TX, P1_HAS_HEADER | P1_HAS_DATA, P2_UNUSED, data.slice(offset, offset + chunkSize));
      response = await _send(P1_HAS_HEADER | P1_HAS_DATA, P2_UNUSED, data.slice(offset, offset + chunkSize));
      // console.log("Response:", response.toString('hex'));
      Assert.assert(response.length == 0);
      dataSize -= chunkSize;
      offset += chunkSize;
      // Send tx data
      while (dataSize > MAX_PACKET_LENGTH) {
        // printApdu(CLA, INS.SIGN_TX, P1_HAS_DATA, P2_UNUSED, data.slice(offset, offset + chunkSize));
        response = await _send(P1_HAS_DATA, P2_UNUSED, data.slice(offset, offset + chunkSize));
        // console.log("Response:", response.toString('hex'));
        Assert.assert(response.length == 0);
        dataSize -= chunkSize;
        offset += chunkSize;
      }
      // printApdu(CLA, INS.SIGN_TX, P1_IS_LAST, P2_UNUSED, data.slice(offset));
      response = await _send(P1_IS_LAST, P2_UNUSED, data.slice(offset));
      // console.log("Response:", response.toString('hex'));
    }

    Assert.assert(response !== null);

    const [signature, pubKey, rest] = utils.chunkBy(response, [64, 32]);
    Assert.assert(rest.length == 0);

    return Buffer.concat([tx.slice(0, 1), signature, tx.slice(1)]);
  }
}

export {
  utils // reexport
};
