import {createUser, loadUser} from '../../shared/persistence/users';

const DEFAULT_STARTING_BALANCE = 10000;

/**
 * Syncs a Cognito user to DynamoDB. Called after successful Cognito signup
 * or on first authenticated request if user doesn't exist yet.
 *
 * Returns the user record (existing or newly created).
 */
export async function syncUser(userID: string, username: string):
    Promise<{userID: string; username: string; balance: number}> {
  // Check if user already exists
  const existing = await loadUser(userID);
  if (existing) {
    return existing;
  }

  // Create new user with starting balance
  await createUser(userID, username, DEFAULT_STARTING_BALANCE);

  return {
    userID,
    username,
    balance: DEFAULT_STARTING_BALANCE,
  };
}

/**
 * Gets user profile. Throws if user doesn't exist.
 */
export async function getMe(userID: string):
    Promise<{userID: string; username: string; balance: number}> {
  const user = await loadUser(userID);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}