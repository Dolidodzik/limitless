import { useState, forwardRef, useImperativeHandle, ForwardedRef, useEffect, useRef } from "react";
import { ChatMessage } from "../dataStructures/interfaces";
import { sendSomeData } from "../utils/senderFunctions";
import { AppGlobals } from "../globals/globals";

interface ChatProps {
    myPeerId: string;
}

export interface ChatRef {
    addMessageToChatLogs: (message: string, peerId: string) => void;
}

export const Chat = forwardRef(({
    myPeerId
}: ChatProps, ref: ForwardedRef<ChatRef>) => {
    const [messageInput, setMessageInput] = useState("");
    const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

    const scroll: any = useRef(null);
    useEffect(() => {
        scroll.current.scrollIntoView({ behavior: "smooth" });
      }, [chatLogs]);

    const addMessageToChatLogs = (message: string, peerId: string) => {
        const chatMessage: ChatMessage = { peerId: peerId, message: message };
        setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
    }

    const sendChatMessage = () => {
        if (messageInput) {
            const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
            const chatMessageTransfer = { text: messageInput, dataType: "CHAT_MESSAGE" }
            setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
            sendSomeData(chatMessageTransfer);
            setMessageInput("");
        }
    };

    // Use useImperativeHandle to expose the addSystemMessage function
    useImperativeHandle(ref, () => ({
        addMessageToChatLogs,
    }));

    // TODO - BLOCK USER IN UI FROM SENDING MESSAGES WHEN THERE ARE NO CONNECTIONS
    return (
        
            <div className="flex flex-col h-full">
                <h2>Chat logs:</h2>
                <div className="overflow-y-scroll p-4 flex-grow" id="style-1">
                    {chatLogs.map((message, index) => (
                        <div
                            key={index}
                            style={{ textAlign: message.peerId === myPeerId ? 'right' : 'left' }}
                        >
                            <b>{message.peerId === myPeerId ? `${AppGlobals.ownNickname}` : `${AppGlobals.connections.map((connection) => (connection.peerNickname))}`}: {message.message}</b> 
                        </div>
                    ))}
                <div ref={scroll}/>
                </div>
            
                <div className="mt-auto">
                    <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="text-black"
                    />
                    <button onClick={sendChatMessage}> Send </button>
                </div>
            </div>
    );
});

