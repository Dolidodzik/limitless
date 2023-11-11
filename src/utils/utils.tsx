// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import { progressUpdateMessage, chunkProgress } from '../dataStructures/interfaces';
import { AppConfig } from '../config';
import { AppGlobals } from '../globals/globals';
import { sendSomeData } from './senderFunctions';
import { FileTransfer } from '../dataStructures/classes';


export function generateRandomString(length: number): string {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

export function calculateTotalChunks(fileSize: number, chunkSize: number): number{
  return Math.ceil(fileSize / chunkSize);
}

export function isJsonString(str: string): boolean {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}

export function generateRandomNickname(){
  let result = '';
  const characters = '0123456789';

  // random 5 numbers just for now, later we can replace generating random usernames with usernames from either discord, chosen manually by user or whatever else
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return "User"+result;
}

export function sendProgressUpdateMessage(progress: number, senderPeerId: string, transferID: string, last5updates: chunkProgress[]){ // chunk progress can be null, because if it's just null then it means that we want to set speed to 0 and that's it
  // sending progress update to the sender
  const progressUpdate: progressUpdateMessage = {
    progress: progress,
    transferID: transferID,
    dataType: "TRANSFER_PROGRESS_UPDATE",
    last5updates: last5updates
  }
  sendSomeData(progressUpdate, senderPeerId);
}



export function uploadProgressValues(transfer: FileTransfer, receiverId: string | null = null){

  let receiverPeer = transfer.receiverPeers.find(obj => {
    return obj.id === receiverId
  })

  let last5updates;
  if(!receiverPeer){ // means this peer is receiver
    last5updates = transfer.last5updates;
  } else if(receiverPeer) { // means this peer is sender
    last5updates = receiverPeer.last5updates;
  } else {
    console.log("not enough data to calucuate progress")
    return "nothing"
  }

  if(!last5updates){
    return "nothing"
  }

  const chunkSizeKB = AppConfig.chunkSize / 1000;
  const fullSize = (transfer.totalChunks * chunkSizeKB / 1000)
  const alreadyTransferredSize = (last5updates[0].chunkNumber * chunkSizeKB / 1000)

  if(transfer.isPaused === true || transfer.progress === 100 || transfer.isAborted){
    return {
      fullSize: fullSize.toFixed(2), // in MB
      alreadyTransferredSize: alreadyTransferredSize.toFixed(2), // in MB
      timeLeft: 0, // in seconds
      speed: 0 // in MBps
    }
  }

  const numberOfChunks = last5updates.length;
  // Calculate the total time taken to upload the chunks (in milliseconds).
  const totalTime = last5updates[0].time - last5updates[numberOfChunks - 1].time;
  // Calculate the total size of the chunks (in kilobytes).
  const totalSizeKB = (last5updates[0].chunkNumber - last5updates[numberOfChunks - 1].chunkNumber) * chunkSizeKB;
  // Calculate the upload speed (MB/s).
  const uploadSpeedMBps = (totalSizeKB / (totalTime / 1000)) / 1000;

  const MBsLeftToTransfer = fullSize - alreadyTransferredSize;
  const timeLeft = MBsLeftToTransfer / uploadSpeedMBps; 
  
  return {
    fullSize: fullSize.toFixed(2), 
    alreadyTransferredSize: alreadyTransferredSize.toFixed(2), 
    timeLeft: timeLeft.toFixed(2), 
    speed: uploadSpeedMBps.toFixed(2)
  }
}

// should be called every 500ms. This function loops over every transfer, and checks how progress is going
export function dealWithTransferProgressUpdates(forceUpdate: () => void){
  AppGlobals.incomingFileTransfers.forEach((fileTransfer) => {
    let chunks = 0;
    if(AppGlobals.receivedChunks[fileTransfer.id] && AppGlobals.receivedChunks[fileTransfer.id].chunks){
      chunks = AppGlobals.receivedChunks[fileTransfer.id].chunks.length
    }
    fileTransfer.appendLast5Chunks(chunks)
    
    // sending update to sender of the file about progress
    if(fileTransfer.senderPeerID && fileTransfer.progress){
      sendProgressUpdateMessage(
        fileTransfer.progress,
        fileTransfer.senderPeerID,
        fileTransfer.id,
        fileTransfer.last5updates
      );
    }

    forceUpdate();
  });
}