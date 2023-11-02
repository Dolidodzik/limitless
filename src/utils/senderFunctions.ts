import { AppGlobals } from "../globals/globals";
import { AppConfig } from "../config";
import { calculateTotalChunks } from "./utils";
import { ConnectionData, transferPauseNotification } from "../dataStructures/interfaces";


export function sendSomeData(
    data: Object,
    targetPeer: string | string[] | null = null, // if targetPeer is null, we assume that message will be sent to everyone, if it's array of strings we send the data to every peer from the array, and if it's string we just send data to the one
){
    console.log("SENDING SOMETHING")
    console.log("targetPeer: ", targetPeer)
    console.log("data: ", data)
    
    if(typeof(targetPeer) == "string"){ // selected single peer
        AppGlobals.connections
        .filter((c) => targetPeer === c.peerId )
        .forEach((c) => c.connection.send(data));
    } else if (Array.isArray(targetPeer)) { // selected peers
        console.log("SENDING TO SELECTED PEERS")
        AppGlobals.connections
        .filter((c) => targetPeer.includes(c.peerId) )
        .forEach((c) => {
            console.log("HERE SENDING UWUUWUWUW ", c)
            c.connection.send(data);
        })
    } else { // every connected peer
        AppGlobals.connections
        .forEach((c) => c.connection.send(data));
    }
}

export function sendTransferPauseNotification(isPaused: boolean, transferID: string){
  const notification: transferPauseNotification = {
    dataType: "TRANSFER_PAUSE_NOTIFICATION",
    isPaused: isPaused,
    transferID: transferID
  }

  const index = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
  let targetPeers: string[] = [];
  AppGlobals.outgoingFileTransfers[index].receiverPeers.forEach(userAccepts => {
    targetPeers.push(userAccepts.id)
  });

  sendSomeData(notification, targetPeers);
}

export const sendChunksData = async (file: File, connectionData: ConnectionData, transferID: string) => {

    const chunkSize: number = AppConfig.chunkSize;
  
    if (!file){
      console.log("NO FILE SELECTED??? BIG ERROR SOMETHING WENT WRONG.");
      return;
    } 
  
    const totalChunks = calculateTotalChunks(file.size, chunkSize)
    const reader = new FileReader();
    let currentChunk = 0;
  
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const chunkData = new Uint8Array(arrayBuffer);
  
      const chunk = {
        dataType: "FILE_CHUNK",
        chunk: chunkData,
        currentChunk,
        totalChunks,
        name: file.name,
        type: file.type,
        transferID: transferID,
        chunkOrder: currentChunk
      };
      
      const doTheSending = async () => {
        connectionData.connection.send(chunk);
    
        if (currentChunk < totalChunks - 1) {
          currentChunk++;
          loadNextChunk();
        }
      }
  
      const waiter = async() => {
  
        const fileInfo = AppGlobals.outgoingFileTransfers.find(
          (fileInfo) => fileInfo.id === transferID
        );
  
        const userAccepts = fileInfo?.receiverPeers.find(
          (peer) => peer.id === connectionData.peerId
        );
        let clientProgress: number = 0;
        if(userAccepts?.progress){
          clientProgress = userAccepts.progress
        }
  
        // this check makes sure we don't chunk too much of data in advance. It matters only for bigger files tho
        if(((totalChunks<100) || (clientProgress+2 >= (currentChunk / totalChunks) * 100)) && !fileInfo?.isPaused){
          doTheSending();
        } else {
          setTimeout(function () {
            waiter();
          }, 100)
        }
      }
      waiter();
    };
  
    const loadNextChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      reader.readAsArrayBuffer(chunk);
    };
  
    if(currentChunk <= 0){
      loadNextChunk();
    }
  };