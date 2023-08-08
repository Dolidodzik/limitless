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
Id vs id vs ID
better ways of checking what transfer chunks are being received maybe? but what we have now is fine ig
math progress validation to utils

======================
major issue z z kolejnoscia chunkow, czasem po wireless networku pliki sa corrupted w huj:
[lesiu@nobara-pc lissandra_comparison]$ sha512sum chromium.mkv 
be9b1df3feb7f3af8a9649f2bbf481241f194c8b6e6e28572e8b6b25c3e6e91e22b68d6d20b02a4d198623faec6359baccc07801fb0e8979bc862253bdd0a743  chromium.mkv
[lesiu@nobara-pc lissandra_comparison]$ sha512sum firefox.mkv 
50549d39fc68e62121dec23ce62a5b5bf3396f1b0bf1693d46c52c5817cf2490faa348eeabbd8562641120f13424e3d96c15e04dc12d42c069115d2ddb9a8ff8  firefox.mkv
[lesiu@nobara-pc lissandra_comparison]$ du firefox.mkv 
46520	firefox.mkv
[lesiu@nobara-pc lissandra_comparison]$ du chromium.mkv 
46520	chromium.mkv
[lesiu@nobara-pc lissandra_comparison]$ 

ten sam plik byl rownolegle pobierany do obu przegladarek i sie zjebalo ewidentnie. issue nie zaobserwowalem po kablu, wiec to pewnie kwestia pingu / traconych pakietow. do obadania.
======================

ACTUAL VALIDATION WHAT FILE WE ARE RECEIVING, IF FILE IS 10MB, WE SHOULDNT MORE CHUNKS THAN 10MB DOES IT MAKE SENSE. THINK ABOUT OTHER WAYS MALICIOUS ACTORS COULD TRY TO EXPLOIT PEER 2 PEER CONNECTION, THINK ABOUT USERS SAFETY

BUTTON FOR DECLINING TRANSFER
