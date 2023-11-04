import React, { useEffect, useState } from "react";

import { AppGlobals } from "../globals/globals";
import { removeConnectionByID } from "../globals/globalFunctions";
import Peer from "peerjs";
import { ConnectionData } from "../dataStructures/interfaces";
import { handleReceivedData } from "../utils/receiverFunctions";
import { ChatRef } from "./chat";
import { sendNicknameManifest } from "../utils/senderFunctions";



export const LoadingPeerJS = (props: {
    chatRef: React.RefObject<ChatRef | null>, 
    myPeerId: string, 
    setMyPeerId: React.Dispatch<React.SetStateAction<string>>,
    forceUpdate: () => void
}) => {
    const [peer, setPeer] = useState<Peer | null>(null);

    useEffect(() => {
      const newPeer = new Peer();
    
        newPeer.on("open", (id) => {
            props.setMyPeerId(id);
            setPeer(newPeer);
            props.forceUpdate();
        });
    
        newPeer.on("connection", (conn) => {
          conn.on("open", () => {
            const newConnectionData: ConnectionData = {
              connection: conn,
              peerId: conn.peer,
              peerNickname: null
            };
            AppGlobals.connections.push(newConnectionData);
    
            if(props.chatRef.current)
                props.chatRef.current.addMessageToChatLogs("Connection established with: " + conn.peer, "SYSTEM_MESSAGE") 
            
            sendNicknameManifest(AppGlobals.ownNickname, conn.peer);
            props.forceUpdate();
          });
    
          conn.on("data", (data) => {
            if(!props.chatRef || !props.chatRef.current)
              return
            handleReceivedData(
              data, 
              conn.peer, 
              props.myPeerId,
              props.forceUpdate,
              props.chatRef.current.addMessageToChatLogs
            );
          });
    
          conn.on("close", () => {
              removeConnectionByID(conn.peer, props.forceUpdate);
              if(props.chatRef && props.chatRef.current)
                props.chatRef.current.addMessageToChatLogs("Connection closed with: " + conn.peer, "SYSTEM_MESSAGE")
          });
        });
    
        return () => {
          resetApp();
        };
      });

      const resetApp = () => {
        AppGlobals.connections.forEach((c) => c.connection.close());
        AppGlobals.connections.splice(0, AppGlobals.connections.length);
        if(peer){
          peer.disconnect();
          peer.destroy();
        }
      }
    
      const connectToPeer = () => {
        const peerId = (document.getElementById("peerIdInput") as HTMLInputElement).value;
        if (peer && peerId) {
          const conn = peer.connect(peerId);
          conn.on("open", () => {
            const newConnectionData: ConnectionData = {
              connection: conn,
              peerId: conn.peer,
              peerNickname: null
            };
            AppGlobals.connections.push(newConnectionData)
            if(props.chatRef && props.chatRef.current)
                props.chatRef.current.addMessageToChatLogs("Connection established with: " + conn.peer, "SYSTEM_MESSAGE")

            sendNicknameManifest(AppGlobals.ownNickname, conn.peer);

            props.forceUpdate();
          });
    
          conn.on("data", (data) => {
            if(!props.chatRef || !props.chatRef.current)
              return
            handleReceivedData(
              data, 
              conn.peer, 
              props.myPeerId,
              props.forceUpdate,
              props.chatRef.current.addMessageToChatLogs
            );
          });
    
          conn.on("close", () => {
            // removing connection
            removeConnectionByID(conn.peer, props.forceUpdate)
            if(props.chatRef && props.chatRef.current)
                props.chatRef.current.addMessageToChatLogs("Connection closed with: " + conn.peer, "SYSTEM_MESSAGE")
          });
        }
      };

      if(AppGlobals.connections.length > 0){
        return ( <div id="NONEXISTANT"></div> )
      }

    return (
        <div className="loadingPeerJS">

            {props.myPeerId ? (
                <div>
                    <p>Enter Peer ID to connect:</p>
                    <input type="text" id="peerIdInput" />
                    <button onClick={connectToPeer}>Connect</button>
                </div>
            ) : (
                <div>
                    <h1> CONNECTING TO PEERJS / OBTAINING ID </h1>
                    <h1> PUT SOME LOADING GIF / ANIMATION HERE </h1>
                </div>
            )}

        </div>
    );
};

