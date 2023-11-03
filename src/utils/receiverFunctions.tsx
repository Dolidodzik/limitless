import { FileTransfer } from '../dataStructures/classes'; 
import { sendProgressUpdateMessage } from './utils';
import { sendChunksData } from './senderFunctions';
import { ChatMessage } from '../dataStructures/interfaces';
import { AppGlobals } from '../globals/globals';


// FILE_TRANSFER_ACCEPT - receiver got the FILE_TRANSFER_OFFER, and now sends back message which is greenlighting sender to actually start sending chunks
export function receiveFileTransferFileAccept(
    senderPeerId: string,
    data: any,
    forceUpdate: () => void
){ 

    console.log("FILE TRANSFER ACCEPT RECEIVED - OTHER PEER ACCEPTED THIS TRANSFER.");
    const fileIndex = AppGlobals.outgoingFileTransfers.findIndex(file => file.id === data.id);
    const fileToUpdate = AppGlobals.outgoingFileTransfers[fileIndex];
    const updatedFile = { ...fileToUpdate };

    // Edit the properties of the copied object
    const i = updatedFile.receiverPeers.findIndex((user) => user.id === senderPeerId);
    updatedFile.receiverPeers[i].isAccepted = true;

    // Update the state with the modified object
    AppGlobals.outgoingFileTransfers[fileIndex] = updatedFile;

    // chunks go wrrrrrrrr (actual file transfer starts)
    const connectionData = AppGlobals.connections.find((connectionData) => connectionData.peerId === senderPeerId);

    if(updatedFile.selectedFile && connectionData){
        console.log("SENDING CHUNKS")
        AppGlobals.outgoingFileTransfers[fileIndex].progress = 0;
        sendChunksData(updatedFile.selectedFile, connectionData, updatedFile.id)
        forceUpdate()
    }else{
        console.log("BIG ERROR SELECTED FILE IS EMPTY, CANNOT SEND OR CONNECTION DATA IS EMPTY FOR SOME REASON")
    }

    forceUpdate();
}


// FILE_CHUNK - file chunk received
export function receiveFileChunk(
        senderPeerId: string, 
        data: any, 
        forceUpdate: () => void
    ){ 

    //console.log("RECEIVED FILE_CHUNK", data);
    const { chunk, currentChunk, totalChunks, name, type, transferID, chunkOrder } = data;
    const chunkData = new Uint8Array(chunk);
    const fileChunk = new Blob([chunkData], { type });

    // if there isn't transfer with that ID in blob list, then add it 
    if (!AppGlobals.receivedChunks[transferID]) {
        AppGlobals.receivedChunks[transferID] = {
            chunks: [],
        };
    }

    AppGlobals.receivedChunks[transferID].chunks.push({
        blob: fileChunk,
        chunkOrder: chunkOrder,
    });

    if (AppGlobals.receivedChunks[transferID].chunks.length % 10 === 0) {
        let progress = Math.floor((AppGlobals.receivedChunks[transferID].chunks.length / totalChunks) * 100 * 100) / 100;
        if(progress >= 100){
            progress = 99.99; // we don't set 100 here, if that would be the case for whatever reason. We set 100% only when we combined file and nothing crashed.
        }else if(progress < 0){
            progress = 0;
        }

        const transferIndex = AppGlobals.incomingFileTransfers.findIndex(
            transfer => transfer.id === transferID
        );

        if (transferIndex !== -1) {
            AppGlobals.incomingFileTransfers[transferIndex].progress = progress;
            forceUpdate()
        } else {
            console.log(`No reciver transfer found with ID ${transferID}.`);
        }
    }

    // last chunk received
    if (currentChunk === totalChunks - 1) {
        // Sort the received chunks by chunkOrder
        const beforeSorting = AppGlobals.receivedChunks
        AppGlobals.receivedChunks[transferID].chunks.sort((a, b) => a.chunkOrder - b.chunkOrder);
        if(beforeSorting == AppGlobals.receivedChunks){
            console.log("before sorting chunks they were fine")
        }else{
            console.log("before sorting chunks had order issue")
        }

        const combinedChunks = AppGlobals.receivedChunks[transferID].chunks.map(chunkInfo => chunkInfo.blob);
        const combinedFile = new Blob(combinedChunks, { type });

        const downloadLink = URL.createObjectURL(combinedFile);

        const anchorElement = document.createElement("a");
        anchorElement.href = downloadLink;
        anchorElement.download = name;
        anchorElement.click();

        URL.revokeObjectURL(downloadLink);

        // set progress to 100
        const transferIndex = AppGlobals.incomingFileTransfers.findIndex(
            transfer => transfer.id === transferID
        );
        AppGlobals.incomingFileTransfers[transferIndex].progress = 100;
        forceUpdate();

        // Clear chunks for this transfer
        AppGlobals.receivedChunks[transferID].chunks = [];
    }    
}

