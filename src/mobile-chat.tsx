import React, { useRef, useState } from 'react';
import { Chat, ChatRef } from './components/chat';
import { Link } from 'react-router-dom';


const Mchat: any  = () => {
    const chatRef = useRef<ChatRef | null>(null);
    const [myPeerId, setMyPeerId] = useState("");
    return (
    <div className="App bg-primary h-screen">
        <h1 className="text-white text-center text-3xl py-4 ">limitless.</h1>
    
      {/* third grid chat */}
      <div className="bg-tile shadow-md rounded-md flex m-auto w-3/4 h-3/4 text-sm">
        <Chat myPeerId={myPeerId} ref={chatRef}/>
      </div>
          
      
      {/* footer for mobile */}
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg-black flex justify-around">
      <Link to='/'>home</Link>
      <Link to='/mchat'>chat</Link>
      </div>
    </div>
    );
};

export default Mchat;