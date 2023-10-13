import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import Peer from "peerjs";
import { ChatMessage, ConnectionData, userAccepts, progressUpdateMessage,chunkProgress } from './interfaces'
import { ChatRenderer, generateRandomString, calculateTotalChunks, isJsonString, sendChunksData, sendProgressUpdateMessage, transferProgress, dealWithTransferProgressUpdates } from './utils';
import { FileTransfer, senderCancelTransferMessage } from './classes';
import { blobDict } from './types';
import { AppConfig } from './config';


let receivedChunks: blobDict = {};

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // IDs of peers user chose to send file to
  const [targetPeers, setTargetPeers] = useState<string[]>([]);

  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const connectionsRef = useRef<ConnectionData[]>([]);
  const outgoingFileTransfersRef = useRef<FileTransfer[]>([]);
  const incomingFileTransfersRef = useRef<FileTransfer[]>([]);

  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

  const setProgress = (transferID: string, progress: number) => {
    if(progress > 100){
      progress = 100;
    }else if(progress < 0){
      progress = 0;
    }
    
    const transferIndex = outgoingFileTransfersRef.current.findIndex(
      transfer => transfer.id === transferID
    );
    
    if (transferIndex !== -1) {
      outgoingFileTransfersRef.current[transferIndex].progress = progress;
      forceUpdate()
    }
  }


  useEffect(() => {
    const newPeer = new Peer();
    const progressUpdatesInterval = setInterval(() => 
    dealWithTransferProgressUpdates(
      receivedChunks, 
      incomingFileTransfersRef)
    , AppConfig.transferProgressUpdatesInterval);


    newPeer.on("open", (id) => {
      setMyPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on("connection", (conn) => {
      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    });

    return () => {
      connectionsRef.current.forEach((c) => c.connection.close());
      connectionsRef.current = [];
      setChatLogs([]);
      newPeer.disconnect();
      newPeer.destroy();
      clearInterval(progressUpdatesInterval);
    };
  }, []);

  const handleReceivedData = (data: any, senderPeerId: string) => {
    if(!data){
      return;
    }
    //console.log("RECEIVED SOME DATA: ", data)

    if (data.dataType && data.dataType === "FILE_CHUNK") {
      //console.log("RECEIVED FILE_CHUNK", data);
      const { chunk, currentChunk, totalChunks, name, type, transferID, chunkOrder } = data;
      const chunkData = new Uint8Array(chunk);
      const fileChunk = new Blob([chunkData], { type });

      // if there isn't transfer with that ID in blob list, then add it
      if (!receivedChunks[transferID]) {
        receivedChunks[transferID] = {
          chunks: [],
        };
      }
      
      receivedChunks[transferID].chunks.push({
        blob: fileChunk,
        chunkOrder: chunkOrder,
      });

      if (receivedChunks[transferID].chunks.length % 10 === 0) {
        let progress = Math.floor((receivedChunks[transferID].chunks.length / totalChunks) * 100 * 100) / 100;
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
        receivedChunks[transferID].chunks.sort((a, b) => a.chunkOrder - b.chunkOrder);
        if(beforeSorting == receivedChunks){
          console.log("before sorting chunks they were fine")
        }else{
          console.log("before sorting chunks had order issue")
        }
      
        const combinedChunks = receivedChunks[transferID].chunks.map(chunkInfo => chunkInfo.blob);
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
        receivedChunks[transferID].chunks = [];
      }      
    } else if (data.dataType == "TRANSFER_PROGRESS_UPDATE") {
    
      // Find the corresponding FileInfo object in the outgoingFileTransfersRef
      const fileInfo = outgoingFileTransfersRef.current.find((file) => file.id === data.transferID);
      if (fileInfo) {
        fileInfo.setPeerProgress(senderPeerId, data.progress, data.last5updates);
        forceUpdate();
      }else{
        console.log("RECEIVED FAULTY FILE TRANSFER UPDATE")
      }

    } else if (data.dataType && data.dataType === "FILE_TRANSFER_ACCEPT" && data.id) {
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
        sendChunksData(updatedFile.selectedFile, connectionData, updatedFile.id, setProgress, outgoingFileTransfersRef)
        forceUpdate()
      }else{
        console.log("BIG ERROR SELECTED FILE IS EMPTY, CANNOT SEND OR CONNECTION DATA IS EMPTY FOR SOME REASON")
      }

      forceUpdate();
    } else if (isJsonString(data)) {
      data = JSON.parse(data);
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
        console.log("got this offer: ", incomingOffer);
        incomingFileTransfersRef.current = [...incomingFileTransfersRef.current, incomingOffer];
        forceUpdate();
      } else if (data.code == "SENDER_CANCELLED_TRANSFER"){
        console.log(data)
        console.log(" DATA RECEIVED SENDER_CANCELLED_TRANSFER")
      }else{
        console.log("WRONG JSON STRING RECEIVED ", data)
      }

    } else {
      console.log("Received normal text message:", data);
      const chatMessage: ChatMessage = { peerId: senderPeerId, message: data };
      setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
    }
  };

  const connectToPeer = () => {
    const peerId = (document.getElementById("peerIdInput") as HTMLInputElement).value;
    if (peer && peerId) {
      const conn = peer.connect(peerId);

      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    }
  };

  const sendMessage = () => {
    if (messageInput) {
      const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
      setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
      connectionsRef.current
        .filter((c) => c.peerId !== myPeerId)
        .forEach((c) => c.connection.send(messageInput));
      setMessageInput("");
    }
  };

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
      connectionsRef.current.forEach((c) => {
        if(targetPeers.includes(c.peerId)){
          c.connection.send(JSON.stringify(outgoingTransferOffer))
        }
      });
  
      // when connection is already sent, we edit it for this client only and assign correct peer ids
      const connectedPeerIDs: userAccepts[] = targetPeers.map(targetPeerID => ({ id: targetPeerID, isAccepted: false, progress: null, last5updates: null }));
      
      outgoingTransferOffer.setPeerIDs(myPeerId, connectedPeerIDs);
      outgoingFileTransfersRef.current = [...outgoingFileTransfersRef.current, outgoingTransferOffer];
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

  const resetConnection = () => {
    connectionsRef.current.forEach((c) => c.connection.close());
    connectionsRef.current = [];
    setChatLogs([]);
    forceUpdate();
  };

  const addSystemMessage = (message: string) => {
    const chatMessage: ChatMessage = { peerId: "SYSTEM", message: message };
    setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
  }

  const disconnectFromSelectedClient = (peerId: string) => {
    // closing connection with unwanted peer
    connectionsRef.current.forEach((c) => {
      if(c.peerId === peerId)
        c.connection.close()
    });
    
    // removing unwanted peer from connections ref
    connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== peerId);
    forceUpdate();
  }

  const acceptTransfer = (id: string) => {
    const fileIndex = incomingFileTransfersRef.current.findIndex(file => file.id === id);
    const fileToUpdate = incomingFileTransfersRef.current[fileIndex];
    const updatedFile = { ...fileToUpdate };

    // Edit the properties of the copied object
    updatedFile.receiverPeers[0].isAccepted = true;

    // letting sender know that we will accept his transfer for this file
    const info = {
      dataType: "FILE_TRANSFER_ACCEPT",
      id: updatedFile.id 
    }

    connectionsRef.current
    .filter((c) => c.peerId === updatedFile.senderPeerID)
    .forEach((c) => c.connection.send(info));

    incomingFileTransfersRef.current[fileIndex] = updatedFile;
    forceUpdate();
  }

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

  const senderCancelTransfer = (transferID: string) => {
    const transferIndex = outgoingFileTransfersRef.current.findIndex(
      transfer => transfer.id === transferID
    );
    
    const transferPeers = outgoingFileTransfersRef.current[transferIndex].receiverPeers.map(peer => peer.id)

    // sending data only to selected peers
    connectionsRef.current.forEach((c) => {
      if(transferPeers.includes(c.peerId)){
        c.connection.send(JSON.stringify(new senderCancelTransferMessage(transferID)))
      }
    });

    // change transfer on THIS peer to cancelled
    if (transferIndex !== -1) {
      outgoingFileTransfersRef.current[transferIndex].cancelled = true;
    }
    forceUpdate();
  }

  const deleteOutgoingTransfer = (transferID: string) => {
    outgoingFileTransfersRef.current = outgoingFileTransfersRef.current.filter(
      fileInfo => fileInfo.id !== transferID
    );
    forceUpdate();
  }

  return (
    <div className="App">
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      {connectionsRef.current.length > 0 ? (
        <div>
          <h1>Connected to Peers:</h1>
          {connectionsRef.current.map((connection) => (
            <div key={connection.peerId}> * {connection.peerId} 
              <button onClick={() => disconnectFromSelectedClient(connection.peerId)}> disconnect </button> 
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
          <br/>

          {ChatRenderer(chatLogs, myPeerId)}

          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>

          <br />
          <br />
          <h2> File transfers: </h2>
          <br/>
          <h3>  Incoming: </h3>
          {incomingFileTransfersRef.current.map((transfer) => (
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
          {outgoingFileTransfersRef.current.map((transfer) => (
            <div key={transfer.id} className="box"> 
              * <b>{transfer.id}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks. <br/> 
              <b> (DEBUG INFO) Chunking progress (not actual upload progress, just information about how many chunks were produced here, on sender machine): {transfer.progress} </b> <br/> 
              
              {transfer.cancelled ? 
                <span> you cancelled this transfer. Do you want to delete it from here all together? <button onClick={() => deleteOutgoingTransfer(transfer.id)}> YES </button> </span>
                : 
                <button onClick={() => senderCancelTransfer(transfer.id)}> CANCEL THIS TRANSFER </button>
              }
              
              To peers:
              {transfer.receiverPeers.map((receiver) => (
                <div key={receiver.id}> 
                  * {receiver.id}, accepted: {receiver.isAccepted.toString()}, with progress {receiver.progress}%
                  <br/> speed: {transferProgress(receiver.last5updates, transfer.progress)}
                </div>
              ))}
              <br/>
            </div>
          ))}
          

          <br/>
          <br/>

          <input type="file" multiple onChange={handleFileUpload} />
          <button onClick={handleFileSubmit}>SEND SELECTED FILE TO SELECTED PEERS!</button>

          {selectedFiles.length > 1 ? 
            <span> Selected multiple files. It will work, but it is advised to compress files into .zip before sending them using limitless. </span>
            : 
            <span> Keep in mind selecting multiple files may cause unforseeable stability issues. It's recommended to compress your shit into single .zip if you want to send multiple files. </span>
          }

          <button onClick={resetConnection}>RESET CONNECTION</button>
        </div>
      ) : (
        <div>
          <p>Enter Peer ID to connect:</p>
          <input type="text" id="peerIdInput" />
          <button onClick={connectToPeer}>Connect</button>
        </div>
      )}
    </div>
  );
};

export default App;
