import React, { useRef, useState } from 'react';
import { Chat, ChatRef } from './components/chat';
import { Link } from 'react-router-dom';
import home from './img/home.png';
import chat from './img/chat.png';


const Mchat: any  = () => {
    const chatRef = useRef<ChatRef | null>(null);
    const [myPeerId, setMyPeerId] = useState("");
    return (
    <div className="App bg-primary h-screen">
        <h1 className="text-white text-center text-3xl py-4">limitless.</h1>
    
      {/* third grid chat */}
      <div className="bg-tile shadow-md rounded-md flex mx-8 h-4/5 text-sm">
        THIS SEEMS LIKE IT ISN'T USED AT ALL CAN WE GET RID OF THIS?
      </div>
          
      
      {/* footer for mobile */}
      <div className="xl:opacity-0 sticky top-[100vh] h-12 w-full bg flex justify-around">
        <Link to='/'><img src={home} className="h-3/4 mt-2"/></Link>
        <Link to='/mchat'><img src={chat} className="h-3/4 mt-2"/></Link>
      </div>
    </div>
    );
};

export default Mchat;