import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const HASH_PATTERN = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: Readonly<{ N: number; maxmem: number; p: number; r: number }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new TypeError("密码不得为空");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 32 * 1024 * 1024,
  });

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const match = HASH_PATTERN.exec(encodedHash);

  if (!match) {
    return false;
  }

  const [, costText, blockSizeText, parallelizationText, saltText, hashText] = match;
  const cost = Number(costText);
  const blockSize = Number(blockSizeText);
  const parallelization = Number(parallelizationText);

  if (cost !== COST || blockSize !== BLOCK_SIZE || parallelization !== PARALLELIZATION) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText ?? "", "base64url");
    const storedHash = Buffer.from(hashText ?? "", "base64url");

    if (salt.length !== SALT_LENGTH || storedHash.length !== KEY_LENGTH) {
      return false;
    }

    const candidate = await deriveKey(password, salt, storedHash.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 32 * 1024 * 1024,
    });

    return timingSafeEqual(candidate, storedHash);
  } catch {
    return false;
  }
}
