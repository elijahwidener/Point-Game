export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    'https://52keqe3is0.execute-api.us-east-1.amazonaws.com/prod';

export const WS_URL = import.meta.env.VITE_WS_URL ||
    'wss://xejlkvd34m.execute-api.us-east-1.amazonaws.com/prod';

export const ROUTES = {
  HOME: '/',
  RULES: '/rules',
  ABOUT: '/about',
  DONATE: '/donate',
  LOBBY: '/lobby',
  TABLE: '/table/:tableID',
  HAND_HISTORY: '/hand-history',
} as const;