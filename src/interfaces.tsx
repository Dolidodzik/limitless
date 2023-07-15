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
  isAccepted: boolean,
  progress: number | null, 
}

export function isFileInfoObject(obj: any): obj is FileInfoInterface {
  return obj.type === 'fileInfo';
}