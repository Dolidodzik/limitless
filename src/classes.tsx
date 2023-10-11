import { FileInfoInterface, userAccepts, chunkProgress } from "./interfaces";
import { uploadProgress } from "./utils"

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
      public cancelled: boolean = false, 
      // only receiver uses those
      public progress: number | null = null, 
      public last5chunks: chunkProgress[] = [],
    ) {}
    
    public setPeerIDs = (senderPeerID: string, receiverPeers: userAccepts[]) => {
        this.senderPeerID = senderPeerID;
        this.receiverPeers = receiverPeers;
    }

    public setPeerProgress = (peerId: string, progress: number) => {
      const peerIndex = this.receiverPeers.findIndex((peer) => peer.id === peerId);
      if (peerIndex !== -1) {
        this.receiverPeers[peerIndex].progress = progress;
      }
    }

    public appendLast5Chunks = (chunkNumber: number) => {
      const newChunk: chunkProgress = {
        time: Date.now(), 
        chunkNumber,
      };
      this.last5chunks.unshift(newChunk);
      if (this.last5chunks.length > 5) {
        this.last5chunks.pop();
      }
      console.log("LAST 5 CHUNKSS")
      console.log(this.last5chunks)
      console.log(uploadProgress(this.last5chunks))
    }
  }

export class senderCancelTransferMessage {
  constructor(
    readonly transferID: string,
    readonly messageCode: string = "SENDER_CANCELLED_TRANSFER",
  ) {}
}