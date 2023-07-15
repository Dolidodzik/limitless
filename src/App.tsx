import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import Peer from "peerjs";
import { ChatMessage, ConnectionData, FileInfoInterface } from './interfaces'
import { ChatRenderer, generateRandomString, calculateTotalChunks, isJsonString } from './utils';
import { FileInfo } from './classes';


let receivedChunks: Blob[] = [];
const chunkSize = 64 * 1024; // 64kB chunk size

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [outgoingFileTransfers, setOutgoingFileTransfers] = useState<FileInfo[]>([]);
  const [incomingFileTransfers, setIncomingFileTransfers] = useState<FileInfo[]>([]);


  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const connectionsRef = useRef<ConnectionData[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

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

    if (data.dataType === "FILE_CHUNK") {
      console.log("RECEIVED FILE_CHUNK", data);
      const { chunk, currentChunk, totalChunks, name, type } = data;
      const chunkData = new Uint8Array(chunk);
      const fileChunk = new Blob([chunkData], { type });

      receivedChunks.push(fileChunk);

      if (receivedChunks.length % 5 === 0) {
        setProgress((receivedChunks.length / totalChunks) * 100);
      }

      console.log(receivedChunks);

      if (currentChunk === totalChunks - 1) {
        console.log("LAST_CHUNK_RECEIVED");
        setProgress(100);
        const combinedFile = new Blob(receivedChunks, { type });
        const downloadLink = URL.createObjectURL(combinedFile);

        const anchorElement = document.createElement("a");
        anchorElement.href = downloadLink;
        anchorElement.download = name;
        anchorElement.click();

        URL.revokeObjectURL(downloadLink);
        receivedChunks = [];
        setTotalChunks(0);
        //setFileName("");
      }
    } else if (isJsonString(data)) {
      data = JSON.parse(data);
      if(data && data.totalChunks && data.size){ // checking if data is valid offer, or at least looks like it
        console.log("file offer json string received ", data)
        let incomingOffer = new FileInfo(
          data.name,
          data.size,
          data.totalChunks,
          data.id,
          data.type,
          data.isAccepted
        );
        incomingOffer.setPeerIDs(senderPeerId, [myPeerId])
        setIncomingFileTransfers((prevTransfers) => [...prevTransfers, incomingOffer]);
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

  const sendChunksData = () => {

    if (!selectedFile){
      console.log("NO FILE SELECTED PLEASE SELECT FILE");
      return;
    } 

    const totalChunks = calculateTotalChunks(selectedFile.size, chunkSize)

    setTotalChunks(totalChunks);

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
        name: selectedFile.name,
        type: selectedFile.type,
      };

      connectionsRef.current.forEach((c) => c.connection.send(chunk));

      if (currentChunk < totalChunks - 1) {
        currentChunk++;
        loadNextChunk();
      }
    };

    const loadNextChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, selectedFile.size);
      const chunk = selectedFile.slice(start, end);

      reader.readAsArrayBuffer(chunk);
    };

    loadNextChunk();
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
      false
    )
    
    console.log("sending this offer to all connected clients: ", outgoingTransferOffer);
    connectionsRef.current.forEach((c) => {c.connection.send(JSON.stringify(outgoingTransferOffer))});
    
    // when connection is already sent, we edit it for this client only and assign correct peer ids
    const connectedPeerIDs = connectionsRef.current.map(c => c.peerId);
    outgoingTransferOffer.setPeerIDs(myPeerId, connectedPeerIDs);
    setOutgoingFileTransfers((prevTransfers) => [...prevTransfers, outgoingTransferOffer]);

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
  console.log(connectionsRef.current);
  console.log("chatlogs: ", chatLogs)
  console.log("outcoming transfers: ", outgoingFileTransfers);
  console.log("incoming transfers: ", incomingFileTransfers)

  const addSystemMessage = (message: string) => {
    const chatMessage: ChatMessage = { peerId: "SYSTEM", message: message };
    setChatLogs((prevChatLogs) => [...prevChatLogs, chatMessage]);
  }

  const disconnectFromSelectedClient = (peerId: string) => {
    console.log("Connection closed with (BY BUTTON CLICK): " + peerId);
    // closing connection with unwanted peer
    connectionsRef.current.forEach((c) => {
      if(c.peerId == peerId)
        c.connection.close()
    });
    
    // removing unwanted peer from connections ref
    connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== peerId);

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
            <div key={connection.peerId}> * {connection.peerId} <button onClick={() => disconnectFromSelectedClient(connection.peerId)}> disconnect </button> </div>
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
          {incomingFileTransfers.map((transfer) => (
            <div key={transfer.id}> 
              * <b>{transfer.id}</b> from <b>{transfer.senderPeerID}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks.
              <br/>
              isAccepted: {transfer.isAccepted.toString()}
            </div>
          ))}

          <h3>  Outgoing: </h3>
          {outgoingFileTransfers.map((transfer) => (
            <div key={transfer.id}> 
              * <b>{transfer.id}</b> to <b>{transfer.receiverPeerIDs}</b> for file <b>{transfer.name} {transfer.size}</b>, with type <b>{transfer.type}</b>, consisting of <b>{transfer.totalChunks}</b> chunks.
              <br/>
              isAccepted: {transfer.isAccepted.toString()}
            </div>
          ))}
          

          <br/>
          <br/>

          <input type="file" onChange={handleFileUpload} />
          <button onClick={handleFileSubmit}>SEND SELECTED FILE!</button>

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
