document.addEventListener("DOMContentLoaded", () => {
  const muteAllToggle = document.getElementById("muteAllToggle");
  const adList = document.getElementById("adList");
  const newAdIdInput = document.getElementById("newAdId");
  const addAdBtn = document.getElementById("addAdBtn");

  console.log("Popup loaded");

  function loadState() {
    browser.storage.local.get(["MUTE_ALL_ADS", "targetAdIds"]).then((data) => {
      console.log("Loaded from storage:", data);
      
      muteAllToggle.checked = data.MUTE_ALL_ADS || false;
      const ids = data.targetAdIds || [];
      renderAdList(ids);
    }).catch((err) => {
      console.error("Error loading state:", err);
    });
  }

  loadState();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      console.log("Storage changed:", changes);
      
      if (changes.MUTE_ALL_ADS) {
        muteAllToggle.checked = changes.MUTE_ALL_ADS.newValue || false;
      }
      
      if (changes.targetAdIds) {
        renderAdList(changes.targetAdIds.newValue || []);
      }
    }
  });

  muteAllToggle.addEventListener("change", () => {
    const value = muteAllToggle.checked;
    console.log("Toggle changed to:", value);
    
    browser.storage.local.set({ MUTE_ALL_ADS: value }).then(() => {
      console.log("Mute All Ads setting saved:", value);
      browser.runtime.sendMessage({ type: "updateMuteAll", value }).catch((err) => {
        console.error("Error sending message:", err);
      });
    }).catch((err) => {
      console.error("Error saving setting:", err);
    });
  });

  addAdBtn.addEventListener("click", () => {
    const newAdId = newAdIdInput.value.trim();
    if (!newAdId) return;

    console.log("Adding new ad ID:", newAdId);

    browser.storage.local.get("targetAdIds").then((data) => {
      const updated = [...(data.targetAdIds || []), newAdId];
      console.log("Updated list:", updated);
      
      browser.storage.local.set({ targetAdIds: updated }).then(() => {
        renderAdList(updated);
        browser.runtime.sendMessage({ type: "updateAdList", value: updated }).catch((err) => {
          console.error("Error sending message:", err);
        });
        newAdIdInput.value = "";
      });
    });
  });

  function renderAdList(ids) {
    console.log("Rendering ad list:", ids);
    adList.innerHTML = "";
    
    if (!ids || ids.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No ad IDs configured";
      li.style.fontStyle = "italic";
      li.style.color = "#666";
      adList.appendChild(li);
      return;
    }
    
    ids.forEach((id) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = id;
      li.appendChild(span);

      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.addEventListener("click", () => {
        console.log("Removing ad ID:", id);
        const updated = ids.filter((x) => x !== id);
        
        browser.storage.local.set({ targetAdIds: updated }).then(() => {
          renderAdList(updated);
          browser.runtime.sendMessage({ type: "updateAdList", value: updated }).catch((err) => {
            console.error("Error sending message:", err);
          });
        });
      });

      li.appendChild(btn);
      adList.appendChild(li);
    });
  }
});