import { useState, forwardRef, useImperativeHandle, ForwardedRef, useEffect, useRef } from "react";
import { ChatMessage } from "../dataStructures/interfaces";
import { sendSomeData } from "../utils/senderFunctions";
import { AppGlobals } from "../globals/globals";
import logo from '../img/send.png';
import empty from '../img/empty.png';

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
        
           
        
            <div className="flex flex-col h-full w-full mx-8 xl:mx-0">
                <div className="overflow-y-scroll p-4 flex-grow md:mx-6 mx-2" id="style-1">
                {chatLogs.length === 0 ? 
                    <div className="flex flex-col text-center items-center">
                        <img src={empty} className="w-1/2 "/>
                        <div className="text-4xl">
                            It's empty!
                        </div>
                        <div className="text-md font-thin">Start chatting with your roommates</div>
                    </div>: chatLogs.map((message, index) => (
                        <div
                            key={index}
                            style={{
                                justifyContent: message.peerId === myPeerId ? 'right' : 'left',
                            }}
                            className="break-all flex mb-2"
                        >   
                            <div className={`flex-col flex ${message.peerId === myPeerId ? 'items-end' : 'items-start'}`}>
                                <p className="font-thin text-sm" style={{color:'#91969d'}}>{message.peerId === myPeerId ? `${AppGlobals.ownNickname}` : `${AppGlobals.connections.map((connection) => (connection.peerNickname))}`}</p>
                                <div
                                style={{
                                    backgroundColor: message.peerId === myPeerId ? '#00b4fd' : '#303030',
                                }}
                                className={`rounded-md p-2 w-fit ${message.peerId === myPeerId ? 'text-right' : 'text-left'}`}
                                >{message.message}</div>
                            </div>
                        </div>
                    ))}
                    
                    <div ref={scroll}/>
                </div>
            
            <div className="mb-6 flex justify-center h-14">
                <input
                    type="text"
                    value={messageInput}
                    placeholder="Message"
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="text-white bg-gray rounded-l-lg border-4 border-r-0 border-black/20 h-full w-4/6 text-lg pl-2 placeholder-white/50"
                />

                    <button onClick={sendChatMessage} className="bg-gray border-4 border-l-0 rounded-r-lg border-black/20 pl-2 pr-2"><img src={logo} height={24} width={24}/></button>              
            </div>
        </div>
    );
});

