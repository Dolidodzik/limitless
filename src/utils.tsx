// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React, {RefObject} from 'react';
import { ChatMessage, ConnectionData, progressUpdateMessage, chunkProgress } from './dataStructures/interfaces';
import { blobDict } from './dataStructures/types';
import { FileTransfer } from './dataStructures/classes'; 
import { AppConfig } from './config';
import { AppGlobals } from './globals/globals';


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

export const sendChunksData = async (file: File, connectionData: ConnectionData, transferID: string) => {

  const chunkSize: number = AppConfig.chunkSize;

  if (!file){
    console.log("NO FILE SELECTED??? BIG ERROR SOMETHING WENT WRONG.");
    return;
  } 

  const totalChunks = calculateTotalChunks(file.size, chunkSize)
  const reader = new FileReader();
  let currentChunk = 0;

  reader.onload = () => {
    const arrayBuffer = reader.result as ArrayBuffer;
    const chunkData = new Uint8Array(arrayBuffer);

    const chunk = {
      dataType: "FILE_CHUNK",
      chunk: chunkData,
      currentChunk,
      totalChunks,
      name: file.name,
      type: file.type,
      transferID: transferID,
      chunkOrder: currentChunk
    };
    
    const doTheSending = async () => {
      connectionData.connection.send(chunk);
  
      if (currentChunk < totalChunks - 1) {
        currentChunk++;
        loadNextChunk();
      }
    }

    const waiter = async() => {

      const fileInfo = AppGlobals.outgoingFileTransfers.find(
        (fileInfo) => fileInfo.id === transferID
      );

      const userAccepts = fileInfo?.receiverPeers.find(
        (peer) => peer.id === connectionData.peerId
      );
      let clientProgress: number = 0;
      if(userAccepts?.progress){
        clientProgress = userAccepts.progress
      }

      // this check makes sure we don't chunk too much of data in advance. It matters only for bigger files tho
      if((totalChunks<100) || (clientProgress+2 >= (currentChunk / totalChunks) * 100)){
        doTheSending();
      } else {
        setTimeout(function () {
          waiter();
        }, 100)
      }
    }
    waiter();
  };

  const loadNextChunk = () => {
    const start = currentChunk * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    reader.readAsArrayBuffer(chunk);
  };

  if(currentChunk <= 0){
    loadNextChunk();
  }
};

export function sendProgressUpdateMessage(progress: number, senderPeerId: string, transferID: string, last5updates: chunkProgress[] | null){ // chunk progress can be null, because if it's just null then it means that we want to set speed to 0 and that's it

  const progressUpdate: progressUpdateMessage = {
    progress: progress,
    transferID: transferID,
    dataType: "TRANSFER_PROGRESS_UPDATE",
    last5updates: last5updates
  }

  // sending progress update to the sender
  AppGlobals.connections
  .filter((c) => c.peerId === senderPeerId)
  .forEach((c) => c.connection.send(progressUpdate));
}

export function transferProgress(last5chunks: chunkProgress[] | null, progress: number | null) {

  // if there's no enough data to approximate speed, or progress is already 100, then just return speed as 0
  if (!last5chunks || last5chunks.length < 2 || progress == 100) {
    return 0;
  }

  const chunkSizeKB = AppConfig.chunkSize / 1024;
  const numberOfChunks = last5chunks.length;
  
  // Calculate the total time taken to upload the chunks (in milliseconds).
  const totalTime = last5chunks[0].time - last5chunks[numberOfChunks - 1].time;

  // Calculate the total size of the chunks (in kilobytes).
  const totalSizeKB = (last5chunks[0].chunkNumber - last5chunks[numberOfChunks - 1].chunkNumber) * chunkSizeKB;

  // Calculate the upload speed (KB/s).
  const uploadSpeedKBps = totalSizeKB / (totalTime / 1000);

  // output is in MB/s rounded to 2 decimal places
  return (uploadSpeedKBps/1024).toFixed(2);
}

// should be called every 500ms. This function loops over every transfer, and checks how progress is going
export function dealWithTransferProgressUpdates(){
  AppGlobals.incomingFileTransfers.forEach((fileTransfer) => {
    let chunks = 0;
    if(AppGlobals.receivedChunks[fileTransfer.id] && AppGlobals.receivedChunks[fileTransfer.id].chunks){
      chunks = AppGlobals.receivedChunks[fileTransfer.id].chunks.length
    }
    fileTransfer.appendLast5Chunks(chunks)
    console.log(fileTransfer.last5updates)
  });
}