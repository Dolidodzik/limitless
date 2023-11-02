// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React, {RefObject} from 'react';
import { ChatMessage, ConnectionData, progressUpdateMessage, chunkProgress } from '../dataStructures/interfaces';
import { blobDict } from '../dataStructures/types';
import { FileTransfer } from '../dataStructures/classes'; 
import { AppConfig } from '../config';
import { AppGlobals } from '../globals/globals';
import { sendSomeData } from './senderFunctions';


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

export function transferProgressSpeed(last5chunks: chunkProgress[] | null, progress: number | null) {

  // if there's no enough data to approximate speed, or progress is already 100, then just return speed as 0
  if (!last5chunks || last5chunks.length < 2 || progress == 100) {
    return 0;
  }

  const chunkSizeKB = AppConfig.chunkSize / 1000;
  const numberOfChunks = last5chunks.length;
  
  // Calculate the total time taken to upload the chunks (in milliseconds).
  const totalTime = last5chunks[0].time - last5chunks[numberOfChunks - 1].time;

  // Calculate the total size of the chunks (in kilobytes).
  const totalSizeKB = (last5chunks[0].chunkNumber - last5chunks[numberOfChunks - 1].chunkNumber) * chunkSizeKB;

  // Calculate the upload speed (KB/s).
  const uploadSpeedKBps = totalSizeKB / (totalTime / 1000);

  // output is in MB/s rounded to 2 decimal places
  return (uploadSpeedKBps/1000)
}

export function transferProgressSize(last5chunks: chunkProgress[] | null, totalChunks: number){

  if(!last5chunks || !last5chunks[0])
    return;

  const chunkSizeKB = AppConfig.chunkSize / 1000;
  const fullSize = (totalChunks * chunkSizeKB / 1000).toFixed(2)
  const alreadyTransferredSize = (last5chunks[0].chunkNumber * chunkSizeKB / 1000).toFixed(2)

  return alreadyTransferredSize+ "MB / "+ fullSize +"MB "
}

export function transferProgressEstimatedTime(last5chunks: chunkProgress[] | null, totalChunks: number, progress: number | null){

  console.log("SIMA: ", last5chunks, " : ", totalChunks, " : ", progress)

  if(progress == 100)
    return 0

  if(!last5chunks || last5chunks.length < 2)
    return;

  const chunkSizeKB = AppConfig.chunkSize / 1000;

  const fullSize = (totalChunks * chunkSizeKB / 1000)
  const alreadyTransferredSize = (last5chunks[0].chunkNumber * chunkSizeKB / 1000)

  const MBsLeftToTransfer = fullSize - alreadyTransferredSize;
  const uploadSpeedMBps = transferProgressSpeed(last5chunks, progress);

  const timeLeft = MBsLeftToTransfer / uploadSpeedMBps; // in seconds

  console.log(timeLeft)

  return timeLeft;
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