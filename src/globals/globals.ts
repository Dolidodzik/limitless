import { blobDict } from '../types';
import { FileTransfer } from '../classes';
import { ConnectionData } from '../interfaces';

export namespace AppGlobals {
    export const receivedChunks: blobDict = {};
    export const outgoingFileTransfers: FileTransfer[] = [];
    export const incomingFileTransfers: FileTransfer[] = [];
    export const connections: ConnectionData[] = [];
}