import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import Peer from "peerjs";
import { ChatMessage, ConnectionData, userAccepts, progressUpdateMessage } from './interfaces'
import { ChatRenderer, generateRandomString, calculateTotalChunks, isJsonString, sendChunksData, sendProgressUpdateMessage } from './utils';
import { FileInfo } from './classes';
import { blobDict } from './types';


let receivedChunks: blobDict = {};
const chunkSize = 64 * 1024; // 64kB chunk size

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // IDs of peers user chose to send file to
  const [targetPeers, setTargetPeers] = useState<string[]>([]);

  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const connectionsRef = useRef<ConnectionData[]>([]);
  const outgoingFileTransfersRef = useRef<FileInfo[]>([]);
  const incomingFileTransfersRef = useRef<FileInfo[]>([]);

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
      console.log(`Progress of transfer with ID ${transferID} has been set to ${progress}.`);
      forceUpdate()
    } else {
      console.log(`No transfer found with ID ${transferID}.`);
    }
  }

  // if state was updated with removing non-accepting client, or with editing client that wasn't accepting, but he accepts now for any outgoing transfer, and now all clients for that transfer agree to receive, we can start sending.
  outgoingFileTransfersRef.current.forEach((transfer, index: number) => {
    if (transfer.receiverPeers.every(peer => peer.isAccepted) && transfer.progress === null) {
      console.log("All receiverPeers have accepted this transfer:");
      if(transfer.selectedFile){
        console.log("SENDING CHUNKS")
        sendChunksData(transfer.selectedFile, connectionsRef.current, transfer.id, setProgress)
        outgoingFileTransfersRef.current[index].progress = 0;
        forceUpdate()
      }else{
        console.log("BIG ERROR SELECTED FILE IS EMPTY, CANNOT SEND")
      }
    } 
  });


  useEffect(() => {
    const newPeer = new Peer();

    newPeer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      setMyPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on("connection", (conn) => {
      console.log("Incoming connection from: " + conn.peer);

      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        console.log("Connection established with: " + conn.peer);
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        console.log("FIRST DATA EVENT RECEIVE");
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        console.log("Connection closed with: " + conn.peer);
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    });

    return () => {
      console.log("RETURN USEEFFECT CLEANUP");
      connectionsRef.current.forEach((c) => c.connection.close());
      connectionsRef.current = [];
      setChatLogs([]);
      newPeer.disconnect();
      newPeer.destroy();
    };
  }, []);

  const handleReceivedData = (data: any, senderPeerId: string) => {
    if(!data){
      console.log("NON EXISTING DATA WAS SENT")
      return;
    }
    console.log("RECEIVED SOME DATA: ", data)

    if (data.dataType && data.dataType === "FILE_CHUNK") {
      console.log("RECEIVED FILE_CHUNK", data);
      const { chunk, currentChunk, totalChunks, name, type, transferID } = data;
      const chunkData = new Uint8Array(chunk);
      const fileChunk = new Blob([chunkData], { type });

      // if there isn't transfer with that ID in blob list, then add it

      console.log("IMPORTANT UWUWUWUWUWUWU", transferID)

      if(!receivedChunks[transferID])
        receivedChunks[transferID] = [];
      
      receivedChunks[transferID].push(fileChunk)


      if (receivedChunks[transferID].length % 10 === 0) {
        console.log("CHANGE RECEIVER PROGRESS...")
        console.log("CHANGE RECEIVER PROGRESS...")
        console.log("CHANGE RECEIVER PROGRESS...")
        let progress = Math.floor((receivedChunks[transferID].length / totalChunks) * 100 * 100) / 100;
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
          console.log(`receiver progress of transfer with ID ${transferID} has been set to ${transferID}.`);
          
          // letting know uploader how download progress is going
          sendProgressUpdateMessage(
            progress,
            senderPeerId,
            transferID,
            connectionsRef.current
          );

          forceUpdate()
        } else {
          console.log(`No reciver transfer found with ID ${transferID}.`);
        }
      }


      console.log("recived chunks up to this point: ", receivedChunks);

      if (currentChunk === totalChunks - 1) {
        console.log("LAST_CHUNK_RECEIVED");
        const combinedFile = new Blob(receivedChunks[transferID], { type });
        const downloadLink = URL.createObjectURL(combinedFile);

        const anchorElement = document.createElement("a");
        anchorElement.href = downloadLink;
        anchorElement.download = name;
        anchorElement.click();

        URL.revokeObjectURL(downloadLink);
        receivedChunks[transferID] = [];

        // letting know uploader how download progress is going
        sendProgressUpdateMessage(
          100,
          senderPeerId,
          transferID,
          connectionsRef.current
        );
        console.log("called sendprogresupdatemessage with ", senderPeerId, transferID, connectionsRef.current)

        // set progress to 100
        const transferIndex = incomingFileTransfersRef.current.findIndex(
          transfer => transfer.id === transferID
        );
        incomingFileTransfersRef.current[transferIndex].progress = 100;
        forceUpdate()
      }
    } else if (data.dataType == "TRANSFER_PROGRESS_UPDATE") {

      console.log("RECEIVED TRANSFER_PROGRESS_UPDATE ", data)
    
      // Find the corresponding FileInfo object in the outgoingFileTransfersRef
      const fileInfo = outgoingFileTransfersRef.current.find((file) => file.id === data.transferID);
      console.log("FILE INFO ", fileInfo)
      if (fileInfo) {
        console.log("FILE INFO EXISTS")
        fileInfo.setPeerProgress(senderPeerId, data.progress);
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
      forceUpdate();
    } else if (isJsonString(data)) {
      data = JSON.parse(data);
      if(data && data.totalChunks && data.size){ // checking if data is valid offer, or at least looks like it
        console.log("file offer json string received ", data)
        let incomingOffer = new FileInfo(
          data.name,
          data.size,
          data.totalChunks,
          data.id,
          data.type
        );
        incomingOffer.setPeerIDs(senderPeerId, [{id: myPeerId, isAccepted: false, progress: null}])
        console.log("got this offer: ", incomingOffer);
        incomingFileTransfersRef.current = [...incomingFileTransfersRef.current, incomingOffer];
        forceUpdate();
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
      console.log("Initiating connection to: " + peerId);
      const conn = peer.connect(peerId);

      conn.on("open", () => {
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        console.log("Connection established with: " + conn.peer);
        addSystemMessage("Connection established with: " + conn.peer)
      });

      conn.on("data", (data) => {
        console.log("SECOND DATA EVENT RECEIVE");
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        console.log("Connection closed with: " + conn.peer);
        addSystemMessage("Connection closed with: " + conn.peer)
      });
    }
  };

  const sendMessage = () => {
    if (messageInput) {
      console.log("Sending message: " + messageInput);
      const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
      setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
      connectionsRef.current
        .filter((c) => c.peerId !== myPeerId)
        .forEach((c) => c.connection.send(messageInput));
      setMessageInput("");
      console.log("MY CONNECTIONS:");
      console.log(connectionsRef.current);
    }
  };

  const handleFileSubmit = () => {
    if (!selectedFile){
      console.log("NO FILE SELECTED PLEASE SELECT FILE");
      return;
    } 

    let outgoingTransferOffer = new FileInfo(
      selectedFile.name,
      selectedFile.size,
      calculateTotalChunks(selectedFile.size, chunkSize),
      generateRandomString(32),
      selectedFile.type,
      selectedFile
    )
    
    console.log("sending this offer to all connected clients: ", outgoingTransferOffer);
    connectionsRef.current.forEach((c) => {c.connection.send(JSON.stringify(outgoingTransferOffer))});
    
    // when connection is already sent, we edit it for this client only and assign correct peer ids
    const connectedPeerIDs: userAccepts[] = connectionsRef.current.map(c => ({ id: c.peerId, isAccepted: false, progress: null }));
    
    outgoingTransferOffer.setPeerIDs(myPeerId, connectedPeerIDs);
    outgoingFileTransfersRef.current = [...outgoingFileTransfersRef.current, outgoingTransferOffer];
    forceUpdate();
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (file) {
      console.log("FILE WAS SELECTED", file);
      setSelectedFile(file);
    } else {
      console.log("NO FILE WAS SELECTED");
    }
  };

  const resetConnection = () => {
    console.log("Resetting connection...");
    connectionsRef.current.forEach((c) => c.connection.close());
    connectionsRef.current = [];
    setChatLogs([]);
    forceUpdate();
  };

  console.log("RE RENDERING");
  console.log("incoming transfers: ", incomingFileTransfersRef.current)
  console.log("outgoing transfers: ", outgoingFileTransfersRef.current)

  const addSystemMessage = (message: string) => {
    const chatMessage: ChatMessage = { peerId: "SYSTEM", message: message };
    setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
  }

  const disconnectFromSelectedClient = (peerId: string) => {
    console.log("Connection closed with (BY BUTTON CLICK): " + peerId);
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
                    <span> Progress: {transfer.progress} </span>
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
              To peers:
              {transfer.receiverPeers.map((receiver) => (
                <div key={receiver.id}> 
                  * {receiver.id}, accepted: {receiver.isAccepted.toString()}, with progress {receiver.progress}%.
                </div>
              ))}
              <br/>

            </div>
          ))}
          

          <br/>
          <br/>

          <input type="file" onChange={handleFileUpload} />
          <button onClick={handleFileSubmit}>SEND SELECTED FILE TO SELECTED PEERS!</button>

          <br />
          <br />
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
