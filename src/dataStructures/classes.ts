import { FileInfoInterface, userAccepts, chunkProgress } from "./interfaces";

export class FileTransfer implements FileInfoInterface {
    constructor(
      readonly name: string,
      readonly size: number,
      readonly totalChunks: number,
      readonly id: string,
      readonly type: string,

      readonly selectedFile: File | null = null, // only sender needs it, just to keep track of what file he needs to send   
      public isPaused: boolean = false,
      public senderPeerID: string | null = null,
      public receiverPeers: userAccepts[] = [],
      
      // only receiver uses those
      public progress: number | null = null, 
      public last5updates: chunkProgress[] = [],
      public isAborted: boolean = false
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
    public setPeerProgress = (peerId: string, progress: number, last5updates: chunkProgress[] | null) => {
      const peerIndex = this.receiverPeers.findIndex((peer) => peer.id === peerId);
      if (peerIndex !== -1) {
        this.receiverPeers[peerIndex].progress = progress;
        this.receiverPeers[peerIndex].last5updates = last5updates;
      }
    }

}

export class senderCancelTransferMessage {
  constructor(
    readonly transferID: string,
    readonly dataType: string = "SENDER_CANCELLED_TRANSFER"
  ) {}
}
export class receiverCancelTransferMessage {
  constructor(
    readonly transferID: string,
    readonly dataType: string = "RECEIVER_CANCELLED_TRANSFER"
  ) {}
}