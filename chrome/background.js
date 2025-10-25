const targetAdIds = [
  "PARLE_MARIE",
  "KAMLA_PASAND",
  "VIMAL",
  "MY11C",
  "POKERBAAZI",
  "POKER_BAAZI",
  "POLICY_BAZAAR",
  "PR-25-011191_TATAIPL2025_IPL18_ipl18HANGOUTEVR20sEng_English_VCTA_NA", //sidhu ipl ad
  "PR-25-012799_TATAIPL2025_IPL18_IPL18BHOJPURI20sBHOmob_Hindi_VCTA_20",
];

const durationRegexes = [
  /(\d{1,3})s(?:Eng(?:lish)?|Hin(?:di)?)/i, // "20sEng", "15sHindi", "10sHin"
  /(?:HIN|ENG|HINDI|ENGLISH)[^\d]*(\d{1,3})/i, // "HIN_10", "ENG_15"
];

console.log("Hotstar Adblocker extension loaded");

// init defaults once
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["targetAdIds", "MUTE_ALL_ADS"], (data) => {
    if (!data.targetAdIds)
      chrome.storage.sync.set({ targetAdIds: targetAdIds });
    if (data.MUTE_ALL_ADS === undefined)
      chrome.storage.sync.set({ MUTE_ALL_ADS: false });
  });
});

async function muteTabForAd(tab, durationSec) {
  if (!tab.mutedInfo.muted) {
    chrome.tabs.update(tab.id, { muted: true });
    setTimeout(() => {
      chrome.tabs.get(tab.id, (updatedTab) => {
        if (updatedTab && updatedTab.mutedInfo.muted) {
          chrome.tabs.update(tab.id, { muted: false });
        }
      });
    }, durationSec * 1000 - 100);
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = new URL(details.url);
    const adName = url.searchParams.get("adName");
    console.log(`Ad id: ${adName}`);
    if (!adName) return;

    chrome.storage.sync.get(["targetAdIds", "MUTE_ALL_ADS"], async (data) => {
      const { targetAdIds, MUTE_ALL_ADS } = data;
      const shouldMute =
        MUTE_ALL_ADS || targetAdIds.some((id) => adName.includes(id));
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
      const tabs = await chrome.tabs.query({ url: "*://*.hotstar.com/*" });
      for (const tab of tabs) {
        muteTabForAd(tab, durationSec);
      }
    });
  },
  { urls: ["*://bifrost-api.hotstar.com/v1/events/track/ct_impression*"] }
);

// handle events from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "updateMuteAll") {
    console.log("Mute All Ads updated:", msg.value);
    chrome.storage.sync.set({ MUTE_ALL_ADS: msg.value });
  }

  if (msg.type === "updateAdList") {
    console.log("Ad list updated:", msg.value);
    chrome.storage.sync.set({ targetAdIds: msg.value });

    chrome.tabs.query({ url: "*://*.hotstar.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "checkAndMuteAds" });
      });
    });
  }
});
