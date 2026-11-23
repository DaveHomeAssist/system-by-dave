import http from 'node:http';
import worker from '../dist/server/index.js';

// Isolated preview storage. No production database or write path is available.
const env={DB:{prepare(){return {all:async()=>({results:[]}),bind(){return this;},run:async()=>{throw Error('Preview writes are disabled');}};}}};
const server=http.createServer(async(request,response)=>{
  try{
    const url='https://wst.housevideo.app'+request.url;
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end('Preview is read only');return;}
    const result=await worker.fetch(new Request(url,{method:request.method,headers:request.headers}),env);
    response.writeHead(result.status,Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  }catch(error){response.writeHead(500);response.end('Preview failed: '+error.message);}
});
server.listen(Number(process.env.PORT||8875),'0.0.0.0',()=>console.log('Navigation preview ready on port '+(process.env.PORT||8875)));
