// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React from 'react';
import { ChatMessage } from './interfaces';

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