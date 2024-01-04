
import React, { useState, ChangeEvent, useEffect } from "react";

import { AppConfig } from "../config";
import { AppGlobals } from "../globals/globals";
import { FileTransfer, senderCancelTransferMessage, receiverCancelTransferMessage } from "../dataStructures/classes";
import { calculateTotalChunks, generateRandomString } from "../utils/utils";
import { userAccepts } from "../dataStructures/interfaces";
import { ChatRef } from "./chat";
import { sendSomeData, sendTransferPauseNotification } from "../utils/senderFunctions";
import { dealWithTransferProgressUpdates, uploadProgressValues } from '../utils/utils';
import file from '../img/word.png';

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

      return () => {
        clearInterval(progressUpdateHandle);
      };
    }, []);

    const handleFileSubmit = () => {
        if (selectedFiles.length === 0){
          alert("NO FILE SELECTED PLEASE SELECT FILE");
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
          const connectedPeerIDs: userAccepts[] = targetPeers.map(targetPeerID => ({ id: targetPeerID, isAccepted: false, progress: null, last5updates: null, isAborted: false }));
          
          outgoingTransferOffer.setPeerIDs(props.myPeerId, connectedPeerIDs);
          AppGlobals.outgoingFileTransfers.push(outgoingTransferOffer)
          forceUpdate();
        });
    }

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
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

    const deleteActiveOutgoingTransfer = (transferID: string) => {
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

    const deleteActiveIncomingTransfer = (transferID: string) => {
      const transferIndex = AppGlobals.incomingFileTransfers.findIndex(
        transfer => transfer.id === transferID
      );
      // sending data only to peers that are receiving this file transfer
      let cancelMessage = new receiverCancelTransferMessage(transferID)
      sendSomeData(cancelMessage, AppGlobals.incomingFileTransfers[transferIndex].senderPeerID)
  
      AppGlobals.incomingFileTransfers.splice(transferIndex, 1);
      
      forceUpdate();
  }

    const pauseOutgoingTransfer = (transferID: string) => {
      const index = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
      AppGlobals.outgoingFileTransfers[index].isPaused = true;
      sendTransferPauseNotification(true, transferID)
      forceUpdate();
    }

    const resumeOutgoingTransfer = (transferID: string) => {
      const index = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
      AppGlobals.outgoingFileTransfers[index].isPaused = false;
      sendTransferPauseNotification(false, transferID)
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


          
          
          <h3 className="text-xl m-2">Incoming: </h3>
          {AppGlobals.incomingFileTransfers.map((transfer) => (
            <div key={transfer.id} className="bg-white/10 flex rounded-lg h-20 m-4"> 
              {/* img */}
              <div className="hidden xl:flex">
                <img src={file} className="h-full p-2"/>
              </div>
              {/* desc */}
              <div className="flex flex-col justify-evenly mx-4 font-semibold flex-grow w-1/2 xl:w-full truncate">
                <p>{transfer.name}</p>
                <p>{(transfer.size / 1024).toFixed(2)} KB</p>
              </div>
              {/* buttons */}
              {transfer.receiverPeers[0].isAccepted ? (
                <div className="flex mx-4 m-auto space-x-4">
                  <button className="bg-red-600 p-2" onClick={() => deleteActiveIncomingTransfer(transfer.id)}>Reject</button>
                </div>
              )
              :(
              <div className="flex mx-4 m-auto space-x-4">
                <button className="bg-green-600 p-2" onClick={() => acceptTransfer(transfer.id)}>Accept</button>
                <button className="bg-red-600 p-2" onClick={() => deleteActiveIncomingTransfer(transfer.id)}>Reject</button>
              </div>)
              }
              {/* * <b>{transfer.id}</b> from <b>{transfer.senderPeerID}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks.
              <br/>
              {transfer.receiverPeers[0].isAccepted ? (
                <span> 
                  You already accepted this transfer.
                  <button onClick={() => deleteActiveIncomingTransfer(transfer.id)}> DELETE THIS TRANSFER </button>
                  {transfer.progress == null ? 
                    <span> Sender haven't started sending yet. </span>
                    : 
                    <span> 
                    
                    Progress: {transfer.progress}, 
                    { JSON.stringify(uploadProgressValues(transfer, null)) }
                    </span>
                  }
                </span>
              ) : (
                <span> You didn't accept this transfer. <button onClick={() => acceptTransfer(transfer.id)}> accept </button> </span>
              )}
              <br/>
              {transfer.isAborted   
                ? <div> This transfer is aborted </div>
                : <div> {transfer.isPaused       
                  ? <div> This transfer is paused </div>
                  : <div> This transfer is going now </div>
                } </div>
              } */}
              
            </div>
          ))}

          <h3 className="text-xl m-2">Outgoing: </h3>
          {AppGlobals.outgoingFileTransfers.map((transfer) => (
             <div key={transfer.id} className="bg-white/10 flex rounded-lg h-20 m-4"> 
              {/* img */}
              <div className="hidden xl:flex">
                <img src={file} className="h-full p-2"/>
              </div>
              {/* desc */}
              <div className="flex flex-col justify-evenly mx-4 font-semibold flex-grow w-1/2 xl:w-full truncate">
                <p>{transfer.name}</p>
                <p>{(transfer.size / 1024).toFixed(2)} KB</p>
              </div>
              {/* buttons */}
              {/* {transfer.receiverPeers[0].isAccepted ? (
                <div className="flex mx-4 m-auto space-x-4">
                  <button className="bg-red-600 p-2" >Reject</button>
                </div>
              )
              :( */}
              <div className="flex mx-4 m-auto space-x-4">
                <button className="bg-sky-600 p-2" >Send</button>
                <button className="bg-red-600 p-2" onClick={() => deleteActiveOutgoingTransfer(transfer.id)}>Delete</button>
              </div>
              {/* } */}
              {/* * <b>{transfer.id}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks. <br/> 
              
              <button onClick={() => deleteActiveOutgoingTransfer(transfer.id)}> Delete this transfer </button> 

              To peers:
              {transfer.receiverPeers.map((receiver) => (
                <div key={receiver.id}> 
                  * {receiver.id}, accepted: {receiver.isAccepted.toString()}, with progress {receiver.progress}%
                  XX{ JSON.stringify(uploadProgressValues(transfer, receiver.id)) }XX
                  <br/> 

                  {receiver.isAborted       
                    ? <div> This transfer was aborted by receiver  </div>
                    : <div> {transfer.isPaused 
                      ? <div> This transfer is paused <button onClick={() => {resumeOutgoingTransfer(transfer.id)}}> RESUME UPLOAD </button> </div>
                      : <div> This transfer is going now <button onClick={() => {pauseOutgoingTransfer(transfer.id)}}> PAUSE UPLOAD </button> </div>
                    } </div>
                  }


                </div>
              ))}
              <br/> */}
              </div>
            
              
          ))}

        
          <br/>
          <div className="flex justify-center text-center">
            <label className="cursor-pointer text-2xl shadow-2xl w-1/2 xl:w-1/4 py-4 ">
              <input type="file" multiple onChange={handleFileUpload} className="shadow-lg file-input w-1/2" />
              Add files
            </label>
          </div>
          <br/>
          <button onClick={handleFileSubmit}>SEND SELECTED FILE TO SELECTED PEERS!</button>

          {/* {selectedFiles.length > 1 ? 
            <span> Selected multiple files. It will work, but it is advised to compress files into .zip before sending them using limitless. </span>
            : 
            <span> Keep in mind selecting multiple files may cause unforseeable stability issues. It's recommended to compress your shit into single .zip if you want to send multiple files. </span>
          } */}
        </div>
    );
};

