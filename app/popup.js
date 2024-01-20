// Global Variables
let timerId;

const startTimer = (interval) => {
    timerId = setTimeout(function() {
        toggleInfo("on", "這個頁面好像沒有影片...");
    }, interval);
}

const toggleLoading = (mode) => {
    if (mode == "on") {
        document.getElementById('load-box').style.display = "flex";
    }
    else if (mode == "off") {
        document.getElementById('load-box').style.display = "none";
    }
}

const toggleVideo = (mode, title="", thumbnail="", link="") => {
    document.getElementById('videoTitle').textContent = title;
    document.getElementById('videoThumbnail').src = thumbnail;
    document.getElementById('videoLink').href = link;
    if (mode == "on") {
        document.getElementById('video-section').style.display = "block";
    }
    else if (mode == "off") {
        document.getElementById('video-section').style.display = "none";
    }
}

const toggleInfo = (mode, msg="", color="darkgrey") => {
    document.getElementById('info-text').textContent = msg;
    document.getElementById('info-text').style.color = color;
    if (mode == "on") {
        document.getElementById('info-box').style.display = "block";
    }
    else if (mode == "off") {
        document.getElementById('info-box').style.display = "none";
    }
}

const reset = (tab) => {
    toggleLoading("off");
    toggleVideo("off");
    toggleInfo("off");
    chrome.debugger.detach({ tabId: tab.id });
}

const findVideo = () => {
    toggleInfo("on", "發生錯誤 請再試一次!", "red");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        reset(tab);
        if (tab.url.startsWith('https://cool.ntu.edu.tw/courses')) {
            toggleLoading("on");
        
            chrome.debugger.attach({ tabId: tab.id }, '1.2', function () {
                chrome.debugger.sendCommand(
                { tabId: tab.id },
                'Network.enable',
                {},
                function () {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    }
                    else {
                        console.log('Start finding video...');
                    }
                }
                );
            });
            
            chrome.tabs.reload(tab.id);
            startTimer(5000);
        }
        else {
            toggleInfo("on", "此頁面沒有影片喔!", "red");
            console.log('Not a video page!');
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>{
    if (request.action === "isTargetFound"){
        clearTimeout(timerId);
        sendResponse({ data: "Timer Cleared" });
    }
    else if (request.action === "getVideoLink") {
        console.log('Data from service worker:', request);   
        toggleLoading("off");
        toggleVideo("on", request.videoTitle, request.videoThumbNail, request.videoLink);
        sendResponse({ data: "Video Success" });
    }
    else if (request.action === "error") {
        toggleLoading("off");
        toggleVideo("off");
        if(request.errMsg == "m3u8") {
            toggleInfo("on", "目前不支援下載此影片QQ");
        }
        else {
            toggleInfo("on", "發生錯誤 請再試一次!", "red");
        }
        sendResponse({ data: "Error Handled" });
    }
});

document.getElementById('findVideoButton').addEventListener('click', findVideo);
