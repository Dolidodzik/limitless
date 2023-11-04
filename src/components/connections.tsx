import React from "react";
import { AppGlobals } from "../globals/globals";
import { ChatRef } from "./chat";


export const Connections = (props: {chatRef: React.RefObject<ChatRef | null>, disconnectFromSelectedClient: (peerId: string) => void}) => {
    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
    const resetConnection = () => { // resets all connections that were present and it lets know to every peer that this was the case
        AppGlobals.connections.forEach((c) => c.connection.close());
        AppGlobals.connections.splice(0, AppGlobals.connections.length);
        if(props.chatRef && props.chatRef.current)
            props.chatRef.current.addMessageToChatLogs("peer connection with all peers was reset", "SYSTEM_MESSAGE")
        window.location.reload();
        forceUpdate();
    };

    return (
        <div className="connections">
            <h1>Connected to Peers:</h1>
            {AppGlobals.connections.map((connection) => (
                <div key={connection.peerId}> 
                * {connection.peerId} <b>  | nickname: {connection.peerNickname} </b>
                <button onClick={() => props.disconnectFromSelectedClient(connection.peerId)}> disconnect </button> 
                </div>
            ))}
            <button onClick={resetConnection}>RESET CONNECTION</button>
        </div>
    );
};

