const vars = {};
const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m,key,value) => {
    vars[key] = value;
});

const vMixSettings = {
    IP: "localhost",
    port: "8088",
    multiViewInput: 0,
    previousProgram: -1,
    preivousPreview: -1,
    refreshInterval: 150,
}

function search(key, keyValue, arr){
    for (let i=0; i < arr.length; i++) {
        if (arr[i][key] === keyValue) {
            return arr[i];
        }
    }
}

function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, match => match.toUpperCase());
}

const saveSettings = [
    "zoomY",
    "zoomX",
    "panX",
    "panY",
    "color",
    "enabled",
    "fontSize",
]

const extras = [
    {
        name: "clock",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        color: "#ffffff",
        enabled: false,
        fontSize: 70,
        template: (obj) => {
            const templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
            <div id="clock" style="color: ${obj.color}; font-size: ${obj.fontSize}px"></div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            </div>
            `
            return templateString
        },
    },
    {
        name: "countdown",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        color: "#ffffff",
        enabled: false,
        fontSize: 70,
        template: (obj) => {
            const templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
            <div id="countdown" style="color: ${obj.color}; font-size: ${obj.fontSize}px"></div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            </div>
            `
            return templateString
        },
    },
    {
        name: "status",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        enabled: false,
        fontSize: 36,
        template: (obj) => {
            let templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
                <div class="vMixStatuses" style="font-size: ${obj.fontSize}px">
                    <div class="column">
            `;
            vMixStatuses.forEach((status, i) => {
                if(i === 3){
                    templateString += `</div><div class="column">`
                }
                if(vMixSettings[status]){
                    templateString += `<div class="vMixStatus vMixStatusEnabled ${status}  ">${status.toUpperCase()}: </div>`
                }
                else{
                    templateString += `<div class="vMixStatus ${status}  ">${status.toUpperCase()}: </div>`
                }
            });
            templateString += `
                </div>
            </div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            `
            return templateString
        },
    },
]


if(vars.Input){
    vMixSettings.multiViewInput = Number.parseFloat(vars.Input) - 1;
}

if(vars.Interval){
    vMixSettings.refreshInterval = Number.parseFloat(vars.Interval);
}
if(vars.Settings){
    const parsedSettings = JSON.parse(decodeURIComponent(vars.Settings))
    for (let i = 0; i < parsedSettings.length; i++) {
        const extra = parsedSettings[i];
        for (const property in extra) {
            extras[i][property] = extra[property];
        }
    }
}

setInterval(() => {
    fetch(`http://${vMixSettings.IP}:${vMixSettings.port}/api`)
    .then(response => response.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(data => vMixRefresh(data));

}, vMixSettings.refreshInterval);

let overlayArray = [];
let multiViewOverlays = [];
let lastResponse;
const vMixInputs = []

function log10(x) {
    if(Math.log(x)*20 === Number.NEGATIVE_INFINITY){
        return 0;
    }
    return Math.log(x)*21.5;
}

const vMixStatuses = [
    "recording",
    "external",
    "streaming",
    "playList",
    "multiCorder",
    "fullscreen",
]

function vMixRefresh(data){
    lastResponse = data;
    const temporaryMultiViewOverlays = []
    vMixSettings.previewNumber = Number.parseFloat(data.getElementsByTagName("preview")[0].innerHTML)
    vMixSettings.programNumber = Number.parseFloat(data.getElementsByTagName("active")[0].innerHTML)
    vMixSettings.previewKey = data.querySelector(`[number="${vMixSettings.previewNumber}"]`).getAttribute("key")
    vMixSettings.programKey = data.querySelector(`[number="${vMixSettings.programNumber}"]`).getAttribute("key")

    Array.prototype.slice.call(data.getElementsByTagName("input"), 0 ).forEach((input, i) => {
        vMixInputs[i] = {}
        vMixInputs[i].title = input.getAttribute("title");
        vMixInputs[i].key = input.getAttribute("key");
        if(input.getAttribute("muted")){
            vMixInputs[i].audio = true
            vMixInputs[i].muted = input.getAttribute("muted") === "True"
            vMixInputs[i].audioL = log10(input.getAttribute("meterF1") * 100)
            vMixInputs[i].audioR = log10(input.getAttribute("meterF2") * 100)
        }
        else{
            vMixInputs[i].audio = false
        }
        if(input.getAttribute("duration")){
            vMixInputs[i].video = true
            vMixInputs[i].duration = input.getAttribute("duration")
            vMixInputs[i].position = input.getAttribute("position")
        }
        else{
            vMixInputs[i].video = false
        }
    })
    
    overlayArray = Array.prototype.slice.call(data.getElementsByTagName("input")[vMixSettings.multiViewInput].getElementsByTagName("overlay"), 0 );

    if(overlayArray.length === 0){
        $(".warning").html(`No multiview layers on input ${vMixSettings.multiViewInput + 1}`);
        $(".warning").css("display", "flex");
    }
    else{
        $(".warning").css("display", "none");
    }

    
    
    for(let i = 0; i < overlayArray.length && i < 9; i++){
        if(Number.parseFloat(overlayArray[i].getAttribute("index")) !== 9){

            if(overlayArray[i].getElementsByTagName("position")[0] !== undefined){
                const zoomY =     (Number.parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("zoomY"))   *   100);
                const zoomX =     (Number.parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("zoomX"))   *   100);
                const panY =      (Number.parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("panY"))    *   100);
                const panX =      (Number.parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("panX"))    *   100);
                const inputKey =  overlayArray[i].getAttribute("key")
                const inputName =  lastResponse.querySelector(`input[key="${inputKey}"]`).getAttribute("title")
            }
            else{
                const zoomY =     (100);
                const zoomX =     (100);
                const panY =      (0);
                const panX =      (0);
                const inputKey =  overlayArray[i].getAttribute("key")
                const inputName =  lastResponse.querySelector(`input[key="${inputKey}"]`).getAttribute("title")

            }

            temporaryMultiViewOverlays[i] = {
                zoomX,
                zoomY,
                panX,
                panY,
                inputKey,
                inputName,
            }
                        
        }
    }
    
    let forceRefresh = false
    for (const status of vMixStatuses) {
        if(vMixSettings[status] !== (data.getElementsByTagName(status)[0].innerHTML === "True")){
            vMixSettings[status] = data.getElementsByTagName(status)[0].innerHTML === "True"
            forceRefresh = true
        }
    }
    if(JSON.stringify(temporaryMultiViewOverlays) !== JSON.stringify(multiViewOverlays) || forceRefresh){
        multiViewOverlays = JSON.parse(JSON.stringify(temporaryMultiViewOverlays))
        refresh();
        updateTally(true);
        
    }
    updateTally();
    updateVU();
}

