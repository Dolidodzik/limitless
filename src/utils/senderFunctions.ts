import { AppGlobals } from "../globals/globals";

/*
export function sendSomeData(
    targetPeer: string | string[] | null, // if targetPeer is null, we assume that message will be sent to everyone, if it's array of strings we send the data to every peer from the array, and if it's string we just send data to the one
    stringData: string
){
    if(typeof(targetPeer) == "string"){ // selected single peer

    } else if (Array.isArray(targetPeer)) { // selected peers

    } else { // everyone
        AppGlobals.connections
        .filter((c) => c.peerId !== myPeerId)
        .forEach((c) => c.connection.send(chatMessageTransfer));
    }
}
*/