import {
    SDKAdapterInterface,
    AbstractSDKRequest,
    StorageType,
    WebSocketContructor,
    SDKRequestConstructor,
    IRequestConfig,
    IRequestMethod,
    IRequestOptions,
    ResponseObject,
} from '@cloudbase/adapter-interface';
import { KV } from '@cloudbase/types';


// this code segment is copied from the source code of official cloudbase jssdk
let PROTOCOL = typeof location !== 'undefined' && location.protocol === 'http:'
    ? 'http:'
    : 'https:';

// this code segment is copied from the source code of official cloudbase jssdk
function formatUrl (PROTOCOL: string, url: string, query: KV<any> = {}): string {
    const urlHasQuery = /\?/.test(url);
    let queryString = '';
    for (let key in query) {
        if (queryString === '') {
            !urlHasQuery && (url += '?');
        } else {
            queryString += '&';
        }
        queryString += `${key}=${encodeURIComponent(query[key])}`;
    }
    url += queryString;
    if (/^http(s)?\:\/\//.test(url)) {
        return url;
    }
    return `${PROTOCOL}${url}`;
}

// this code segment is copied from the source code of official cloudbase jssdk
function isFormData (val: any): boolean {
    return Object.prototype.toString.call(val) === '[object FormData]';
}

// this code segment is copied from the source code of official cloudbase jssdk
function toQueryString (query = {}) {
    let queryString = [];
    for (let key in query) {
        // @ts-ignore
        queryString.push(`${key}=${encodeURIComponent(query[key])}`);
    }
    return queryString.join('&');
}

function isMatch () {
    if (!window || typeof window !== 'object') {
        return false
    }
    if (!XMLHttpRequest|| typeof XMLHttpRequest !== 'function') {
        return false
    }
    if (!WebSocket || typeof WebSocket !== 'function') {
        return false
    }
    if (!localStorage || typeof localStorage !== 'object') {
        return false
    }
    if (!sessionStorage || typeof sessionStorage !== 'object') {
        return false
    }
    return true
}

console.log("isMatch", isMatch())

class SDKRequestImpl extends AbstractSDKRequest {
    private readonly _timeout: number;
    // 超时提示文案
    private readonly _timeoutMsg: string;
    // 超时受限请求类型，默认所有请求均受限
    private readonly _restrictedMethods: IRequestMethod[];

    constructor(config: IRequestConfig = {}) {
        super();
        const { timeout, timeoutMsg, restrictedMethods } = config;
        this._timeout = timeout || 1000 * 20; //20 seconds default
        this._timeoutMsg = timeoutMsg || '请求超时';
        this._restrictedMethods = restrictedMethods || ['get', 'post', 'upload', 'download'];
    }

    // private _request_by_fetch(options: IRequestOptions): Promise<ResponseObject>{
    //     const method = options.method?.toUpperCase() || 'GET';
    //     return new Promise((resolve, reject) =>{
    //         const {url, data, body, headers={}} = options
    //         // let hasQueryString = false
    //         let payload: BodyInit = ''
    //         const contentType = headers["content-type"] || headers["Content-Type"] || ""
    //         if(isFormData(data)){
    //             payload = data as FormData
    //         }else if(contentType === 'application/x-www-form-urlencoded'){
    //             payload = toQueryString(data)
    //             // hasQueryString = true
    //         }else if(data){
    //             payload = JSON.stringify(data)
    //         }else if(body){
    //             payload = body
    //         }
    //         let config = {
    //             method,
    //             headers: {
    //                 mode: 'cors',
    //                 ...headers
    //             },
    //             body: payload
    //         }
    //         if(['GET','HEAD'].includes(method)){
    //             // delete config.body
    //             config.body = ""
    //         }
    //         fetch(url!, config).then(response => {
    //             console.log("response", response)
    //             // console.log("response headers", response.headers)
    //             if(!response.ok) reject(response)
    //             else{
    //                 try{
    //                     let conType = response.headers['content-type'] || response.headers['Content-Type'] || ''
    //                     if(conType === 'application/json'){
    //                         return response.json()
    //                     }else if(conType.startsWith("image")){
    //                         return response.blob()
    //                     }else if(conType.startsWith("text") || conType===''){
    //                         return response.text()
    //                     }else{
    //                         return response.blob()
    //                     }
    //                 }catch(err){
    //                     console.log('response err', err)
    //                 }
    //             }
    //         })
    //         .then(data => {
    //             if(typeof data === 'string'){
    //                 try{
    //                     data = JSON.parse(data)
    //                     // console.log("json data", data)
    //                 }catch(err){}
    //             }
    //             resolve({
    //                 status:200,
    //                 statusCode: 200,
    //                 data,
    //             })
    //         })
    //     })
    // }

