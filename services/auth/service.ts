import {createHash, randomUUID} from 'crypto';

import {createUser, getAuthByUsername} from '../../shared/persistence/users';


export async function signup(
    username: string, password: string): Promise<string> {
  if (!username || !password) {
    throw new Error('Invalid input');
  }

  const userID = randomUUID();

  const hash = createHash('sha256');
  hash.update(password);
  password = hash.digest('hex');

  return await createUser(userID, username, password, 1000);
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