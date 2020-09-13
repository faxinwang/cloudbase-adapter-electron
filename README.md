# cloudbase-adapter-electron
[![NPM Version](https://img.shields.io/npm/v/@cloudbase/js-sdk.svg?style=flat)](https://www.npmjs.com/package/@cloudbase/js-sdk)
[![](https://img.shields.io/npm/dt/@cloudbase/js-sdk.svg)](https://www.npmjs.com/package/@cloudbase/js-sdk)

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
  env: "env-xxxx",
});

```

### main process

从electron 10 开始, `enableRemoteModule` 默认值为false, 由于适配器中使用了 `remote` 模块的 `remote.app.getPath()`, 因此需要在主进程中启用remote模块. electron版本小于10的则不需要该设置.

```javascript
let mainWindow = new BrowserWindow({
  width: 1000,
  height: 600,
  webPreferences: {
    enableRemoteModule: true,
  }
});
```

## 注意

该软件包实现了适配器中的post接口和upload接口, download接口还有一点问题. 不过已经可以使用云开发的登录认证, 文件上传, 数据库等服务了. 欢迎大家提交pr一起完善这个适配器. 

另外, 可以直接下载src/index.ts文件, 修改为合适的名字后放到项目中直接使用(以相对路径的方式引入), 从而方便打印调试信息.