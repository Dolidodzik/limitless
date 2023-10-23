import React from "react";
import { AppGlobals } from "../globals/globals";
import { removeConnectionByID } from "../globals/globalFunctions";
import { ChatRef } from "./chat";
import Peer from "peerjs";


export const Connections = (props: {}) => {

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;


    return (
        <div className="loadingPeerJS">

        </div>
    );
};

