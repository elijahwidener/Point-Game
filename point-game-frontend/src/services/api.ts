import {useAuthStore} from '../stores/authStore';
import type {GameTable, TableConfig} from '../types/game';
import type {AuthResponse, User} from '../types/user';
import {API_BASE_URL} from '../utils/constants';


class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await useAuthStore.getState().getIdToken();
    if (!token) {
      throw new Error('Not Authenticated');
    } else {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  async syncUser(): Promise<User> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/auth/sync`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sync failed');
    }

    return response.json();
  }

  async getMe(): Promise<User> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/me`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  // Tables
  async getTables(): Promise<{tables: GameTable[]}> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tables');
    }

    return response.json();
  }

  async createTable(userID: string, tableName: string, config: TableConfig):
      Promise<string> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables`, {
      method: 'POST',
      headers,
      body: JSON.stringify({tableName, config}),
    });

    if (!response.ok) {
      throw new Error('Failed to create table');
    }

    return response.json();  // Returns tableID
  }

  async sitDown(tableID: string, buyIn: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables/${tableID}/sit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({buyIn}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sit down');
    }
  }

  async startGame(tableID: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables/${tableID}/start`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to start game');
    }
  }

  async togglePause(tableID: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response =
        await fetch(`${this.baseURL}/tables/${tableID}/pause_unpause`, {
          method: 'POST',
          headers,
        });

    if (!response.ok) {
      throw new Error('Failed to toggle pause');
    }
  }

  async endGame(tableID: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables/${tableID}/end`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to end game');
    }
  }

  async leaveSeat(tableID: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables/${tableID}/leave`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to leave seat');
    }
  }

  async toggleAway(tableID: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response =
        await fetch(`${this.baseURL}/tables/${tableID}/toggleAway`, {
          method: 'POST',
          headers,
        });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle sit out');
    }
  }

  async getTable(tableID: string): Promise<GameTable> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/tables/${tableID}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch table');
    }

    return response.json();
  }
}

export const api = new ApiService();