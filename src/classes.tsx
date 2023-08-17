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
      public progress: number | null = null, // when progress is null, it means upload itself didn't start yet. Progress shouldn't be more than 100 or less than 0. ACTUALLY - this progress is kind of useless, it just tells how much chunking progression was done. Let's keep it, but use progress from receiverPeers[i].progress - it tells actual progress that client has.
      public cancelled: boolean = false  
    ) {}
    
    public setPeerIDs = (senderPeerID: string, receiverPeers: userAccepts[]) => {
        this.senderPeerID = senderPeerID;
        this.receiverPeers = receiverPeers;
    }

    public setPeerProgress = (peerId: string, progress: number) => {
      console.log("set peer progress here")
      const peerIndex = this.receiverPeers.findIndex((peer) => peer.id === peerId);
      if (peerIndex !== -1) {
        console.log("ACTUALLY SETTING PROGRESS")
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