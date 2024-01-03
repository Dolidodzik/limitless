import React, { useRef, useState } from "react";

import { AppGlobals } from './globals/globals';
import { removeConnectionByID } from "./globals/globalFunctions";
import { Chat, ChatRef } from "./components/chat";
import { FileTransfers } from "./components/fileTransfers";
import { Connections } from "./components/connections";
import { LoadingPeerJS } from "./components/loadingPeerJS";
import { Link, Route, Routes } from 'react-router-dom'
import QRCode from 'qrcode';
import home from './img/home.png';
import chat from './img/chat.png';




const App: React.FC = () => {
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
  const chatRef = useRef<ChatRef | null>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [qrDataURL, setQrDataURL] = useState("");
  const [targetPeers, setTargetPeers] = useState<string[]>([]); // peers that are selected for transfering files

  const handleCheckboxChange = (peerId: string) => {

    console.log("HERE HANDLE CHECKBOX CHANGE")
    console.log("state: ", targetPeers)
    console.log("globals: ", AppGlobals.targetPeers)

    // handling globals
    const index = AppGlobals.targetPeers.indexOf(peerId);
    if (index !== -1) {
      console.log("REMOVIGN FROM GLOBALS")
      AppGlobals.targetPeers.splice(index, 1);
    } else {
      console.log("ADDIN TO GLOBALS")
      AppGlobals.targetPeers.push(peerId)
    }

    // handling state
    if (targetPeers.includes(peerId)) {
      setTargetPeers(targetPeers.filter((id) => id !== peerId));
    } else {
      setTargetPeers([...targetPeers, peerId]);
    }
  };

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
  //console.log(myPeerId)
  //console.log(qrDataURL)

  return (
    <div className="App bg-primary h-screen">
      <h1 className="text-white text-center text-3xl py-4 ">limitless.</h1>
    <div className="xl:grid grid-cols-3 grid-rows-3 gap-4 flex flex-col h-[80vh] mx-8">
      {/* first grid with users in session*/}
      <div className="bg-tile rounded-md flex flex-col justify-evenly text-center shadow-md">
        <p className="font-thin text-4xl p-4">Hi, {AppGlobals.ownNickname}</p>
        <div className="flex justify-center space-x-5 mb-4">
          <button className="bg-black/25 w-[25%] font-semibold text-lg rounded-sm">QR icon</button>
          <p className="text-xl">or</p>
          <button className="bg-black/25 w-[25%] font-semibold text-lg rounded-sm" onClick={copy}>Copy link</button>
        </div>
      </div>
      {/* second grid with room */}
      <div className="bg-tile rounded-md xl:order-first shadow-md overflow-auto h-64 xl:h-full">
          <span className="text-2xl xl:text-3xl font-normal text-left m-2">Your room</span>
          <div className="overflow-auto">
            
              {AppGlobals.connections.map((connection) => (
                <div className="mx-4 checkbox-wrapper-13 ">
                  <label className="font-thin xl:text-2xl text-xl align-middle flex items-center justify-between">
                    {connection.peerNickname}
                    <input
                      type="checkbox"
                      className="mr-12"
                      checked={targetPeers.includes(connection.peerId)}
                      onChange={() => handleCheckboxChange(connection.peerId)}
                    />
                  </label>
                </div>
              ))
              }
            
          </div>
      </div>
      {/* third grid chat */}
      <div className="bg-tile shadow-md rounded-md hidden xl:flex row-span-3">
        <Chat myPeerId={myPeerId} ref={chatRef}/>
      </div>
          
      {/* fourth grid connection */}
      <div className="bg-tile shadow-md rounded-md col-span-2 row-span-2 h-full overflow-x-auto">
        <div className="w-auto sticky top-0 bg">
          <h1 className="text-2xl xl:text-3xl ml-2 mt-1 font-normal">Transfers</h1>
        </div>
        {AppGlobals.connections.length > 0 ? (
          <div className="">
            {/* <Connections chatRef={chatRef} disconnectFromSelectedClient={disconnectFromSelectedClient} /> */}
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
      
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg flex justify-around">
        <Link to='/'><img src={home} className="h-3/4 mt-2"/></Link>
        <Link to='/mchat'><img src={chat} className="h-3/4 mt-2"/></Link>
      </div>
    </div>
    
  );
};

export default App;
