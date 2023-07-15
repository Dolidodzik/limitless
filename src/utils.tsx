// FOR NOW I WILL KEEP HERE ALL STUFF THAT IS EASILY SEPARATABLE FROM APP.TSX, LATER THERE WILL BE MORE SPLITING DONE

import React from 'react';
import { ChatMessage } from './interfaces';

export default function ChatRenderer(chatLogs: ChatMessage[], ownId: string) {
    return (
      <div>
        <h2>Chat logs:</h2>
        {chatLogs.map((message, index) => (
          <div
            key={index}
            style={{ textAlign: message.peerId === ownId ? 'right' : 'left' }}
          >
            <b>{message.peerId}:</b> {message.message}
          </div>
        ))}
      </div>
    );
  }