// new data from other peer came

export function handleReceivedData (
    data: any, 
    senderPeerId: string, 
    myPeerId: string,
    forceUpdate: () => void,
    addMessageToChatLogs: (message: string, peerId: string) => void
){

    console.log("RECEIVED SOMETHING: ", data)
    
    if(!data || !data.dataType || !addMessageToChatLogs){
      console.warn("Received some data with nonexistent dataType property")
      return;
    }

    if (data.dataType === "FILE_CHUNK") {
      receiveFileChunk(
        senderPeerId,
        data,
        forceUpdate
      );
    } else if (data.dataType == "TRANSFER_PROGRESS_UPDATE") {
      // Received progress update from receiver
      const fileInfo = AppGlobals.outgoingFileTransfers.find((file) => file.id === data.transferID);
      if (fileInfo) {
        fileInfo.setPeerProgress(senderPeerId, data.progress, data.last5updates);
        forceUpdate();
      }else{
        console.warn("RECEIVED FAULTY FILE TRANSFER UPDATE")
      }
    } else if (data.dataType === "FILE_TRANSFER_ACCEPT" && data.id) {
      receiveFileTransferFileAccept(
        senderPeerId,
        data,
        forceUpdate
      );
    } else if (data.dataType == "FILE_TRANSFER_OFFER") { // sender chose files, and asks peer for permission to start sending them
      if(data && data.totalChunks && data.size){ // checking if data is valid offer, or at least looks like it
        console.log("file offer json string received ", data)
        let incomingOffer = new FileTransfer(
          data.name,
          data.size,
          data.totalChunks,
          data.id,
          data.type
        );
        incomingOffer.setPeerIDs(senderPeerId, [{id: myPeerId, isAccepted: false, progress: null, last5updates: null}])
        AppGlobals.incomingFileTransfers.push(incomingOffer);
        forceUpdate();
      }
    } else if (data.dataType == "CHAT_MESSAGE" && data.text){
      // Handling usual text chat message
      console.log("Received normal text message:", data);
      addMessageToChatLogs(data.text, senderPeerId);
    } else if (data.dataType == "SENDER_CANCELLED_TRANSFER"){ // sender is letting know that he cancelled the transfer
      // handle transfer being canclled somehow - transfer is effectively over, it can be deleted or kept alive just to let end user know what happened with it 
    } else if(data.dataType == "NICKNAME_MANIFEST"){ // other peer is letting know about his username
      const connectionData = AppGlobals.connections.find((connectionData) => connectionData.peerId === senderPeerId);
      if(connectionData){
        console.log("SETTING NICKNAME")
        connectionData.peerNickname = data.nickname;
        console.log(connectionData)
      }
        
    } else if(data.dataType == "TRANSFER_PAUSE_NOTIFICATION"){
      const index = AppGlobals.incomingFileTransfers.findIndex(fileInfo => fileInfo.id === data.transferID);
      AppGlobals.incomingFileTransfers[index].isPaused = data.isPaused;
    } else {
      console.warn("received some data with unknown dataType")
    }
  };