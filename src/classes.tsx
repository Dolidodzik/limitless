import { FileInfoInterface } from "./interfaces";

export class FileInfo implements FileInfoInterface {
    constructor(
      readonly name: string,
      readonly size: number,
      readonly totalChunks: number,
      readonly id: string,
      readonly type: string,
      public isAccepted: boolean,
      public senderPeerID: string | null = null,
      public receiverPeerIDs: string[] | null = null,
      public progress: number | null = null, // when progress is null, it means upload itself didn't start yet. Progress shouldn't be more than 100 or less than 0.
    ) {}
    
    
    public setPeerIDs = (senderPeerID: string, receiverPeerIDs: string[]) => {
        this.senderPeerID = senderPeerID;
        this.receiverPeerIDs = receiverPeerIDs;
    }
  }