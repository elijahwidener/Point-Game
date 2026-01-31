export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    'https://52keqe3is0.execute-api.us-east-1.amazonaws.com/prod';

export const WS_URL = import.meta.env.VITE_WS_URL ||
    'wss://xejlkvd34m.execute-api.us-east-1.amazonaws.com/prod';

export const COGNITO_USER_POOL_ID =
    import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_SlElqw6VR';

export const COGNITO_CLIENT_ID =
    import.meta.env.VITE_COGNITO_CLIENT_ID || '1nu7qgectcu1nvmehb6ha2rjvl';

export const COGNITO_REGION =
    import.meta.env.VITE_COGNITO_REGION || 'us-east-1';

export const ROUTES = {
  HOME: '/',
  RULES: '/rules',
  ABOUT: '/about',
  DONATE: '/donate',
  LOBBY: '/lobby',
  TABLE: '/table/:tableID',
  HAND_HISTORY: '/hand-history',
} as const;