function updateVU(){
    overlayArray.forEach((overlay, i) => {
        if(vMixInputs[vMixInputs.findIndex(vMixInputs => vMixInputs.key === overlay.getAttribute("key"))].audio){
            $($(".outerContainer").children()[i]).find(".actualMeterL").css("clip-path", `inset(${Math.floor((100 - vMixInputs[vMixInputs.findIndex(vMixInputs => vMixInputs.key === overlay.getAttribute("key"))].audioL)/3.125)*3.125}% 0% 0% 0%)`);
            $($(".outerContainer").children()[i]).find(".actualMeterR").css("clip-path", `inset(${Math.floor((100 - vMixInputs[vMixInputs.findIndex(vMixInputs => vMixInputs.key === overlay.getAttribute("key"))].audioR)/3.125)*3.125}% 0% 0% 0%)`);
            if(vMixInputs[vMixInputs.findIndex(vMixInputs => vMixInputs.key === overlay.getAttribute("key"))].muted){
                $($(".outerContainer").children()[i]).find(".actualMeterR").css("filter", "grayscale(100%)");
                $($(".outerContainer").children()[i]).find(".actualMeterL").css("filter", "grayscale(100%)");
            }
            else{
                $($(".outerContainer").children()[i]).find(".actualMeterR").css("filter", "grayscale(0%)");
                $($(".outerContainer").children()[i]).find(".actualMeterL").css("filter", "grayscale(0%)");

            }
        }
    });
}

function generateVU(bool, overlay){
    if(bool){
        return(`
        <div class="leftAlignContainer">
        <div class="audioMeterContainer">
            <div class="audioMeter">
                <div class="meterOutline"></div>
                <div class="actualMeter actualMeterL"></div>
            </div>
            <div class="audioMeter">
                <div class="meterOutline"></div>
                <div class="actualMeter actualMeterR"></div>
            </div>
            <div class="VUlabels">
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">0</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-5</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-10</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-15</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-20</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-25</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-30</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-40</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-50</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-60</div>
            </div>
        </div>
        <div class="LRlabels">
            <div class="LRlabel" style="transform: scale(${overlay.zoomY / 100})">
                L
            </div>
            <div class="LRlabel" style="transform: scale(${overlay.zoomY / 100})">
                R
            </div>
        </div>
    </div>
        `)
    }
    return ""
}

function refresh(){
    const saveArray = []
    for (const extra of extras) {
        if(saveArray[i] === undefined){
            saveArray[i] = {}
        }
        for (const setting of saveSettings) {
            saveArray[i][setting] = extra[setting]
        }
    }
    $("#saveURL").val(`${window.location.href.split('?')[0]}?Settings=${encodeURIComponent(JSON.stringify(saveArray))}`)
    $("#saveURL").focus(function(){
        $(this).select();
    })
    clockTick();
    $(".outerContainer").html("")
    for (const overlay of multiViewOverlays) {
        $(".outerContainer").append(`
        <div class="multiViewBox" style="
            height: ${overlay.zoomY}%;
            width:  ${overlay.zoomX}%;
            left:   ${((overlay.panX)/2) + 50}%;
            top:    ${((overlay.panY*-1)/2) + 50}%;
        ">
        <div class="inputTitle">${lastResponse.querySelector(`input[key="${overlay.inputKey}"]`).getAttribute("title")}</div>
        ${generateVU(vMixInputs[vMixInputs.findIndex(vMixInputs => vMixInputs.key === overlay.inputKey)].audio, overlay)}
        </div>
        `)
    }
    for (const extra of extras) {
    
        if(extra.enabled){
            $(".outerContainer").append(extra.template(extra))
        }
    }
    
}

