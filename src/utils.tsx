// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React from 'react';
import { ChatMessage, ConnectionData } from './interfaces';

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

export const sendChunksData = (file: File, connections: ConnectionData[], transferID: string, setProgress: Function, chunkSize: number = 64 * 1024) => {

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
    };

    connections.forEach((c) => c.connection.send(chunk));

    if (currentChunk % 5 === 0) {
      setProgress(transferID, (currentChunk / totalChunks) * 100);
    }

    if (currentChunk < totalChunks - 1) {
      currentChunk++;
      loadNextChunk();
    }else{
      console.log("FINISHED SENDING STUFF, HOOORAYYY, PROGRESS IS 100%")
      setProgress(transferID, 100);
    }
  };

  const loadNextChunk = () => {
    const start = currentChunk * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    reader.readAsArrayBuffer(chunk);
  };

  loadNextChunk();
};