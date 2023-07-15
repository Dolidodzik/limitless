import { DataConnection } from 'peerjs';

export interface ChatMessage {
    peerId: string;
    message: string;
  }
  
export interface ConnectionData {
    connection: DataConnection;
    peerId: string;
  }