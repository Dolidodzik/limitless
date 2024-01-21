import React, { useRef, useState, useCallback } from "react";

import { AppGlobals } from './globals/globals';
import { removeConnectionByID } from "./globals/globalFunctions";
import { Chat, ChatRef } from "./components/chat";
import { FileTransfers } from "./components/fileTransfers";
import { LoadingPeerJS } from "./components/loadingPeerJS";
import { ChatMessage } from "./dataStructures/interfaces";
import { useBeforeUnload } from "react-router-dom";
import QRCode from 'qrcode';
import homeIcon from './img/home.png';
import chatIcon from './img/chat.png';



const App: React.FC = () => {
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
  const chatRef = useRef<ChatRef | null>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [qrDataURL, setQrDataURL] = useState("");
  const [size, setSize] = useState("main");
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

  // handling closing browser/tab event, by simply closing all connections on that event
  const [dirty, toggleDirty] = useState(false);
  const dirtyFn = useCallback(() => {
    console.log("FUNC")
    AppGlobals.connections.forEach((c) => {
      c.connection.close()
    });
    return dirty;
  }, [dirty]);
  useBeforeUnload(dirtyFn, undefined);


  const setParentChatLogs = (newLogs: any) => {
    setChatLogs(newLogs)
  }

  const handleCheckboxChange = (peerId: string) => {
    const connectionIndex = AppGlobals.connections.findIndex((conn) => conn.peerId === peerId);
    if (connectionIndex !== -1) {
      AppGlobals.connections[connectionIndex].isSelectedForFileTransfer = !AppGlobals.connections[connectionIndex].isSelectedForFileTransfer;
    } else {
      console.error(`Connection with peerId ${peerId} not found`);
    }
    forceUpdate();
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


  return (
    <div className="App bg-primary h-screen">

<LoadingPeerJS 
        chatRef={chatRef} 
        myPeerId={myPeerId} 
        setMyPeerId={setMyPeerId} 
        forceUpdate={forceUpdate} 
      />
   {size == 'main' ? <>   <h1 className="text-white text-center text-3xl py-4 ">limitless.</h1>
    <div className="xl:grid grid-cols-3 grid-rows-3 gap-4 flex flex-col h-[80vh] mx-8">
      {/* first grid with users in session*/}
      <div className="bg-tile rounded-md flex flex-col justify-evenly text-center shadow-md">
        <p className="font-thin text-4xl p-4">Hi, {AppGlobals.ownNickname}</p>
        <div className="flex justify-center items-center space-x-5 mb-4">
          <button className="bg-black/25 w-[10%] font-semibold text-lg rounded-md xl:focus:scale-150 ease-out duration-300 ">
            <img src={qrDataURL} alt={"loading qr code"} className="hover:scale-600 xl:hover:scale-100 ease-out duration-300 rounded-sm"/>
          </button>
          <p className="text-xl justify-items-center">or</p>
          <button className="bg-sky-500 w-fit px-1 font-semibold text-lg rounded-md hover:scale-110 ease-out duration-300" onClick={copy}>Copy</button>
        </div>
      </div>
      {/* second grid with room */}
      <div className="bg-tile rounded-md xl:order-first shadow-md overflow-auto h-64 xl:h-full">
          <span className="text-2xl xl:text-3xl font-normal text-left m-2">Your room</span>
          <div className="overflow-auto">
            
              {AppGlobals.connections.map((connection) => (
                <div className="mx-4 checkbox-wrapper-13" key={connection.peerId}>
                  <label className="font-thin xl:text-2xl text-xl align-middle flex items-center justify-between">
                    {connection.peerNickname}
                    <input
                      type="checkbox"
                      className="mr-12"
                      checked={connection.isSelectedForFileTransfer}
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
        <Chat myPeerId={myPeerId} ref={chatRef} setParentChatLogs={setParentChatLogs} chatLogs={chatLogs}/>
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
      


      </div>
      {/* footer for mobile */}
      
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg flex justify-around">
        <button onClick={() => setSize("main")}><img src={homeIcon} className="h-3/4 mt-2"/></button>
        <button onClick={() => setSize("chat")}><img src={chatIcon} className="h-3/4 mt-2"/></button>
      </div>
      </>: <>
        <h1 className="text-white text-center text-3xl py-4">limitless.</h1>
      
      {/* third grid chat */}
      <div className="bg-tile shadow-md rounded-md flex mx-8 h-4/5 text-sm">
        <Chat myPeerId={myPeerId} ref={chatRef} setParentChatLogs={setParentChatLogs} chatLogs={chatLogs} />
      </div>
          
      
      {/* footer for mobile */}
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg flex justify-around">
        <button onClick={() => setSize("main")}><img src={homeIcon} className="h-3/4 mt-2"/></button>
        <button onClick={() => setSize("chat")}><img src={chatIcon} className="h-3/4 mt-2"/></button>
      </div>
    
      </>
    }
    </div>
    
  );
};

export default App;
