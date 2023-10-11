// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React from 'react';
import { ChatMessage, ConnectionData, progressUpdateMessage } from './interfaces';
import { blobDict } from './types';
import { FileInfo } from './classes'; 

export function ChatRenderer(chatLogs: ChatMessage[], ownId: string) {
    return (
      <div>
        <h2>Chat logs:</h2>
        {chatLogs.map((message, index) => (
          <div
            key={index}
            style={{ textAlign: message.peerId === ownId ? 'right' : 'left' }}
          >
            <b>{index}. {message.peerId}:</b> {message.message}
          </div>
        ))}
      </div>
    );
  }

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

export const sendChunksData = async (file: File, connectionData: ConnectionData, transferID: string, setProgress: Function, ref: React.MutableRefObject<FileInfo[]>, chunkSize: number = 64 * 1024) => {

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

      if (currentChunk % 5 === 0) {
        setProgress(transferID, Math.floor((currentChunk / totalChunks) * 100 * 100) / 100); // * 100 because progress is like this 0.50 means 50%, so to get % value instead of fraction we need * 100. Then *100 and /100, because we are rounding up to 2 decimal places. Rounding down with Math.floor, so it will never be 100, to make 100 we will need to do it explicitly.
      }
  
      if (currentChunk < totalChunks - 1) {
        currentChunk++;
        loadNextChunk();
      }else{
        setProgress(transferID, 100);
      }
    }

    const waiter = async() => {
      const fileInfo = ref.current.find(
        (fileInfo) => fileInfo.id === transferID
      );
      const userAccepts = fileInfo?.receiverPeers.find(
        (peer) => peer.id === connectionData.peerId
      );
      let clientProgress: number = 0;
      if(userAccepts?.progress){
        clientProgress = userAccepts.progress
      }

      // this check makes sure we don't chunk too much of data in advance. It should matter only for bigger files tho. 
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

export function sendProgressUpdateMessage(progress: number, senderPeerId: string, transferID: string, connectionsRef: ConnectionData[]){
  const progressUpdate: progressUpdateMessage = {
    progress: progress,
    transferID: transferID,
    dataType: "TRANSFER_PROGRESS_UPDATE"
  }

  connectionsRef
  .filter((c) => c.peerId === senderPeerId)
  .forEach((c) => c.connection.send(progressUpdate));
}
