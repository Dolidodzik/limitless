
import React, { useState, ChangeEvent, useEffect } from "react";

import { AppConfig } from "../config";
import { AppGlobals } from "../globals/globals";
import { FileTransfer, senderCancelTransferMessage, receiverCancelTransferMessage } from "../dataStructures/classes";
import { calculateTotalChunks, generateRandomString } from "../utils/utils";
import { userAccepts } from "../dataStructures/interfaces";
import { ChatRef } from "./chat";
import { sendSomeData, sendTransferPauseNotification } from "../utils/senderFunctions";
import { dealWithTransferProgressUpdates, uploadProgressValues } from '../utils/utils';


let progressUpdateHandle: any;
 
export const FileTransfers = (props: {myPeerId: string, chatRef: React.RefObject<ChatRef | null>, disconnectFromSelectedClient: (peerId: string) => void}) => {
    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

    const [sendBtnHidden,setSendBtnHidden] = useState("visible");

    const localTargetPeers: string[] = AppGlobals.connections.filter((conn) => conn.isSelectedForFileTransfer).map((conn) => conn.peerId);
    console.log("APP GLOBALS: ", AppGlobals)

    useEffect(() => {
      progressUpdateHandle = setInterval(() => {
        dealWithTransferProgressUpdates(forceUpdate)
      }
      , AppConfig.transferProgressUpdatesInterval);

      return () => {
        clearInterval(progressUpdateHandle);
      };
    }, []);

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {

        if(localTargetPeers.length === 0){
          alert("You have to select to who you will be transfering your files, before selecting them!")
          return;
        }

        const newFiles = Array.from(event.target.files || []);

        console.log("New file(s) selected, creating transfer offers: ", newFiles)

        if (newFiles.length === 0) {
          console.warn("WARNING! No files selected.");
        } else if (newFiles.length > 1) {
          console.warn("WARNING! Selecting multiple files. All selections will be kept.");
        }
    
        newFiles.forEach((file) => {
          let outgoingTransfer = new FileTransfer(
            file.name,
            file.size,
            calculateTotalChunks(file.size, AppConfig.chunkSize),
            generateRandomString(32),
            file.type,
            file
          )

          const connectedPeerIDs: userAccepts[] = localTargetPeers.map(targetPeerID => ({ id: targetPeerID, isAccepted: false, progress: null, last5updates: null, isAborted: false }));
          
          outgoingTransfer.setPeerIDs(props.myPeerId, connectedPeerIDs);
          AppGlobals.outgoingFileTransfers.push(outgoingTransfer)
          console.log("after selecting files new outgoing transfer should be present in app globals outgoing transfers: ", AppGlobals.outgoingFileTransfers)
          forceUpdate();
        });
    };

    const sendTransferOffer = (transfer: FileTransfer) => {

      let finalOffer: any = JSON.parse(JSON.stringify(transfer));
      finalOffer.dataType = "FILE_TRANSFER_OFFER";
      // censoring data about other peers
      finalOffer.receiverPeers = "EMPTY"
      
      transfer.receiverPeers.forEach((peerUserAccepts) => {
        console.log("sending transfer offer: ", transfer, "sex", peerUserAccepts)
        sendSomeData(finalOffer, peerUserAccepts.id)
      });
    }

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
            </div>
          ))}


          
          
          <h3 className="text-xl m-2">Incoming: </h3>
          {AppGlobals.incomingFileTransfers.map((transfer) => (
            <div key={transfer.id} className="bg-white/10 flex rounded-lg h-20 m-4"> 
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
                <span> You didn't accept this transfer. </span>
              )}
              <br/>
              {transfer.isAborted   
                ? <div> This transfer is aborted </div>
                : <div> {transfer.isPaused       
                  ? <div> This transfer is paused </div>
                  : <div> This transfer is going now </div>
                } </div>
              }
              
            </div>
          ))}

          <h3 className="text-xl m-2">Outgoing: </h3>
          {AppGlobals.outgoingFileTransfers.map((transfer) => (
             <div key={transfer.id} className="bg-white/10 flex rounded-lg h-20 m-4"> 
              {/* desc */}
              <div className="flex flex-col justify-evenly px-4 font-semibold flex-grow w-1/3 truncate">
                <p>{transfer.name}</p>
                <p>{(transfer.size / 1024).toFixed(2)} KB</p>
              </div>
              <div className="flex items-center w-1/2 justify-center mx-4">
                {/* progressbar */}
                {transfer.receiverPeers.map((receiver) => (
                  <div key={receiver.id} className="h-1/6 w-full border-2 border-sky-600 flex m-auto rounded-md">
                    <div className='bg-sky-600' style={{
                      width:`${receiver.progress}%`
                    }}/>
                  </div>
                  // uploadProgressValues(transfer.id) <= zwraca jsona z progresem
                  // <div key={receiver.id} className="bg-sky-500 h-1/6 m-auto w-1/4"> 
                  //   {receiver.progress}
                  //   XX{ JSON.stringify(uploadProgressValues(transfer, receiver.id)) }XX

                  //   <br/> 

                  //   {receiver.isAborted       
                  //     ? <div> This transfer was aborted by receiver  </div>
                  //     : <div> {transfer.isPaused 
                  //       ? <div> This transfer is paused <button onClick={() => {resumeOutgoingTransfer(transfer.id)}}> RESUME UPLOAD </button> </div>
                  //       : <div> This transfer is going now <button onClick={() => {pauseOutgoingTransfer(transfer.id)}}> PAUSE UPLOAD </button> </div>
                  //     } </div>
                  //   }


                  // </div>
                ))}
              </div>
              {/* buttons */}
              <div className="flex mx-4 m-auto space-x-4">
                <button className={`bg-sky-600 p-2 ${(transfer.progress != null || transfer.progress! > 0) ? 'hidden':'visible'}`} onClick={() => {sendTransferOffer(transfer)}}>Send</button>
                <button className="bg-red-600 p-2" onClick={() => deleteActiveOutgoingTransfer(transfer.id)}>Delete</button>
              </div>
             
              
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

        </div>
    );
};