function updateTally(force){
        if(vMixSettings.previousPreviewKey !== vMixSettings.previewKey || force){
        if(multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousPreviewKey) !== -1){
            $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousPreviewKey)]).removeClass("preview");
        }
        $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previewKey)]).addClass("preview");
        vMixSettings.previousPreviewKey = vMixSettings.previewKey
    }
    if(vMixSettings.previousProgramKey !== vMixSettings.programKey || force){
        if(multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousProgramKey) !== -1){
            $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousProgramKey)]).removeClass("program");
        }
        $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.programKey)]).addClass("program");
        vMixSettings.previousProgramKey = vMixSettings.programKey
    }
}

const clockTick = () => {
    const date = new Date();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();
    hrs = hrs < 10 ? `0${hrs}` : hrs;
    mins = mins < 10 ? `0${mins}` : mins;
    secs = secs < 10 ? `0${secs}` : secs;

    const time = `${hrs}:${mins}:${secs}`;
    if(search("name", "clock", extras).enabled){
        $("#clock").html(time)
    };
    setTimeout(clockTick, 1000);
}
clockTick();

function msToTime(s) {
    let time = s;
    const ms = time % 1000;
    time = (time - ms) / 1000;
    const secs = time % 60;
    time = (time - secs) / 60;
    const mins = time % 60;
    const hrs = (time - mins) / 60;
  
    return `${hrs.toString().padStart(2,0)}:${mins.toString().padStart(2,0)}:${secs.toString().padStart(2,0)}`;
  }
    
function updateCountdown(){
    if(vMixInputs[vMixSettings.programNumber - 1].video){
        const timeLeft = Number.parseFloat(vMixInputs[vMixSettings.programNumber - 1].duration) - Number.parseFloat(vMixInputs[vMixSettings.programNumber - 1].position)
        if(timeLeft < 10000 && timeLeft > 1){
            $("#countdown").parent().addClass("program")
            $("#countdown").parent().removeClass("preview")
        }
        else if(timeLeft < 60000 && timeLeft > 1){
            $("#countdown").parent().addClass("preview")
            $("#countdown").parent().removeClass("program")
        }
        else{
            $("#countdown").parent().removeClass("program")
            $("#countdown").parent().removeClass("preview")
        }
        $("#countdown").html(msToTime(timeLeft))
    }
    else{
        $("#countdown").html("00:00:00");
        $("#countdown").parent().removeClass("program")
        $("#countdown").parent().removeClass("preview")
    }
    
}

setInterval(() => {
    updateCountdown()
}, 200);

for (const extra of extras) {
    $(`#${extra.name}ZoomNumber`).val(extra.zoomX/100)
    $(`#${extra.name}ZoomSlider`).val(extra.zoomX/100)
    $(`#${extra.name}ZoomSlider`).on('input', e => {
        extra.zoomX = e.target.value * 100;
        extra.zoomY = e.target.value * 100;
        $(`#${extra.name}ZoomNumber`).val(e.target.value)
        refresh();
    });
    $(`#${extra.name}ZoomNumber`).on('input', e => {
        extra.zoomX = e.target.value * 100;
        extra.zoomY = e.target.value * 100;
        $(`#${extra.name}ZoomSlider`).val(e.target.value)
        refresh();
    });

    $(`#${extra.name}PanYNumber`).val(extra.panY/100)
    $(`#${extra.name}PanYSlider`).val(extra.panY/100)
    $(`#${extra.name}PanYSlider`).on('input', e => {
        extra.panY = e.target.value * 100;
        $(`#${extra.name}PanYNumber`).val(e.target.value)
        refresh();
    });
    $(`#${extra.name}PanYNumber`).on('input', e => {
        extra.panY = e.target.value * 100;
        $(`#${extra.name}PanYSlider`).val(e.target.value)
        refresh();
    });

    $(`#${extra.name}PanXNumber`).val(extra.panX/100)
    $(`#${extra.name}PanXSlider`).val(extra.panX/100)
    $(`#${extra.name}PanXSlider`).on('input', e => {
        extra.panX = e.target.value * 100;
        $(`#${extra.name}PanXNumber`).val(e.target.value)
        refresh();
    });
    $(`#${extra.name}PanXNumber`).on('input', e => {
        extra.panX = e.target.value * 100;
        $(`#${extra.name}PanXSlider`).val(e.target.value)
        refresh();
    });

    $(`#${extra.name}Enable`).attr("checked", extra.enabled)
    $(`#${extra.name}Enable`).on('input', e => {
        extra.enabled = e.target.checked;
        refresh();
    });

    $(`#${extra.name}FontSize`).val(extra.fontSize)
    $(`#${extra.name}FontSize`).on('input', e => {
        extra.fontSize = e.target.value;
        refresh();
    });

    $(`#${extra.name}Color`).val(extra.color)
    $(`#${extra.name}Color`).on('input', e => {
        extra.color = e.target.value;
        refresh();
    });
}