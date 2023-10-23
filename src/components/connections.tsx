import React from "react";
import { AppGlobals } from "../globals/globals";
import { removeConnectionByID } from "../globals/globalFunctions";
import { ChatRef } from "./chat";


export const Connections = (props: {chatRef: React.RefObject<ChatRef | null>, disconnectFromSelectedClient: (peerId: string) => void}) => {

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

    const resetConnection = () => {
        AppGlobals.connections.forEach((c) => c.connection.close());
        AppGlobals.connections.splice(0, AppGlobals.connections.length);
        if(props.chatRef && props.chatRef.current)
            props.chatRef.current.addMessageToChatLogs("peer connection with all peers was reset", "SYSTEM_MESSAGE")
        forceUpdate();
    };

    console.log("AppGlobals connections in connections: ", AppGlobals.connections)

    return (
        <div className="connections">
            <h1>Connected to Peers:</h1>
            {AppGlobals.connections.map((connection) => (
                <div key={connection.peerId}> * {connection.peerId} 
                <button onClick={() => props.disconnectFromSelectedClient(connection.peerId)}> disconnect </button> 
                </div>
            ))}
            <button onClick={resetConnection}>RESET CONNECTION</button>
        </div>
    );
};

