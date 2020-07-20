const HARDENED = 0x80000000;

export const Precondition = {
  // Generic check
  check: (cond: boolean) => {
    if (!cond) throw new Error("Precondition failed");
  },
  // Basic types
  checkIsString: (data: any) => {
    Precondition.check(typeof data === "string");
  },
  checkIsInteger: (data: any) => {
    Precondition.check(Number.isInteger(data));
  },
  checkIsArray: (data: any) => {
    Precondition.check(Array.isArray(data));
  },
  checkIsBuffer: (data: any) => {
    Precondition.check(Buffer.isBuffer(data));
  },

  // Extended checks
  checkIsUint32: (data: any) => {
    Precondition.checkIsInteger(data);
    Precondition.check(data >= 0);
    Precondition.check(data <= 4294967295);
  },
  checkIsUint8: (data: any) => {
    Precondition.checkIsInteger(data);
    Precondition.check(data >= 0);
    Precondition.check(data <= 255);
  },

  checkIsHexString: (data: any) => {
    Precondition.checkIsString(data);
    Precondition.check(data.length % 2 == 0);
    Precondition.check(/^[0-9a-fA-F]*$/.test(data));
  },
  checkIsValidPath: (path: Array<number>) => {
    Precondition.checkIsArray(path);
    for (const x of path) {
      Precondition.checkIsUint32(x);
    }
  },
  checkIsValidAmount: (amount: string) => {
    Precondition.checkIsString(amount);
    Precondition.check(/^[0-9]*$/.test(amount));
    // Length checks
    Precondition.check(amount.length > 0);
    // Leading zeros
    if (amount.length > 1) {
      Precondition.check(amount[0] != "0");
    }
  }
};

export const Assert = {
  assert: (cond: boolean) => {
    if (!cond) throw new Error("Assertion failed");
  }
};

export function uint8_to_buf(value: number): Buffer {
  Precondition.checkIsUint8(value);

  const data = Buffer.alloc(1);
  data.writeUInt8(value, 0);
  return data;
}

export function hex_to_buf(data: string): Buffer {
  Precondition.checkIsHexString(data);
  return Buffer.from(data, "hex");
}

export function buf_to_hex(data: Buffer): string {
  return data.toString("hex");
}

// no buf_to_uint8

export function path_to_buf(path: Array<number>): Buffer {
  Precondition.checkIsValidPath(path);

  const data = Buffer.alloc(1 + 4 * path.length);
  data.writeUInt8(path.length, 0);

  for (let i = 0; i < path.length; i++) {
    data.writeUInt32BE(path[i], 1 + i * 4);
  }
  return data;
}

const sum = (arr: Array<number>) => arr.reduce((x, y) => x + y, 0);

export function chunkBy(data: Buffer, chunkLengths: Array<number>) {
  Precondition.checkIsBuffer(data);
  Precondition.checkIsArray(chunkLengths);
  for (const len of chunkLengths) {
    Precondition.checkIsInteger(len);
    Precondition.check(len > 0);
  }
  Precondition.check(data.length <= sum(chunkLengths));

  let offset = 0;
  const result = [];

  const restLength = data.length - sum(chunkLengths);

  for (let c of [...chunkLengths, restLength]) {
    result.push(data.slice(offset, offset + c));

    offset += c;
  }

  return result;
}

export function stripRetcodeFromResponse(response: Buffer): Buffer {
  Precondition.checkIsBuffer(response);
  Precondition.check(response.length >= 2);

  const L = response.length - 2;
  const retcode = response.slice(L, L + 2);

  if (retcode.toString("hex") != "9000")
    throw new Error(`Invalid retcode ${retcode.toString("hex")}`);
  return response.slice(0, L);
}

export function buf_to_amount(data: Buffer): string {
  Precondition.checkIsBuffer(data);
  Precondition.check(data.length == 8);

  const encoded = bs10.encode(data);
  // Strip leading zeros
  return encoded.replace(/^0*(.)/, "$1");
}

export function amount_to_buf(amount: string): Buffer {
  Precondition.checkIsValidAmount(amount);

  const data = bs10.decode(amount);
  // Amount should fit uin64_t
  Assert.assert(data.length <= 8);

  const padding = Buffer.alloc(8 - data.length);
  return Buffer.concat([padding, data]);
}

export default {
  HARDENED,

  hex_to_buf,
  buf_to_hex,

  uint32_to_buf,
  buf_to_uint32,

  // no pair for now
  uint8_to_buf,

  // no pair for now
  path_to_buf,

  amount_to_buf,
  buf_to_amount,

  chunkBy,
  stripRetcodeFromResponse
};
