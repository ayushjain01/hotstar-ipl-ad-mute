document.addEventListener("DOMContentLoaded", () => {
  const muteAllToggle = document.getElementById("muteAllToggle");
  const adList = document.getElementById("adList");
  const newAdIdInput = document.getElementById("newAdId");
  const addAdBtn = document.getElementById("addAdBtn");

  chrome.storage.sync.get(["MUTE_ALL_ADS", "targetAdIds"], (data) => {
    muteAllToggle.checked = data.MUTE_ALL_ADS || false;
    renderAdList(data.targetAdIds || []);
  });

  muteAllToggle.addEventListener("change", () => {
    const value = muteAllToggle.checked;
    chrome.storage.sync.set({ MUTE_ALL_ADS: value }, () => {
      console.log("Mute All Ads setting saved:", value);
      chrome.runtime.sendMessage({ type: "updateMuteAll", value });
    });
  });

  addAdBtn.addEventListener("click", () => {
    const newAdId = newAdIdInput.value.trim();
    if (!newAdId) return;

    chrome.storage.sync.get("targetAdIds", (data) => {
      const updated = [...(data.targetAdIds || []), newAdId];
      chrome.storage.sync.set({ targetAdIds: updated }, () => {
        renderAdList(updated);
        chrome.runtime.sendMessage({ type: "updateAdList", value: updated });
      });
    });

    newAdIdInput.value = "";
  });

  function renderAdList(ids) {
    adList.innerHTML = "";
    ids.forEach((id) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = id;
      li.appendChild(span);

      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.addEventListener("click", () => {
        const updated = ids.filter((x) => x !== id);
        chrome.storage.sync.set({ targetAdIds: updated }, () => {
          renderAdList(updated);
          chrome.runtime.sendMessage({ type: "updateAdList", value: updated });
        });
      });

      li.appendChild(btn);
      adList.appendChild(li);
    });
  }
});
