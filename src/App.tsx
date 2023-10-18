import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import Peer from "peerjs";
import { ChatMessage, ConnectionData, userAccepts } from './interfaces'
import { ChatRenderer, generateRandomString, calculateTotalChunks, isJsonString, transferProgress, dealWithTransferProgressUpdates } from './utils';
import { FileTransfer, senderCancelTransferMessage } from './classes';
import { AppConfig } from './config';
import { receiveFileChunk, receiveFileTransferFileAccept } from './receiverFunctions';
import { AppGlobals } from './globals';



const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // IDs of peers user chose to send file to
  const [targetPeers, setTargetPeers] = useState<string[]>([]);

  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const newPeer = new Peer();
    const progressUpdatesInterval = setInterval(() => 
    dealWithTransferProgressUpdates(), AppConfig.transferProgressUpdatesInterval);


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
        AppGlobals.connections.push(newConnectionData);
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        // removing connection
        const indexToRemove = AppGlobals.connections.findIndex(c => c.peerId === conn.peer);
        if (indexToRemove !== -1) { AppGlobals.connections.splice(indexToRemove, 1); }
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    });

    return () => {
      AppGlobals.connections.forEach((c) => c.connection.close());
      AppGlobals.connections.splice(0, AppGlobals.connections.length);
      setChatLogs([]);
      newPeer.disconnect();
      newPeer.destroy();
      clearInterval(progressUpdatesInterval);
    };
  }, []);

  const handleReceivedData = (data: any, senderPeerId: string) => {
    
    if(!data || !data.dataType){
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
      const chatMessage: ChatMessage = { peerId: senderPeerId, message: data.text };
      setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
    } else if (data.dataType == "SENDER_CANCELLED_TRANSFER"){ // sender is letting know that he cancelled the transfer
      // handle transfer being canclled somehow - transfer is effectively over, it can be deleted or kept alive just to let end user know what happened with it 
    } else {
      console.warn("received some data with unknown dataType")
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
        AppGlobals.connections.push(newConnectionData)
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        // removing connection
        const indexToRemove = AppGlobals.connections.findIndex(c => c.peerId === conn.peer);
        if (indexToRemove !== -1) { AppGlobals.connections.splice(indexToRemove, 1); }
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    }
  };

  const sendMessage = () => {
    if (messageInput) {
      const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
      const chatMessageTransfer = { text: messageInput, dataType: "CHAT_MESSAGE" }
      setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
      AppGlobals.connections
        .filter((c) => c.peerId !== myPeerId)
        .forEach((c) => c.connection.send(chatMessageTransfer));
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
      AppGlobals.connections.forEach((c) => {
        if(targetPeers.includes(c.peerId)){
          let offer: any = JSON.parse(JSON.stringify(outgoingTransferOffer));
          offer.dataType = "FILE_TRANSFER_OFFER";
          c.connection.send(offer)
        }
      });
  
      // when connection is already sent, we edit it for this client only and assign correct peer ids
      const connectedPeerIDs: userAccepts[] = targetPeers.map(targetPeerID => ({ id: targetPeerID, isAccepted: false, progress: null, last5updates: null }));
      
      outgoingTransferOffer.setPeerIDs(myPeerId, connectedPeerIDs);
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

  const resetConnection = () => {
    AppGlobals.connections.forEach((c) => c.connection.close());
    AppGlobals.connections.splice(0, AppGlobals.connections.length);
    setChatLogs([]);
    forceUpdate();
  };

  const addSystemMessage = (message: string) => {
    const chatMessage: ChatMessage = { peerId: "SYSTEM", message: message };
    setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
  }

  const disconnectFromSelectedClient = (peerId: string) => {
    // closing connection with unwanted peer
    AppGlobals.connections.forEach((c) => {
      if(c.peerId === peerId)
        c.connection.close()
    });
    
    // removing unwanted peer from connections 
    const indexToRemove = AppGlobals.connections.findIndex(c => c.peerId === peerId);
    if (indexToRemove !== -1) { AppGlobals.connections.splice(indexToRemove, 1); }
    forceUpdate();
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

    AppGlobals.connections
    .filter((c) => c.peerId === updatedFile.senderPeerID)
    .forEach((c) => c.connection.send(info));

    AppGlobals.incomingFileTransfers[fileIndex] = updatedFile;
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

  const deleteOutgoingTransfer = (transferID: string) => {
    const transferIndex = AppGlobals.outgoingFileTransfers.findIndex(
      transfer => transfer.id === transferID
    );
    
    const transferPeers = AppGlobals.outgoingFileTransfers[transferIndex].receiverPeers.map(peer => peer.id)

    // sending data only to peers that are receiving this file transfer
    AppGlobals.connections.forEach((c) => {
      if(transferPeers.includes(c.peerId)){
        let cancelMessage = JSON.parse(JSON.stringify(new senderCancelTransferMessage(transferID)))
        c.connection.send(cancelMessage)
      }
    });

    const indexToDelete = AppGlobals.outgoingFileTransfers.findIndex(fileInfo => fileInfo.id === transferID);
    if (indexToDelete !== -1) {
      AppGlobals.outgoingFileTransfers.splice(indexToDelete, 1);
    }
    
    forceUpdate();
  }

  return (
    <div className="App">
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      {AppGlobals.connections.length > 0 ? (
        <div>
          <h1>Connected to Peers:</h1>
          {AppGlobals.connections.map((connection) => (
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
