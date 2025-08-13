import { WebSocket, WebSocketServer } from 'ws';
import type { NetworkMessage } from '../types/server';

type PlayerConnection = {
  id: string;
  ws: WebSocket;
  messageQueue: NetworkMessage[];
  isAlive: boolean;
};

export class NetworkManager {
  private wss: WebSocketServer;
  private onPlayerConnect: (ws: WebSocket) => void;
  private connections: Map<string, PlayerConnection>;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(port: number, onPlayerConnect: (ws: WebSocket) => void) {
    this.wss = new WebSocketServer({ 
      port,
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: { level: 3 },
        zlibInflateOptions: { level: 3 },
        serverNoContextTakeover: true,
        clientNoContextTakeover: true,
        threshold: 1024,
        concurrencyLimit: 10,
      },
    });
    
    this.onPlayerConnect = onPlayerConnect;
    this.connections = new Map();
    this.setupWebSocket();
    this.setupHeartbeat();
    console.log(`✅ NetworkManager ready on port ${port}!`);
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = req.headers['sec-websocket-key'] || Math.random().toString(36).substring(2, 15);
      
      // Set up connection
      const connection: PlayerConnection = {
        id: connectionId,
        ws,
        messageQueue: [],
        isAlive: true,
      };
      
      this.connections.set(connectionId, connection);
      
      // Set up heartbeat
      ws.on('pong', () => {
        const conn = this.connections.get(connectionId);
        if (conn) conn.isAlive = true;
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.cleanupConnection(connectionId);
      });
      
      // Handle close
      ws.on('close', () => {
        this.cleanupConnection(connectionId);
      });
      
      // Process any queued messages
      this.processMessageQueue(connectionId);
      
      // Notify server of new connection
      this.onPlayerConnect(ws);
    });
    
    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }
  
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        if (!connection.isAlive) {
          console.log(`Terminating connection ${connectionId} - no heartbeat`);
          return this.cleanupConnection(connectionId);
        }
        
        connection.isAlive = false;
        connection.ws.ping(() => {});
      });
    }, this.HEARTBEAT_INTERVAL);
  }
  
  private cleanupConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.terminate();
      }
    } catch (error) {
      console.error('Error closing connection:', error);
    }
    
    this.connections.delete(connectionId);
  }
  
  private processMessageQueue(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    while (connection.messageQueue.length > 0 && connection.ws.readyState === WebSocket.OPEN) {
      const message = connection.messageQueue.shift();
      if (message) {
        this.send(connection.ws, message);
      }
    }
  }

  public send(ws: WebSocket, message: NetworkMessage): boolean {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  public sendWithRetry(ws: WebSocket, message: NetworkMessage, maxRetries = 3): void {
    let attempts = 0;
    const connection = Array.from(this.connections.values()).find(conn => conn.ws === ws);
    
    if (!connection) {
      console.warn('No connection found for WebSocket');
      return;
    }
    
    const trySend = () => {
      if (attempts >= maxRetries) {
        console.warn(`Max retries (${maxRetries}) reached for message:`, message.type);
        return;
      }
      
      attempts++;
      
      if (ws.readyState === WebSocket.OPEN) {
        if (!this.send(ws, message)) {
          setTimeout(trySend, 1000 * attempts); // Exponential backoff
        }
      } else {
        // Queue message if connection is not ready
        connection.messageQueue.push(message);
        
        // Try to process queue after a delay
        setTimeout(() => this.processMessageQueue(connection.id), 1000);
      }
    };
    
    trySend();
  }

  public broadcast(players: Array<{ id: string; ws: WebSocket }>, message: NetworkMessage): void {
    const messageStr = JSON.stringify(message);
    players.forEach(player => {
      try {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(messageStr);
        } else {
          // Queue message for later delivery
          const connection = Array.from(this.connections.values())
            .find(conn => conn.ws === player.ws);
          if (connection) {
            connection.messageQueue.push(message);
          }
        }
      } catch (error) {
        console.error(`Error broadcasting to player ${player.id}:`, error);
      }
    });
  }

  public broadcastToOthers(players: Array<{ id: string; ws: WebSocket }>, excludePlayerId: string, message: NetworkMessage): void {
    players.forEach(player => {
      if (player.id !== excludePlayerId) {
        this.sendWithRetry(player.ws, message);
      }
    });
  }
  
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    this.connections.forEach(connection => {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.terminate();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    
    this.connections.clear();
    
    // Close the server
    this.wss.close((error) => {
      if (error) {
        console.error('Error closing WebSocket server:', error);
      } else {
        console.log('WebSocket server closed');
      }
    });
  }
}
