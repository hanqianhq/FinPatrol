function setStatus(text, isWarn = false) {
  const el = document.getElementById("status");
  el.textContent = text;
  if (isWarn) el.classList.add("warn");
  else el.classList.remove("warn");
}

function mask(value) {
  if (!value) return "未采集";
  if (value.length <= 8) return "已采集";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function getCaptured() {
  const resp = await chrome.runtime.sendMessage({ type: "GET_CAPTURED_CREDENTIALS" });
  return resp?.data || { aliyun: null, cfm: null, lastUpdatedAt: 0 };
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function toImportJson(payload) {
  return JSON.stringify(
    {
      provider: payload.provider,
      apiUrl: payload.credential.apiUrl || "",
      token: payload.credential.token || "",
      csrfToken: payload.credential.csrfToken || "",
      cookie: payload.credential.cookie || "",
      authorization: payload.credential.authorization || "",
      capturedAt: payload.capturedAt,
    },
    null,
    2,
  );
}

function toCombinedJson(data) {
  const out = {
    version: "v1",
    exportedAt: Date.now(),
    aliyun: data.aliyun
      ? {
          apiUrl: data.aliyun.credential.apiUrl || "",
          csrfToken: data.aliyun.credential.csrfToken || "",
          cookie: data.aliyun.credential.cookie || "",
          token: data.aliyun.credential.token || "",
          authorization: data.aliyun.credential.authorization || "",
          capturedAt: data.aliyun.capturedAt,
        }
      : null,
    cfm: data.cfm
      ? {
          apiUrl: data.cfm.credential.apiUrl || "",
          token: data.cfm.credential.token || "",
          csrfToken: data.cfm.credential.csrfToken || "",
          cookie: data.cfm.credential.cookie || "",
          authorization: data.cfm.credential.authorization || "",
          capturedAt: data.cfm.capturedAt,
        }
      : null,
  };
  return JSON.stringify(out, null, 2);
}

async function refreshStatus() {
  const data = await getCaptured();
  const aliyunToken =
    data.aliyun?.credential?.authorization || data.aliyun?.credential?.token || data.aliyun?.credential?.csrfToken || "";
  const cfmToken =
    data.cfm?.credential?.authorization || data.cfm?.credential?.token || data.cfm?.credential?.csrfToken || "";
  document.getElementById("aliyun-status").textContent = mask(aliyunToken);
  document.getElementById("cfm-status").textContent = mask(cfmToken);
}

document.getElementById("copy-aliyun").addEventListener("click", async () => {
  const data = await getCaptured();
  if (!data.aliyun) {
    setStatus("未检测到阿里云请求。请先打开阿里云页面并刷新一次。", true);
    return;
  }
  await copyText(toImportJson(data.aliyun));
  setStatus("阿里云凭据已复制。");
});

document.getElementById("copy-cfm").addEventListener("click", async () => {
  const data = await getCaptured();
  if (!data.cfm) {
    setStatus("未检测到 CFM 请求。请先打开 CFM 页面并刷新一次。", true);
    return;
  }
  await copyText(toImportJson(data.cfm));
  setStatus("CFM 凭据已复制。");
});

document.getElementById("copy-all").addEventListener("click", async () => {
  const data = await getCaptured();
  if (!data.aliyun && !data.cfm) {
    setStatus("暂无可复制数据，请先在阿里云或 CFM 页面触发请求。", true);
    return;
  }
  await copyText(toCombinedJson(data));
  setStatus("合并 JSON 已复制。");
});

document.getElementById("clear-all").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_CAPTURED_CREDENTIALS" });
  await refreshStatus();
  setStatus("已清空。");
});

refreshStatus();
