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
  //copy to clipboard peerId
  const copy = async () => {
    await navigator.clipboard.writeText("http://localhost:3000/"+myPeerId);
  };

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
  console.log(myPeerId)
  console.log(qrDataURL)

  return (
    <div className="App bg-primary h-screen">
      <h1 className="text-white text-center text-3xl py-4 ">limitless.</h1>
    
    <div className="xl:grid grid-cols-3 grid-rows-3 gap-4 flex flex-col h-[80vh] mx-8">
      {/* first grid with users in session*/}
      <div className="bg-tile rounded-md flex flex-col justify-between text-center shadow-md">
        <p className="font-thin text-2xl p-4">Hi, {AppGlobals.ownNickname} </p> 
        <div className="flex justify-evenly mb-4">
          <button className="bg-black/25 w-[25%] font-semibold text-lg rounded-sm">QR icon</button>
          <p className="text-xl">or</p>
          <button className="bg-black/25 w-[25%] font-semibold text-lg rounded-sm" onClick={copy}>Copy link</button>
        </div>
      </div>
      {/* second grid with room */}
      <div className="bg-tile rounded-md xl:order-first shadow-md flex flex-col">
          <span className="text-2xl text-left">Your room</span>
          <div className="overflow-auto">
            
              {AppGlobals.connections.map((connection) => (
                <div className="flex item-center">
                  <p className="font-thin text-xl">{connection.peerNickname}</p>
                  <input type="checkbox"/>
                </div>
              ))
              }
            
          </div>
      </div>
      {/* third grid chat */}
      <div className="bg-tile shadow-md rounded-md opacity-0 xl:opacity-100 row-span-3">
        <Chat myPeerId={myPeerId} ref={chatRef}/>
      </div>
          
      {/* fourth grid connection */}
      <div className="bg-tile shadow-md rounded-md opacity-0 xl:opacity-100 col-span-2 row-span-2 overflow-x-auto">
        <div className="w-auto sticky top-0 bg-primary">
          <h1>Transfer</h1>
        </div>
        {AppGlobals.connections.length > 0 ? (
          <div className="">
            <Connections chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
            <FileTransfers myPeerId="cipa" chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} />
          </div>
        ) : (
          <div>

          </div>
        )}
      </div>
      

      <LoadingPeerJS 
        chatRef={chatRef} 
        myPeerId={myPeerId} 
        setMyPeerId={setMyPeerId} 
        forceUpdate={forceUpdate} 
      />
      </div>
      {/* footer for mobile */}
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg-black flex justify-around">
        <p>icon</p>
        <p>icon2</p>
      </div>
    </div>
    
  );
};

export default App;
