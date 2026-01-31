import {AuthenticationDetails, CognitoUser, CognitoUserAttribute, CognitoUserPool, CognitoUserSession,} from 'amazon-cognito-identity-js';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

import type {User} from '../types/user';
import {COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID} from '../utils/constants';

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_USER_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
});

interface AuthState {
  user: User|null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  signup: (username: string, email: string, password: string) => Promise<void>;
  confirmSignup: (username: string, code: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  setUser: (user: User) => void;

  // Token helpers
  getIdToken: () => Promise<string|null>;
}

export const useAuthStore = create<AuthState>()(persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      signup: async (username: string, email: string, password: string) => {
        return new Promise((resolve, reject) => {
          const attributeList = [
            new CognitoUserAttribute({Name: 'email', Value: email}),
          ];

          userPool.signUp(username, password, attributeList, [], (err) => {
            if (err) {
              reject(new Error(err.message || 'Signup failed'));
              return;
            }
            // User created but needs confirmation
            resolve();
          });
        });
      },

      confirmSignup: async (username: string, code: string) => {
        return new Promise((resolve, reject) => {
          const cognitoUser = new CognitoUser({
            Username: username,
            Pool: userPool,
          });

          cognitoUser.confirmRegistration(code, true, (err) => {
            if (err) {
              reject(new Error(err.message || 'Confirmation failed'));
              return;
            }
            resolve();
          });
        });
      },

      login: async (username: string, password: string) => {
        set({isLoading: true});

        return new Promise((resolve, reject) => {
          const cognitoUser = new CognitoUser({
            Username: username,
            Pool: userPool,
          });

          const authDetails = new AuthenticationDetails({
            Username: username,
            Password: password,
          });

          cognitoUser.authenticateUser(authDetails, {
            onSuccess: async (session: CognitoUserSession) => {
              const idToken = session.getIdToken();
              const payload = idToken.decodePayload();

              // Set basic user info from token
              const user: User = {
                userID: payload.sub,
                username: payload['cognito:username'],
                balance: 0,  // Will be updated by /me call
              };

              set({user, isAuthenticated: true, isLoading: false});
              resolve();
            },
            onFailure: (err) => {
              set({isLoading: false});
              reject(new Error(err.message || 'Login failed'));
            },
            newPasswordRequired: () => {
              set({isLoading: false});
              reject(new Error('Password change required'));
            },
          });
        });
      },

      logout: () => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
          cognitoUser.signOut();
        }
        set({user: null, isAuthenticated: false});
      },

      refreshSession: async () => {
        return new Promise((resolve, reject) => {
          const cognitoUser = userPool.getCurrentUser();
          if (!cognitoUser) {
            set({user: null, isAuthenticated: false});
            reject(new Error('No user session'));
            return;
          }

          cognitoUser.getSession(
              (err: Error|null, session: CognitoUserSession|null) => {
                if (err || !session) {
                  set({user: null, isAuthenticated: false});
                  reject(new Error('Session expired'));
                  return;
                }

                if (session.isValid()) {
                  const idToken = session.getIdToken();
                  const payload = idToken.decodePayload();

                  set({
                    user: {
                      userID: payload.sub,
                      username: payload['cognito:username'],
                      balance: get().user?.balance || 0,
                    },
                    isAuthenticated: true,
                  });
                  resolve();
                } else {
                  // Try to refresh
                  const refreshToken = session.getRefreshToken();
                  cognitoUser.refreshSession(
                      refreshToken, (refreshErr, newSession) => {
                        if (refreshErr || !newSession) {
                          set({user: null, isAuthenticated: false});
                          reject(new Error('Failed to refresh session'));
                          return;
                        }
                        resolve();
                      });
                }
              });
        });
      },

      setUser: (user: User) => set({user, isAuthenticated: true}),

      getIdToken: async () => {
        return new Promise((resolve) => {
          const cognitoUser = userPool.getCurrentUser();
          if (!cognitoUser) {
            resolve(null);
            return;
          }

          cognitoUser.getSession(
              (err: Error|null, session: CognitoUserSession|null) => {
                if (err || !session || !session.isValid()) {
                  resolve(null);
                  return;
                }
                resolve(session.getIdToken().getJwtToken());
              });
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }));