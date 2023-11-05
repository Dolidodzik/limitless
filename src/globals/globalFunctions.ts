// functions that make dealing with globals easier
import { AppGlobals } from './globals';

export function removeConnectionByID(peerID: string, forceUpdate: () => void){
    const indexToRemove = AppGlobals.connections.findIndex(c => c.peerId === peerID);
    if (indexToRemove !== -1) { AppGlobals.connections.splice(indexToRemove, 1); }
    forceUpdate();
}