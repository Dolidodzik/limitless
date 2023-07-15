branch for working out MVP functionality and codebase, witout styling or usable UI.
to run just npm install && npm run start

// TODO
MULTIPLE FILE UPLOADS
PREVENT USERS WHO DIDN'T SHARE LINK/CODE EXPLICITLY THEMSELVES FROM RECEIVING CONNECTIONS
JAK USER DA KOMUŚ DC TO MOZE DODAWAC DO BLACKLISTY???
ZROBIENEI KLAS/TYPOW/INTERFEJSOW DLA RZECZY TYPU MESSAGE ITD
100 - 0 progress validation
CLEANUP OVERALL
replace warning console.log with actually sending information back to client
chunk size as global setting, file id length etc.
tech allowing sender to select which users should receive file he's sending
pausing breaking etc edge cases connection during upload or not, during offer sent, during everything
// better validating offers like here:
    else if (isJsonString(data)) 
      data = JSON.parse(data);
      if(data && data.totalChunks && data.size){ // checking if data is valid offer, or at least looks like it
        console.log("file offer json string received ", data)
      }else{
        console.log("WRONG JSON STRING RECEIVED ", data)
      }
Dealing with offers JSON stringing etc in a better way