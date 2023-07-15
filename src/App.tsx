import React, { useEffect, useState, ChangeEvent, useRef, useReducer } from "react";
import Peer, { DataConnection } from "peerjs";

let receivedChunks: Blob[] = [];

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { peerId: string; message: string }[]
  >([]);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [fileName, setFileName] = useState("");
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void


  const connectionRef = useRef<DataConnection | null>(null);


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
        connectionRef.current = conn;
        forceUpdate();
      });

      conn.on("data", (data) => {
        console.log("FIRST DATA EVENT RECEIVE")
        handleReceivedData(data);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        connectionRef.current = null;
      });
    });

    return () => {
      console.log("RETURN USEEFFECT CLEANUP")
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
      newPeer.disconnect();
      newPeer.destroy();
    };
  }, []);

  const handleReceivedData = (data: any) => {
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
        setFileName("");
      }
    } else {
      console.log(connectionRef.current)
      console.log("Received message:", data);
      if (connectionRef.current) {
        setChatMessages((prevChatMessages) => [
          ...prevChatMessages,
          { peerId: connectionRef.current!.peer, message: data },
        ]);
      } else {
        console.log("No active connection to receive message");
      }
    }
  };

  const connectToPeer = () => {
    const peerId = (document.getElementById("peerIdInput") as HTMLInputElement)
      .value;
    if (peer && peerId) {
      console.log("Initiating connection to: " + peerId);
      const conn = peer.connect(peerId);

      conn.on("open", () => {
        console.log("Connection established with: " + conn.peer);
        connectionRef.current = conn;
        forceUpdate()
      });

      conn.on("data", (data) => {
        console.log("SECOND DATA EVENT RECEIVE")
        handleReceivedData(data);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        connectionRef.current = null;
      });
    }
  };

  const sendMessage = () => {
    if (connectionRef.current && messageInput) {
      console.log(
        "Sending message: " + messageInput + " to " + connectionRef.current.peer
      );
      connectionRef.current.send(messageInput);
      setChatMessages((prevChatMessages) => [
        ...prevChatMessages,
        { peerId: myPeerId, message: messageInput },
      ]);
      setMessageInput("");
      console.log("MY CONNECTION:")
      console.log(connectionRef.current)
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    const chunkSize = 64 * 1024; // 64kB chunk size
    const totalChunks = Math.ceil(file.size / chunkSize);

    setTotalChunks(totalChunks);
    setFileName(file.name);

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
      };

      connectionRef.current!.send(chunk);

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
    if (connectionRef.current) {
      console.log("Resetting connection...");
      const peerId = connectionRef.current.peer;
      connectionRef.current.close();
      connectionRef.current = null;
    }
  };

  console.log("RE RENDERING");
  console.log(connectionRef.current)

  return (
    <div>
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      {connectionRef.current ? (
        <div>
          <h2>Connected to Peer: {connectionRef.current.peer}</h2>
          <div>
            {chatMessages.map((chatMessage, index) => (
              <p key={index}>
                <b> {chatMessage.peerId.substring(0, 8)} </b>: {chatMessage.message}
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
