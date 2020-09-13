import { 
    SDKAdapterInterface,
    AbstractSDKRequest,
    StorageType,
    WebSocketContructor,
    SDKRequestConstructor,
    IRequestConfig,
    IRequestMethod,
    IRequestOptions,
} from '@cloudbase/adapter-interface';

import * as fs from 'fs'
import * as path from 'path';
import {remote} from 'electron'

 
function isFormData(val: any): boolean {
    return Object.prototype.toString.call(val) === '[object FormData]';
}

function toQueryString(query = {}) {
    let queryString = [];
    for (let key in query) {
        // @ts-ignore
        queryString.push(`${key}=${encodeURIComponent(query[key])}`);
    }
    return queryString.join('&');
}

function isMatch(){
    if(!window || typeof window !== 'object'){
        return false
    }
    if(!window.fetch || typeof window.fetch !== 'function'){
        return false
    }
    if(!WebSocket || typeof WebSocket !== 'function'){
        return false
    }
    if(!localStorage || typeof localStorage !== 'object'){
        return false
    }
    if(!sessionStorage || typeof sessionStorage !== 'object'){
        return false
    }
    if(!fs || !path || !remote){
        return false
    }
    return true
}

// console.log("isMatch", isMatch())

class SDKRequestImpl extends AbstractSDKRequest{
    // 默认不限超时
    private readonly _timeout: number;
    // 超时提示文案
    private readonly _timeoutMsg: string;
    // 超时受限请求类型，默认所有请求均受限
    private readonly _restrictedMethods: IRequestMethod[];

    constructor(config: IRequestConfig={}) {
        super();
        const { timeout, timeoutMsg, restrictedMethods } = config;
        this._timeout = timeout || 1000 * 15; //15 seconds default
        this._timeoutMsg = timeoutMsg || '请求超时';
        this._restrictedMethods = restrictedMethods || ['get', 'post', 'upload', 'download'];
    }

    private _request(options: IRequestOptions): Promise<any>{
        const method = options.method?.toUpperCase() || 'GET';
        return new Promise((resolve, reject) =>{
            const {url, data, body, headers={}} = options
            // let hasQueryString = false
            let payload: BodyInit = ''
            const contentType = headers["content-type"] || headers["Content-Type"] || ""
            if(isFormData(data)){
                payload = data as FormData
            }else if(contentType === 'application/x-www-form-urlencoded'){
                payload = toQueryString(data)
                // hasQueryString = true
            }else if(data){
                payload = JSON.stringify(data)
            }else if(body){
                payload = body
            }
            let config = {
                method,
                headers: {
                    mode: 'cors',
                    ...headers
                },
                body: payload
            }
            if(['GET','HEAD'].includes(method)){
                delete config.body
            }
            fetch(url!, config).then(response => {
                // console.log("response", response)
                // console.log("response headers", response.headers)
                if(!response.ok) reject(response)
                else{
                    try{
                        let conType = response.headers['content-type'] || response.headers['Content-Type'] || ''
                        if(conType === 'application/json'){
                            return response.json()
                        }else if(conType.startsWith("image")){
                            return response.blob()
                        }else if(conType.startsWith("text") || conType===''){
                            return response.text()
                        }else{
                            return response.blob()
                        }
                    }catch(err){
                        console.error('response err', err)
                    }
                }
            })
            .then(data => {
                if(typeof data === 'string'){
                    try{
                        data = JSON.parse(data)
                        // console.log("json data", data)
                    }catch(err){}
                }
                resolve({
                    status:200,
                    statusCode: 200,
                    data,
                })
            })
        })
    }

    private _request_with_timeout(options: IRequestOptions): Promise<any>{
        return Promise.race([
            this._request(options),
            new Promise(resolve => {
                setTimeout(() => resolve(this._timeoutMsg), this._timeout)
            })
        ])
    }

    private request(options: IRequestOptions){
        let method = options.method?.toLowerCase() || 'get'
        // @ts-ignore
        let restricted = this._restrictedMethods.includes(method)
        return restricted? this._request_with_timeout(options) : this._request(options)
    }

    public async post(options: IRequestOptions){
        // console.log("post options", options);
        return this.request({
            ...options,
            method: 'POST',
        })
    }

    public async upload(options: IRequestOptions) {
        // console.log("upload options", options);
        const {data, file, name} = options
        const formData = new FormData();
        for(let key in data){
            formData.append(key, data[key])
        }
        formData.append('key', name);
        let fileContent = fs.readFileSync(file)
        formData.append('file', new File( [fileContent], name ));
        return this.request({
            ...options,
            data: formData,
            method: 'POST',
        }).then( resp => {
            if(resp.statusCode === 200) resp.statusCode = 201
            return resp
        })
        
    }

    public download(options: IRequestOptions){
        // console.log("download options", options);
        return this.request(options).then(data => {
            // console.log('data', data)
            const userDataPath = remote.app.getPath('userData')
            const fileName = decodeURIComponent(options.url?.split('/').pop() || (new Date()).valueOf() + '' )
            const filePath = path.join(userDataPath, 'tmp', fileName)
            fs.writeFileSync(filePath, data)
            return {
                code:'SUCCESS',
                status:200,
                statusCode: 200,
                tempFilePath: filePath
            }
        })
        .catch(err =>{
            // console.log(err)
            return err
        })
    }
}

function genAdapter(){
    const adapter: SDKAdapterInterface = {
        root: window,
        localStorage,
        sessionStorage,
        reqClass: SDKRequestImpl as SDKRequestConstructor,
        wsClass: WebSocket as WebSocketContructor,
        primaryStorage: StorageType.local,
    }

    return adapter;
}

const adapter = {
    genAdapter,
    isMatch,
    runtime: 'electron_renderer_process',
}

export {adapter};
export default adapter;