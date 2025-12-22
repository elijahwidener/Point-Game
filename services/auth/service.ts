import {createHash, randomUUID} from 'crypto';

import {createUser, getAuthByUsername} from '../../shared/persistence/users';


export async function signup(
    username: string, password: string): Promise<string> {
  if (!username || !password) {
    throw new Error('Invalid input');
  }

  const existing = await getAuthByUsername(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const userID = randomUUID();

  const hash = createHash('sha256');
  hash.update(password);
  const hashedPassword = hash.digest('hex');
  await createUser(userID, username, hashedPassword, 1000);
  return userID;
}

export async function login(
    username: string, password: string): Promise<string> {
  if (!username || !password) {
    throw new Error('Invalid input');
  }

  const credentials = await getAuthByUsername(username);
  if (!credentials) {
    throw new Error('Invalid input');
  }

  const hash = createHash('sha256');
  hash.update(password);
  const passwordHash = hash.digest('hex');
  if (credentials.passwordHash != passwordHash) {
    throw new Error('Username and Password do not match!')
  }

  return credentials.userID;
}