
import React, { useState, ChangeEvent, MutableRefObject, useEffect } from "react";

import { AppConfig } from "../config";
import { AppGlobals } from "../globals/globals";
import { transferProgress } from "../utils/utils";
import { FileTransfer, senderCancelTransferMessage } from "../dataStructures/classes";
import { calculateTotalChunks, generateRandomString } from "../utils/utils";
import { userAccepts } from "../dataStructures/interfaces";
import { ChatRef } from "./chat";
import { sendSomeData } from "../utils/senderFunctions";
import { dealWithTransferProgressUpdates } from '../utils/utils';



let progressUpdateHandle: any;


export const FileTransfers = (props: {myPeerId: string, chatRef: React.RefObject<ChatRef | null>, disconnectFromSelectedClient: (peerId: string) => void}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    // IDs of peers user chose to send file to
    const [targetPeers, setTargetPeers] = useState<string[]>([]);

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

    useEffect(() => {
      progressUpdateHandle = setInterval(() => {
        dealWithTransferProgressUpdates(forceUpdate)
      }
      , AppConfig.transferProgressUpdatesInterval);
  
      // A cleanup function can be returned from the effect.
      return () => {
        console.log('Cleanup performed');
        clearInterval(progressUpdateHandle);
      };
    }, []);

    const handleFileSubmit = () => {
        if (selectedFiles.length == 0){
          console.log("NO FILE SELECTED PLEASE SELECT FILE");
          return;
        } 
    
        selectedFiles.forEach((file) => {
          let outgoingTransferOffer = new FileTransfer(
            file.name,
            file.size,
            calculateTotalChunks(file.size, AppConfig.chunkSize),
            generateRandomString(32),
            file.type,
            file
          )
          
          // sending data only to selected peers
          let offer: any = JSON.parse(JSON.stringify(outgoingTransferOffer));
          offer.dataType = "FILE_TRANSFER_OFFER";
          sendSomeData(offer, targetPeers);
      
          // when connection is already sent, we edit it for this client only and assign correct peer ids
          const connectedPeerIDs: userAccepts[] = targetPeers.map(targetPeerID => ({ id: targetPeerID, isAccepted: false, progress: null, last5updates: null }));
          
          outgoingTransferOffer.setPeerIDs(props.myPeerId, connectedPeerIDs);
          AppGlobals.outgoingFileTransfers.push(outgoingTransferOffer)
          forceUpdate();
        });
    }

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        console.log("FILES WERE SELECTED", event.target.files);
        const newFiles = Array.from(event.target.files || []);
    
        if (newFiles.length === 0) {
          console.warn("WARNING! No files selected.");
        } else if (newFiles.length > 1) {
          console.warn("WARNING! Selecting multiple files. All selections will be kept.");
        }
      
        setSelectedFiles(newFiles);
    };

    const switchTargetPeer = (peerId: string) => {
        setTargetPeers((prevTargetPeers) => {
          // Check if the peerId already exists in the list
          const isPeerIdExists = prevTargetPeers.includes(peerId);
      
          if (isPeerIdExists) {
            // If the peerId exists, remove it from the list
            return prevTargetPeers.filter((id) => id !== peerId);
          } else {
            // If the peerId doesn't exist, add it to the list
            return [...prevTargetPeers, peerId];
          }
        });
    };

    const acceptTransfer = (id: string) => {
        const fileIndex = AppGlobals.incomingFileTransfers.findIndex(file => file.id === id);
        const fileToUpdate = AppGlobals.incomingFileTransfers[fileIndex];
        const updatedFile = { ...fileToUpdate };
    
        // Edit the properties of the copied object
        updatedFile.receiverPeers[0].isAccepted = true;
    
        // letting sender know that we will accept his transfer for this file
        const info = {
          dataType: "FILE_TRANSFER_ACCEPT",
          id: updatedFile.id 
        }
        sendSomeData(info, updatedFile.senderPeerID)
    
        AppGlobals.incomingFileTransfers[fileIndex] = updatedFile;
        forceUpdate();
    }

    const deleteOutgoingTransfer = (transferID: string) => {
        const transferIndex = AppGlobals.outgoingFileTransfers.findIndex(
          transfer => transfer.id === transferID
        );
        
        const transferPeers = AppGlobals.outgoingFileTransfers[transferIndex].receiverPeers.map(peer => peer.id)
    
        // sending data only to peers that are receiving this file transfer
        let cancelMessage = new senderCancelTransferMessage(transferID)
        sendSomeData(cancelMessage, transferPeers)
    
        const indexToDelete = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
        if (indexToDelete !== -1) {
          AppGlobals.outgoingFileTransfers.splice(indexToDelete, 1);
        }
        
        forceUpdate();
    }

    const pauseOutgoingTransfer = (transferID: string) => {
      console.log("PAUSING TRANSFER: ", transferID)
      const index = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
      AppGlobals.outgoingFileTransfers[index].isPaused = true;
      forceUpdate();
    }

    const resumeOutgoingTransfer = (transferID: string) => {
      console.log("resuming TRANSFER: ", transferID)
      const index = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
      AppGlobals.outgoingFileTransfers[index].isPaused = false;
      forceUpdate();
    }

    return (
        <div className="fileTransfers">
          <br/>

          <h1><i> !! TODO UI/UX !! There should be some interface that allows user choose who he wants to upload to in more user friendly way than this shit: </i></h1>

          {AppGlobals.connections.map((connection) => (
            <div key={connection.peerId}> * {connection.peerId} 
              <button onClick={() => props.disconnectFromSelectedClient(connection.peerId)}> disconnect </button> 
              <div> 
                  {targetPeers.includes(connection.peerId) ? 
                    <span> SELECTED FOR FILE UPLOAD TRUE. </span>
                    : 
                    <span> SELECTED FOR FILE UPLOAD FALSE. </span>
                  }
                  <button onClick={() => switchTargetPeer(connection.peerId)}> switch! </button>
              </div>
            </div>
          ))}


          <h2> File transfers: </h2>
          <br/>
          <h3>  Incoming: </h3>
          {AppGlobals.incomingFileTransfers.map((transfer) => (
            <div key={transfer.id} className="box"> 
              * <b>{transfer.id}</b> from <b>{transfer.senderPeerID}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks.
              <br/>
              {transfer.receiverPeers[0].isAccepted ? (
                <span> 
                  You already accepted this transfer.
                  {transfer.progress == null ? 
                    <span> Sender haven't started sending yet. </span>
                    : 
                    <span> Progress: {transfer.progress}, <br/> Speed: {transferProgress(transfer.last5updates, transfer.progress)} MB/s </span>
                  }
                </span>
              ) : (
                <span> You didn't accept this transfer. <button onClick={() => acceptTransfer(transfer.id)}> accept </button> </span>
              )}
            </div>
          ))}

          <h3>  Outgoing: </h3>
          {AppGlobals.outgoingFileTransfers.map((transfer) => (
            <div key={transfer.id} className="box"> 
              * <b>{transfer.id}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks. <br/> 
              
              <button onClick={() => deleteOutgoingTransfer(transfer.id)}> Delete this transfer </button> 

              To peers:
              {transfer.receiverPeers.map((receiver) => (
                <div key={receiver.id}> 
                  * {receiver.id}, accepted: {receiver.isAccepted.toString()}, with progress {receiver.progress}%
                  <br/> speed: {transferProgress(receiver.last5updates, transfer.progress)}
                  <br/> 
                  {transfer.isPaused       
                    ? <div> This transfer is paused <button onClick={() => {resumeOutgoingTransfer(transfer.id)}}> RESUME UPLOAD </button> </div>
                    : <div> This transfer is going now <button onClick={() => {pauseOutgoingTransfer(transfer.id)}}> PAUSE UPLOAD </button> </div>
                  }
                </div>
              ))}
              <br/>
            </div>
          ))}

        
          <br/>

          <input type="file" multiple onChange={handleFileUpload} />
          <button onClick={handleFileSubmit}>SEND SELECTED FILE TO SELECTED PEERS!</button>

          {selectedFiles.length > 1 ? 
            <span> Selected multiple files. It will work, but it is advised to compress files into .zip before sending them using limitless. </span>
            : 
            <span> Keep in mind selecting multiple files may cause unforseeable stability issues. It's recommended to compress your shit into single .zip if you want to send multiple files. </span>
          }
        </div>
    );
};

