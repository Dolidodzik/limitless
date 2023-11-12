import { useState, forwardRef, useImperativeHandle, ForwardedRef } from "react";
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
        <div >
            <div>
                <h2>Chat logs:</h2>
                <div className="overflow-scroll h-[20vh]">
                    {chatLogs.map((message, index) => (
                        <div
                            key={index}
                            style={{ textAlign: message.peerId === myPeerId ? 'right' : 'left' }}
                        >
                            <b>{index}. {message.peerId === myPeerId ? `${AppGlobals.ownNickname}` : `${message.peerId}`}:</b> {message.message}
                        </div>
                    ))}
                </div>
            </div>
        <div className="">
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

