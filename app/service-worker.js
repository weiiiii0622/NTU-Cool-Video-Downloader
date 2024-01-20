const handleError = (errMsg) => {
  chrome.runtime.sendMessage({ action: "error", errMsg: errMsg }, (response) => {
    if (response) {
      console.log("Data from popup:", response.data);
    }
  });
}

const parseYtVideoLink = (str) => {
  let idx, idx2;

  idx = str.indexOf("Audio Only");
  str = str.substring(0, idx);
  idx = str.lastIndexOf("href");
  str = str.substring(idx);
  idx = str.indexOf('"');
  idx2 = str.indexOf('"', idx+1);

  str = str.substring(idx+1, idx2);
  str = str.replace(/amp;/g, '');
  console.log('ytVideo: ', str);

  return str;
}

const fetchYtVideo = async (ytURL) => {
  try {
    const ytResponse = await fetch(ytURL);
    const ytData = await ytResponse.text();

    ytVideoPointer = await parseYtVideoLink(ytData);
    console.log('ytVideoPointer:', ytVideoPointer);
    const ytResponse2 = await fetch(ytVideoPointer);
    console.log('ytResponse2:', ytResponse2);

    const ytVideo = await ytResponse2.url;
    console.log('ytVideo: ', ytVideo);

    return ytVideo;
  } catch (error) {
    console.error('fetchYtVideo() error:', error);
    return "";
  }
}

const fetchVideo = async (apiUrl) => {
  try {
    // Fetch apiURL
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    console.log('apiData:', apiData);
    let title = await apiData.title;
    let thumbnailPath = await apiData.thumbnailPath;
    let sourceUri = await apiData.sourceUri;
    let errorMsg = "";

    // Old Videos
    if(apiData.altSourceUri != undefined){
      sourceUri = apiData.altSourceUri;
    }
    // Handle yt links
    else if (sourceUri.startsWith("https://www.youtube.com/")) {
      sourceUri = await fetchYtVideo("https://yt-dl-web.vercel.app/result?url="+ sourceUri);
      console.log('sourceUri:', sourceUri);
    } 


    // m3u8
    if (sourceUri.endsWith('m3u8')){
      // Be handled later
      errorMsg = "m3u8";
    }
    
    return {
      title: title,
      thumbnailPath: thumbnailPath,
      sourceUri: sourceUri,
      errorMsg: errorMsg
    };
  } catch (error) {
    console.error('fetchVideo() error:', error);
    return {
      title: "",
      thumbnailPath: "",
      sourceUri: "",
      errorMsg: error
    };
  }
}


chrome.debugger.onEvent.addListener(function (source, method, params) {
  if (method === 'Network.requestWillBeSent') {
    if (params.documentURL.startsWith('https://cool-video.dlc.ntu.edu.tw/courses/')){

      // Notify target founded
      chrome.runtime.sendMessage({ action: "isTargetFound"}, (response) => {
        if (response) {
          console.log("Data from popup:", response.data);
        }
      });

      console.log('Response received:', params);  

      chrome.debugger.detach({ tabId: source.tabId });

      // Download video
      const apiUrl = params.documentURL.replace(/\/courses\/(\d+)\/videos\/(\d+)/, "/api/courses/$1/videos/$2/view");
      console.log(apiUrl);
      
      fetchVideo(apiUrl).then(data => {
          
          // Send videoLink
          console.log('fetchVideo data:', data);
          if (data.sourceUri != "" && data.errorMsg == "") {
            chrome.runtime.sendMessage({ action: "getVideoLink", videoTitle: data.title, videoThumbNail: data.thumbnailPath, videoLink: data.sourceUri}, (response) => {
              if (response) {
                console.log("Data from popup:", response.data);
              }
            });
          }
          else{
            handleError(data.errorMsg);
          }
          
      })
      .catch(error => {
        console.error('Error:', error);
      });  
    }
  }
});

chrome.runtime.onConnect.addListener(function (externalPort) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTabId = tabs[0].id;

      externalPort.onDisconnect.addListener(function () {
          console.log("onDisconnect");
          chrome.debugger.detach({ tabId: currentTabId });
      });

      console.log("onConnect");
  });
});