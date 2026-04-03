// Spell Fixer — Popup Script
(function () {
  'use strict';

  const toggle      = document.getElementById('sf-toggle');
  const dot         = document.getElementById('sf-dot');
  const statusText  = document.getElementById('sf-status-text');
  const siteRow     = document.getElementById('sf-site-row');
  const siteBtn     = document.getElementById('sf-site-btn');
  const acToggle    = document.getElementById('sf-autocorrect');
  const wordCount   = document.getElementById('sf-word-count');
  const exportBtn   = document.getElementById('sf-export-btn');
  const importBtn   = document.getElementById('sf-import-btn');
  const importFile  = document.getElementById('sf-import-file');
  const colorBtns   = document.querySelectorAll('.sf-color-btn');

  let currentHostname = null;
  let currentTabId    = null;

  // ── Get current tab, then load storage + stats ───────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs && tabs[0];
    const url = tab && tab.url;
    currentTabId = tab ? tab.id : null;
    try {
      currentHostname = url ? new URL(url).hostname : null;
    } catch (_) {
      currentHostname = null;
    }

    if (!currentHostname) {
      siteRow.style.display = 'none';
    }

    chrome.storage.local.get(['enabled', 'userWords', 'disabledSites', 'autoCorrect', 'highlightColor'], function (data) {
      const isEnabled     = data.enabled !== false;
      const count         = (data.userWords || []).length;
      const disabledSites = data.disabledSites || [];
      const activeColor   = data.highlightColor || '#E24B4A';

      toggle.checked    = isEnabled;
      acToggle.checked  = data.autoCorrect !== false;
      updateWordCount(count);
      render(isEnabled, count);
      renderSiteBtn(disabledSites);
      fetchStats(isEnabled, disabledSites);
      renderColorBtns(activeColor);
    });
  });

  // ── Toggle auto-correct ──────────────────────────────────────────────────────
  acToggle.addEventListener('change', function () {
    chrome.storage.local.set({ autoCorrect: acToggle.checked });
  });

  // ── Toggle spell check globally ──────────────────────────────────────────────
  toggle.addEventListener('change', function () {
    const isEnabled = toggle.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    render(isEnabled, null);
  });

  // ── Toggle this site ─────────────────────────────────────────────────────────
  siteBtn.addEventListener('click', function () {
    if (!currentHostname) return;
    chrome.storage.local.get('disabledSites', function (data) {
      const sites = data.disabledSites || [];
      const idx   = sites.indexOf(currentHostname);
      if (idx === -1) {
        sites.push(currentHostname);
      } else {
        sites.splice(idx, 1);
      }
      chrome.storage.local.set({ disabledSites: sites }, function () {
        renderSiteBtn(sites);
        // Update status text to reflect site state
        chrome.storage.local.get(['enabled', 'userWords'], function (d) {
          render(d.enabled !== false, (d.userWords || []).length);
        });
      });
    });
  });

  // ── Render helpers ───────────────────────────────────────────────────────────
  function render(isEnabled, wordCount) {
    if (isEnabled) {
      dot.className = 'status-dot';
      if (wordCount === null) {
        chrome.storage.local.get(['userWords', 'disabledSites'], function (d) {
          const sites      = d.disabledSites || [];
          const isDisabled = currentHostname && sites.includes(currentHostname);
          if (isDisabled) {
            statusText.textContent = 'Disabled on this site';
            dot.className = 'status-dot off';
          } else {
            setStatusText((d.userWords || []).length);
          }
        });
      } else {
        chrome.storage.local.get('disabledSites', function (d) {
          const sites      = d.disabledSites || [];
          const isDisabled = currentHostname && sites.includes(currentHostname);
          if (isDisabled) {
            statusText.textContent = 'Disabled on this site';
            dot.className = 'status-dot off';
          } else {
            setStatusText(wordCount);
          }
        });
      }
    } else {
      dot.className = 'status-dot off';
      statusText.textContent = 'Disabled — highlights removed';
    }
  }

  function fetchStats(isEnabled, disabledSites) {
    if (!isEnabled || !currentTabId) return;
    if (currentHostname && disabledSites.includes(currentHostname)) return;
    chrome.tabs.sendMessage(currentTabId, { type: 'GET_STATS' }, function (res) {
      if (chrome.runtime.lastError || !res) return;
      if (res.checked === 0) return;  // no fields checked yet — keep default text
      const errPart = res.errors === 0
        ? 'no errors'
        : res.errors + ' error' + (res.errors === 1 ? '' : 's');
      statusText.textContent = res.checked + ' words · ' + errPart;
    });
  }

  function setStatusText(count) {
    if (count > 0) {
      statusText.textContent =
        count + ' custom word' + (count === 1 ? '' : 's') + ' in dictionary';
    } else {
      statusText.textContent = 'Active on this page';
    }
  }

  function updateWordCount(count) {
    wordCount.textContent = count;
  }

  // ── Export custom dictionary ─────────────────────────────────────────────────
  exportBtn.addEventListener('click', function () {
    chrome.storage.local.get('userWords', function (data) {
      const words = data.userWords || [];
      const blob  = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = 'spell-fixer-words.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // ── Import custom dictionary ─────────────────────────────────────────────────
  importBtn.addEventListener('click', function () {
    importFile.value = '';
    importFile.click();
  });

  importFile.addEventListener('change', function () {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      let imported;
      try {
        imported = JSON.parse(e.target.result);
      } catch (_) {
        return;
      }
      if (!Array.isArray(imported)) return;
      const cleaned = imported.filter(w => typeof w === 'string' && w.trim());
      chrome.storage.local.get('userWords', function (data) {
        const existing = data.userWords || [];
        const merged   = [...new Set([...existing, ...cleaned.map(w => w.toLowerCase().trim())])];
        chrome.storage.local.set({ userWords: merged }, function () {
          updateWordCount(merged.length);
        });
      });
    };
    reader.readAsText(file);
  });

  // ── Color swatches ───────────────────────────────────────────────────────────
  function renderColorBtns(activeColor) {
    colorBtns.forEach(function (btn) {
      if (btn.dataset.color.toLowerCase() === activeColor.toLowerCase()) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  colorBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const color = btn.dataset.color;
      chrome.storage.local.set({ highlightColor: color });
      renderColorBtns(color);
      if (currentTabId !== null) {
        chrome.tabs.sendMessage(currentTabId, { type: 'SET_COLOR', color: color });
      }
    });
  });

  function renderSiteBtn(disabledSites) {
    if (!currentHostname) return;
    const isSiteDisabled = disabledSites.includes(currentHostname);
    if (isSiteDisabled) {
      siteBtn.textContent = 'Enable';
      siteBtn.classList.add('enabled-btn');
    } else {
      siteBtn.textContent = 'Disable';
      siteBtn.classList.remove('enabled-btn');
    }
  }
})();
