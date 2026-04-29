# 云巡凭据采集助手（阿里云 + CFM）

这个扩展用于在你已登录的浏览器会话中，自动采集最近一次阿里云和 CFM 请求里的凭据，并一键复制为 JSON。

## 1. 安装（Chrome）

1. 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择目录：
   - `tools/dual-credential-capture-extension`

## 2. 使用

1. 先打开并登录阿里云页面（如资金流水页），刷新一次让页面发请求
2. 再打开并登录 CFM 页面，刷新一次让页面发请求
3. 点击浏览器工具栏里的「云巡凭据采集助手」
4. 选择：
   - `复制阿里云凭据`
   - `复制 CFM 凭据`
   - `复制合并 JSON`
5. 回到你的平台 `接入凭据` 页面，粘贴导入

## 3. 导入 JSON 示例

单平台（例如 CFM）：

```json
{
  "provider": "cfm",
  "apiUrl": "https://apiadmin.cycor.io/api/v1/xxx",
  "token": "Bearer xxxxx",
  "csrfToken": "",
  "cookie": "",
  "authorization": "Bearer xxxxx",
  "capturedAt": 1714380000000
}
```

双平台合并：

```json
{
  "version": "v1",
  "exportedAt": 1714380000000,
  "aliyun": {
    "apiUrl": "https://fortune.console.aliyun.com/api/income/queryFundFlow.json",
    "csrfToken": "0gaOAqmo",
    "cookie": "...",
    "token": "0gaOAqmo",
    "authorization": "",
    "capturedAt": 1714380000000
  },
  "cfm": {
    "apiUrl": "https://apiadmin.cycor.io/api/v1/xxx",
    "token": "Bearer xxxxx",
    "csrfToken": "",
    "cookie": "",
    "authorization": "Bearer xxxxx",
    "capturedAt": 1714380001000
  }
}
```

## 4. 注意事项

- 扩展只存「最近一次」采集到的阿里云与 CFM 请求信息。
- 数据仅保存于当前浏览器的扩展本地存储。
- 切换账号后建议点击「清空采集数据」再重新采集。
