import { blobDict } from './types';
import { RefObject } from 'react';
import { FileTransfer } from './classes'; 
import { sendProgressUpdateMessage, sendChunksData } from './utils';
import { ConnectionData } from './interfaces';

// FILE_TRANSFER_ACCEPT - receiver got the FILE_TRANSFER_OFFER, and now sends back message which is greenlighting sender to actually start sending chunks
export function receiveFileTransferFileAccept(
    senderPeerId: string,
    data: any,
    outgoingFileTransfersRef: RefObject<FileTransfer[]>,
    connectionsRef: RefObject<ConnectionData[]>,
    forceUpdate: () => void
){ 

    if(!outgoingFileTransfersRef || !outgoingFileTransfersRef.current || !connectionsRef || !connectionsRef.current){
        console.error("receiveFileChunk() got empty file transfers / connection ref")
        return;
    }

    console.log("FILE TRANSFER ACCEPT RECEIVED - OTHER PEER ACCEPTED THIS TRANSFER.");
    const fileIndex = outgoingFileTransfersRef.current.findIndex(file => file.id === data.id);
    const fileToUpdate = outgoingFileTransfersRef.current[fileIndex];
    const updatedFile = { ...fileToUpdate };

    // Edit the properties of the copied object
    console.log(updatedFile)
    console.log(outgoingFileTransfersRef.current)
    const i = updatedFile.receiverPeers.findIndex((user) => user.id === senderPeerId);
    updatedFile.receiverPeers[i].isAccepted = true;

    // Update the state with the modified object
    outgoingFileTransfersRef.current[fileIndex] = updatedFile;

    // chunks go wrrrrrrrr (actual file transfer starts)
    const connectionData = connectionsRef.current.find((connectionData) => connectionData.peerId === senderPeerId);

    if(updatedFile.selectedFile && connectionData){
        console.log("SENDING CHUNKS")
        outgoingFileTransfersRef.current[fileIndex].progress = 0;
        sendChunksData(updatedFile.selectedFile, connectionData, updatedFile.id, outgoingFileTransfersRef)
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
        receivedChunks: RefObject<blobDict>, 
        incomingFileTransfersRef: RefObject<FileTransfer[]>,
        connectionsRef: RefObject<ConnectionData[]>,
        forceUpdate: () => void
    ){ 

    if(!incomingFileTransfersRef || !incomingFileTransfersRef.current || !receivedChunks || !receivedChunks.current || !connectionsRef || !connectionsRef.current){
        console.error("receiveFileChunk() got empty file transfers / received chunks / connection data ref")
        return;
    }

    //console.log("RECEIVED FILE_CHUNK", data);
    const { chunk, currentChunk, totalChunks, name, type, transferID, chunkOrder } = data;
    const chunkData = new Uint8Array(chunk);
    const fileChunk = new Blob([chunkData], { type });

    // if there isn't transfer with that ID in blob list, then add it
    if (!receivedChunks.current[transferID]) {
        receivedChunks.current[transferID] = {
            chunks: [],
        };
    }

    receivedChunks.current[transferID].chunks.push({
        blob: fileChunk,
        chunkOrder: chunkOrder,
    });

    if (receivedChunks.current[transferID].chunks.length % 10 === 0) {
        let progress = Math.floor((receivedChunks.current[transferID].chunks.length / totalChunks) * 100 * 100) / 100;
        if(progress >= 100){
            progress = 99.99; // we don't set 100 here, if that would be the case for whatever reason. We set 100% only when we combined file and nothing crashed.
        }else if(progress < 0){
            progress = 0;
        }

        const transferIndex = incomingFileTransfersRef.current.findIndex(
            transfer => transfer.id === transferID
        );

        if (transferIndex !== -1) {
            incomingFileTransfersRef.current[transferIndex].progress = progress;
            //console.log(`receiver progress of transfer with ID ${transferID} has been set to ${transferID}.`);
            
            // letting know uploader how download progress is going
            console.log(incomingFileTransfersRef.current[transferIndex].last5updates)
            sendProgressUpdateMessage(
                progress,
                senderPeerId,
                transferID,
                connectionsRef.current,
                incomingFileTransfersRef.current[transferIndex].last5updates
            );

            forceUpdate()
        } else {
            console.log(`No reciver transfer found with ID ${transferID}.`);
        }
    }

    // last chunk received
    if (currentChunk === totalChunks - 1) {
        // Sort the received chunks by chunkOrder
        const beforeSorting = receivedChunks
        receivedChunks.current[transferID].chunks.sort((a, b) => a.chunkOrder - b.chunkOrder);
        if(beforeSorting == receivedChunks){
            console.log("before sorting chunks they were fine")
        }else{
            console.log("before sorting chunks had order issue")
        }

        const combinedChunks = receivedChunks.current[transferID].chunks.map(chunkInfo => chunkInfo.blob);
        const combinedFile = new Blob(combinedChunks, { type });

        const downloadLink = URL.createObjectURL(combinedFile);

        const anchorElement = document.createElement("a");
        anchorElement.href = downloadLink;
        anchorElement.download = name;
        anchorElement.click();

        URL.revokeObjectURL(downloadLink);

        // letting the uploader know how download progress is going
        sendProgressUpdateMessage(
            100,
            senderPeerId,
            transferID,
            connectionsRef.current,
            null
        );

        // set progress to 100
        const transferIndex = incomingFileTransfersRef.current.findIndex(
            transfer => transfer.id === transferID
        );
        incomingFileTransfersRef.current[transferIndex].progress = 100;
        forceUpdate();

        // Clear chunks for this transfer
        receivedChunks.current[transferID].chunks = [];
    }    
}