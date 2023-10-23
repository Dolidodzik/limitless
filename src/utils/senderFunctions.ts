import { AppGlobals } from "../globals/globals";


export function sendSomeData(
    targetPeer: string | string[] | null, // if targetPeer is null, we assume that message will be sent to everyone, if it's array of strings we send the data to every peer from the array, and if it's string we just send data to the one
    data: Object
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
    } else { // everyone
        AppGlobals.connections
        .forEach((c) => c.connection.send(data));
    }
}
