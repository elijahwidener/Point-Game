
import {WS_URL} from '../utils/constants';

export type ConnectionStatus =
    'disconnected'|'connecting'|'connected'|'reconnecting';

export interface WSMessage {
  type: 'state'|'action'|'system'|'error';
  payload: any;
}

export interface WebSocketCallbacks {
  onStateUpdate: (state: any) => void;
  onActionReceived: (action: any) => void;
  onSystemMessage: (event: string, data?: any) => void;
  onError: (error: {code: number; message: string}) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export class TableWebSocket {
  private ws: WebSocket|null = null;
  private tableID: string;
  private userID: string;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private lastKnownSeq: number|null = null;

  constructor(tableID: string, userID: string, callbacks: WebSocketCallbacks) {
    this.tableID = tableID;
    this.userID = userID;
    this.callbacks = callbacks;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Websocket already connected');
      return;
    }

    this.intentionalClose = false;
    this.callbacks.onStatusChange('connecting');

    const url = `${WS_URL}?tableID=${this.tableID}&userID=${this.userID}`;
    console.log('Connecting to WebSocket:', url);

    this.ws = new WebSocket(url);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  disconnect(): void {
    this.intentionalClose = true;

    if (this.ws) {
      this.ws.close(1000, 'Client Disconnecting');
      this.ws = null;
    }

    this.callbacks.onStatusChange('disconnected')
  }

  sendAction(action: string, payload?: any): void {
    this.send({
      type: 'player_action',
      tableID: this.tableID,
      userID: this.userID,
      action,
      payload
    });
  }

  requestResync(): void {
    console.log('Requesting Resync...');
    this.send({type: 'resync', tableID: this.tableID});
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message - WebSocket not connected');
    }
  }


  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.callbacks.onStatusChange('connected');
    this.requestResync();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'state':
          this.handleStateMessage(message.payload);
          break;

        case 'action':
          this.handleActionMessage(message.payload);
          break;
        case 'system':
          this.callbacks.onSystemMessage(
              message.payload.event, message.payload);
          break;

        case 'error':
          this.callbacks.onError(message.payload);
          break;

        default:
          console.warn('Unknown message: ', message.type);
      }
    } catch (error: any) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Always accepts and updates the sequence number
   * @param state The true game state
   */
  private handleStateMessage(state: any): void {
    this.lastKnownSeq = state.gameSeq;
    this.callbacks.onStateUpdate(state);
  }

  /**
   * Verifies the action seq, requests resync if stale. Processes action
   * otherwise
   */
  private handleActionMessage(actionPayLoad: any): void {
    const {gameSeq} = actionPayLoad;

    if (this.lastKnownSeq !== null && this.lastKnownSeq + 1 !== gameSeq) {
      console.warn(`Sequence mismatch: expected ${this.lastKnownSeq + 1}, got ${
          gameSeq}`);
      this.requestResync();
      return;
    }

    this.lastKnownSeq = gameSeq;
    this.callbacks.onActionReceived(actionPayLoad);
  }

  /**
   * closes ws. Attempts reconnects is closure was not intentional
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.ws = null;
    if (this.intentionalClose) {
      this.callbacks.onStatusChange('disconnected');
      return;
    }

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAYS[this.reconnectAttempts] ||
          RECONNECT_DELAYS[RECONNECT_DELAYS.length - 1];
      console.log(`Reconnecting in ${delay}ms (attempt ${
          this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      this.callbacks.onStatusChange('reconnecting');
      this.reconnectAttempts++;

      setTimeout(() => {
        if (!this.intentionalClose) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.callbacks.onStatusChange('disconnected');
      this.callbacks.onError(
          {code: 0, message: 'Connection lost. Please refresh the page.'});
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
  }
}

export function createTableConnection(
    tableID: string, userID: string,
    callbacks: WebSocketCallbacks): TableWebSocket {
  return new TableWebSocket(tableID, userID, callbacks);
}
