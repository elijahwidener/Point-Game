import type {GameTable, TableConfig} from '../types/game';
import type {AuthResponse, User} from '../types/user';
import {API_BASE_URL} from '../utils/constants';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Auth
  async signup(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async getMe(userID: string): Promise<User> {
    const response = await fetch(`${this.baseURL}/me?userID=${userID}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  // Tables
  async getTables(): Promise<{tables: GameTable[]}> {
    const response = await fetch(`${this.baseURL}/tables`);

    if (!response.ok) {
      throw new Error('Failed to fetch tables');
    }

    return response.json();
  }

  async createTable(userID: string, tableName: string, config: TableConfig):
      Promise<string> {
    const response = await fetch(`${this.baseURL}/tables`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userID, tableName, config}),
    });

    if (!response.ok) {
      throw new Error('Failed to create table');
    }

    return response.json();  // Returns tableID
  }

  async sitDown(tableID: string, userID: string, buyIn: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/tables/${tableID}/sit`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userID, buyIn}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sit down');
    }
  }

  async startGame(tableID: string, userID: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/tables/${tableID}/start`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userID}),
    });

    if (!response.ok) {
      throw new Error('Failed to start game');
    }
  }

  async togglePause(tableID: string, userID: string): Promise<void> {
    const response =
        await fetch(`${this.baseURL}/tables/${tableID}/pause_unpause`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userID}),
        });

    if (!response.ok) {
      throw new Error('Failed to toggle pause');
    }
  }

  async endGame(tableID: string, userID: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/tables/${tableID}/end`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userID}),
    });

    if (!response.ok) {
      throw new Error('Failed to end game');
    }
  }

  async leaveSeat(tableID: string, userID: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/tables/${tableID}/leave`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userID}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to leave seat');
    }
  }

  async toggleAway(tableID: string, userID: string): Promise<void> {
    const response =
        await fetch(`${this.baseURL}/tables/${tableID}/toggleAway`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userID}),
        });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle sit out');
    }
  }

  async getTable(tableID: string): Promise<GameTable> {
    const response = await fetch(`${this.baseURL}/tables/${tableID}`);

    if (!response.ok) {
      throw new Error('Failed to fetch table');
    }

    return response.json();
  }
}

export const api = new ApiService();