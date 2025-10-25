const targetAdIds = [
  "PARLE_MARIE",
  "KAMLA_PASAND",
  "VIMAL",
  "MY11C",
  "POKERBAAZI",
  "POKER_BAAZI",
  "POLICY_BAZAAR",
  "PR-25-011191_TATAIPL2025_IPL18_ipl18HANGOUTEVR20sEng_English_VCTA_NA", //sidhu ipl ad
  "PR-25-012799_TATAIPL2025_IPL18_IPL18BHOJPURI20sBHOmob_Hindi_VCTA_20"
];

const durationRegexes = [
  /(\d{1,3})s(?:Eng(?:lish)?|Hin(?:di)?)/i,      // "20sEng", "15sHindi", "10sHin"
  /(?:HIN|ENG|HINDI|ENGLISH)[^\d]*(\d{1,3})/i    // "HIN_10", "ENG_15"
];

console.log("Hotstar Adblocker extension loaded");

// init defaults
function initDefaults() {
  browser.storage.local.get(["targetAdIds", "MUTE_ALL_ADS"]).then((data) => {
    console.log("Current storage:", data);
    const updates = {};
    
    if (!data.targetAdIds || data.targetAdIds.length === 0) {
      updates.targetAdIds = targetAdIds;
      console.log("Setting default ad IDs");
    }
    
    if (data.MUTE_ALL_ADS === undefined) {
      updates.MUTE_ALL_ADS = false;
      console.log("Setting default MUTE_ALL_ADS");
    }
    
    if (Object.keys(updates).length > 0) {
      browser.storage.local.set(updates).then(() => {
        console.log("Defaults saved:", updates);
      });
    }
  }).catch((err) => {
    console.error("Error initializing defaults:", err);
  });
}

initDefaults();

browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated");
  initDefaults();
});

function muteTabForAd(tab, durationSec) {
  console.log(`Attempting to mute tab ${tab.id} for ${durationSec}s`);
  
  if (!tab.mutedInfo || !tab.mutedInfo.muted) {
    browser.tabs.update(tab.id, { muted: true }).then(() => {
      console.log(`Tab ${tab.id} muted successfully`);
      
      setTimeout(() => {
        browser.tabs.get(tab.id).then((updatedTab) => {
          if (updatedTab && updatedTab.mutedInfo && updatedTab.mutedInfo.muted) {
            browser.tabs.update(tab.id, { muted: false }).then(() => {
              console.log(`Tab ${tab.id} unmuted after ${durationSec}s`);
            });
          }
        }).catch((err) => {
          console.log("Tab no longer exists:", err);
        });
      }, durationSec * 1000 - 100);
    }).catch((err) => {
      console.error("Error muting tab:", err);
    });
  }
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      const adName = url.searchParams.get("adName");
      console.log(`Ad id: ${adName}`);
      
      if (!adName) return;

      browser.storage.local.get(["targetAdIds", "MUTE_ALL_ADS"]).then((data) => {
        console.log("Storage data:", data);
        
        const storedAdIds = data.targetAdIds || [];
        const muteAll = data.MUTE_ALL_ADS || false;
        
        const shouldMute = muteAll || storedAdIds.some((id) => adName.includes(id));
        
        console.log(`Should mute: ${shouldMute} (muteAll: ${muteAll})`);
        
        if (!shouldMute) return;

        let durationSec = 10;
        for (const regex of durationRegexes) {
          const match = adName.match(regex);
          if (match) {
            durationSec = parseInt(match[1], 10);
            break;
          }
        }

        console.log(`Muting ${adName} for ${durationSec} seconds`);

        
        browser.tabs.query({ url: "*://*.hotstar.com/*" }).then((tabs) => {
          console.log(`Found ${tabs.length} Hotstar tabs`);
          for (const tab of tabs) {
            muteTabForAd(tab, durationSec);
          }
        });
      }).catch((err) => {
        console.error("Error reading storage:", err);
      });
    } catch (err) {
      console.error("Error in webRequest listener:", err);
    }
  },
  { urls: ["*://bifrost-api.hotstar.com/v1/events/track/ct_impression*"] }
);

// handle popup events
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received:", msg);
  
  if (msg.type === "updateMuteAll") {
    console.log("Updating Mute All Ads:", msg.value);
    browser.storage.local.set({ MUTE_ALL_ADS: msg.value }).then(() => {
      console.log("MUTE_ALL_ADS saved");
      sendResponse({ success: true });
    });
    return true; 
  }

  if (msg.type === "updateAdList") {
    console.log("Updating Ad list:", msg.value);
    browser.storage.local.set({ targetAdIds: msg.value }).then(() => {
      console.log("targetAdIds saved");
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (msg.type === "getStatus") {
    browser.storage.local.get(["targetAdIds", "MUTE_ALL_ADS"]).then((data) => {
      sendResponse(data);
    });
    return true;
  }
});