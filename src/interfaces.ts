import { DataConnection } from 'peerjs';

export interface chunkProgress {
  time: number, // timestamp with miliseconds
  chunkNumber: number
}

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
  progress: number | null,
  last5updates: chunkProgress[] | null // last5updates can be always null, if there's not progress yet, or when progress is over, we want to set speed to 0 and that's just it
}

export interface progressUpdateMessage {
  dataType: string,
  transferID: string,
  progress: number
  last5updates: chunkProgress[] | null // last5updates can be always null, if there's not progress yet, or when progress is over, we want to set speed to 0 and that's just it
}

