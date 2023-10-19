import { useState, useRef } from "react";

import { ChatMessage } from "../dataStructures/interfaces";
import { AppGlobals } from "../globals/globals";


interface ChatProps {
    myPeerId: string; 
}

export function Chat({ myPeerId }: ChatProps) {
    const [messageInput, setMessageInput] = useState("");
    const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

    const addSystemMessage = (message: string) => {
        const chatMessage: ChatMessage = { peerId: "SYSTEM", message: message };
        setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
    }

    const sendMessage = () => {
        if (messageInput) {
            const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
            const chatMessageTransfer = { text: messageInput, dataType: "CHAT_MESSAGE" }
            setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
            AppGlobals.connections
            .filter((c) => c.peerId !== myPeerId)
            .forEach((c) => c.connection.send(chatMessageTransfer));
            setMessageInput("");
        }
    };
    

    return (
      <>

        <div>
            <h2>Chat logs:</h2>
            {chatLogs.map((message, index) => (
                <div
                    key={index}
                    style={{ textAlign: message.peerId === myPeerId ? 'right' : 'left' }}
                >
                    <b>{index}. {message.peerId}:</b> {message.message}
                </div>
            ))}
        </div>

        <input
        type="text"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </>
    );
  }