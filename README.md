# cloudbase-adapter-electron

[![NPM Version](https://img.shields.io/npm/v/cloudbase-adapter-electron.svg?style=flat)](https://www.npmjs.com/package/cloudbase-adapter-electron)
[![](https://img.shields.io/npm/dt/cloudbase-adapter-electron.svg)](https://www.npmjs.com/package/cloudbase-adapter-electron)

腾讯云开发 @cloudbase/js-sdk 的 electron 适配器, 运行于electron的渲染进程中.

## 安装

yarn
> yarn add cloudbase-adapter-electron

npm
> npm install cloudbase-adapter-electron -S

## 使用

### 初始化


```javascript
import cloudbase from "@cloudbase/js-sdk";
// 根据需要引入其他模块
// import "@cloudbase/js-sdk/auth";
// import "@cloudbase/js-sdk/storage";
// import "@cloudbase/js-sdk/database";
import electron_adapter from 'cloudbase-adapter-electron'

cloudbase.useAdapters(electron_adapter);    //引入适配器

const tcb = cloudbase.init({
  env: "your envId",
  appSign: 'your appSign',                  //云开发控制台 > 环境 > 安全配置 > 移动应用安全来源 > 应用标识 （如果没有，点击“添加应用”按钮创建）
  appSecret: {
    appAccessKeyId: 'your appAccessKeyId',  //云开发控制台 > 环境 > 安全配置 > 移动应用安全来源 > 版本
    appAccessKey: 'your appAccessKey',      //云开发控制台 > 环境 > 安全配置 > 移动应用安全来源 > [获取凭证]
  }
});

```

### 文件上传

上一个版本中，我在适配器的`upload`函数里面使用 node 的 fs 模块手动读取文件内容进行上传，这导致适配器
依赖于 node。 从 electron v12 开始，为了增加 electron 程序的安全性，`BrowserWindow`默认启用了
`contextIsolation`, 启用该配置后渲染进程将无法直接访问 node API，需要使用 preload script 来间接
使用 node 的功能。为了顺应趋势，该适配器也移除了对 fs 模块的依赖，而是通过 `window._upload_file_content`
全局属性来传递要上传的内容, 适配器在`upload`函数里会读取该属性作为要上传的文件的内容。因此在调用tcb的文件上传
API时，你需要使用在 preload script 里面通过 contextBridge 暴露到渲染进程的 api 来读取文件内容，
然后挂载到`window._upload_file_content`上去。

```typescript
/**
 * 上传文件到云存储
 * @param filePath 本地文件路径
 * @param cloudPath 云存储文件路径
 */
export function uploadFile(filePath:string, cloudPath:string){
  // 
  const fileContent:string|ArrayBuffer = read_file_using_your_own_method(filePath);
  // @ts-ignore
  window._upload_file_content = fileContent;
  return tcb.uploadFile({
    cloudPath,
    filePath,
  })
  .then(res=>{
    console.log("uploaded res", res);
    return {ok: true, res};
  })
  .catch(err=>{
    console.error(err);
    return {ok: false, err};
  })
  .finally(()=>{
    window._upload_file_content = null;
  })
}
```

### 文件下载

首先通过 `getTempFileURL`获取文件临时下载链接，然后通过该链接请求文件数据。

> 不要通过`tcb.downloadFile()`下载文件：
> 1. 适配器中的 download 函数实现有点问题，不能成功下载。
> 1. 就算能成功下载，其默认行为也很影响用户体验，没记错的话好像是会自动打开一个窗口让用户选择文件保存的位置.

```typescript
export function donwlowdData(cloudFileId:string){
  tcb.getTempFileURL({
    fileList:[cloudFileId],
  })
  .then(async res=>{
    const item = res.fileList && res.fileList[0]
    if(item){
      let url:string = item.download_url || item.tempFileURL;
      const resp = await fetch(url);
      if(resp.ok){
        const jsonData = await resp.json();
        // const arrayBuffer = await resp.arrayBuffer();
        // const text = await resp.text();
        // ...
        return jsonData;
      }
    }
  })
}

```

### 其他

1. 其他的功能的使用方式与 @cloudbase/js-sdk 的使用方式相同。
1. preload script 使用示例 https://www.electronjs.org/docs/api/context-bridge#exposing-node-global-symbols

## 更新:

1. 2020/12: 移除electron依赖
2. 2021/8/18: 移除对 `fs`, `path`, `os` 模块的依赖.