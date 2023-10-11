import { DataConnection } from 'peerjs';

export interface ChatMessage {
  peerId: string;
  message: string;
}
  
export interface ConnectionData {
  connection: DataConnection;
  peerId: string;
}

export interface FileInfoInterface {
  name: string,
  size: number,
  totalChunks: number,
  id: string,
  type: string,
  progress: number | null, 
}

export interface userAccepts {
  id: string,
  isAccepted: boolean,
  progress: number | null
}

export interface progressUpdateMessage {
  dataType: string,
  transferID: string,
  progress: number
}

export interface chunkProgress {
  time: number, // timestamp with miliseconds
  chunkNumber: number
}