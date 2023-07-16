import { FileInfoInterface, userAccepts } from "./interfaces";

export class FileInfo implements FileInfoInterface {
    constructor(
      readonly name: string,
      readonly size: number,
      readonly totalChunks: number,
      readonly id: string,
      readonly type: string,
      readonly selectedFile: File | null = null, // only sender needs it, just to keep track of what file he needs to send   
      public senderPeerID: string | null = null,
      public receiverPeers: userAccepts[] = [],
      public progress: number | null = null, // when progress is null, it means upload itself didn't start yet. Progress shouldn't be more than 100 or less than 0.
    ) {}
    
    public setPeerIDs = (senderPeerID: string, receiverPeers: userAccepts[]) => {
        this.senderPeerID = senderPeerID;
        this.receiverPeers = receiverPeers;
    }
  }