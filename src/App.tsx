import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import Peer, { DataConnection } from "peerjs";

interface ChatMessage {
  peerId: string;
  message: string;
}

interface ConnectionData {
  connection: DataConnection;
  peerId: string;
}

let receivedChunks: Blob[] = [];

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

  const connectionRef = useRef<DataConnection | null>(null);
  const connectionsRef = useRef<ConnectionData[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});

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
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        setChatMessages((prevChatMessages) => ({
          ...prevChatMessages,
          [conn.peer]: [],
        }));
        forceUpdate();
      });

      conn.on("data", (data) => {
        console.log("FIRST DATA EVENT RECEIVE");
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        setChatMessages((prevChatMessages) => {
          const { [conn.peer]: _, ...updatedChatMessages } = prevChatMessages;
          return updatedChatMessages;
        });
        forceUpdate();
      });
    });

    return () => {
      console.log("RETURN USEEFFECT CLEANUP");
      connectionsRef.current.forEach((c) => c.connection.close());
      connectionsRef.current = [];
      setChatMessages({});
      newPeer.disconnect();
      newPeer.destroy();
    };
  }, []);

  const handleReceivedData = (data: any, senderPeerId: string) => {
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
    } else {
      console.log("Received message:", data);
      const chatMessage: ChatMessage = { peerId: senderPeerId, message: data };
      setChatMessages((prevChatMessages) => ({
        ...prevChatMessages,
        [senderPeerId]: [...prevChatMessages[senderPeerId], chatMessage],
      }));
    }
  };

  const connectToPeer = () => {
    const peerId = (document.getElementById("peerIdInput") as HTMLInputElement).value;
    if (peer && peerId) {
      console.log("Initiating connection to: " + peerId);
      const conn = peer.connect(peerId);

      conn.on("open", () => {
        console.log("Connection established with: " + conn.peer);
        const newConnectionData: ConnectionData = {
          connection: conn,
          peerId: conn.peer,
        };
        connectionsRef.current = [...connectionsRef.current, newConnectionData];
        setChatMessages((prevChatMessages) => ({
          ...prevChatMessages,
          [conn.peer]: [],
        }));
        forceUpdate();
      });

      conn.on("data", (data) => {
        console.log("SECOND DATA EVENT RECEIVE");
        handleReceivedData(data, conn.peer);
      });

      conn.on("close", () => {
        console.log("Connection closed with: " + conn.peer);
        connectionsRef.current = connectionsRef.current.filter((c) => c.peerId !== conn.peer);
        setChatMessages((prevChatMessages) => {
          const { [conn.peer]: _, ...updatedChatMessages } = prevChatMessages;
          return updatedChatMessages;
        });
        forceUpdate();
      });
    }
  };

  const sendMessage = () => {
    if (messageInput) {
      console.log("Sending message: " + messageInput);
      const chatMessage: ChatMessage = { peerId: myPeerId, message: messageInput };
      setChatMessages((prevChatMessages) => {
        const messages = prevChatMessages[myPeerId] || []; // Initialize the array if it doesn't exist
        return {
          ...prevChatMessages,
          [myPeerId]: [...messages, chatMessage],
        };
      });
      connectionsRef.current
        .filter((c) => c.peerId !== myPeerId)
        .forEach((c) => c.connection.send(messageInput));
      setMessageInput("");
      console.log("MY CONNECTIONS:");
      console.log(connectionsRef.current);
    }
  };

  const handleFileSubmit = () => {
    if (!selectedFile) return;

    const chunkSize = 64 * 1024; // 64kB chunk size
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);

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
    setChatMessages({});
    forceUpdate();
  };

  console.log("RE RENDERING");
  console.log(connectionsRef.current);

  return (
    <div>
      <h1>Peer-to-Peer Chat</h1>

      {myPeerId && <h2>Your peer ID is: {myPeerId}</h2>}

      {Object.keys(chatMessages).length > 0 ? (
        <div>
          <h2>Connected to Peers:</h2>
          <div>
            {Object.entries(chatMessages).map(([peerId, messages]) => (
              <div key={peerId}>
                <h3>Peer: {peerId}</h3>
                {messages.map((chatMessage, index) => (
                  <p key={index}>
                    <b>{chatMessage.peerId.substring(0, 8)}</b>: {chatMessage.message}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>

          <br />
          <br />

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
