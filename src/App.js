import React, { useEffect, useState } from "react";
import Peer from "peerjs";
import { renderProgress } from "./utils"

let receivedChunks = [];

const App = () => {
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [progress, setProgress] = useState("");
  const [totalChunks, setTotalChunks] = useState(0);
  const [fileName, setFileName] = useState("");

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
        console.log("Connection established with: " + conn.peer);
        setConnection(conn);
      });

      conn.on("data", (data) => {
        handleReceivedData(data);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        setConnection(null);
      });
    });

    return () => {
      if (connection) {
        connection.close();
        setConnection(null);
      }
      newPeer.disconnect();
      newPeer.destroy();
    };
  }, []);

  const handleReceivedData = (data) => {
    if (data.dataType === "FILE_CHUNK") {
      console.log("RECEIVED FILE_CHUNK", data)
      const { chunk, currentChunk, totalChunks, name, type } = data;
      const chunkData = new Uint8Array(chunk);
      const fileChunk = new Blob([chunkData], { type });

      receivedChunks.push(fileChunk)
      
      // of often do we want to upload progress bars (e.g every X chunks received)
      if(receivedChunks.length%5 == 0){
        setProgress(receivedChunks.length / totalChunks * 100)
      }

      console.log(receivedChunks)

      if (currentChunk === totalChunks - 1) {
        console.log("LAST_CHUNK_RECEIVED")
        setProgress(100)
        const combinedFile = new Blob(receivedChunks, { type });
        const downloadLink = URL.createObjectURL(combinedFile);

        const anchorElement = document.createElement("a");
        anchorElement.href = downloadLink;
        anchorElement.download = name;
        anchorElement.click();

        URL.revokeObjectURL(downloadLink);
        receivedChunks = [];
        setTotalChunks(0);
        setFileName("");
      }
    } else {
      // TEXT MESSAGE
      console.log("Received message:", data);
      setChatMessages((prevChatMessages) => [
        ...prevChatMessages,
        { peerId: connection.peer, message: data },
      ]);
    }
  };

  const connectToPeer = () => {
    const peerId = document.getElementById("peerIdInput").value;
    if (peer && peerId) {
      console.log("Initiating connection to: " + peerId);
      const conn = peer.connect(peerId);

      conn.on("open", () => {
        console.log("Connection established with: " + conn.peer);
        setConnection(conn);
      });

      conn.on("data", (data) => {
        handleReceivedData(data);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        setConnection(null);
      });
    }
  };

  const sendMessage = () => {
    if (connection && messageInput) {
      console.log("Sending message: " + messageInput + " to " + connection.peer);
      connection.send(messageInput);
      setChatMessages((prevChatMessages) => [
        ...prevChatMessages,
        { peerId: myPeerId, message: messageInput },
      ]);
      setMessageInput("");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const chunkSize = 64 * 1024; // 64kB chunk size
    const totalChunks = Math.ceil(file.size / chunkSize);

    setTotalChunks(totalChunks);
    setFileName(file.name);

    const reader = new FileReader();
    let currentChunk = 0;

    reader.onload = () => {
      const arrayBuffer = reader.result;
      const chunkData = new Uint8Array(arrayBuffer);

      const chunk = {
        dataType: "FILE_CHUNK",
        chunk: chunkData,
        currentChunk,
        totalChunks,
        name: file.name,
        type: file.type,
      };

      connection.send(chunk);

      if (currentChunk < totalChunks - 1) {
        currentChunk++;
        loadNextChunk();
      }
    };

    const loadNextChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      reader.readAsArrayBuffer(chunk);
    };

    loadNextChunk();
  };

  const resetConnection = () => {
    if (connection) {
      console.log("Resetting connection...");
      const peerId = connection.peer;
      connection.close();
      setConnection(null);
    }
  };

  console.log("RE RENDERING")

  return (
    <div>
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      {connection ? (
        <div>
          <h2>Connected to Peer: {connection.peer}</h2>
          <div>
            {chatMessages.map((chatMessage, index) => (
              <p key={index}>
                {chatMessage.systemMessage ? (
                  <em>{chatMessage.systemMessage}</em>
                ) : (
                  <span>
                    <b>{chatMessage.peerId.substring(0, 8)}</b> {chatMessage.message}
                  </span>
                )}
              </p>
            ))}
          </div>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
          <input type="file" onChange={handleFileUpload} />
          <button onClick={resetConnection}> RESET CONNECTION </button>
          {renderProgress(progress, fileName)}
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