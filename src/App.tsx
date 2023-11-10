import React, { useRef, useState } from "react";

import { AppGlobals } from './globals/globals';
import { removeConnectionByID } from "./globals/globalFunctions";
import { Chat, ChatRef } from "./components/chat";
import { FileTransfers } from "./components/fileTransfers";
import { Connections } from "./components/connections";
import { LoadingPeerJS } from "./components/loadingPeerJS";
import QRCode from 'qrcode'



const App: React.FC = () => {
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
  const chatRef = useRef<ChatRef | null>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [qrDataURL, setQrDataURL] = useState("");

  const disconnectFromSelectedClient = (peerId: string) => {
    // closing connection with unwanted peer
    AppGlobals.connections.forEach((c) => {
      if(c.peerId === peerId)
        c.connection.close()
    });
    
    // removing unwanted peer from connections 
    removeConnectionByID(peerId, forceUpdate)
    if(chatRef && chatRef.current)
      chatRef.current.addMessageToChatLogs("deleted peer connection: " + peerId, "SYSTEM_MESSAGE")
    forceUpdate();
  }

  const returnLink = () => {
    return "http://localhost:3000/"+myPeerId;
  }

  if(!qrDataURL && myPeerId){
    QRCode.toDataURL(returnLink())
    .then(url => {
      setQrDataURL(url)
    })
    .catch(err => {
      console.error(err)
    })
  }

  return (
    <div className="App">
      <h1>Peer-to-Peer Chat</h1>

      <h3> Your peer ID is: {myPeerId} </h3>  
      <h1> Your nickname is {AppGlobals.ownNickname} </h1>

      <br/>

      COPY THIS LINK AND SEND TO YOUR FRIEND WHO WANTS TO SEND YOU FILES:
      
      <h3> {returnLink()} </h3>

      OR SCAN QR CODE:

      <img src={qrDataURL} alt="qr not generated yet" />

      <Chat myPeerId={myPeerId} ref={chatRef} />

      {AppGlobals.connections.length > 0 ? (
        <div>
          <Connections chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
          <FileTransfers myPeerId="cipa" chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
        </div>
      ) : (
        <div>

        </div>
      )}

      <LoadingPeerJS 
        chatRef={chatRef} 
        myPeerId={myPeerId} 
        setMyPeerId={setMyPeerId} 
        forceUpdate={forceUpdate} 
      />
    </div>
  );
};

export default App;
