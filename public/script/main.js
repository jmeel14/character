import { initiateWS, sendLLMReq } from './wsConn.js';
import { postError } from './notices.js';

const DEFAULT_PROMPT = "**Now interfacing with the LLM**. Say, 'hi'.";

function reverseString(text){
    let newStr = [];
    for(let ltr = 0; ltr < text.length; ltr++){ newStr.push(text[(text.length - 1) - ltr]) }
    return newStr.join("");
}

function attachConfirmable(elem, confirmHandler, remove){
    elem.addEventListener("keydown", function attachHandler(kEv){
        if(kEv.key.toLowerCase() == "enter" && kEv.ctrlKey){
            confirmHandler();
            if(remove){ elem.removeEventListener("keydown", attachHandler); }
        }
    });
}

function attachEditable(elem, tdService){
    elem.addEventListener('mousedown', ()=>{
        elem.textContent = tdService.turndown(elem.innerHTML);
        elem.setAttribute('contenteditable', true);
        attachConfirmable(elem, ()=>{
            elem.setAttribute('contenteditable', false);
            elem.formatContent();
        }, true);
    });
};
function attachReroll(doc, elem, wsCommHandler){
    let newRoller = doc.createElement("div");
    newRoller.setAttribute('class', 'chat-reroll');
    elem.appendChild(newRoller);
    
    newRoller.addEventListener('mousedown', ()=>{
        elem.getElementsByClassName("chat-contents")[0].innerHTML = "";
        wsCommHandler();
    });
    elem.setAttribute('rollerAttached', "1");
    
    return newRoller;
}

function prePrompt(promptInput, msgList){
    if(promptInput.value != ""){
        return [
            {role: "system", content:`Respond according to the following criteria: ${promptInput.value}`},
            ...msgList
        ]
    }
    else { return msgList; }
}

function createChatEntry(doc, chatLog, tdService){
    let entryInst = doc.createElement("div"); entryInst.setAttribute('class', "chat-item");
    
    let eInstBody = doc.createElement("div"); eInstBody.setAttribute('class', "chat-contents");
    entryInst.appendChild(eInstBody);
    chatLog.appendChild(entryInst);
    
    eInstBody.addEventListener('mousedown', ()=>{
        if(eInstBody.getAttribute('contenteditable') == "true"){ return; }
        eInstBody.textContent = tdService.turndown(eInstBody.innerHTML);
        eInstBody.setAttribute('contenteditable', true);
    });
    attachConfirmable(eInstBody, ()=>{
        eInstBody.setAttribute('contenteditable', false);
        entryInst.formatContent();
    });
    
    entryInst.updateContent = (updateData)=>{
        if(updateData.author){ entryInst.setAttribute('author', updateData.author); }
        if(updateData.increment){ eInstBody.textContent += updateData.content; }
        else { eInstBody.textContent = updateData.content; }
    };
    entryInst.formatContent = ()=>{
        eInstBody.innerHTML = marked.parse(eInstBody.textContent);
    }
    return entryInst;
} 

function getLLMText(llmResp){
    if(llmResp.slice(0, 6) == "data: "){
        let llmRaw = llmResp.slice(6);
        if(llmRaw == "[DONE]"){ return {finished:true, message:false}; }
        let llmData = JSON.parse(llmRaw);
        let llmMsg = llmData.choices[0].delta.content;
        
        return { finished:false, message: llmMsg };
    }
}

function compileMsgs(chatLog){
    let msgList = [];
    for(let m = 0; m < chatLog.childNodes.length; m++){
        let msgInst = chatLog.childNodes[m];
        msgList.push({role: msgInst.getAttribute("author"), content: msgInst.textContent});
    }
    return msgList;
}

function emptyChat(doc, chatLog, tdService, systemMsg=DEFAULT_PROMPT){
    chatLog.innerHTML = null;
    let initMsg = createChatEntry(doc, chatLog, tdService);
    initMsg.updateContent({ author: "system", content: systemMsg });
    initMsg.formatContent();
    initMsg = null;
}

window.addEventListener("load", ()=>{
    attachEditable(document.getElementsByTagName("h3")[0], ()=>{});
    const turnDownService = new TurndownService();
    let wSListening = false;
    const wSMain = initiateWS('./llm',
        (wSErr)=>{ postError(document, document.querySelector(".errZone"), wSErr); },
        (closeEv)=>{ wSListening = false; }
    );
    emptyChat(document, chatBox, turnDownService);
    
    reset.addEventListener("mousedown", ()=>{
        emptyChat(document, chatBox, turnDownServiec);
    });
    let activeChatItem = null;
    
    attachConfirmable(msgBox, ()=>{
        if(msgBox.value != ""){
            activeChatItem = createChatEntry(document, chatBox, turnDownService);
            activeChatItem.updateContent({author: "user", content: msgBox.value});
            msgBox.value = "";
            sendLLMReq(prePrompt(prepromptIn, compileMsgs(chatBox)), wSMain);
            activeChatItem = null;
       }
   });
   
   wSMain.addEventListener("message", (wSMessageEvent)=>{
       let llmMessage = getLLMText(wSMessageEvent.data);
       if(llmMessage){
           if(!activeChatItem){ activeChatItem = createChatEntry(document, chatBox, turnDownService); }
           if(llmMessage.message) {
               activeChatItem.updateContent({
                   author: "assistant", content: llmMessage.message, increment: true
               });
           }
           if(llmMessage.finished){
               activeChatItem.formatContent();
               if(activeChatItem.getAttribute('rollerAttached') != "1"){
                   attachReroll(document, activeChatItem, ()=>{
                       let instMsgList = compileMsgs(chatBox);
                       console.log(instMsgList.slice(0, instMsgList.length - 1));
                       sendLLMReq(
                           prePrompt(prepromptIn,instMsgList.slice(0, instMsgList.length - 1)),
                           wSMain
                       );
                   });
               }
           }
       }
       else{ if(wSMessageEvent.data && wsMessageEvent.data != ""){ console.log(wSMessageEvent); } }
   });
});