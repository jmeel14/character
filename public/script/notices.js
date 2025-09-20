function postError(doc, noticeBox, errMsg){
    noticeBox.innerHTML = null;
    let newNotice = doc.createElement("div");
    newNotice.setAttribute('class', "error");
    
    let nNoticeTitle = doc.createElement("h3");
    nNoticeTitle.setAttribute('class', "errTitle");
    nNoticeTitle.textContent = errMsg.title;
    newNotice.appendChild(nNoticeTitle);
    
    let nNoticeDesc = doc.createElement("p");
    nNoticeDesc.setAttribute('class', "errBody");
    nNoticeDesc.textContent = errMsg.desc;
    newNotice.appendChild(nNoticeDesc)
    
    if(errMsg.extra){
        let nNoticeExtra = doc.createElement("p");
        nNoticeExtra.setAttribute('class', "errExtra");
        nNoticeExtra.textContent = errMsg.extra;
        
        newNotice.appendChild(nNoticeExtra);
    }
    
    noticeBox.appendChild(newNotice);
}

export { postError }