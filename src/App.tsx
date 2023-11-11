import React, { useRef, useState } from "react";

import { AppGlobals } from './globals/globals';
import { removeConnectionByID } from "./globals/globalFunctions";
import { Chat, ChatRef } from "./components/chat";
import { FileTransfers } from "./components/fileTransfers";
import { Connections } from "./components/connections";
import { LoadingPeerJS } from "./components/loadingPeerJS";



const App: React.FC = () => {
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
  const chatRef = useRef<ChatRef | null>(null);
  const [myPeerId, setMyPeerId] = useState("");

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

  return (
    <div className="App bg-primary">
      <h1 className="text-white text-center text-3xl py-4 ">limitless.</h1>
    
    <div className="xl:grid grid-cols-3 grid-rows-3 gap-4 flex flex-col ">
      {/* first grid with users in session*/}
      <div className="bg-tile rounded-md mx-8 my-2 flex justify-between text-center">
        <p className="font-semibold text-lg p-4">{AppGlobals.ownNickname} {myPeerId} </p>
        <button className="bg-black/25 w-[25%] font-semibold text-lg rounded-sm" >Copy ID </button>
      </div>
      <div className="bg-tile rounded-md mx-8 my-2 text-center">
          
      </div>
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
    </div>
  );
};

export default App;
