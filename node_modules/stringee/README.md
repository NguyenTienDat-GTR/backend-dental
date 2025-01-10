A library to build high-quality voice, video applications in the Cloud. With this library, you can:
+ you can make voice calls or video calls
+ proactive call control
+ [View Sample](https://github.com/stringeecom/web-sdk-samples/tree/master/NpmStringeeSample)

<hr>

### Table of Contents

**[Install SDK from NPM](#install-sdk-from-npm)**
**[Create StringeeClient](#create-stringeeclient)**  
**[Setup voice call](#setup-voice-call)**  
**[Set up video call](#setup-video-call)**  


## Install SDK from NPM
```
npm install stringee
```

## Create StringeeClient

``` javascript
import { StringeeUtil, StringeeClient, StringeeCall, StringeeCall2 } from "stringee";

const client = new StringeeClient();

client.on("connect", () => {
    // connected to StringeeServer
});

client.on("authen", (response) => {
    // on authen user, response object
    // {
    //     r               : 0
    //     requestId       : 1
    //     clients         : [{…}]
    //     connectionId    : 123456789
    //     ping_after_ms   : 45000
    //     projectId       : 1234
    //     userId          : "abc"
    //     ice_servers     : [{…}, {…}, {…}, {…}]
    //     message         : "SUCCESS"
    // }
    // response success: r = 0
    // response error: r != 0 and message : "Error message"
});

client.on("disconnect", () => {
    //disconnected
});

client.on("incomingcall", (incomingcall) => {
    // Setup voice call
});


client.on("incomingcall2", (call2) => {
    // Setup video call
});

client.on("requestnewtoken", () => {
    // request new token;
    // please get new access_token from YourServer
    // and call client.connect(new_access_token)
});

client.on("otherdeviceauthen", (data) => {
    console.log("otherdeviceauthen: ", data);
});


stringeeClient.connect(accessToken);
```

## Setup voice call
```html
<!-- Create video tag -->
<video id="remoteVideo" playsinline autoplay style="width: 350px"></video>
```

### Make the voice call
```javascript
var call = new StringeeCall(stringeeClient, from, to);

// SETTING CALL EVENTS
    call.on("error", (info) => {
        // on error
    });
    call.on("addlocalstream", (stream) => {
        // on add local stream
    });
    call.on("addremotestream", (stream) => {
        // on add remote stream
    });
    call.on("signalingstate", (state) => {
        // signalingstate

        if (state.code == 6) {// call ended
            incomingCallDiv.style.display = "none";
            callStopped();
        }

        if (state.code == 5) {// busy here
            callStopped();
        }

        const reason = state.reason;
        callStatus.innerHTML = reason;
    });
    call.on("mediastate", (state) => {
        // mediastate 
    });
    call.on("info", (info) => {
        // on info
    });
    call.on("otherdevice", (data) => {
        // "on otherdevice
    });

// MAKE CALL
    call.makeCall((response) => {
        // response json data success
        // {
        //     r                        : 0,
        //     callId                   : "call-vn-1-D2BIJCH2U9-1686467352064",
        //     fromNumber               : "FROM_NUMBER",
        //     customDataFromYourServer : "",
        //     toType                   : "internal",
        //     requestId                : 9,
        //     video                    : false,
        //     message                  : "SUCCESS",
        //     toNumber                 : "TO_NUMBER",
        //     peerToPeerCall           : true
        // }
        
    });

// AFTER THEN 
call.hangup((res) => {
    // hangup res
    // and remove source remote video
    remoteVideo.srcObject = null;
});

```
### Receiving the voice call
```javascript
client.on("incomingcall", (incomingcall) => {
    // Object incomingcall is StringeeCall    
    // reassign incomingcall to call
    call = incomingcall;

    // you can call SETTING CALL EVENTS
});

// Answare the call
call.answer((res) => {
    // answer res
});
// OR Reject the call
call.reject((response) => {
    // reject res
});
```

## Set up video call
### Make the video call
```javascript
var call = new StringeeCall2(stringeeClient, FROM_NUMBER, TO_NUMBER, true);

// SETTING CALL EVENT
    call.on("addlocaltrack", (localtrack) => {
        // add local track
    });
    call.on("addremotetrack", (track) => {
        // add remote track
    });
    call.on("removeremotetrack", (track) => {
        // remove remote track
        track.detachAndRemove();
    });
    call.on("removelocaltrack", (track) => {
        track.detachAndRemove();
    });
    call.on("signalingstate", (state) => {
        // signalingstate object
        // {
        //     code      : 6
        //     reason    : "Ended"
        //     sipCode   : SIP_CODE
        //     sipReason : SIP_REASON
        // }
    });
    call.on("mediastate", (state) => {
        // mediastate
    });
    call.on("otherdevice", (msg) => {
        // otherdevice
    });
    call.on("info", (info) => {
        // receiving info
    });

// MAKE CALL
call.makeCall((response) => {
    // response object
    // {
    //     r         : 0
    //     requestId : 2
    //     callId    : "call-vn-1-D2BIJCH2U9-1686467455592"
    //     message   : "SUCCESS"
    // }
});

// HANGUP
    call.hangup((res) => {});
    // at the same time we remove all video tracks
    call.subscribedTracks.forEach((track) => {
        track.detachAndRemove();
    });

// MUTE
    call.mute(true);

// SEND INFO
    call.sendInfo({ a: "hello", b: 1 }, (res) => {});

// ENABLE/DISABLE VIDEO
    // disable Local Video
    call.enableLocalVideo(false);
    // enable Local Video
    call.enableLocalVideo(true);

// SWITCH CAMERA (mobile only)
    call.switchCamera();

// Transfer
    // TYPE is string and value in list ['agent', 'queue']
    // TYPE_VALUE is string and value in list ['blind', 'attended', 'conference', 'coach']
    call.transferCall(to, TYPE, TYPE_VALUE, console.log);

// HOLD VIDEO CALL
    call.sendHold(null, (h) => {});
    call.sendUnHold((h) => {});

// LEAVE ROOM
    call.leaveRoom();
```

### Receiving the video call
```javascript
client.on("incomingcall2", (call2) => {
    // Object incomingcall is StringeeCall2    
    // reassign call2 to call
    call = call2;

    // then you should call SETTING CALL EVENTS
});
```