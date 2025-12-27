import {NotFoundError} from '../../shared/errors'
import {applyBalanceUpdate, loadUser} from '../../shared/persistence/users';

export async function getMe(userID: string) {
  const user = await loadUser(userID);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

// INTERNAL ONLY — not exposed via HTTP
export async function applyBalanceDelta(
    userID: string, delta: number): Promise<number> {
  return applyBalanceUpdate(userID, delta);
}