    // private _request_by_fetch_with_timeout(options: IRequestOptions): Promise<ResponseObject>{
    //     return Promise.race([
    //         this._request_by_fetch(options),
    //         new Promise<ResponseObject>(resolve => {
    //             console.warn(this._timeoutMsg)
    //             setTimeout(() => resolve({msg: this._timeoutMsg}), this._timeout)
    //         })
    //     ])
    // }

    /**
     * @param {IRequestOptions} options
     * @param {boolean} enableAbort 是否超时中断请求
     */
    // this code segment is copied from the source code of official cloudbase jssdk
    protected _request_by_xhr (options: IRequestOptions, enableAbort = false): Promise<ResponseObject> {
        const method = (String(options.method)).toLowerCase() || 'get';
        return new Promise(resolve => {
            const { url, headers = {}, data, responseType, withCredentials, body, onUploadProgress } = options;
            const realUrl = formatUrl(PROTOCOL, url!, method === 'get' ? data : {});

            const ajax = new XMLHttpRequest();
            ajax.open(method, realUrl);
            responseType && (ajax.responseType = responseType);
            for (const key in headers) {
                ajax.setRequestHeader(key, headers[key]);
            }
            let timer;
            if (onUploadProgress) {
                ajax.addEventListener('progress', onUploadProgress);
            }
            ajax.onreadystatechange = () => {
                const result: ResponseObject = {};
                if (ajax.readyState === 4) {
                    let headers = ajax.getAllResponseHeaders();
                    let arr = headers.trim().split(/[\r\n]+/);
                    // Create a map of header names to values
                    let headerMap = {};
                    arr.forEach(function (line) {
                        let parts = line.split(': ');
                        let header = parts.shift()!.toLowerCase();
                        let value = parts.join(': ');
                        headerMap[header] = value;
                    });
                    result.header = headerMap;
                    result.statusCode = ajax.status;
                    if (!result.code) result.code = "SUCCESS";
                    try {
                        // 上传post请求返回数据格式为xml，此处容错
                        result.data = responseType === 'blob' ? ajax.response : JSON.parse(ajax.responseText);
                    } catch (e) {
                        result.data = responseType === 'blob' ? ajax.response : ajax.responseText;
                    }
                    clearTimeout(timer);
                    resolve(result);
                }
            };
            if (enableAbort && this._timeout) {
                timer = setTimeout(() => {
                    console.warn(this._timeoutMsg);
                    ajax.abort();
                }, this._timeout);
            }
            // 处理 payload
            let payload;
            if (isFormData(data)) {
                // FormData，不处理
                payload = data;
            } else if (headers['content-type'] === 'application/x-www-form-urlencoded') {
                payload = toQueryString(data);
            } else if (body) {
                payload = body;
            } else {
                // 其它情况
                payload = data ? JSON.stringify(data) : undefined;
            }

            if (withCredentials) {
                ajax.withCredentials = true;
            }
            ajax.send(payload);
        });
    }

    private _request (options: IRequestOptions) {
        let method = options.method?.toLowerCase() || 'get'
        // @ts-ignore
        let restricted = this._restrictedMethods.includes(method)
        // return restricted? this._request_by_fetch_with_timeout(options) : this._request_by_fetch(options)
        return this._request_by_xhr(options, restricted)
    }

    public post (options: IRequestOptions) {
        // console.log("post options", options);
        return this._request({
            ...options,
            method: 'POST',
        })
    }

    public upload (options: IRequestOptions) {
        // console.log("upload options", options);
        const { data, name } = options
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key])
        }
        formData.append('key', name);
        // @ts-ignore
        const fileContent = window._upload_file_content;
        formData.append('file', new File([fileContent], name));
        return this._request({
            ...options,
            data: formData,
            method: 'POST',
        })
        // .then( resp => {
        //     if(resp.statusCode === 200) resp.statusCode = 201
        //     return resp
        // })

    }

    // @ts-ignore
    public download (options: IRequestOptions) {
        // console.log("download options", options);
        // return this._request({...options,  crossDomain:true}).then(resp => {
        //     // console.log('data', resp)
        //     const tmpPath = path.join(os.tmpdir(),"electron");
        //     if(!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath);
        //     const fileName = decodeURIComponent(options.url?.split('/').pop() || (new Date()).valueOf() + '' );
        //     const filePath = path.join(tmpPath, fileName);
        //     fs.writeFileSync(filePath, resp.data);
        //     return {
        //         code:'SUCCESS',
        //         status:200,
        //         statusCode: 200,
        //         tempFilePath: filePath
        //     }
        // })
        // .catch(err =>{
        //     console.log(err)
        //     return err
        // })
    }
}

function genAdapter () {
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

export { adapter };
export default adapter;