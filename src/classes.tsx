import { FileInfoInterface, userAccepts, chunkProgress } from "./interfaces";

export class FileTransfer implements FileInfoInterface {
    constructor(
      readonly name: string,
      readonly size: number,
      readonly totalChunks: number,
      readonly id: string,
      readonly type: string,

      readonly selectedFile: File | null = null, // only sender needs it, just to keep track of what file he needs to send   
      public senderPeerID: string | null = null,
      public receiverPeers: userAccepts[] = [],
      public cancelled: boolean = false, 
      
      // only receiver uses those
      public progress: number | null = null, 
      public last5updates: chunkProgress[] = [],
    ) {}
    
    public setPeerIDs = (senderPeerID: string, receiverPeers: userAccepts[]) => {
        this.senderPeerID = senderPeerID;
        this.receiverPeers = receiverPeers;
    }

    // for receiver
    public appendLast5Chunks = (chunkNumber: number) => {
      const newChunk: chunkProgress = {
        time: Date.now(), 
        chunkNumber,
      };
      this.last5updates.unshift(newChunk);
      if (this.last5updates.length > 5) {
        this.last5updates.pop();
      }
    }

    // for sender
    public setPeerProgress = (peerId: string, progress: number) => {
      const peerIndex = this.receiverPeers.findIndex((peer) => peer.id === peerId);
      if (peerIndex !== -1) {
        this.receiverPeers[peerIndex].progress = progress;
      }
    }
}

export class senderCancelTransferMessage {
  constructor(
    readonly transferID: string,
    readonly messageCode: string = "SENDER_CANCELLED_TRANSFER",
  ) {}
}