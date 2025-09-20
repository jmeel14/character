function initiateWS(url, msgHandler, errHandler, terminationListener){
    try{
        let instWSock = new WebSocket(url);
        
        instWSock.addEventListener('open', (heartBeatListener)=>{ heartBeatListener = true; });
        return instWSock;
    }
    catch(wsErr){
        errHandler({
            title: "WebSocketError",
            desc: "An error occurred initiating the websocket.",
            extra: wsErr
        });
    }
}

function sendLLMReq(msgList, webSockConn){
    let prepMsg = {
        messages: msgList,
        end_chat: false
    }
    webSockConn.send(JSON.stringify(prepMsg));
}

export { initiateWS, sendLLMReq };