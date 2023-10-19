import { blobDict } from '../dataStructures/types';
import { FileTransfer } from '../dataStructures/classes';
import { ConnectionData } from '../dataStructures/interfaces';

export namespace AppGlobals {
    export const receivedChunks: blobDict = {};
    export const outgoingFileTransfers: FileTransfer[] = [];
    export const incomingFileTransfers: FileTransfer[] = [];
    export const connections: ConnectionData[] = [];
}