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

### renderer process

```javascript
import cloudbase from "@cloudbase/js-sdk";
import electron_adapter from 'cloudbase-adapter-electron'

cloudbase.useAdapters(electron_adapter);

const tcb = cloudbase.init({
  env: "your envId",
  appSign: 'your appSign',
  appSecret: {
    appAccessKeyId: 'your appAccessKeyId',
    appAccessKey: 'your appAccessKey',
  }
});

```

## 注意

该适配器实现了SDK中的post接口和upload接口, download虽已实现，但是通过SDK中的downloadFile函数下载文件会失败. 

虽然downloadFile函数下载文件会报错， 但是可以通过getTempFileURL先拿到基于https的下载链接，然后通过该链接进行下载. 代码如下：

```typescript
const cloudFilePath = "cloud file ID"
tcb.getTempFileURL({
  fileList:[cloudFilePath],
})
.then(async res=>{
  const item = res.fileList && res.fileList[0]
  if(item){
    let url:string = item.download_url || item.tempFileURL;
    const resp = await fetch(url);
    if(resp.ok){
      const jsonData = await resp.json();
      // ...
      return jsonData;
    }
  }
})
```

## notes: 

1. 新版的适配器移除了electron依赖。
1. 方便打印调试信息，可以直接下载src/index.ts文件, 修改为合适的名字后放到项目中直接使用(以相对路径的方式引入)。