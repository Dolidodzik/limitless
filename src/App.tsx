import React, { useEffect, useState, useRef } from "react";
import Peer from "peerjs";

import { ConnectionData, userAccepts } from './dataStructures/interfaces'
import { dealWithTransferProgressUpdates } from './utils/utils';
import { FileTransfer, senderCancelTransferMessage } from './dataStructures/classes';
import { AppConfig } from './config';
import { handleReceivedData } from './utils/receiverFunctions';
import { AppGlobals } from './globals/globals';
import { removeConnectionByID } from "./globals/globalFunctions";
import { Chat, ChatRef } from "./components/chat";
import { FileTransfers } from "./components/fileTransfers";
import { Connections } from "./components/connections";



const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState("");

  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const chatRef = useRef<ChatRef | null>(null);

  useEffect(() => {
    const newPeer = new Peer();
    const progressUpdatesInterval = setInterval(() => {
      dealWithTransferProgressUpdates()
    }
    , AppConfig.transferProgressUpdatesInterval);

    newPeer.on("open", (id) => {
      setMyPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on("connection", (conn) => {
      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        AppGlobals.connections.push(newConnectionData);

        if(chatRef.current)
          chatRef.current.addMessageToChatLogs("Connection established with: " + conn.peer, "SYSTEM_MESSAGE") 
        forceUpdate();
      });

      conn.on("data", (data) => {
        if(!chatRef || !chatRef.current)
          return
        handleReceivedData(
          data, 
          conn.peer, 
          myPeerId,
          forceUpdate,
          chatRef.current.addMessageToChatLogs
        );
      });

      conn.on("close", () => {
          removeConnectionByID(conn.peer);
          if(chatRef && chatRef.current)
            chatRef.current.addMessageToChatLogs("Connection closed with: " + conn.peer, "SYSTEM_MESSAGE")
      });
    });

    return () => {
      AppGlobals.connections.forEach((c) => c.connection.close());
      AppGlobals.connections.splice(0, AppGlobals.connections.length);
      newPeer.disconnect();
      newPeer.destroy();
      clearInterval(progressUpdatesInterval);
    };
  }, []);

  const connectToPeer = () => {
    console.log('here')
    const peerId = (document.getElementById("peerIdInput") as HTMLInputElement).value;
    if (peer && peerId) {
      const conn = peer.connect(peerId);
      console.log('here 2')
      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        AppGlobals.connections.push(newConnectionData)
        if(chatRef && chatRef.current)
            chatRef.current.addMessageToChatLogs("Connection established with: " + conn.peer, "SYSTEM_MESSAGE")
        
        console.log('here 3')
        forceUpdate();
      });

      conn.on("data", (data) => {
        if(!chatRef || !chatRef.current)
          return
        handleReceivedData(
          data, 
          conn.peer, 
          myPeerId,
          forceUpdate,
          chatRef.current.addMessageToChatLogs
        );
      });

      conn.on("close", () => {
        // removing connection
        removeConnectionByID(conn.peer)
        if(chatRef && chatRef.current)
          chatRef.current.addMessageToChatLogs("Connection closed with: " + conn.peer, "SYSTEM_MESSAGE")
      });
    }
  };

  const disconnectFromSelectedClient = (peerId: string) => {
    // closing connection with unwanted peer
    AppGlobals.connections.forEach((c) => {
      if(c.peerId === peerId)
        c.connection.close()
    });
    
    // removing unwanted peer from connections 
    removeConnectionByID(peerId)
    if(chatRef && chatRef.current)
      chatRef.current.addMessageToChatLogs("deleted peer connection: " + peerId, "SYSTEM_MESSAGE")
    forceUpdate();
  }

  return (
    <div className="App">
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      <br/>

      <Chat myPeerId={myPeerId} ref={chatRef} />

      {AppGlobals.connections.length > 0 ? (
        <div>
          <Connections chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
          <FileTransfers myPeerId="cipa" chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
        </div>
      ) : (
        <div>
          <p>Enter Peer ID to connect:</p>
          <input type="text" id="peerIdInput" />
          <button onClick={connectToPeer}>Connect</button>
        </div>
      )}
    </div>
  );
};

export default App;
