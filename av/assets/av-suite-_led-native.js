/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const It="srgb",cr="srgb-linear",ur="linear",it="srgb";const _a="300 es";function dr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Hs(){const n=dr("canvas");return n.style.display="block",n}const va={};function xa(...n){const e="THREE."+n.shift();console.log(e,...n)}function vs(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Oe(...n){const e="THREE."+(n=vs(n)).shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function Je(...n){const e="THREE."+(n=vs(n)).shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function ea(...n){const e=n.join(" ");e in va||(va[e]=!0,Oe(...n))}function Vs(n,e,t){return new Promise(function(i,r){setTimeout(function a(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:i()}},t)})}const Gs={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3};class In{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i!==void 0&&i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const a=r.indexOf(t);a!==-1&&r.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let a=0,s=r.length;a<s;a++)r[a].call(this,e);e.target=null}}}const Et=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ma=1234567;const Kn=Math.PI/180,wi=180/Math.PI;function ti(){const n=4294967295*Math.random()|0,e=4294967295*Math.random()|0,t=4294967295*Math.random()|0,i=4294967295*Math.random()|0;return(Et[255&n]+Et[n>>8&255]+Et[n>>16&255]+Et[n>>24&255]+"-"+Et[255&e]+Et[e>>8&255]+"-"+Et[e>>16&15|64]+Et[e>>24&255]+"-"+Et[63&t|128]+Et[t>>8&255]+"-"+Et[t>>16&255]+Et[t>>24&255]+Et[255&i]+Et[i>>8&255]+Et[i>>16&255]+Et[i>>24&255]).toLowerCase()}function qe(n,e,t){return Math.max(e,Math.min(t,n))}function ta(n,e){return(n%e+e)%e}function Ti(n,e,t){return(1-t)*n+t*e}function qn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function wt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(4294967295*n);case Uint16Array:return Math.round(65535*n);case Uint8Array:return Math.round(255*n);case Int32Array:return Math.round(2147483647*n);case Int16Array:return Math.round(32767*n);case Int8Array:return Math.round(127*n);default:throw new Error("Invalid component type.")}}const mi={DEG2RAD:Kn,RAD2DEG:wi,generateUUID:ti,clamp:qe,euclideanModulo:ta,mapLinear:function(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)},inverseLerp:function(n,e,t){return n!==e?(t-n)/(e-n):0},lerp:Ti,damp:function(n,e,t,i){return Ti(n,e,1-Math.exp(-t*i))},pingpong:function(n,e=1){return e-Math.abs(ta(n,2*e)-e)},smoothstep:function(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e))*n*(3-2*n)},smootherstep:function(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e))*n*n*(n*(6*n-15)+10)},randInt:function(n,e){return n+Math.floor(Math.random()*(e-n+1))},randFloat:function(n,e){return n+Math.random()*(e-n)},randFloatSpread:function(n){return n*(.5-Math.random())},seededRandom:function(n){n!==void 0&&(Ma=n);let e=Ma+=1831565813;return e=Math.imul(e^e>>>15,1|e),e^=e+Math.imul(e^e>>>7,61|e),((e^e>>>14)>>>0)/4294967296},degToRad:function(n){return n*Kn},radToDeg:function(n){return n*wi},isPowerOfTwo:function(n){return!(n&n-1)&&n!==0},ceilPowerOfTwo:function(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))},floorPowerOfTwo:function(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))},setQuaternionFromProperEuler:function(n,e,t,i,r){const a=Math.cos,s=Math.sin,c=a(t/2),l=s(t/2),o=a((e+i)/2),u=s((e+i)/2),p=a((e-i)/2),f=s((e-i)/2),d=a((i-e)/2),M=s((i-e)/2);switch(r){case"XYX":n.set(c*u,l*p,l*f,c*o);break;case"YZY":n.set(l*f,c*u,l*p,c*o);break;case"ZXZ":n.set(l*p,l*f,c*u,c*o);break;case"XZX":n.set(c*u,l*M,l*d,c*o);break;case"YXY":n.set(l*d,c*u,l*M,c*o);break;case"ZYZ":n.set(l*M,l*d,c*u,c*o);break;default:Oe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}},normalize:wt,denormalize:qn},ha=class ha{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(qe(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),a=this.x-e.x,s=this.y-e.y;return this.x=a*i-s*r+e.x,this.y=a*r+s*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};ha.prototype.isVector2=!0;let tt=ha;class ni{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,a,s,c){let l=i[r+0],o=i[r+1],u=i[r+2],p=i[r+3],f=a[s+0],d=a[s+1],M=a[s+2],m=a[s+3];if(p!==m||l!==f||o!==d||u!==M){let E=l*f+o*d+u*M+p*m;E<0&&(f=-f,d=-d,M=-M,m=-m,E=-E);let _=1-c;if(E<.9995){const v=Math.acos(E),C=Math.sin(v);_=Math.sin(_*v)/C,l=l*_+f*(c=Math.sin(c*v)/C),o=o*_+d*c,u=u*_+M*c,p=p*_+m*c}else{l=l*_+f*c,o=o*_+d*c,u=u*_+M*c,p=p*_+m*c;const v=1/Math.sqrt(l*l+o*o+u*u+p*p);l*=v,o*=v,u*=v,p*=v}}e[t]=l,e[t+1]=o,e[t+2]=u,e[t+3]=p}static multiplyQuaternionsFlat(e,t,i,r,a,s){const c=i[r],l=i[r+1],o=i[r+2],u=i[r+3],p=a[s],f=a[s+1],d=a[s+2],M=a[s+3];return e[t]=c*M+u*p+l*d-o*f,e[t+1]=l*M+u*f+o*p-c*d,e[t+2]=o*M+u*d+c*f-l*p,e[t+3]=u*M-c*p-l*f-o*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,a=e._z,s=e._order,c=Math.cos,l=Math.sin,o=c(i/2),u=c(r/2),p=c(a/2),f=l(i/2),d=l(r/2),M=l(a/2);switch(s){case"XYZ":this._x=f*u*p+o*d*M,this._y=o*d*p-f*u*M,this._z=o*u*M+f*d*p,this._w=o*u*p-f*d*M;break;case"YXZ":this._x=f*u*p+o*d*M,this._y=o*d*p-f*u*M,this._z=o*u*M-f*d*p,this._w=o*u*p+f*d*M;break;case"ZXY":this._x=f*u*p-o*d*M,this._y=o*d*p+f*u*M,this._z=o*u*M+f*d*p,this._w=o*u*p-f*d*M;break;case"ZYX":this._x=f*u*p-o*d*M,this._y=o*d*p+f*u*M,this._z=o*u*M-f*d*p,this._w=o*u*p+f*d*M;break;case"YZX":this._x=f*u*p+o*d*M,this._y=o*d*p+f*u*M,this._z=o*u*M-f*d*p,this._w=o*u*p-f*d*M;break;case"XZY":this._x=f*u*p-o*d*M,this._y=o*d*p-f*u*M,this._z=o*u*M+f*d*p,this._w=o*u*p+f*d*M;break;default:Oe("Quaternion: .setFromEuler() encountered an unknown order: "+s)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],a=t[8],s=t[1],c=t[5],l=t[9],o=t[2],u=t[6],p=t[10],f=i+c+p;if(f>0){const d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(u-l)*d,this._y=(a-o)*d,this._z=(s-r)*d}else if(i>c&&i>p){const d=2*Math.sqrt(1+i-c-p);this._w=(u-l)/d,this._x=.25*d,this._y=(r+s)/d,this._z=(a+o)/d}else if(c>p){const d=2*Math.sqrt(1+c-i-p);this._w=(a-o)/d,this._x=(r+s)/d,this._y=.25*d,this._z=(l+u)/d}else{const d=2*Math.sqrt(1+p-i-c);this._w=(s-r)/d,this._x=(a+o)/d,this._y=(l+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(qe(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,a=e._z,s=e._w,c=t._x,l=t._y,o=t._z,u=t._w;return this._x=i*u+s*c+r*o-a*l,this._y=r*u+s*l+a*c-i*o,this._z=a*u+s*o+i*l-r*c,this._w=s*u-i*c-r*l-a*o,this._onChangeCallback(),this}slerp(e,t){let i=e._x,r=e._y,a=e._z,s=e._w,c=this.dot(e);c<0&&(i=-i,r=-r,a=-a,s=-s,c=-c);let l=1-t;if(c<.9995){const o=Math.acos(c),u=Math.sin(o);l=Math.sin(l*o)/u,t=Math.sin(t*o)/u,this._x=this._x*l+i*t,this._y=this._y*l+r*t,this._z=this._z*l+a*t,this._w=this._w*l+s*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+r*t,this._z=this._z*l+a*t,this._w=this._w*l+s*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),a=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const pa=class pa{constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Sa.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Sa.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,a=e.elements;return this.x=a[0]*t+a[3]*i+a[6]*r,this.y=a[1]*t+a[4]*i+a[7]*r,this.z=a[2]*t+a[5]*i+a[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,a=e.elements,s=1/(a[3]*t+a[7]*i+a[11]*r+a[15]);return this.x=(a[0]*t+a[4]*i+a[8]*r+a[12])*s,this.y=(a[1]*t+a[5]*i+a[9]*r+a[13])*s,this.z=(a[2]*t+a[6]*i+a[10]*r+a[14])*s,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,a=e.x,s=e.y,c=e.z,l=e.w,o=2*(s*r-c*i),u=2*(c*t-a*r),p=2*(a*i-s*t);return this.x=t+l*o+s*p-c*u,this.y=i+l*u+c*o-a*p,this.z=r+l*p+a*u-s*o,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r,this.y=a[1]*t+a[5]*i+a[9]*r,this.z=a[2]*t+a[6]*i+a[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this.z=qe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this.z=qe(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,a=e.z,s=t.x,c=t.y,l=t.z;return this.x=r*l-a*c,this.y=a*s-i*l,this.z=i*c-r*s,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Sr.copy(this).projectOnVector(e),this.sub(Sr)}reflect(e){return this.sub(Sr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(qe(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,4*t)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,3*t)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=2*Math.random()-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};pa.prototype.isVector3=!0;let X=pa;const Sr=new X,Sa=new ni,fa=class fa{constructor(e,t,i,r,a,s,c,l,o){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,a,s,c,l,o)}set(e,t,i,r,a,s,c,l,o){const u=this.elements;return u[0]=e,u[1]=r,u[2]=c,u[3]=t,u[4]=a,u[5]=l,u[6]=i,u[7]=s,u[8]=o,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,a=this.elements,s=i[0],c=i[3],l=i[6],o=i[1],u=i[4],p=i[7],f=i[2],d=i[5],M=i[8],m=r[0],E=r[3],_=r[6],v=r[1],C=r[4],U=r[7],P=r[2],T=r[5],F=r[8];return a[0]=s*m+c*v+l*P,a[3]=s*E+c*C+l*T,a[6]=s*_+c*U+l*F,a[1]=o*m+u*v+p*P,a[4]=o*E+u*C+p*T,a[7]=o*_+u*U+p*F,a[2]=f*m+d*v+M*P,a[5]=f*E+d*C+M*T,a[8]=f*_+d*U+M*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],a=e[3],s=e[4],c=e[5],l=e[6],o=e[7],u=e[8];return t*s*u-t*c*o-i*a*u+i*c*l+r*a*o-r*s*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],a=e[3],s=e[4],c=e[5],l=e[6],o=e[7],u=e[8],p=u*s-c*o,f=c*l-u*a,d=o*a-s*l,M=t*p+i*f+r*d;if(M===0)return this.set(0,0,0,0,0,0,0,0,0);const m=1/M;return e[0]=p*m,e[1]=(r*o-u*i)*m,e[2]=(c*i-r*s)*m,e[3]=f*m,e[4]=(u*t-r*l)*m,e[5]=(r*a-c*t)*m,e[6]=d*m,e[7]=(i*l-o*t)*m,e[8]=(s*t-i*a)*m,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,a,s,c){const l=Math.cos(a),o=Math.sin(a);return this.set(i*l,i*o,-i*(l*s+o*c)+s+e,-r*o,r*l,-r*(-o*s+l*c)+c+t,0,0,1),this}scale(e,t){return this.premultiply(yr.makeScale(e,t)),this}rotate(e){return this.premultiply(yr.makeRotation(-e)),this}translate(e,t){return this.premultiply(yr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}};fa.prototype.isMatrix3=!0;let Ge=fa;const yr=new Ge,ya=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ea=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ws(){const n={enabled:!0,workingColorSpace:cr,spaces:{},convert:function(r,a,s){return this.enabled!==!1&&a!==s&&a&&s&&(this.spaces[a].transfer===it&&(r.r=gn(r.r),r.g=gn(r.g),r.b=gn(r.b)),this.spaces[a].primaries!==this.spaces[s].primaries&&(r.applyMatrix3(this.spaces[a].toXYZ),r.applyMatrix3(this.spaces[s].fromXYZ)),this.spaces[s].transfer===it&&(r.r=Zn(r.r),r.g=Zn(r.g),r.b=Zn(r.b))),r},workingToColorSpace:function(r,a){return this.convert(r,this.workingColorSpace,a)},colorSpaceToWorking:function(r,a){return this.convert(r,a,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===""?ur:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,a=this.workingColorSpace){return r.fromArray(this.spaces[a].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,a,s){return r.copy(this.spaces[a].toXYZ).multiply(this.spaces[s].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,a){return ea("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(r,a)},toWorkingColorSpace:function(r,a){return ea("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(r,a)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[cr]:{primaries:e,whitePoint:i,transfer:ur,toXYZ:ya,fromXYZ:Ea,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:It},outputColorSpaceConfig:{drawingBufferColorSpace:It}},[It]:{primaries:e,whitePoint:i,transfer:it,toXYZ:ya,fromXYZ:Ea,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:It}}}),n}const Ze=Ws();function gn(n){return n<.04045?.0773993808*n:Math.pow(.9478672986*n+.0521327014,2.4)}function Zn(n){return n<.0031308?12.92*n:1.055*Math.pow(n,.41666)-.055}let Nn;class ks{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Nn===void 0&&(Nn=dr("canvas")),Nn.width=e.width,Nn.height=e.height;const r=Nn.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=Nn}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=dr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),a=r.data;for(let s=0;s<a.length;s++)a[s]=255*gn(a[s]/255);return i.putImageData(r,0,0),t}if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(255*gn(t[i]/255)):t[i]=gn(t[i]);return{data:t,width:e.width,height:e.height}}return Oe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let $s=0;class aa{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:$s++}),this.uuid=ti(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let a;if(Array.isArray(r)){a=[];for(let s=0,c=r.length;s<c;s++)r[s].isDataTexture?a.push(Er(r[s].image)):a.push(Er(r[s]))}else a=Er(r);i.url=a}return t||(e.images[this.uuid]=i),i}}function Er(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?ks.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Oe("Texture: Unable to serialize Texture."),{})}let Xs=0;const br=new X;class Tt extends In{constructor(e=Tt.DEFAULT_IMAGE,t=Tt.DEFAULT_MAPPING,i=1001,r=1001,a=1006,s=1008,c=1023,l=1009,o=Tt.DEFAULT_ANISOTROPY,u=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Xs++}),this.uuid=ti(),this.name="",this.source=new aa(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=a,this.minFilter=s,this.anisotropy=o,this.format=c,this.internalFormat=null,this.type=l,this.offset=new tt(0,0),this.repeat=new tt(1,1),this.center=new tt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(br).x}get height(){return this.source.getSize(br).y}get depth(){return this.source.getSize(br).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Oe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];r!==void 0?r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i:Oe(`Texture.setValues(): property '${t}' does not exist.`)}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case 1e3:e.x=e.x-Math.floor(e.x);break;case 1001:e.x=e.x<0?0:1;break;case 1002:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case 1e3:e.y=e.y-Math.floor(e.y);break;case 1001:e.y=e.y<0?0:1;break;case 1002:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Tt.DEFAULT_IMAGE=null,Tt.DEFAULT_MAPPING=300,Tt.DEFAULT_ANISOTROPY=1;const ma=class ma{constructor(e=0,t=0,i=0,r=1){this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,a=this.w,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r+s[12]*a,this.y=s[1]*t+s[5]*i+s[9]*r+s[13]*a,this.z=s[2]*t+s[6]*i+s[10]*r+s[14]*a,this.w=s[3]*t+s[7]*i+s[11]*r+s[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,a;const l=e.elements,o=l[0],u=l[4],p=l[8],f=l[1],d=l[5],M=l[9],m=l[2],E=l[6],_=l[10];if(Math.abs(u-f)<.01&&Math.abs(p-m)<.01&&Math.abs(M-E)<.01){if(Math.abs(u+f)<.1&&Math.abs(p+m)<.1&&Math.abs(M+E)<.1&&Math.abs(o+d+_-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const C=(o+1)/2,U=(d+1)/2,P=(_+1)/2,T=(u+f)/4,F=(p+m)/4,W=(M+E)/4;return C>U&&C>P?C<.01?(i=0,r=.707106781,a=.707106781):(i=Math.sqrt(C),r=T/i,a=F/i):U>P?U<.01?(i=.707106781,r=0,a=.707106781):(r=Math.sqrt(U),i=T/r,a=W/r):P<.01?(i=.707106781,r=.707106781,a=0):(a=Math.sqrt(P),i=F/a,r=W/a),this.set(i,r,a,t),this}let v=Math.sqrt((E-M)*(E-M)+(p-m)*(p-m)+(f-u)*(f-u));return Math.abs(v)<.001&&(v=1),this.x=(E-M)/v,this.y=(p-m)/v,this.z=(f-u)/v,this.w=Math.acos((o+d+_-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this.z=qe(this.z,e.z,t.z),this.w=qe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this.z=qe(this.z,e,t),this.w=qe(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};ma.prototype.isVector4=!0;let ft=ma;class qs extends In{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new ft(0,0,e,t),this.scissorTest=!1,this.viewport=new ft(0,0,e,t),this.textures=[];const r={width:e,height:t,depth:i.depth},a=new Tt(r),s=i.count;for(let c=0;c<s;c++)this.textures[c]=a.clone(),this.textures[c].isRenderTargetTexture=!0,this.textures[c].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,a=this.textures.length;r<a;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new aa(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ln extends qs{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class xs extends Tt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class js extends Tt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const mr=class mr{constructor(e,t,i,r,a,s,c,l,o,u,p,f,d,M,m,E){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,a,s,c,l,o,u,p,f,d,M,m,E)}set(e,t,i,r,a,s,c,l,o,u,p,f,d,M,m,E){const _=this.elements;return _[0]=e,_[4]=t,_[8]=i,_[12]=r,_[1]=a,_[5]=s,_[9]=c,_[13]=l,_[2]=o,_[6]=u,_[10]=p,_[14]=f,_[3]=d,_[7]=M,_[11]=m,_[15]=E,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new mr().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,i=e.elements,r=1/Fn.setFromMatrixColumn(e,0).length(),a=1/Fn.setFromMatrixColumn(e,1).length(),s=1/Fn.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*a,t[5]=i[5]*a,t[6]=i[6]*a,t[7]=0,t[8]=i[8]*s,t[9]=i[9]*s,t[10]=i[10]*s,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,a=e.z,s=Math.cos(i),c=Math.sin(i),l=Math.cos(r),o=Math.sin(r),u=Math.cos(a),p=Math.sin(a);if(e.order==="XYZ"){const f=s*u,d=s*p,M=c*u,m=c*p;t[0]=l*u,t[4]=-l*p,t[8]=o,t[1]=d+M*o,t[5]=f-m*o,t[9]=-c*l,t[2]=m-f*o,t[6]=M+d*o,t[10]=s*l}else if(e.order==="YXZ"){const f=l*u,d=l*p,M=o*u,m=o*p;t[0]=f+m*c,t[4]=M*c-d,t[8]=s*o,t[1]=s*p,t[5]=s*u,t[9]=-c,t[2]=d*c-M,t[6]=m+f*c,t[10]=s*l}else if(e.order==="ZXY"){const f=l*u,d=l*p,M=o*u,m=o*p;t[0]=f-m*c,t[4]=-s*p,t[8]=M+d*c,t[1]=d+M*c,t[5]=s*u,t[9]=m-f*c,t[2]=-s*o,t[6]=c,t[10]=s*l}else if(e.order==="ZYX"){const f=s*u,d=s*p,M=c*u,m=c*p;t[0]=l*u,t[4]=M*o-d,t[8]=f*o+m,t[1]=l*p,t[5]=m*o+f,t[9]=d*o-M,t[2]=-o,t[6]=c*l,t[10]=s*l}else if(e.order==="YZX"){const f=s*l,d=s*o,M=c*l,m=c*o;t[0]=l*u,t[4]=m-f*p,t[8]=M*p+d,t[1]=p,t[5]=s*u,t[9]=-c*u,t[2]=-o*u,t[6]=d*p+M,t[10]=f-m*p}else if(e.order==="XZY"){const f=s*l,d=s*o,M=c*l,m=c*o;t[0]=l*u,t[4]=-p,t[8]=o*u,t[1]=f*p+m,t[5]=s*u,t[9]=d*p-M,t[2]=M*p-d,t[6]=c*u,t[10]=m*p+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ys,e,Ks)}lookAt(e,t,i){const r=this.elements;return Ot.subVectors(e,t),Ot.lengthSq()===0&&(Ot.z=1),Ot.normalize(),Sn.crossVectors(i,Ot),Sn.lengthSq()===0&&(Math.abs(i.z)===1?Ot.x+=1e-4:Ot.z+=1e-4,Ot.normalize(),Sn.crossVectors(i,Ot)),Sn.normalize(),Ui.crossVectors(Ot,Sn),r[0]=Sn.x,r[4]=Ui.x,r[8]=Ot.x,r[1]=Sn.y,r[5]=Ui.y,r[9]=Ot.y,r[2]=Sn.z,r[6]=Ui.z,r[10]=Ot.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,a=this.elements,s=i[0],c=i[4],l=i[8],o=i[12],u=i[1],p=i[5],f=i[9],d=i[13],M=i[2],m=i[6],E=i[10],_=i[14],v=i[3],C=i[7],U=i[11],P=i[15],T=r[0],F=r[4],W=r[8],L=r[12],O=r[1],Q=r[5],z=r[9],ne=r[13],R=r[2],H=r[6],J=r[10],j=r[14],pe=r[3],ge=r[7],Le=r[11],Ae=r[15];return a[0]=s*T+c*O+l*R+o*pe,a[4]=s*F+c*Q+l*H+o*ge,a[8]=s*W+c*z+l*J+o*Le,a[12]=s*L+c*ne+l*j+o*Ae,a[1]=u*T+p*O+f*R+d*pe,a[5]=u*F+p*Q+f*H+d*ge,a[9]=u*W+p*z+f*J+d*Le,a[13]=u*L+p*ne+f*j+d*Ae,a[2]=M*T+m*O+E*R+_*pe,a[6]=M*F+m*Q+E*H+_*ge,a[10]=M*W+m*z+E*J+_*Le,a[14]=M*L+m*ne+E*j+_*Ae,a[3]=v*T+C*O+U*R+P*pe,a[7]=v*F+C*Q+U*H+P*ge,a[11]=v*W+C*z+U*J+P*Le,a[15]=v*L+C*ne+U*j+P*Ae,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],a=e[12],s=e[1],c=e[5],l=e[9],o=e[13],u=e[2],p=e[6],f=e[10],d=e[14],M=e[3],m=e[7],E=e[11],_=e[15],v=l*d-o*f,C=c*d-o*p,U=c*f-l*p,P=s*d-o*u,T=s*f-l*u,F=s*p-c*u;return t*(m*v-E*C+_*U)-i*(M*v-E*P+_*T)+r*(M*C-m*P+_*F)-a*(M*U-m*T+E*F)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],a=e[3],s=e[4],c=e[5],l=e[6],o=e[7],u=e[8],p=e[9],f=e[10],d=e[11],M=e[12],m=e[13],E=e[14],_=e[15],v=t*c-i*s,C=t*l-r*s,U=t*o-a*s,P=i*l-r*c,T=i*o-a*c,F=r*o-a*l,W=u*m-p*M,L=u*E-f*M,O=u*_-d*M,Q=p*E-f*m,z=p*_-d*m,ne=f*_-d*E,R=v*ne-C*z+U*Q+P*O-T*L+F*W;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const H=1/R;return e[0]=(c*ne-l*z+o*Q)*H,e[1]=(r*z-i*ne-a*Q)*H,e[2]=(m*F-E*T+_*P)*H,e[3]=(f*T-p*F-d*P)*H,e[4]=(l*O-s*ne-o*L)*H,e[5]=(t*ne-r*O+a*L)*H,e[6]=(E*U-M*F-_*C)*H,e[7]=(u*F-f*U+d*C)*H,e[8]=(s*z-c*O+o*W)*H,e[9]=(i*O-t*z-a*W)*H,e[10]=(M*T-m*U+_*v)*H,e[11]=(p*U-u*T-d*v)*H,e[12]=(c*L-s*Q-l*W)*H,e[13]=(t*Q-i*L+r*W)*H,e[14]=(m*C-M*P-E*v)*H,e[15]=(u*P-p*C+f*v)*H,this}scale(e){const t=this.elements,i=e.x,r=e.y,a=e.z;return t[0]*=i,t[4]*=r,t[8]*=a,t[1]*=i,t[5]*=r,t[9]*=a,t[2]*=i,t[6]*=r,t[10]*=a,t[3]*=i,t[7]*=r,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),a=1-i,s=e.x,c=e.y,l=e.z,o=a*s,u=a*c;return this.set(o*s+i,o*c-r*l,o*l+r*c,0,o*c+r*l,u*c+i,u*l-r*s,0,o*l-r*c,u*l+r*s,a*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,a,s){return this.set(1,i,a,0,e,1,s,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,a=t._x,s=t._y,c=t._z,l=t._w,o=a+a,u=s+s,p=c+c,f=a*o,d=a*u,M=a*p,m=s*u,E=s*p,_=c*p,v=l*o,C=l*u,U=l*p,P=i.x,T=i.y,F=i.z;return r[0]=(1-(m+_))*P,r[1]=(d+U)*P,r[2]=(M-C)*P,r[3]=0,r[4]=(d-U)*T,r[5]=(1-(f+_))*T,r[6]=(E+v)*T,r[7]=0,r[8]=(M+C)*F,r[9]=(E-v)*F,r[10]=(1-(f+m))*F,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const a=this.determinant();if(a===0)return i.set(1,1,1),t.identity(),this;let s=Fn.set(r[0],r[1],r[2]).length();const c=Fn.set(r[4],r[5],r[6]).length(),l=Fn.set(r[8],r[9],r[10]).length();a<0&&(s=-s),Zt.copy(this);const o=1/s,u=1/c,p=1/l;return Zt.elements[0]*=o,Zt.elements[1]*=o,Zt.elements[2]*=o,Zt.elements[4]*=u,Zt.elements[5]*=u,Zt.elements[6]*=u,Zt.elements[8]*=p,Zt.elements[9]*=p,Zt.elements[10]*=p,t.setFromRotationMatrix(Zt),i.x=s,i.y=c,i.z=l,this}makePerspective(e,t,i,r,a,s,c=2e3,l=!1){const o=this.elements,u=2*a/(t-e),p=2*a/(i-r),f=(t+e)/(t-e),d=(i+r)/(i-r);let M,m;if(l)M=a/(s-a),m=s*a/(s-a);else if(c===2e3)M=-(s+a)/(s-a),m=-2*s*a/(s-a);else{if(c!==2001)throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+c);M=-s/(s-a),m=-s*a/(s-a)}return o[0]=u,o[4]=0,o[8]=f,o[12]=0,o[1]=0,o[5]=p,o[9]=d,o[13]=0,o[2]=0,o[6]=0,o[10]=M,o[14]=m,o[3]=0,o[7]=0,o[11]=-1,o[15]=0,this}makeOrthographic(e,t,i,r,a,s,c=2e3,l=!1){const o=this.elements,u=2/(t-e),p=2/(i-r),f=-(t+e)/(t-e),d=-(i+r)/(i-r);let M,m;if(l)M=1/(s-a),m=s/(s-a);else if(c===2e3)M=-2/(s-a),m=-(s+a)/(s-a);else{if(c!==2001)throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+c);M=-1/(s-a),m=-a/(s-a)}return o[0]=u,o[4]=0,o[8]=0,o[12]=f,o[1]=0,o[5]=p,o[9]=0,o[13]=d,o[2]=0,o[6]=0,o[10]=M,o[14]=m,o[3]=0,o[7]=0,o[11]=0,o[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}};mr.prototype.isMatrix4=!0;let $e=mr;const Fn=new X,Zt=new $e,Ys=new X(0,0,0),Ks=new X(1,1,1),Sn=new X,Ui=new X,Ot=new X,ba=new $e,Ta=new ni;let Jn=class Ms{constructor(e=0,t=0,i=0,r=Ms.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,a=r[0],s=r[4],c=r[8],l=r[1],o=r[5],u=r[9],p=r[2],f=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(qe(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-s,a)):(this._x=Math.atan2(f,o),this._z=0);break;case"YXZ":this._x=Math.asin(-qe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(c,d),this._z=Math.atan2(l,o)):(this._y=Math.atan2(-p,a),this._z=0);break;case"ZXY":this._x=Math.asin(qe(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-p,d),this._z=Math.atan2(-s,o)):(this._y=0,this._z=Math.atan2(l,a));break;case"ZYX":this._y=Math.asin(-qe(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(l,a)):(this._x=0,this._z=Math.atan2(-s,o));break;case"YZX":this._z=Math.asin(qe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,o),this._y=Math.atan2(-p,a)):(this._x=0,this._y=Math.atan2(c,d));break;case"XZY":this._z=Math.asin(-qe(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(f,o),this._y=Math.atan2(c,a)):(this._x=Math.atan2(-u,d),this._y=0);break;default:Oe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return ba.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ba,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ta.setFromEuler(this),this.setFromQuaternion(Ta,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Jn.DEFAULT_ORDER="XYZ";let sa=class{constructor(){this.mask=1}set(e){this.mask=1<<e>>>0}enable(e){this.mask|=1<<e}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e}disable(e){this.mask&=~(1<<e)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&1<<e)}},Zs=0;const wa=new X,On=new ni,dn=new $e,Ni=new X,gi=new X,Js=new X,Qs=new ni,Aa=new X(1,0,0),Ra=new X(0,1,0),Ca=new X(0,0,1),Pa={type:"added"},eo={type:"removed"},Bn={type:"childadded",child:null},Tr={type:"childremoved",child:null};let Dt=class or extends In{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Zs++}),this.uuid=ti(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=or.DEFAULT_UP.clone();const e=new X,t=new Jn,i=new ni,r=new X(1,1,1);t._onChange(function(){i.setFromEuler(t,!1)}),i._onChange(function(){t.setFromQuaternion(i,void 0,!1)}),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new $e},normalMatrix:{value:new Ge}}),this.matrix=new $e,this.matrixWorld=new $e,this.matrixAutoUpdate=or.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=or.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new sa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return On.setFromAxisAngle(e,t),this.quaternion.multiply(On),this}rotateOnWorldAxis(e,t){return On.setFromAxisAngle(e,t),this.quaternion.premultiply(On),this}rotateX(e){return this.rotateOnAxis(Aa,e)}rotateY(e){return this.rotateOnAxis(Ra,e)}rotateZ(e){return this.rotateOnAxis(Ca,e)}translateOnAxis(e,t){return wa.copy(e).applyQuaternion(this.quaternion),this.position.add(wa.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Aa,e)}translateY(e){return this.translateOnAxis(Ra,e)}translateZ(e){return this.translateOnAxis(Ca,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(dn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Ni.copy(e):Ni.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),gi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?dn.lookAt(gi,Ni,this.up):dn.lookAt(Ni,gi,this.up),this.quaternion.setFromRotationMatrix(dn),r&&(dn.extractRotation(r.matrixWorld),On.setFromRotationMatrix(dn),this.quaternion.premultiply(On.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Je("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Pa),Bn.child=e,this.dispatchEvent(Bn),Bn.child=null):Je("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(eo),Tr.child=e,this.dispatchEvent(Tr),Tr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(dn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Pa),Bn.child=e,this.dispatchEvent(Bn),Bn.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let a=0,s=r.length;a<s;a++)r[a].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gi,e,Js),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gi,Qs,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,r=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*i-a[8]*r,a[13]+=i-a[1]*t-a[5]*i-a[9]*r,a[14]+=r-a[2]*t-a[6]*i-a[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let a=0,s=r.length;a<s;a++)r[a].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};function a(c,l){return c[l.uuid]===void 0&&(c[l.uuid]=l.toJSON(e)),l.uuid}if(r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(c=>({...c,boundingBox:c.boundingBox?c.boundingBox.toJSON():void 0,boundingSphere:c.boundingSphere?c.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(c=>({...c})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON())),this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=a(e.geometries,this.geometry);const c=this.geometry.parameters;if(c!==void 0&&c.shapes!==void 0){const l=c.shapes;if(Array.isArray(l))for(let o=0,u=l.length;o<u;o++){const p=l[o];a(e.shapes,p)}else a(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const c=[];for(let l=0,o=this.material.length;l<o;l++)c.push(a(e.materials,this.material[l]));r.material=c}else r.material=a(e.materials,this.material);if(this.children.length>0){r.children=[];for(let c=0;c<this.children.length;c++)r.children.push(this.children[c].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let c=0;c<this.animations.length;c++){const l=this.animations[c];r.animations.push(a(e.animations,l))}}if(t){const c=s(e.geometries),l=s(e.materials),o=s(e.textures),u=s(e.images),p=s(e.shapes),f=s(e.skeletons),d=s(e.animations),M=s(e.nodes);c.length>0&&(i.geometries=c),l.length>0&&(i.materials=l),o.length>0&&(i.textures=o),u.length>0&&(i.images=u),p.length>0&&(i.shapes=p),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),M.length>0&&(i.nodes=M)}return i.object=r,i;function s(c){const l=[];for(const o in c){const u=c[o];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}};Dt.DEFAULT_UP=new X(0,1,0),Dt.DEFAULT_MATRIX_AUTO_UPDATE=!0,Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;let Fi=class extends Dt{constructor(){super(),this.isGroup=!0,this.type="Group"}};const to={type:"move"};let wr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new X,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new X),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new X,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new X,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,a=null,s=null;const c=this._targetRay,l=this._grip,o=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(o&&e.hand){s=!0;for(const m of e.hand.values()){const E=t.getJointPose(m,i),_=this._getHandJoint(o,m);E!==null&&(_.matrix.fromArray(E.transform.matrix),_.matrix.decompose(_.position,_.rotation,_.scale),_.matrixWorldNeedsUpdate=!0,_.jointRadius=E.radius),_.visible=E!==null}const u=o.joints["index-finger-tip"],p=o.joints["thumb-tip"],f=u.position.distanceTo(p.position),d=.02,M=.005;o.inputState.pinching&&f>d+M?(o.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!o.inputState.pinching&&f<=d-M&&(o.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,i),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));c!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&a!==null&&(r=a),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,this.dispatchEvent(to)))}return c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),o!==null&&(o.visible=s!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Fi;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}};const Ss={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},yn={h:0,s:0,l:0},Oi={h:0,s:0,l:0};function Ar(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+6*(e-n)*t:t<.5?e:t<2/3?n+6*(e-n)*(2/3-t):n}let je=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=It){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(255&e)/255,Ze.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=Ze.workingColorSpace){return this.r=e,this.g=t,this.b=i,Ze.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=Ze.workingColorSpace){if(e=ta(e,1),t=qe(t,0,1),i=qe(i,0,1),t===0)this.r=this.g=this.b=i;else{const a=i<=.5?i*(1+t):i+t-i*t,s=2*i-a;this.r=Ar(s,a,e+1/3),this.g=Ar(s,a,e),this.b=Ar(s,a,e-1/3)}return Ze.colorSpaceToWorking(this,r),this}setStyle(e,t=It){function i(a){a!==void 0&&parseFloat(a)<1&&Oe("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const s=r[1],c=r[2];switch(s){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(c))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(c))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(c))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:Oe("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=r[1],s=a.length;if(s===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(s===6)return this.setHex(parseInt(a,16),t);Oe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=It){const i=Ss[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Oe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=gn(e.r),this.g=gn(e.g),this.b=gn(e.b),this}copyLinearToSRGB(e){return this.r=Zn(e.r),this.g=Zn(e.g),this.b=Zn(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=It){return Ze.workingToColorSpace(bt.copy(this),e),65536*Math.round(qe(255*bt.r,0,255))+256*Math.round(qe(255*bt.g,0,255))+Math.round(qe(255*bt.b,0,255))}getHexString(e=It){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ze.workingColorSpace){Ze.workingToColorSpace(bt.copy(this),t);const i=bt.r,r=bt.g,a=bt.b,s=Math.max(i,r,a),c=Math.min(i,r,a);let l,o;const u=(c+s)/2;if(c===s)l=0,o=0;else{const p=s-c;switch(o=u<=.5?p/(s+c):p/(2-s-c),s){case i:l=(r-a)/p+(r<a?6:0);break;case r:l=(a-i)/p+2;break;case a:l=(i-r)/p+4}l/=6}return e.h=l,e.s=o,e.l=u,e}getRGB(e,t=Ze.workingColorSpace){return Ze.workingToColorSpace(bt.copy(this),t),e.r=bt.r,e.g=bt.g,e.b=bt.b,e}getStyle(e=It){Ze.workingToColorSpace(bt.copy(this),e);const t=bt.r,i=bt.g,r=bt.b;return e!==It?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(255*t)},${Math.round(255*i)},${Math.round(255*r)})`}offsetHSL(e,t,i){return this.getHSL(yn),this.setHSL(yn.h+e,yn.s+t,yn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(yn),e.getHSL(Oi);const i=Ti(yn.h,Oi.h,t),r=Ti(yn.s,Oi.s,t),a=Ti(yn.l,Oi.l,t);return this.setHSL(i,r,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,a=e.elements;return this.r=a[0]*t+a[3]*i+a[6]*r,this.g=a[1]*t+a[4]*i+a[7]*r,this.b=a[2]*t+a[5]*i+a[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}};const bt=new je;je.NAMES=Ss;let no=class extends Dt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Jn,this.environmentIntensity=1,this.environmentRotation=new Jn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}};const Jt=new X,hn=new X,Rr=new X,pn=new X,zn=new X,Hn=new X,La=new X,Cr=new X,Pr=new X,Lr=new X,Ir=new ft,Dr=new ft,Ur=new ft;let jn=class Yn{constructor(e=new X,t=new X,i=new X){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Jt.subVectors(e,t),r.cross(Jt);const a=r.lengthSq();return a>0?r.multiplyScalar(1/Math.sqrt(a)):r.set(0,0,0)}static getBarycoord(e,t,i,r,a){Jt.subVectors(r,t),hn.subVectors(i,t),Rr.subVectors(e,t);const s=Jt.dot(Jt),c=Jt.dot(hn),l=Jt.dot(Rr),o=hn.dot(hn),u=hn.dot(Rr),p=s*o-c*c;if(p===0)return a.set(0,0,0),null;const f=1/p,d=(o*l-c*u)*f,M=(s*u-c*l)*f;return a.set(1-d-M,M,d)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,pn)!==null&&pn.x>=0&&pn.y>=0&&pn.x+pn.y<=1}static getInterpolation(e,t,i,r,a,s,c,l){return this.getBarycoord(e,t,i,r,pn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(a,pn.x),l.addScaledVector(s,pn.y),l.addScaledVector(c,pn.z),l)}static getInterpolatedAttribute(e,t,i,r,a,s){return Ir.setScalar(0),Dr.setScalar(0),Ur.setScalar(0),Ir.fromBufferAttribute(e,t),Dr.fromBufferAttribute(e,i),Ur.fromBufferAttribute(e,r),s.setScalar(0),s.addScaledVector(Ir,a.x),s.addScaledVector(Dr,a.y),s.addScaledVector(Ur,a.z),s}static isFrontFacing(e,t,i,r){return Jt.subVectors(i,t),hn.subVectors(e,t),Jt.cross(hn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Jt.subVectors(this.c,this.b),hn.subVectors(this.a,this.b),.5*Jt.cross(hn).length()}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,a){return Yn.getInterpolation(e,this.a,this.b,this.c,t,i,r,a)}containsPoint(e){return Yn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,a=this.c;let s,c;zn.subVectors(r,i),Hn.subVectors(a,i),Cr.subVectors(e,i);const l=zn.dot(Cr),o=Hn.dot(Cr);if(l<=0&&o<=0)return t.copy(i);Pr.subVectors(e,r);const u=zn.dot(Pr),p=Hn.dot(Pr);if(u>=0&&p<=u)return t.copy(r);const f=l*p-u*o;if(f<=0&&l>=0&&u<=0)return s=l/(l-u),t.copy(i).addScaledVector(zn,s);Lr.subVectors(e,a);const d=zn.dot(Lr),M=Hn.dot(Lr);if(M>=0&&d<=M)return t.copy(a);const m=d*o-l*M;if(m<=0&&o>=0&&M<=0)return c=o/(o-M),t.copy(i).addScaledVector(Hn,c);const E=u*M-d*p;if(E<=0&&p-u>=0&&d-M>=0)return La.subVectors(a,r),c=(p-u)/(p-u+(d-M)),t.copy(r).addScaledVector(La,c);const _=1/(E+m+f);return s=m*_,c=f*_,t.copy(i).addScaledVector(zn,s).addScaledVector(Hn,c)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},ii=class{constructor(e=new X(1/0,1/0,1/0),t=new X(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Qt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Qt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Qt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const a=i.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let s=0,c=a.count;s<c;s++)e.isMesh===!0?e.getVertexPosition(s,Qt):Qt.fromBufferAttribute(a,s),Qt.applyMatrix4(e.matrixWorld),this.expandByPoint(Qt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Bi.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Bi.copy(i.boundingBox)),Bi.applyMatrix4(e.matrixWorld),this.union(Bi)}const r=e.children;for(let a=0,s=r.length;a<s;a++)this.expandByObject(r[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Qt),Qt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(_i),zi.subVectors(this.max,_i),Vn.subVectors(e.a,_i),Gn.subVectors(e.b,_i),Wn.subVectors(e.c,_i),En.subVectors(Gn,Vn),bn.subVectors(Wn,Gn),An.subVectors(Vn,Wn);let t=[0,-En.z,En.y,0,-bn.z,bn.y,0,-An.z,An.y,En.z,0,-En.x,bn.z,0,-bn.x,An.z,0,-An.x,-En.y,En.x,0,-bn.y,bn.x,0,-An.y,An.x,0];return!!Nr(t,Vn,Gn,Wn,zi)&&(t=[1,0,0,0,1,0,0,0,1],!!Nr(t,Vn,Gn,Wn,zi)&&(Hi.crossVectors(En,bn),t=[Hi.x,Hi.y,Hi.z],Nr(t,Vn,Gn,Wn,zi)))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Qt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=.5*this.getSize(Qt).length()),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()||(fn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),fn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),fn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),fn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),fn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),fn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),fn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),fn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(fn)),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}};const fn=[new X,new X,new X,new X,new X,new X,new X,new X],Qt=new X,Bi=new ii,Vn=new X,Gn=new X,Wn=new X,En=new X,bn=new X,An=new X,_i=new X,zi=new X,Hi=new X,Rn=new X;function Nr(n,e,t,i,r){for(let a=0,s=n.length-3;a<=s;a+=3){Rn.fromArray(n,a);const c=r.x*Math.abs(Rn.x)+r.y*Math.abs(Rn.y)+r.z*Math.abs(Rn.z),l=e.dot(Rn),o=t.dot(Rn),u=i.dot(Rn);if(Math.max(-Math.max(l,o,u),Math.min(l,o,u))>c)return!1}return!0}io();function io(){const n=new ArrayBuffer(4),e=new Float32Array(n),t=new Uint32Array(n),i=new Uint32Array(512),r=new Uint32Array(512);for(let l=0;l<256;++l){const o=l-127;o<-27?(i[l]=0,i[256|l]=32768,r[l]=24,r[256|l]=24):o<-14?(i[l]=1024>>-o-14,i[256|l]=1024>>-o-14|32768,r[l]=-o-1,r[256|l]=-o-1):o<=15?(i[l]=o+15<<10,i[256|l]=o+15<<10|32768,r[l]=13,r[256|l]=13):o<128?(i[l]=31744,i[256|l]=64512,r[l]=24,r[256|l]=24):(i[l]=31744,i[256|l]=64512,r[l]=13,r[256|l]=13)}const a=new Uint32Array(2048),s=new Uint32Array(64),c=new Uint32Array(64);for(let l=1;l<1024;++l){let o=l<<13,u=0;for(;!(8388608&o);)o<<=1,u-=8388608;o&=-8388609,u+=947912704,a[l]=o|u}for(let l=1024;l<2048;++l)a[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)s[l]=l<<23;s[31]=1199570944,s[32]=2147483648;for(let l=33;l<63;++l)s[l]=2147483648+(l-32<<23);s[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(c[l]=1024);return{floatView:e,uint32View:t,baseTable:i,shiftTable:r,mantissaTable:a,exponentTable:s,offsetTable:c}}const mt=new X,Vi=new tt;let ro=0;class cn extends In{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ro++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,a=this.itemSize;r<a;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Vi.fromBufferAttribute(this,t),Vi.applyMatrix3(e),this.setXY(t,Vi.x,Vi.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix3(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix4(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)mt.fromBufferAttribute(this,t),mt.applyNormalMatrix(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)mt.fromBufferAttribute(this,t),mt.transformDirection(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=qn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=wt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=qn(t,this.array)),t}setX(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=qn(t,this.array)),t}setY(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=qn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=qn(t,this.array)),t}setW(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),i=wt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),i=wt(i,this.array),r=wt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,a){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),i=wt(i,this.array),r=wt(r,this.array),a=wt(a,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}let ys=class extends cn{constructor(e,t,i){super(new Uint16Array(e),t,i)}};class Es extends cn{constructor(e,t,i){super(new Uint32Array(e),t,i)}}let kt=class extends cn{constructor(e,t,i){super(new Float32Array(e),t,i)}};const ao=new ii,vi=new X,Fr=new X;class gr{constructor(e=new X,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):ao.setFromPoints(e).getCenter(i);let r=0;for(let a=0,s=e.length;a<s;a++)r=Math.max(r,i.distanceToSquared(e[a]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;vi.subVectors(e,this.center);const t=vi.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=.5*(i-this.radius);this.center.addScaledVector(vi,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Fr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(vi.copy(e.center).add(Fr)),this.expandByPoint(vi.copy(e.center).sub(Fr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let so=0;const Gt=new $e,Or=new Dt,kn=new X,Bt=new ii,xi=new ii,xt=new X;let _n=class bs extends In{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:so++}),this.uuid=ti(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new((function(t){for(let i=t.length-1;i>=0;--i)if(t[i]>=65535)return!0;return!1})(e)?Es:ys)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const a=new Ge().getNormalMatrix(e);i.applyNormalMatrix(a),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Gt.makeRotationFromQuaternion(e),this.applyMatrix4(Gt),this}rotateX(e){return Gt.makeRotationX(e),this.applyMatrix4(Gt),this}rotateY(e){return Gt.makeRotationY(e),this.applyMatrix4(Gt),this}rotateZ(e){return Gt.makeRotationZ(e),this.applyMatrix4(Gt),this}translate(e,t,i){return Gt.makeTranslation(e,t,i),this.applyMatrix4(Gt),this}scale(e,t,i){return Gt.makeScale(e,t,i),this.applyMatrix4(Gt),this}lookAt(e){return Or.lookAt(e),Or.updateMatrix(),this.applyMatrix4(Or.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(kn).negate(),this.translate(kn.x,kn.y,kn.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,a=e.length;r<a;r++){const s=e[r];i.push(s.x,s.y,s.z||0)}this.setAttribute("position",new kt(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const a=e[r];t.setXYZ(r,a.x,a.y,a.z||0)}e.length>t.count&&Oe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ii);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)return Je("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),void this.boundingBox.set(new X(-1/0,-1/0,-1/0),new X(1/0,1/0,1/0));if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const a=t[i];Bt.setFromBufferAttribute(a),this.morphTargetsRelative?(xt.addVectors(this.boundingBox.min,Bt.min),this.boundingBox.expandByPoint(xt),xt.addVectors(this.boundingBox.max,Bt.max),this.boundingBox.expandByPoint(xt)):(this.boundingBox.expandByPoint(Bt.min),this.boundingBox.expandByPoint(Bt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Je('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new gr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)return Je("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),void this.boundingSphere.set(new X,1/0);if(e){const i=this.boundingSphere.center;if(Bt.setFromBufferAttribute(e),t)for(let a=0,s=t.length;a<s;a++){const c=t[a];xi.setFromBufferAttribute(c),this.morphTargetsRelative?(xt.addVectors(Bt.min,xi.min),Bt.expandByPoint(xt),xt.addVectors(Bt.max,xi.max),Bt.expandByPoint(xt)):(Bt.expandByPoint(xi.min),Bt.expandByPoint(xi.max))}Bt.getCenter(i);let r=0;for(let a=0,s=e.count;a<s;a++)xt.fromBufferAttribute(e,a),r=Math.max(r,i.distanceToSquared(xt));if(t)for(let a=0,s=t.length;a<s;a++){const c=t[a],l=this.morphTargetsRelative;for(let o=0,u=c.count;o<u;o++)xt.fromBufferAttribute(c,o),l&&(kn.fromBufferAttribute(e,o),xt.add(kn)),r=Math.max(r,i.distanceToSquared(xt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Je('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0)return void Je("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");const i=t.position,r=t.normal,a=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new cn(new Float32Array(4*i.count),4));const s=this.getAttribute("tangent"),c=[],l=[];for(let W=0;W<i.count;W++)c[W]=new X,l[W]=new X;const o=new X,u=new X,p=new X,f=new tt,d=new tt,M=new tt,m=new X,E=new X;function _(W,L,O){o.fromBufferAttribute(i,W),u.fromBufferAttribute(i,L),p.fromBufferAttribute(i,O),f.fromBufferAttribute(a,W),d.fromBufferAttribute(a,L),M.fromBufferAttribute(a,O),u.sub(o),p.sub(o),d.sub(f),M.sub(f);const Q=1/(d.x*M.y-M.x*d.y);isFinite(Q)&&(m.copy(u).multiplyScalar(M.y).addScaledVector(p,-d.y).multiplyScalar(Q),E.copy(p).multiplyScalar(d.x).addScaledVector(u,-M.x).multiplyScalar(Q),c[W].add(m),c[L].add(m),c[O].add(m),l[W].add(E),l[L].add(E),l[O].add(E))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let W=0,L=v.length;W<L;++W){const O=v[W],Q=O.start;for(let z=Q,ne=Q+O.count;z<ne;z+=3)_(e.getX(z+0),e.getX(z+1),e.getX(z+2))}const C=new X,U=new X,P=new X,T=new X;function F(W){P.fromBufferAttribute(r,W),T.copy(P);const L=c[W];C.copy(L),C.sub(P.multiplyScalar(P.dot(L))).normalize(),U.crossVectors(T,L);const O=U.dot(l[W])<0?-1:1;s.setXYZW(W,C.x,C.y,C.z,O)}for(let W=0,L=v.length;W<L;++W){const O=v[W],Q=O.start;for(let z=Q,ne=Q+O.count;z<ne;z+=3)F(e.getX(z+0)),F(e.getX(z+1)),F(e.getX(z+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new cn(new Float32Array(3*t.count),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);const r=new X,a=new X,s=new X,c=new X,l=new X,o=new X,u=new X,p=new X;if(e)for(let f=0,d=e.count;f<d;f+=3){const M=e.getX(f+0),m=e.getX(f+1),E=e.getX(f+2);r.fromBufferAttribute(t,M),a.fromBufferAttribute(t,m),s.fromBufferAttribute(t,E),u.subVectors(s,a),p.subVectors(r,a),u.cross(p),c.fromBufferAttribute(i,M),l.fromBufferAttribute(i,m),o.fromBufferAttribute(i,E),c.add(u),l.add(u),o.add(u),i.setXYZ(M,c.x,c.y,c.z),i.setXYZ(m,l.x,l.y,l.z),i.setXYZ(E,o.x,o.y,o.z)}else for(let f=0,d=t.count;f<d;f+=3)r.fromBufferAttribute(t,f+0),a.fromBufferAttribute(t,f+1),s.fromBufferAttribute(t,f+2),u.subVectors(s,a),p.subVectors(r,a),u.cross(p),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)xt.fromBufferAttribute(e,t),xt.normalize(),e.setXYZ(t,xt.x,xt.y,xt.z)}toNonIndexed(){function e(c,l){const o=c.array,u=c.itemSize,p=c.normalized,f=new o.constructor(l.length*u);let d=0,M=0;for(let m=0,E=l.length;m<E;m++){d=c.isInterleavedBufferAttribute?l[m]*c.data.stride+c.offset:l[m]*u;for(let _=0;_<u;_++)f[M++]=o[d++]}return new cn(f,u,p)}if(this.index===null)return Oe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new bs,i=this.index.array,r=this.attributes;for(const c in r){const l=e(r[c],i);t.setAttribute(c,l)}const a=this.morphAttributes;for(const c in a){const l=[],o=a[c];for(let u=0,p=o.length;u<p;u++){const f=e(o[u],i);l.push(f)}t.morphAttributes[c]=l}t.morphTargetsRelative=this.morphTargetsRelative;const s=this.groups;for(let c=0,l=s.length;c<l;c++){const o=s[c];t.addGroup(o.start,o.count,o.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const o in l)l[o]!==void 0&&(e[o]=l[o]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const o=i[l];e.data.attributes[l]=o.toJSON(e.data)}const r={};let a=!1;for(const l in this.morphAttributes){const o=this.morphAttributes[l],u=[];for(let p=0,f=o.length;p<f;p++){const d=o[p];u.push(d.toJSON(e.data))}u.length>0&&(r[l]=u,a=!0)}a&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const s=this.groups;s.length>0&&(e.data.groups=JSON.parse(JSON.stringify(s)));const c=this.boundingSphere;return c!==null&&(e.data.boundingSphere=c.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const o in r){const u=r[o];this.setAttribute(o,u.clone(t))}const a=e.morphAttributes;for(const o in a){const u=[],p=a[o];for(let f=0,d=p.length;f<d;f++)u.push(p[f].clone(t));this.morphAttributes[o]=u}this.morphTargetsRelative=e.morphTargetsRelative;const s=e.groups;for(let o=0,u=s.length;o<u;o++){const p=s[o];this.addGroup(p.start,p.count,p.materialIndex)}const c=e.boundingBox;c!==null&&(this.boundingBox=c.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},oo=0,ri=class extends In{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:oo++}),this.uuid=ti(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Oe(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];r!==void 0?r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i:Oe(`Material: '${t}' is not a property of THREE.${this.type}.`)}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};function r(a){const s=[];for(const c in a){const l=a[c];delete l.metadata,s.push(l)}return s}if(i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(i.blending=this.blending),this.side!==0&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==204&&(i.blendSrc=this.blendSrc),this.blendDst!==205&&(i.blendDst=this.blendDst),this.blendEquation!==100&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(i.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData),t){const a=r(e.textures),s=r(e.images);a.length>0&&(i.textures=a),s.length>0&&(i.images=s)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let a=0;a!==r;++a)i[a]=t[a].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};new $e;const mn=new X,Br=new X,Gi=new X,Tn=new X,zr=new X,Wi=new X,Hr=new X;class oa{constructor(e=new X,t=new X(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,mn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=mn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(mn.copy(this.origin).addScaledVector(this.direction,t),mn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Br.copy(e).add(t).multiplyScalar(.5),Gi.copy(t).sub(e).normalize(),Tn.copy(this.origin).sub(Br);const a=.5*e.distanceTo(t),s=-this.direction.dot(Gi),c=Tn.dot(this.direction),l=-Tn.dot(Gi),o=Tn.lengthSq(),u=Math.abs(1-s*s);let p,f,d,M;if(u>0)if(p=s*l-c,f=s*c-l,M=a*u,p>=0)if(f>=-M)if(f<=M){const m=1/u;p*=m,f*=m,d=p*(p+s*f+2*c)+f*(s*p+f+2*l)+o}else f=a,p=Math.max(0,-(s*f+c)),d=-p*p+f*(f+2*l)+o;else f=-a,p=Math.max(0,-(s*f+c)),d=-p*p+f*(f+2*l)+o;else f<=-M?(p=Math.max(0,-(-s*a+c)),f=p>0?-a:Math.min(Math.max(-a,-l),a),d=-p*p+f*(f+2*l)+o):f<=M?(p=0,f=Math.min(Math.max(-a,-l),a),d=f*(f+2*l)+o):(p=Math.max(0,-(s*a+c)),f=p>0?a:Math.min(Math.max(-a,-l),a),d=-p*p+f*(f+2*l)+o);else f=s>0?-a:a,p=Math.max(0,-(s*f+c)),d=-p*p+f*(f+2*l)+o;return i&&i.copy(this.origin).addScaledVector(this.direction,p),r&&r.copy(Br).addScaledVector(Gi,f),d}intersectSphere(e,t){mn.subVectors(e.center,this.origin);const i=mn.dot(this.direction),r=mn.dot(mn)-i*i,a=e.radius*e.radius;if(r>a)return null;const s=Math.sqrt(a-r),c=i-s,l=i+s;return l<0?null:c<0?this.at(l,t):this.at(c,t)}intersectsSphere(e){return!(e.radius<0)&&this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0?!0:e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,a,s,c,l;const o=1/this.direction.x,u=1/this.direction.y,p=1/this.direction.z,f=this.origin;return o>=0?(i=(e.min.x-f.x)*o,r=(e.max.x-f.x)*o):(i=(e.max.x-f.x)*o,r=(e.min.x-f.x)*o),u>=0?(a=(e.min.y-f.y)*u,s=(e.max.y-f.y)*u):(a=(e.max.y-f.y)*u,s=(e.min.y-f.y)*u),i>s||a>r?null:((a>i||isNaN(i))&&(i=a),(s<r||isNaN(r))&&(r=s),p>=0?(c=(e.min.z-f.z)*p,l=(e.max.z-f.z)*p):(c=(e.max.z-f.z)*p,l=(e.min.z-f.z)*p),i>l||c>r?null:((c>i||i!=i)&&(i=c),(l<r||r!=r)&&(r=l),r<0?null:this.at(i>=0?i:r,t)))}intersectsBox(e){return this.intersectBox(e,mn)!==null}intersectTriangle(e,t,i,r,a){zr.subVectors(t,e),Wi.subVectors(i,e),Hr.crossVectors(zr,Wi);let s,c=this.direction.dot(Hr);if(c>0){if(r)return null;s=1}else{if(!(c<0))return null;s=-1,c=-c}Tn.subVectors(this.origin,e);const l=s*this.direction.dot(Wi.crossVectors(Tn,Wi));if(l<0)return null;const o=s*this.direction.dot(zr.cross(Tn));if(o<0||l+o>c)return null;const u=-s*Tn.dot(Hr);return u<0?null:this.at(u/c,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}let la=class extends ri{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Jn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};const Ia=new $e,Cn=new oa,ki=new gr,Da=new X,$i=new X,Xi=new X,qi=new X,Vr=new X,ji=new X,Ua=new X,Yi=new X;let $t=class extends Dt{constructor(e=new _n,t=new la){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){const i=e[t[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const s=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[s]=r}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,a=i.morphAttributes.position,s=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const c=this.morphTargetInfluences;if(a&&c){ji.set(0,0,0);for(let l=0,o=a.length;l<o;l++){const u=c[l],p=a[l];u!==0&&(Vr.fromBufferAttribute(p,e),s?ji.addScaledVector(Vr,u):ji.addScaledVector(Vr.sub(t),u))}t.add(ji)}return t}raycast(e,t){const i=this.geometry,r=this.material,a=this.matrixWorld;if(r!==void 0){if(i.boundingSphere===null&&i.computeBoundingSphere(),ki.copy(i.boundingSphere),ki.applyMatrix4(a),Cn.copy(e.ray).recast(e.near),ki.containsPoint(Cn.origin)===!1&&(Cn.intersectSphere(ki,Da)===null||Cn.origin.distanceToSquared(Da)>(e.far-e.near)**2))return;Ia.copy(a).invert(),Cn.copy(e.ray).applyMatrix4(Ia),i.boundingBox!==null&&Cn.intersectsBox(i.boundingBox)===!1||this._computeIntersections(e,t,Cn)}}_computeIntersections(e,t,i){let r;const a=this.geometry,s=this.material,c=a.index,l=a.attributes.position,o=a.attributes.uv,u=a.attributes.uv1,p=a.attributes.normal,f=a.groups,d=a.drawRange;if(c!==null)if(Array.isArray(s))for(let M=0,m=f.length;M<m;M++){const E=f[M],_=s[E.materialIndex];for(let v=Math.max(E.start,d.start),C=Math.min(c.count,Math.min(E.start+E.count,d.start+d.count));v<C;v+=3)r=Ki(this,_,e,i,o,u,p,c.getX(v),c.getX(v+1),c.getX(v+2)),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=E.materialIndex,t.push(r))}else for(let M=Math.max(0,d.start),m=Math.min(c.count,d.start+d.count);M<m;M+=3)r=Ki(this,s,e,i,o,u,p,c.getX(M),c.getX(M+1),c.getX(M+2)),r&&(r.faceIndex=Math.floor(M/3),t.push(r));else if(l!==void 0)if(Array.isArray(s))for(let M=0,m=f.length;M<m;M++){const E=f[M],_=s[E.materialIndex];for(let v=Math.max(E.start,d.start),C=Math.min(l.count,Math.min(E.start+E.count,d.start+d.count));v<C;v+=3)r=Ki(this,_,e,i,o,u,p,v,v+1,v+2),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=E.materialIndex,t.push(r))}else for(let M=Math.max(0,d.start),m=Math.min(l.count,d.start+d.count);M<m;M+=3)r=Ki(this,s,e,i,o,u,p,M,M+1,M+2),r&&(r.faceIndex=Math.floor(M/3),t.push(r))}};function Ki(n,e,t,i,r,a,s,c,l,o){n.getVertexPosition(c,$i),n.getVertexPosition(l,Xi),n.getVertexPosition(o,qi);const u=(function(p,f,d,M,m,E,_,v){let C;if(C=f.side===1?M.intersectTriangle(_,E,m,!0,v):M.intersectTriangle(m,E,_,f.side===0,v),C===null)return null;Yi.copy(v),Yi.applyMatrix4(p.matrixWorld);const U=d.ray.origin.distanceTo(Yi);return U<d.near||U>d.far?null:{distance:U,point:Yi.clone(),object:p}})(n,e,t,i,$i,Xi,qi,Ua);if(u){const p=new X;jn.getBarycoord(Ua,$i,Xi,qi,p),r&&(u.uv=jn.getInterpolatedAttribute(r,c,l,o,p,new tt)),a&&(u.uv1=jn.getInterpolatedAttribute(a,c,l,o,p,new tt)),s&&(u.normal=jn.getInterpolatedAttribute(s,c,l,o,p,new X),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const f={a:c,b:l,c:o,normal:new X,materialIndex:0};jn.getNormal($i,Xi,qi,f.normal),u.face=f,u.barycoord=p}return u}new $e;new $e;class lo extends Tt{constructor(e=null,t=1,i=1,r,a,s,c,l,o=1003,u=1003,p,f){super(null,s,c,l,o,u,r,a,p,f),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}new $e;new $e;new $e;new $e;new $e;new $t;const Gr=new X,co=new X,uo=new Ge;class Ln{constructor(e=new X(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Gr.subVectors(i,t).cross(co.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const r=e.delta(Gr),a=this.normal.dot(r);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/a;return i===!0&&(s<0||s>1)?null:t.copy(e.start).addScaledVector(r,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||uo.getNormalMatrix(e),r=this.coplanarPoint(Gr).applyMatrix4(e),a=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Pn=new gr,ho=new tt(.5,.5),Zi=new X;class ca{constructor(e=new Ln,t=new Ln,i=new Ln,r=new Ln,a=new Ln,s=new Ln){this.planes=[e,t,i,r,a,s]}set(e,t,i,r,a,s){const c=this.planes;return c[0].copy(e),c[1].copy(t),c[2].copy(i),c[3].copy(r),c[4].copy(a),c[5].copy(s),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=2e3,i=!1){const r=this.planes,a=e.elements,s=a[0],c=a[1],l=a[2],o=a[3],u=a[4],p=a[5],f=a[6],d=a[7],M=a[8],m=a[9],E=a[10],_=a[11],v=a[12],C=a[13],U=a[14],P=a[15];if(r[0].setComponents(o-s,d-u,_-M,P-v).normalize(),r[1].setComponents(o+s,d+u,_+M,P+v).normalize(),r[2].setComponents(o+c,d+p,_+m,P+C).normalize(),r[3].setComponents(o-c,d-p,_-m,P-C).normalize(),i)r[4].setComponents(l,f,E,U).normalize(),r[5].setComponents(o-l,d-f,_-E,P-U).normalize();else if(r[4].setComponents(o-l,d-f,_-E,P-U).normalize(),t===2e3)r[5].setComponents(o+l,d+f,_+E,P+U).normalize();else{if(t!==2001)throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);r[5].setComponents(l,f,E,U).normalize()}return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Pn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Pn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Pn)}intersectsSprite(e){Pn.center.set(0,0,0);const t=ho.distanceTo(e.center);return Pn.radius=.7071067811865476+t,Pn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Pn)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(Zi.x=r.normal.x>0?e.max.x:e.min.x,Zi.y=r.normal.y>0?e.max.y:e.min.y,Zi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Zi)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}new $e;new $e;new je(1,1,1);new $t;class Ts extends ri{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new je(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const hr=new X,pr=new X,Na=new $e,Mi=new oa,Ji=new gr,Wr=new X,Fa=new X;class po extends Dt{constructor(e=new _n,t=new Ts){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let r=1,a=t.count;r<a;r++)hr.fromBufferAttribute(t,r-1),pr.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=hr.distanceTo(pr);e.setAttribute("lineDistance",new kt(i,1))}else Oe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,r=this.matrixWorld,a=e.params.Line.threshold,s=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ji.copy(i.boundingSphere),Ji.applyMatrix4(r),Ji.radius+=a,e.ray.intersectsSphere(Ji)===!1)return;Na.copy(r).invert(),Mi.copy(e.ray).applyMatrix4(Na);const c=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=c*c,o=this.isLineSegments?2:1,u=i.index,p=i.attributes.position;if(u!==null){const f=Math.max(0,s.start),d=Math.min(u.count,s.start+s.count);for(let M=f,m=d-1;M<m;M+=o){const E=u.getX(M),_=u.getX(M+1),v=Qi(this,e,Mi,l,E,_,M);v&&t.push(v)}if(this.isLineLoop){const M=u.getX(d-1),m=u.getX(f),E=Qi(this,e,Mi,l,M,m,d-1);E&&t.push(E)}}else{const f=Math.max(0,s.start),d=Math.min(p.count,s.start+s.count);for(let M=f,m=d-1;M<m;M+=o){const E=Qi(this,e,Mi,l,M,M+1,M);E&&t.push(E)}if(this.isLineLoop){const M=Qi(this,e,Mi,l,d-1,f,d-1);M&&t.push(M)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){const i=e[t[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const s=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[s]=r}}}}}function Qi(n,e,t,i,r,a,s){const c=n.geometry.attributes.position;if(hr.fromBufferAttribute(c,r),pr.fromBufferAttribute(c,a),t.distanceSqToSegment(hr,pr,Wr,Fa)>i)return;Wr.applyMatrix4(n.matrixWorld);const l=e.ray.origin.distanceTo(Wr);return l<e.near||l>e.far?void 0:{distance:l,point:Fa.clone().applyMatrix4(n.matrixWorld),index:s,face:null,faceIndex:null,barycoord:null,object:n}}const Oa=new X,Ba=new X;class fo extends po{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let r=0,a=t.count;r<a;r+=2)Oa.fromBufferAttribute(t,r),Ba.fromBufferAttribute(t,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+Oa.distanceTo(Ba);e.setAttribute("lineDistance",new kt(i,1))}else Oe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}new $e;class ws extends Tt{constructor(e=[],t=301,i,r,a,s,c,l,o,u){super(e,t,i,r,a,s,c,l,o,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class mo extends Tt{constructor(e,t,i,r,a,s,c,l,o){super(e,t,i,r,a,s,c,l,o),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Qn extends Tt{constructor(e,t,i=1014,r,a,s,c=1003,l=1003,o,u=1026,p=1){if(u!==1026&&u!==1027)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super({width:e,height:t,depth:p},r,a,s,c,l,u,i,o),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new aa(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class go extends Qn{constructor(e,t=1014,i=301,r,a,s=1003,c=1003,l,o=1026){const u={width:e,height:e,depth:1},p=[u,u,u,u,u,u];super(e,e,t,i,r,a,s,c,l,o),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class As extends Tt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ai extends _n{constructor(e=1,t=1,i=1,r=1,a=1,s=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:a,depthSegments:s};const c=this;r=Math.floor(r),a=Math.floor(a),s=Math.floor(s);const l=[],o=[],u=[],p=[];let f=0,d=0;function M(m,E,_,v,C,U,P,T,F,W,L){const O=U/F,Q=P/W,z=U/2,ne=P/2,R=T/2,H=F+1,J=W+1;let j=0,pe=0;const ge=new X;for(let Le=0;Le<J;Le++){const Ae=Le*Q-ne;for(let Te=0;Te<H;Te++){const oe=Te*O-z;ge[m]=oe*v,ge[E]=Ae*C,ge[_]=R,o.push(ge.x,ge.y,ge.z),ge[m]=0,ge[E]=0,ge[_]=T>0?1:-1,u.push(ge.x,ge.y,ge.z),p.push(Te/F),p.push(1-Le/W),j+=1}}for(let Le=0;Le<W;Le++)for(let Ae=0;Ae<F;Ae++){const Te=f+Ae+H*Le,oe=f+Ae+H*(Le+1),ue=f+(Ae+1)+H*(Le+1),B=f+(Ae+1)+H*Le;l.push(Te,oe,B),l.push(oe,ue,B),pe+=6}c.addGroup(d,pe,L),d+=pe,f+=j}M("z","y","x",-1,-1,i,t,e,s,a,0),M("z","y","x",1,-1,i,t,-e,s,a,1),M("x","z","y",1,1,e,i,t,r,s,2),M("x","z","y",1,-1,e,i,-t,r,s,3),M("x","y","z",1,-1,e,t,i,r,a,4),M("x","y","z",-1,-1,e,t,-i,r,a,5),this.setIndex(l),this.setAttribute("position",new kt(o,3)),this.setAttribute("normal",new kt(u,3)),this.setAttribute("uv",new kt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ai(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}const er=new X,tr=new X,kr=new X,nr=new jn;class _o extends _n{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){const r=Math.pow(10,4),a=Math.cos(Kn*t),s=e.getIndex(),c=e.getAttribute("position"),l=s?s.count:c.count,o=[0,0,0],u=["a","b","c"],p=new Array(3),f={},d=[];for(let M=0;M<l;M+=3){s?(o[0]=s.getX(M),o[1]=s.getX(M+1),o[2]=s.getX(M+2)):(o[0]=M,o[1]=M+1,o[2]=M+2);const{a:m,b:E,c:_}=nr;if(m.fromBufferAttribute(c,o[0]),E.fromBufferAttribute(c,o[1]),_.fromBufferAttribute(c,o[2]),nr.getNormal(kr),p[0]=`${Math.round(m.x*r)},${Math.round(m.y*r)},${Math.round(m.z*r)}`,p[1]=`${Math.round(E.x*r)},${Math.round(E.y*r)},${Math.round(E.z*r)}`,p[2]=`${Math.round(_.x*r)},${Math.round(_.y*r)},${Math.round(_.z*r)}`,p[0]!==p[1]&&p[1]!==p[2]&&p[2]!==p[0])for(let v=0;v<3;v++){const C=(v+1)%3,U=p[v],P=p[C],T=nr[u[v]],F=nr[u[C]],W=`${U}_${P}`,L=`${P}_${U}`;L in f&&f[L]?(kr.dot(f[L].normal)<=a&&(d.push(T.x,T.y,T.z),d.push(F.x,F.y,F.z)),f[L]=null):W in f||(f[W]={index0:o[v],index1:o[C],normal:kr.clone()})}}for(const M in f)if(f[M]){const{index0:m,index1:E}=f[M];er.fromBufferAttribute(c,m),tr.fromBufferAttribute(c,E),d.push(er.x,er.y,er.z),d.push(tr.x,tr.y,tr.z)}this.setAttribute("position",new kt(d,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}class _r extends _n{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const a=e/2,s=t/2,c=Math.floor(i),l=Math.floor(r),o=c+1,u=l+1,p=e/c,f=t/l,d=[],M=[],m=[],E=[];for(let _=0;_<u;_++){const v=_*f-s;for(let C=0;C<o;C++){const U=C*p-a;M.push(U,-v,0),m.push(0,0,1),E.push(C/c),E.push(1-_/l)}}for(let _=0;_<l;_++)for(let v=0;v<c;v++){const C=v+o*_,U=v+o*(_+1),P=v+1+o*(_+1),T=v+1+o*_;d.push(C,U,T),d.push(U,P,T)}this.setIndex(d),this.setAttribute("position",new kt(M,3)),this.setAttribute("normal",new kt(m,3)),this.setAttribute("uv",new kt(E,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new _r(e.width,e.height,e.widthSegments,e.heightSegments)}}function ei(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];if(za(r))r.isRenderTargetTexture?(Oe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone();else if(Array.isArray(r))if(za(r[0])){const a=[];for(let s=0,c=r.length;s<c;s++)a[s]=r[s].clone();e[t][i]=a}else e[t][i]=r.slice();else e[t][i]=r}}return e}function At(n){const e={};for(let t=0;t<n.length;t++){const i=ei(n[t]);for(const r in i)e[r]=i[r]}return e}function za(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function Rs(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ze.workingColorSpace}const vo={clone:ei,merge:At};class un extends ri{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,this.fragmentShader=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ei(e.uniforms),this.uniformsGroups=(function(t){const i=[];for(let r=0;r<t.length;r++)i.push(t[r].clone());return i})(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class xo extends un{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class $r extends ri{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new je(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new je(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new tt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Jn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Mo extends ri{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class So extends ri{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Cs extends Dt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new je(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class yo extends Cs{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new je(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Xr=new $e,Ha=new X,Va=new X;class Eo{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new tt(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new $e,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ca,this._frameExtents=new tt(1,1),this._viewportCount=1,this._viewports=[new ft(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Ha.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ha),Va.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Va),t.updateMatrixWorld(),Xr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Xr,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Xr)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),this.mapSize.x===512&&this.mapSize.y===512||(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const ir=new X,rr=new ni,an=new X;class ua extends Dt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new $e,this.projectionMatrix=new $e,this.projectionMatrixInverse=new $e,this.coordinateSystem=2e3,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(ir,rr,an),an.x===1&&an.y===1&&an.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ir,rr,an.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(ir,rr,an),an.x===1&&an.y===1&&an.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ir,rr,an.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const wn=new X,Ga=new tt,Wa=new tt;class Wt extends ua{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=2*wi*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(.5*Kn*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return 2*wi*Math.atan(Math.tan(.5*Kn*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){wn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(wn.x,wn.y).multiplyScalar(-e/wn.z),wn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(wn.x,wn.y).multiplyScalar(-e/wn.z)}getViewSize(e,t){return this.getViewBounds(e,Ga,Wa),t.subVectors(Wa,Ga)}setViewOffset(e,t,i,r,a,s){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=a,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(.5*Kn*this.fov)/this.zoom,i=2*t,r=this.aspect*i,a=-.5*r;const s=this.view;if(this.view!==null&&this.view.enabled){const l=s.fullWidth,o=s.fullHeight;a+=s.offsetX*r/l,t-=s.offsetY*i/o,r*=s.width/l,i*=s.height/o}const c=this.filmOffset;c!==0&&(a+=e*c/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class da extends ua{constructor(e=-1,t=1,i=1,r=-1,a=.1,s=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=a,this.far=s,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,a,s){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=a,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let a=i-e,s=i+e,c=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const o=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=o*this.view.offsetX,s=a+o*this.view.width,c-=u*this.view.offsetY,l=c-u*this.view.height}this.projectionMatrix.makeOrthographic(a,s,c,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class bo extends Eo{constructor(){super(new da(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class ka extends Cs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.target=new Dt,this.shadow=new bo}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}new $e;new $e;new $e;const $n=-90;class To extends Dt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Wt($n,1,e,t);r.layers=this.layers,this.add(r);const a=new Wt($n,1,e,t);a.layers=this.layers,this.add(a);const s=new Wt($n,1,e,t);s.layers=this.layers,this.add(s);const c=new Wt($n,1,e,t);c.layers=this.layers,this.add(c);const l=new Wt($n,1,e,t);l.layers=this.layers,this.add(l);const o=new Wt($n,1,e,t);o.layers=this.layers,this.add(o)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,a,s,c,l]=t;for(const o of t)this.remove(o);if(e===2e3)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),s.up.set(0,0,1),s.lookAt(0,-1,0),c.up.set(0,1,0),c.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else{if(e!==2001)throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),s.up.set(0,0,-1),s.lookAt(0,-1,0),c.up.set(0,-1,0),c.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1)}for(const o of t)this.add(o),o.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,s,c,l,o,u]=this.children,p=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),M=e.xr.enabled;e.xr.enabled=!1;const m=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let E=!1;E=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(i,0,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,1,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(i,2,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(i,3,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),i.texture.generateMipmaps=m,e.setRenderTarget(i,5,r),E&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(p,f,d),e.xr.enabled=M,i.texture.needsPMREMUpdate=!0}}class wo extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Ps="\\[\\]\\.:\\/",qr="[^"+Ps+"]",Ao="[^"+Ps.replace("\\.","")+"]";new RegExp("^"+/((?:WC+[\/:])*)/.source.replace("WC",qr)+/(WCOD+)?/.source.replace("WCOD",Ao)+/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",qr)+/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",qr)+"$");const $a=new $e;class Ro{constructor(e,t,i=0,r=1/0){this.ray=new oa(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new sa,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Je("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return $a.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4($a),this}intersectObject(e,t=!0,i=[]){return na(e,this,i,t),i.sort(Xa),i}intersectObjects(e,t=!0,i=[]){for(let r=0,a=e.length;r<a;r++)na(e[r],this,i,t);return i.sort(Xa),i}}function Xa(n,e){return n.distance-e.distance}function na(n,e,t,i){let r=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(r=!1),r===!0&&i===!0){const a=n.children;for(let s=0,c=a.length;s<c;s++)na(a[s],e,t,!0)}}const ga=class ga{constructor(e,t,i,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,r){const a=this.elements;return a[0]=e,a[2]=t,a[1]=i,a[3]=r,this}};ga.prototype.isMatrix2=!0;let qa=ga;new $e;new $e;new je;new je;new ua;function ja(n,e,t,i){const r=(function(a){switch(a){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${a}.`)})(i);switch(t){case 1021:return n*e;case 1028:case 1029:return n*e/r.components*r.byteLength;case 1030:case 1031:return n*e*2/r.components*r.byteLength;case 1022:return n*e*3/r.components*r.byteLength;case 1023:case 1033:return n*e*4/r.components*r.byteLength;case 33776:case 33777:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case 33778:case 33779:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case 35841:case 35843:return Math.max(n,16)*Math.max(e,8)/4;case 35840:case 35842:return Math.max(n,8)*Math.max(e,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case 37496:case 37490:case 37491:case 37808:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case 37809:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case 37810:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case 37811:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case 37812:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case 37813:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case 37814:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case 37815:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case 37816:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case 37817:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case 37818:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case 37819:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case 37820:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case 37821:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(n/4)*Math.ceil(e/4)*16;case 36283:case 36284:return Math.ceil(n/4)*Math.ceil(e/4)*8;case 36285:case 36286:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"184"}})),typeof window<"u"&&(window.__THREE__?Oe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="184");/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Ls(){let n=null,e=!1,t=null,i=null;function r(a,s){t(a,s),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){n=a}}}function Co(n){const e=new WeakMap;return{get:function(t){return t.isInterleavedBufferAttribute&&(t=t.data),e.get(t)},remove:function(t){t.isInterleavedBufferAttribute&&(t=t.data);const i=e.get(t);i&&(n.deleteBuffer(i.buffer),e.delete(t))},update:function(t,i){if(t.isInterleavedBufferAttribute&&(t=t.data),t.isGLBufferAttribute){const a=e.get(t);return void((!a||a.version<t.version)&&e.set(t,{buffer:t.buffer,type:t.type,bytesPerElement:t.elementSize,version:t.version}))}const r=e.get(t);if(r===void 0)e.set(t,(function(a,s){const c=a.array,l=a.usage,o=c.byteLength,u=n.createBuffer();let p;if(n.bindBuffer(s,u),n.bufferData(s,c,l),a.onUploadCallback(),c instanceof Float32Array)p=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=n.HALF_FLOAT;else if(c instanceof Uint16Array)p=a.isFloat16BufferAttribute?n.HALF_FLOAT:n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else{if(!(c instanceof Uint8ClampedArray))throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);p=n.UNSIGNED_BYTE}return{buffer:u,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:o}})(t,i));else if(r.version<t.version){if(r.size!==t.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");(function(a,s,c){const l=s.array,o=s.updateRanges;if(n.bindBuffer(c,a),o.length===0)n.bufferSubData(c,0,l);else{o.sort((p,f)=>p.start-f.start);let u=0;for(let p=1;p<o.length;p++){const f=o[u],d=o[p];d.start<=f.start+f.count+1?f.count=Math.max(f.count,d.start+d.count-f.start):(++u,o[u]=d)}o.length=u+1;for(let p=0,f=o.length;p<f;p++){const d=o[p];n.bufferSubData(c,d.start*l.BYTES_PER_ELEMENT,l,d.start,d.count)}s.clearUpdateRanges()}s.onUploadCallback()})(r.buffer,t,i),r.version=t.version}}}}const ke={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:"gl_FragColor = linearToOutputTexel( gl_FragColor );",colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},_e={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new tt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new X},probesMax:{value:new X},probesResolution:{value:new X}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new tt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},on={basic:{uniforms:At([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.fog]),vertexShader:ke.meshbasic_vert,fragmentShader:ke.meshbasic_frag},lambert:{uniforms:At([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new je(0)},envMapIntensity:{value:1}}]),vertexShader:ke.meshlambert_vert,fragmentShader:ke.meshlambert_frag},phong:{uniforms:At([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ke.meshphong_vert,fragmentShader:ke.meshphong_frag},standard:{uniforms:At([_e.common,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.roughnessmap,_e.metalnessmap,_e.fog,_e.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag},toon:{uniforms:At([_e.common,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.gradientmap,_e.fog,_e.lights,{emissive:{value:new je(0)}}]),vertexShader:ke.meshtoon_vert,fragmentShader:ke.meshtoon_frag},matcap:{uniforms:At([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,{matcap:{value:null}}]),vertexShader:ke.meshmatcap_vert,fragmentShader:ke.meshmatcap_frag},points:{uniforms:At([_e.points,_e.fog]),vertexShader:ke.points_vert,fragmentShader:ke.points_frag},dashed:{uniforms:At([_e.common,_e.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ke.linedashed_vert,fragmentShader:ke.linedashed_frag},depth:{uniforms:At([_e.common,_e.displacementmap]),vertexShader:ke.depth_vert,fragmentShader:ke.depth_frag},normal:{uniforms:At([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,{opacity:{value:1}}]),vertexShader:ke.meshnormal_vert,fragmentShader:ke.meshnormal_frag},sprite:{uniforms:At([_e.sprite,_e.fog]),vertexShader:ke.sprite_vert,fragmentShader:ke.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ke.background_vert,fragmentShader:ke.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:ke.backgroundCube_vert,fragmentShader:ke.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ke.cube_vert,fragmentShader:ke.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ke.equirect_vert,fragmentShader:ke.equirect_frag},distance:{uniforms:At([_e.common,_e.displacementmap,{referencePosition:{value:new X},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ke.distance_vert,fragmentShader:ke.distance_frag},shadow:{uniforms:At([_e.lights,_e.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:ke.shadow_vert,fragmentShader:ke.shadow_frag}};on.physical={uniforms:At([on.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new tt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new tt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new tt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag};const ar={r:0,b:0,g:0},Po=new $e,Is=new Ge;function Lo(n,e,t,i,r,a){const s=new je(0);let c,l,o=r===!0?0:1,u=null,p=0,f=null;function d(m){let E=m.isScene===!0?m.background:null;if(E&&E.isTexture){const _=m.backgroundBlurriness>0;E=e.get(E,_)}return E}function M(m,E){m.getRGB(ar,Rs(n)),t.buffers.color.setClear(ar.r,ar.g,ar.b,E,a)}return{getClearColor:function(){return s},setClearColor:function(m,E=1){s.set(m),o=E,M(s,o)},getClearAlpha:function(){return o},setClearAlpha:function(m){o=m,M(s,o)},render:function(m){let E=!1;const _=d(m);_===null?M(s,o):_&&_.isColor&&(M(_,1),E=!0);const v=n.xr.getEnvironmentBlendMode();v==="additive"?t.buffers.color.setClear(0,0,0,1,a):v==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(n.autoClear||E)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))},addToRenderList:function(m,E){const _=d(E);_&&(_.isCubeTexture||_.mapping===306)?(l===void 0&&(l=new $t(new ai(1,1,1),new un({name:"BackgroundCubeMaterial",uniforms:ei(on.backgroundCube.uniforms),vertexShader:on.backgroundCube.vertexShader,fragmentShader:on.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(v,C,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(l)),l.material.uniforms.envMap.value=_,l.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Po.makeRotationFromEuler(E.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Is),l.material.toneMapped=Ze.getTransfer(_.colorSpace)!==it,u===_&&p===_.version&&f===n.toneMapping||(l.material.needsUpdate=!0,u=_,p=_.version,f=n.toneMapping),l.layers.enableAll(),m.unshift(l,l.geometry,l.material,0,0,null)):_&&_.isTexture&&(c===void 0&&(c=new $t(new _r(2,2),new un({name:"BackgroundMaterial",uniforms:ei(on.background.uniforms),vertexShader:on.background.vertexShader,fragmentShader:on.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=_,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.toneMapped=Ze.getTransfer(_.colorSpace)!==it,_.matrixAutoUpdate===!0&&_.updateMatrix(),c.material.uniforms.uvTransform.value.copy(_.matrix),u===_&&p===_.version&&f===n.toneMapping||(c.material.needsUpdate=!0,u=_,p=_.version,f=n.toneMapping),c.layers.enableAll(),m.unshift(c,c.geometry,c.material,0,0,null))},dispose:function(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}}}function Io(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=o(null);let a=r,s=!1;function c(_){return n.bindVertexArray(_)}function l(_){return n.deleteVertexArray(_)}function o(_){const v=[],C=[],U=[];for(let P=0;P<t;P++)v[P]=0,C[P]=0,U[P]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:v,enabledAttributes:C,attributeDivisors:U,object:_,attributes:{},index:null}}function u(){const _=a.newAttributes;for(let v=0,C=_.length;v<C;v++)_[v]=0}function p(_){f(_,0)}function f(_,v){const C=a.newAttributes,U=a.enabledAttributes,P=a.attributeDivisors;C[_]=1,U[_]===0&&(n.enableVertexAttribArray(_),U[_]=1),P[_]!==v&&(n.vertexAttribDivisor(_,v),P[_]=v)}function d(){const _=a.newAttributes,v=a.enabledAttributes;for(let C=0,U=v.length;C<U;C++)v[C]!==_[C]&&(n.disableVertexAttribArray(C),v[C]=0)}function M(_,v,C,U,P,T,F){F===!0?n.vertexAttribIPointer(_,v,C,P,T):n.vertexAttribPointer(_,v,C,U,P,T)}function m(){E(),s=!0,a!==r&&(a=r,c(a.object))}function E(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:function(_,v,C,U,P){let T=!1;const F=(function(W,L,O,Q){const z=Q.wireframe===!0;let ne=i[L.id];ne===void 0&&(ne={},i[L.id]=ne);const R=W.isInstancedMesh===!0?W.id:0;let H=ne[R];H===void 0&&(H={},ne[R]=H);let J=H[O.id];J===void 0&&(J={},H[O.id]=J);let j=J[z];return j===void 0&&(j=o(n.createVertexArray()),J[z]=j),j})(_,U,C,v);a!==F&&(a=F,c(a.object)),T=(function(W,L,O,Q){const z=a.attributes,ne=L.attributes;let R=0;const H=O.getAttributes();for(const J in H)if(H[J].location>=0){const j=z[J];let pe=ne[J];if(pe===void 0&&(J==="instanceMatrix"&&W.instanceMatrix&&(pe=W.instanceMatrix),J==="instanceColor"&&W.instanceColor&&(pe=W.instanceColor)),j===void 0||j.attribute!==pe||pe&&j.data!==pe.data)return!0;R++}return a.attributesNum!==R||a.index!==Q})(_,U,C,P),T&&(function(W,L,O,Q){const z={},ne=L.attributes;let R=0;const H=O.getAttributes();for(const J in H)if(H[J].location>=0){let j=ne[J];j===void 0&&(J==="instanceMatrix"&&W.instanceMatrix&&(j=W.instanceMatrix),J==="instanceColor"&&W.instanceColor&&(j=W.instanceColor));const pe={};pe.attribute=j,j&&j.data&&(pe.data=j.data),z[J]=pe,R++}a.attributes=z,a.attributesNum=R,a.index=Q})(_,U,C,P),P!==null&&e.update(P,n.ELEMENT_ARRAY_BUFFER),(T||s)&&(s=!1,(function(W,L,O,Q){u();const z=Q.attributes,ne=O.getAttributes(),R=L.defaultAttributeValues;for(const H in ne){const J=ne[H];if(J.location>=0){let j=z[H];if(j===void 0&&(H==="instanceMatrix"&&W.instanceMatrix&&(j=W.instanceMatrix),H==="instanceColor"&&W.instanceColor&&(j=W.instanceColor)),j!==void 0){const pe=j.normalized,ge=j.itemSize,Le=e.get(j);if(Le===void 0)continue;const Ae=Le.buffer,Te=Le.type,oe=Le.bytesPerElement,ue=Te===n.INT||Te===n.UNSIGNED_INT||j.gpuType===1013;if(j.isInterleavedBufferAttribute){const B=j.data,le=B.stride,ye=j.offset;if(B.isInstancedInterleavedBuffer){for(let N=0;N<J.locationSize;N++)f(J.location+N,B.meshPerAttribute);W.isInstancedMesh!==!0&&Q._maxInstanceCount===void 0&&(Q._maxInstanceCount=B.meshPerAttribute*B.count)}else for(let N=0;N<J.locationSize;N++)p(J.location+N);n.bindBuffer(n.ARRAY_BUFFER,Ae);for(let N=0;N<J.locationSize;N++)M(J.location+N,ge/J.locationSize,Te,pe,le*oe,(ye+ge/J.locationSize*N)*oe,ue)}else{if(j.isInstancedBufferAttribute){for(let B=0;B<J.locationSize;B++)f(J.location+B,j.meshPerAttribute);W.isInstancedMesh!==!0&&Q._maxInstanceCount===void 0&&(Q._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let B=0;B<J.locationSize;B++)p(J.location+B);n.bindBuffer(n.ARRAY_BUFFER,Ae);for(let B=0;B<J.locationSize;B++)M(J.location+B,ge/J.locationSize,Te,pe,ge*oe,ge/J.locationSize*B*oe,ue)}}else if(R!==void 0){const pe=R[H];if(pe!==void 0)switch(pe.length){case 2:n.vertexAttrib2fv(J.location,pe);break;case 3:n.vertexAttrib3fv(J.location,pe);break;case 4:n.vertexAttrib4fv(J.location,pe);break;default:n.vertexAttrib1fv(J.location,pe)}}}}d()})(_,v,C,U),P!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(P).buffer))},reset:m,resetDefaultState:E,dispose:function(){m();for(const _ in i){const v=i[_];for(const C in v){const U=v[C];for(const P in U){const T=U[P];for(const F in T)l(T[F].object),delete T[F];delete U[P]}}delete i[_]}},releaseStatesOfGeometry:function(_){if(i[_.id]===void 0)return;const v=i[_.id];for(const C in v){const U=v[C];for(const P in U){const T=U[P];for(const F in T)l(T[F].object),delete T[F];delete U[P]}}delete i[_.id]},releaseStatesOfObject:function(_){for(const v in i){const C=i[v],U=_.isInstancedMesh===!0?_.id:0,P=C[U];if(P!==void 0){for(const T in P){const F=P[T];for(const W in F)l(F[W].object),delete F[W];delete P[T]}delete C[U],Object.keys(C).length===0&&delete i[v]}}},releaseStatesOfProgram:function(_){for(const v in i){const C=i[v];for(const U in C){const P=C[U];if(P[_.id]===void 0)continue;const T=P[_.id];for(const F in T)l(T[F].object),delete T[F];delete P[_.id]}}},initAttributes:u,enableAttribute:p,disableUnusedAttributes:d}}function Do(n,e,t){let i;this.setMode=function(r){i=r},this.render=function(r,a){n.drawArrays(i,r,a),t.update(a,i,1)},this.renderInstances=function(r,a,s){s!==0&&(n.drawArraysInstanced(i,r,a,s),t.update(a,i,s))},this.renderMultiDraw=function(r,a,s){if(s===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,r,0,a,0,s);let c=0;for(let l=0;l<s;l++)c+=a[l];t.update(c,i,1)}}function Uo(n,e,t,i){let r;function a(u){if(u==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";u="mediump"}return u==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let s=t.precision!==void 0?t.precision:"highp";const c=a(s);c!==s&&(Oe("WebGLRenderer:",s,"not supported, using",c,"instead."),s=c);const l=t.logarithmicDepthBuffer===!0,o=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");return t.reversedDepthBuffer===!0&&o===!1&&Oe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),{isWebGL2:!0,getMaxAnisotropy:function(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const u=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(u.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r},getMaxPrecision:a,textureFormatReadable:function(u){return u===1023||i.convert(u)===n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT)},textureTypeReadable:function(u){const p=u===1016&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(u!==1009&&i.convert(u)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&u!==1015&&!p)},precision:s,logarithmicDepthBuffer:l,reversedDepthBuffer:o,maxTextures:n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),maxVertexTextures:n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),maxTextureSize:n.getParameter(n.MAX_TEXTURE_SIZE),maxCubemapSize:n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),maxAttributes:n.getParameter(n.MAX_VERTEX_ATTRIBS),maxVertexUniforms:n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),maxVaryings:n.getParameter(n.MAX_VARYING_VECTORS),maxFragmentUniforms:n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),maxSamples:n.getParameter(n.MAX_SAMPLES),samples:n.getParameter(n.SAMPLES)}}function No(n){const e=this;let t=null,i=0,r=!1,a=!1;const s=new Ln,c=new Ge,l={value:null,needsUpdate:!1};function o(u,p,f,d){const M=u!==null?u.length:0;let m=null;if(M!==0){if(m=l.value,d!==!0||m===null){const E=f+4*M,_=p.matrixWorldInverse;c.getNormalMatrix(_),(m===null||m.length<E)&&(m=new Float32Array(E));for(let v=0,C=f;v!==M;++v,C+=4)s.copy(u[v]).applyMatrix4(_,c),s.normal.toArray(m,C),m[C+3]=s.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=M,e.numIntersection=0,m}this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,p){const f=u.length!==0||p||i!==0||r;return r=p,i=u.length,f},this.beginShadows=function(){a=!0,o(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(u,p){t=o(u,p,0)},this.setState=function(u,p,f){const d=u.clippingPlanes,M=u.clipIntersection,m=u.clipShadows,E=n.get(u);if(!r||d===null||d.length===0||a&&!m)a?o(null):(function(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0})();else{const _=a?0:i,v=4*_;let C=E.clippingState||null;l.value=C,C=o(d,p,v,f);for(let U=0;U!==v;++U)C[U]=t[U];E.clippingState=C,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=_}}}Is.set(-1,0,0,0,1,0,0,0,1);const Ya=[.125,.215,.35,.446,.526,.582],Si=20,yi=new da,Ka=new je;let jr=null,Yr=0,Kr=0,Zr=!1;const Fo=new X;class Za{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,r=100,a={}){const{size:s=256,position:c=Fo}=a;jr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(s);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,r,l,c),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=es(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Qa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(jr,Yr,Kr),this._renderer.xr.enabled=Zr,e.scissorTest=!1,Xn(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),jr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:cr,depthBuffer:!1},r=Ja(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ja(e,t,i);const{_lodMax:a}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=(function(s){const c=[],l=[],o=[];let u=s;const p=s-4+1+Ya.length;for(let f=0;f<p;f++){const d=Math.pow(2,u);c.push(d);let M=1/d;f>s-4?M=Ya[f-s+4-1]:f===0&&(M=0),l.push(M);const m=1/(d-2),E=-m,_=1+m,v=[E,E,_,E,_,_,E,E,_,_,E,_],C=6,U=6,P=3,T=2,F=1,W=new Float32Array(P*U*C),L=new Float32Array(T*U*C),O=new Float32Array(F*U*C);for(let z=0;z<C;z++){const ne=z%3*2/3-1,R=z>2?0:-1,H=[ne,R,0,ne+2/3,R,0,ne+2/3,R+1,0,ne,R,0,ne+2/3,R+1,0,ne,R+1,0];W.set(H,P*U*z),L.set(v,T*U*z);const J=[z,z,z,z,z,z];O.set(J,F*U*z)}const Q=new _n;Q.setAttribute("position",new cn(W,P)),Q.setAttribute("uv",new cn(L,T)),Q.setAttribute("faceIndex",new cn(O,F)),o.push(new $t(Q,null)),u>4&&u--}return{lodMeshes:o,sizeLods:c,sigmas:l}})(a)),this._blurMaterial=(function(s,c,l){const o=new Float32Array(Si),u=new X(0,1,0);return new un({name:"SphericalGaussianBlur",defines:{n:Si,CUBEUV_TEXEL_WIDTH:1/c,CUBEUV_TEXEL_HEIGHT:1/l,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:o},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:u}},vertexShader:fr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})})(a,e,t),this._ggxMaterial=(function(s,c,l){return new un({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:256,CUBEUV_TEXEL_WIDTH:1/c,CUBEUV_TEXEL_HEIGHT:1/l,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:fr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})})(a,e,t)}return r}_compileMaterial(e){const t=new $t(new _n,e);this._renderer.compile(t,yi)}_sceneToCubeUV(e,t,i,r,a){const s=new Wt(90,1,t,i),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],o=this._renderer,u=o.autoClear,p=o.toneMapping;o.getClearColor(Ka),o.toneMapping=0,o.autoClear=!1,o.state.buffers.depth.getReversed()&&(o.setRenderTarget(r),o.clearDepth(),o.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new $t(new ai,new la({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1})));const f=this._backgroundBox,d=f.material;let M=!1;const m=e.background;m?m.isColor&&(d.color.copy(m),e.background=null,M=!0):(d.color.copy(Ka),M=!0);for(let E=0;E<6;E++){const _=E%3;_===0?(s.up.set(0,c[E],0),s.position.set(a.x,a.y,a.z),s.lookAt(a.x+l[E],a.y,a.z)):_===1?(s.up.set(0,0,c[E]),s.position.set(a.x,a.y,a.z),s.lookAt(a.x,a.y+l[E],a.z)):(s.up.set(0,c[E],0),s.position.set(a.x,a.y,a.z),s.lookAt(a.x,a.y,a.z+l[E]));const v=this._cubeSize;Xn(r,_*v,E>2?v:0,v,v),o.setRenderTarget(r),M&&o.render(f,s),o.render(e,s)}o.toneMapping=p,o.autoClear=u,e.background=m}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=es()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Qa());const a=r?this._cubemapMaterial:this._equirectMaterial,s=this._lodMeshes[0];s.material=a,a.uniforms.envMap.value=e;const c=this._cubeSize;Xn(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(s,yi)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodMeshes.length;for(let a=1;a<r;a++)this._applyGGXFilter(e,a-1,a);t.autoClear=i}_applyGGXFilter(e,t,i){const r=this._renderer,a=this._pingPongRenderTarget,s=this._ggxMaterial,c=this._lodMeshes[i];c.material=s;const l=s.uniforms,o=i/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),p=Math.sqrt(o*o-u*u)*(0+1.25*o),{_lodMax:f}=this,d=this._sizeLods[i],M=3*d*(i>f-4?i-f+4:0),m=4*(this._cubeSize-d);l.envMap.value=e.texture,l.roughness.value=p,l.mipInt.value=f-t,Xn(a,M,m,3*d,2*d),r.setRenderTarget(a),r.render(c,yi),l.envMap.value=a.texture,l.roughness.value=0,l.mipInt.value=f-i,Xn(e,M,m,3*d,2*d),r.setRenderTarget(e),r.render(c,yi)}_blur(e,t,i,r,a){const s=this._pingPongRenderTarget;this._halfBlur(e,s,t,i,r,"latitudinal",a),this._halfBlur(s,e,i,i,r,"longitudinal",a)}_halfBlur(e,t,i,r,a,s,c){const l=this._renderer,o=this._blurMaterial;s!=="latitudinal"&&s!=="longitudinal"&&Je("blur direction must be either latitudinal or longitudinal!");const u=this._lodMeshes[r];u.material=o;const p=o.uniforms,f=this._sizeLods[i]-1,d=isFinite(a)?Math.PI/(2*f):2*Math.PI/39,M=a/d,m=isFinite(a)?1+Math.floor(3*M):Si;m>Si&&Oe(`sigmaRadians, ${a}, is too large and will clip, as it requested ${m} samples when the maximum is set to 20`);const E=[];let _=0;for(let U=0;U<Si;++U){const P=U/M,T=Math.exp(-P*P/2);E.push(T),U===0?_+=T:U<m&&(_+=2*T)}for(let U=0;U<E.length;U++)E[U]=E[U]/_;p.envMap.value=e.texture,p.samples.value=m,p.weights.value=E,p.latitudinal.value=s==="latitudinal",c&&(p.poleAxis.value=c);const{_lodMax:v}=this;p.dTheta.value=d,p.mipInt.value=v-i;const C=this._sizeLods[r];Xn(t,3*C*(r>v-4?r-v+4:0),4*(this._cubeSize-C),3*C,2*C),l.setRenderTarget(t),l.render(u,yi)}}function Ja(n,e,t){const i=new ln(n,e,t);return i.texture.mapping=306,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Xn(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Qa(){return new un({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:fr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function es(){return new un({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:fr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function fr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class Ds extends ln{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new ws(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ai(5,5,5),a=new un({name:"CubemapFromEquirect",uniforms:ei(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:1,blending:0});a.uniforms.tEquirect.value=t;const s=new $t(r,a),c=t.minFilter;return t.minFilter===1008&&(t.minFilter=1006),new To(1,10,this).update(e,s),t.minFilter=c,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const a=e.getRenderTarget();for(let s=0;s<6;s++)e.setRenderTarget(this,s),e.clear(t,i,r);e.setRenderTarget(a)}}function Oo(n){let e=new WeakMap,t=new WeakMap,i=null;function r(c,l){return l===303?c.mapping=301:l===304&&(c.mapping=302),c}function a(c){const l=c.target;l.removeEventListener("dispose",a);const o=e.get(l);o!==void 0&&(e.delete(l),o.dispose())}function s(c){const l=c.target;l.removeEventListener("dispose",s);const o=t.get(l);o!==void 0&&(t.delete(l),o.dispose())}return{get:function(c,l=!1){return c==null?null:l?(function(o){if(o&&o.isTexture){const u=o.mapping,p=u===303||u===304,f=u===301||u===302;if(p||f){let d=t.get(o);const M=d!==void 0?d.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==M)return i===null&&(i=new Za(n)),d=p?i.fromEquirectangular(o,d):i.fromCubemap(o,d),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),d.texture;if(d!==void 0)return d.texture;{const m=o.image;return p&&m&&m.height>0||f&&m&&(function(E){let _=0;const v=6;for(let C=0;C<v;C++)E[C]!==void 0&&_++;return _===v})(m)?(i===null&&(i=new Za(n)),d=p?i.fromEquirectangular(o):i.fromCubemap(o),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),o.addEventListener("dispose",s),d.texture):null}}}return o})(c):(function(o){if(o&&o.isTexture){const u=o.mapping;if(u===303||u===304){if(e.has(o))return r(e.get(o).texture,o.mapping);{const p=o.image;if(p&&p.height>0){const f=new Ds(p.height);return f.fromEquirectangularTexture(n,o),e.set(o,f),o.addEventListener("dispose",a),r(f.texture,o.mapping)}return null}}}return o})(c)},dispose:function(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}}}function Bo(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const r=n.getExtension(i);return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&ea("WebGLRenderer: "+i+" extension not supported."),r}}}function zo(n,e,t,i){const r={},a=new WeakMap;function s(l){const o=l.target;o.index!==null&&e.remove(o.index);for(const p in o.attributes)e.remove(o.attributes[p]);o.removeEventListener("dispose",s),delete r[o.id];const u=a.get(o);u&&(e.remove(u),a.delete(o)),i.releaseStatesOfGeometry(o),o.isInstancedBufferGeometry===!0&&delete o._maxInstanceCount,t.memory.geometries--}function c(l){const o=[],u=l.index,p=l.attributes.position;let f=0;if(p===void 0)return;if(u!==null){const m=u.array;f=u.version;for(let E=0,_=m.length;E<_;E+=3){const v=m[E+0],C=m[E+1],U=m[E+2];o.push(v,C,C,U,U,v)}}else{const m=p.array;f=p.version;for(let E=0,_=m.length/3-1;E<_;E+=3){const v=E+0,C=E+1,U=E+2;o.push(v,C,C,U,U,v)}}const d=new(p.count>=65535?Es:ys)(o,1);d.version=f;const M=a.get(l);M&&e.remove(M),a.set(l,d)}return{get:function(l,o){return r[o.id]===!0||(o.addEventListener("dispose",s),r[o.id]=!0,t.memory.geometries++),o},update:function(l){const o=l.attributes;for(const u in o)e.update(o[u],n.ARRAY_BUFFER)},getWireframeAttribute:function(l){const o=a.get(l);if(o){const u=l.index;u!==null&&o.version<u.version&&c(l)}else c(l);return a.get(l)}}}function Ho(n,e,t){let i,r,a;this.setMode=function(s){i=s},this.setIndex=function(s){r=s.type,a=s.bytesPerElement},this.render=function(s,c){n.drawElements(i,c,r,s*a),t.update(c,i,1)},this.renderInstances=function(s,c,l){l!==0&&(n.drawElementsInstanced(i,c,r,s*a,l),t.update(c,i,l))},this.renderMultiDraw=function(s,c,l){if(l===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,c,0,r,s,0,l);let o=0;for(let u=0;u<l;u++)o+=c[u];t.update(o,i,1)}}function Vo(n){const e={frame:0,calls:0,triangles:0,points:0,lines:0};return{memory:{geometries:0,textures:0},render:e,programs:null,autoReset:!0,reset:function(){e.calls=0,e.triangles=0,e.points=0,e.lines=0},update:function(t,i,r){switch(e.calls++,i){case n.TRIANGLES:e.triangles+=r*(t/3);break;case n.LINES:e.lines+=r*(t/2);break;case n.LINE_STRIP:e.lines+=r*(t-1);break;case n.LINE_LOOP:e.lines+=r*t;break;case n.POINTS:e.points+=r*t;break;default:Je("WebGLInfo: Unknown draw mode:",i)}}}}function Go(n,e,t){const i=new WeakMap,r=new ft;return{update:function(a,s,c){const l=a.morphTargetInfluences,o=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,u=o!==void 0?o.length:0;let p=i.get(s);if(p===void 0||p.count!==u){let W=function(){T.dispose(),i.delete(s),s.removeEventListener("dispose",W)};p!==void 0&&p.texture.dispose();const f=s.morphAttributes.position!==void 0,d=s.morphAttributes.normal!==void 0,M=s.morphAttributes.color!==void 0,m=s.morphAttributes.position||[],E=s.morphAttributes.normal||[],_=s.morphAttributes.color||[];let v=0;f===!0&&(v=1),d===!0&&(v=2),M===!0&&(v=3);let C=s.attributes.position.count*v,U=1;C>e.maxTextureSize&&(U=Math.ceil(C/e.maxTextureSize),C=e.maxTextureSize);const P=new Float32Array(C*U*4*u),T=new xs(P,C,U,u);T.type=1015,T.needsUpdate=!0;const F=4*v;for(let L=0;L<u;L++){const O=m[L],Q=E[L],z=_[L],ne=C*U*4*L;for(let R=0;R<O.count;R++){const H=R*F;f===!0&&(r.fromBufferAttribute(O,R),P[ne+H+0]=r.x,P[ne+H+1]=r.y,P[ne+H+2]=r.z,P[ne+H+3]=0),d===!0&&(r.fromBufferAttribute(Q,R),P[ne+H+4]=r.x,P[ne+H+5]=r.y,P[ne+H+6]=r.z,P[ne+H+7]=0),M===!0&&(r.fromBufferAttribute(z,R),P[ne+H+8]=r.x,P[ne+H+9]=r.y,P[ne+H+10]=r.z,P[ne+H+11]=z.itemSize===4?r.w:1)}}p={count:u,texture:T,size:new tt(C,U)},i.set(s,p),s.addEventListener("dispose",W)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let f=0;for(let M=0;M<l.length;M++)f+=l[M];const d=s.morphTargetsRelative?1:1-f;c.getUniforms().setValue(n,"morphTargetBaseInfluence",d),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",p.texture,t),c.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}}}function Wo(n,e,t,i,r){let a=new WeakMap;function s(c){const l=c.target;l.removeEventListener("dispose",s),i.releaseStatesOfObject(l),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:function(c){const l=r.render.frame,o=c.geometry,u=e.get(c,o);if(a.get(u)!==l&&(e.update(u),a.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",s)===!1&&c.addEventListener("dispose",s),a.get(c)!==l&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),a.set(c,l))),c.isSkinnedMesh){const p=c.skeleton;a.get(p)!==l&&(p.update(),a.set(p,l))}return u},dispose:function(){a=new WeakMap}}}const ko={1:"LINEAR_TONE_MAPPING",2:"REINHARD_TONE_MAPPING",3:"CINEON_TONE_MAPPING",4:"ACES_FILMIC_TONE_MAPPING",6:"AGX_TONE_MAPPING",7:"NEUTRAL_TONE_MAPPING",5:"CUSTOM_TONE_MAPPING"};function $o(n,e,t,i,r){const a=new ln(e,t,{type:n,depthBuffer:i,stencilBuffer:r,depthTexture:i?new Qn(e,t):void 0}),s=new ln(e,t,{type:1016,depthBuffer:!1,stencilBuffer:!1}),c=new _n;c.setAttribute("position",new kt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new kt([0,2,0,0,2,0],2));const l=new xo({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),o=new $t(c,l),u=new da(-1,1,1,-1,0,1);let p,f=null,d=null,M=!1,m=null,E=[],_=!1;this.setSize=function(v,C){a.setSize(v,C),s.setSize(v,C);for(let U=0;U<E.length;U++){const P=E[U];P.setSize&&P.setSize(v,C)}},this.setEffects=function(v){E=v,_=E.length>0&&E[0].isRenderPass===!0;const C=a.width,U=a.height;for(let P=0;P<E.length;P++){const T=E[P];T.setSize&&T.setSize(C,U)}},this.begin=function(v,C){if(M||v.toneMapping===0&&E.length===0)return!1;if(m=C,C!==null){const U=C.width,P=C.height;a.width===U&&a.height===P||this.setSize(U,P)}return _===!1&&v.setRenderTarget(a),p=v.toneMapping,v.toneMapping=0,!0},this.hasRenderPass=function(){return _},this.end=function(v,C){v.toneMapping=p,M=!0;let U=a,P=s;for(let T=0;T<E.length;T++){const F=E[T];if(F.enabled!==!1&&(F.render(v,P,U,C),F.needsSwap!==!1)){const W=U;U=P,P=W}}if(f!==v.outputColorSpace||d!==v.toneMapping){f=v.outputColorSpace,d=v.toneMapping,l.defines={},Ze.getTransfer(f)===it&&(l.defines.SRGB_TRANSFER="");const T=ko[d];T&&(l.defines[T]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=U.texture,v.setRenderTarget(m),v.render(o,u),m=null,M=!1},this.isCompositing=function(){return M},this.dispose=function(){a.depthTexture&&a.depthTexture.dispose(),a.dispose(),s.dispose(),c.dispose(),l.dispose()}}const Us=new Tt,ia=new Qn(1,1),Ns=new xs,Fs=new js,Os=new ws,ts=[],ns=[],is=new Float32Array(16),rs=new Float32Array(9),as=new Float32Array(4);function si(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let a=ts[r];if(a===void 0&&(a=new Float32Array(r),ts[r]=a),e!==0){i.toArray(a,0);for(let s=1,c=0;s!==e;++s)c+=t,n[s].toArray(a,c)}return a}function gt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function _t(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function vr(n,e){let t=ns[e];t===void 0&&(t=new Int32Array(e),ns[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Xo(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function qo(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2fv(this.addr,e),_t(t,e)}}function jo(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)t[0]===e.r&&t[1]===e.g&&t[2]===e.b||(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(gt(t,e))return;n.uniform3fv(this.addr,e),_t(t,e)}}function Yo(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4fv(this.addr,e),_t(t,e)}}function Ko(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),_t(t,e)}else{if(gt(t,i))return;as.set(i),n.uniformMatrix2fv(this.addr,!1,as),_t(t,i)}}function Zo(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),_t(t,e)}else{if(gt(t,i))return;rs.set(i),n.uniformMatrix3fv(this.addr,!1,rs),_t(t,i)}}function Jo(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),_t(t,e)}else{if(gt(t,i))return;is.set(i),n.uniformMatrix4fv(this.addr,!1,is),_t(t,i)}}function Qo(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function el(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2iv(this.addr,e),_t(t,e)}}function tl(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(gt(t,e))return;n.uniform3iv(this.addr,e),_t(t,e)}}function nl(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4iv(this.addr,e),_t(t,e)}}function il(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function rl(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2uiv(this.addr,e),_t(t,e)}}function al(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(gt(t,e))return;n.uniform3uiv(this.addr,e),_t(t,e)}}function sl(n,e){const t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4uiv(this.addr,e),_t(t,e)}}function ol(n,e,t){const i=this.cache,r=t.allocateTextureUnit();let a;i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),this.type===n.SAMPLER_2D_SHADOW?(ia.compareFunction=t.isReversedDepthBuffer()?518:515,a=ia):a=Us,t.setTexture2D(e||a,r)}function ll(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Fs,r)}function cl(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||Os,r)}function ul(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||Ns,r)}function dl(n,e){n.uniform1fv(this.addr,e)}function hl(n,e){const t=si(e,this.size,2);n.uniform2fv(this.addr,t)}function pl(n,e){const t=si(e,this.size,3);n.uniform3fv(this.addr,t)}function fl(n,e){const t=si(e,this.size,4);n.uniform4fv(this.addr,t)}function ml(n,e){const t=si(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function gl(n,e){const t=si(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function _l(n,e){const t=si(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function vl(n,e){n.uniform1iv(this.addr,e)}function xl(n,e){n.uniform2iv(this.addr,e)}function Ml(n,e){n.uniform3iv(this.addr,e)}function Sl(n,e){n.uniform4iv(this.addr,e)}function yl(n,e){n.uniform1uiv(this.addr,e)}function El(n,e){n.uniform2uiv(this.addr,e)}function bl(n,e){n.uniform3uiv(this.addr,e)}function Tl(n,e){n.uniform4uiv(this.addr,e)}function wl(n,e,t){const i=this.cache,r=e.length,a=vr(t,r);let s;gt(i,a)||(n.uniform1iv(this.addr,a),_t(i,a)),s=this.type===n.SAMPLER_2D_SHADOW?ia:Us;for(let c=0;c!==r;++c)t.setTexture2D(e[c]||s,a[c])}function Al(n,e,t){const i=this.cache,r=e.length,a=vr(t,r);gt(i,a)||(n.uniform1iv(this.addr,a),_t(i,a));for(let s=0;s!==r;++s)t.setTexture3D(e[s]||Fs,a[s])}function Rl(n,e,t){const i=this.cache,r=e.length,a=vr(t,r);gt(i,a)||(n.uniform1iv(this.addr,a),_t(i,a));for(let s=0;s!==r;++s)t.setTextureCube(e[s]||Os,a[s])}function Cl(n,e,t){const i=this.cache,r=e.length,a=vr(t,r);gt(i,a)||(n.uniform1iv(this.addr,a),_t(i,a));for(let s=0;s!==r;++s)t.setTexture2DArray(e[s]||Ns,a[s])}class Pl{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=(function(r){switch(r){case 5126:return Xo;case 35664:return qo;case 35665:return jo;case 35666:return Yo;case 35674:return Ko;case 35675:return Zo;case 35676:return Jo;case 5124:case 35670:return Qo;case 35667:case 35671:return el;case 35668:case 35672:return tl;case 35669:case 35673:return nl;case 5125:return il;case 36294:return rl;case 36295:return al;case 36296:return sl;case 35678:case 36198:case 36298:case 36306:case 35682:return ol;case 35679:case 36299:case 36307:return ll;case 35680:case 36300:case 36308:case 36293:return cl;case 36289:case 36303:case 36311:case 36292:return ul}})(t.type)}}class Ll{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=(function(r){switch(r){case 5126:return dl;case 35664:return hl;case 35665:return pl;case 35666:return fl;case 35674:return ml;case 35675:return gl;case 35676:return _l;case 5124:case 35670:return vl;case 35667:case 35671:return xl;case 35668:case 35672:return Ml;case 35669:case 35673:return Sl;case 5125:return yl;case 36294:return El;case 36295:return bl;case 36296:return Tl;case 35678:case 36198:case 36298:case 36306:case 35682:return wl;case 35679:case 36299:case 36307:return Al;case 35680:case 36300:case 36308:case 36293:return Rl;case 36289:case 36303:case 36311:case 36292:return Cl}})(t.type)}}class Il{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let a=0,s=r.length;a!==s;++a){const c=r[a];c.setValue(e,t[c.id],i)}}}const Jr=/(\w+)(\])?(\[|\.)?/g;function ss(n,e){n.seq.push(e),n.map[e.id]=e}function Dl(n,e,t){const i=n.name,r=i.length;for(Jr.lastIndex=0;;){const a=Jr.exec(i),s=Jr.lastIndex;let c=a[1];const l=a[2]==="]",o=a[3];if(l&&(c|=0),o===void 0||o==="["&&s+2===r){ss(t,o===void 0?new Pl(c,n,e):new Ll(c,n,e));break}{let u=t.map[c];u===void 0&&(u=new Il(c),ss(t,u)),t=u}}}class lr{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const c=e.getActiveUniform(t,s);Dl(c,e.getUniformLocation(t,c.name),this)}const r=[],a=[];for(const s of this.seq)s.type===e.SAMPLER_2D_SHADOW||s.type===e.SAMPLER_CUBE_SHADOW||s.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(s):a.push(s);r.length>0&&(this.seq=r.concat(a))}setValue(e,t,i,r){const a=this.map[t];a!==void 0&&a.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let a=0,s=t.length;a!==s;++a){const c=t[a],l=i[c.id];l.needsUpdate!==!1&&c.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,a=e.length;r!==a;++r){const s=e[r];s.id in t&&i.push(s)}return i}}function os(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}let Ul=0;const ls=new Ge;function cs(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=(n.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const s=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+(function(c,l){const o=c.split(`
`),u=[],p=Math.max(l-6,0),f=Math.min(l+6,o.length);for(let d=p;d<f;d++){const M=d+1;u.push(`${M===l?">":" "} ${M}: ${o[d]}`)}return u.join(`
`)})(n.getShaderSource(e),s)}return r}function Nl(n,e){const t=(function(i){Ze._getMatrix(ls,Ze.workingColorSpace,i);const r=`mat3( ${ls.elements.map(a=>a.toFixed(4))} )`;switch(Ze.getTransfer(i)){case ur:return[r,"LinearTransferOETF"];case it:return[r,"sRGBTransferOETF"];default:return Oe("WebGLProgram: Unsupported color space: ",i),[r,"LinearTransferOETF"]}})(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Fl={1:"Linear",2:"Reinhard",3:"Cineon",4:"ACESFilmic",6:"AgX",7:"Neutral",5:"Custom"};function Ol(n,e){const t=Fl[e];return t===void 0?(Oe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const sr=new X;function Bl(){return Ze.getLuminanceCoefficients(sr),["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${sr.x.toFixed(4)}, ${sr.y.toFixed(4)}, ${sr.z.toFixed(4)} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ei(n){return n!==""}function us(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ds(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const zl=/^[ \t]*#include +<([\w\d./]+)>/gm;function ra(n){return n.replace(zl,Vl)}const Hl=new Map;function Vl(n,e){let t=ke[e];if(t===void 0){const i=Hl.get(e);if(i===void 0)throw new Error("Can not resolve #include <"+e+">");t=ke[i],Oe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i)}return ra(t)}const Gl=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function hs(n){return n.replace(Gl,Wl)}function Wl(n,e,t,i){let r="";for(let a=parseInt(e);a<parseInt(t);a++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return r}function ps(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const kl={1:"SHADOWMAP_TYPE_PCF",3:"SHADOWMAP_TYPE_VSM"},$l={301:"ENVMAP_TYPE_CUBE",302:"ENVMAP_TYPE_CUBE",306:"ENVMAP_TYPE_CUBE_UV"},Xl={302:"ENVMAP_MODE_REFRACTION"},ql={0:"ENVMAP_BLENDING_MULTIPLY",1:"ENVMAP_BLENDING_MIX",2:"ENVMAP_BLENDING_ADD"};function jl(n,e,t,i){const r=n.getContext(),a=t.defines;let s=t.vertexShader,c=t.fragmentShader;const l=(function(Q){return kl[Q.shadowMapType]||"SHADOWMAP_TYPE_BASIC"})(t),o=(function(Q){return Q.envMap===!1?"ENVMAP_TYPE_CUBE":$l[Q.envMapMode]||"ENVMAP_TYPE_CUBE"})(t),u=(function(Q){return Q.envMap===!1?"ENVMAP_MODE_REFLECTION":Xl[Q.envMapMode]||"ENVMAP_MODE_REFLECTION"})(t),p=(function(Q){return Q.envMap===!1?"ENVMAP_BLENDING_NONE":ql[Q.combine]||"ENVMAP_BLENDING_NONE"})(t),f=(function(Q){const z=Q.envMapCubeUVHeight;if(z===null)return null;const ne=Math.log2(z)-2,R=1/z;return{texelWidth:1/(3*Math.max(Math.pow(2,ne),112)),texelHeight:R,maxMip:ne}})(t),d=(function(Q){return[Q.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",Q.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ei).join(`
`)})(t),M=(function(Q){const z=[];for(const ne in Q){const R=Q[ne];R!==!1&&z.push("#define "+ne+" "+R)}return z.join(`
`)})(a),m=r.createProgram();let E,_,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(E=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(Ei).join(`
`),E.length>0&&(E+=`
`),_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(Ei).join(`
`),_.length>0&&(_+=`
`)):(E=[ps(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ei).join(`
`),_=[ps(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+o:"",t.envMap?"#define "+u:"",t.envMap?"#define "+p:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==0?"#define TONE_MAPPING":"",t.toneMapping!==0?ke.tonemapping_pars_fragment:"",t.toneMapping!==0?Ol("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ke.colorspace_pars_fragment,Nl("linearToOutputTexel",t.outputColorSpace),Bl(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ei).join(`
`)),s=ra(s),s=us(s,t),s=ds(s,t),c=ra(c),c=us(c,t),c=ds(c,t),s=hs(s),c=hs(c),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,E=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+E,_=["#define varying in",t.glslVersion===_a?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===_a?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+_);const C=v+E+s,U=v+_+c,P=os(r,r.VERTEX_SHADER,C),T=os(r,r.FRAGMENT_SHADER,U);function F(Q){if(n.debug.checkShaderErrors){const z=r.getProgramInfoLog(m)||"",ne=r.getShaderInfoLog(P)||"",R=r.getShaderInfoLog(T)||"",H=z.trim(),J=ne.trim(),j=R.trim();let pe=!0,ge=!0;if(r.getProgramParameter(m,r.LINK_STATUS)===!1)if(pe=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,m,P,T);else{const Le=cs(r,P,"vertex"),Ae=cs(r,T,"fragment");Je("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(m,r.VALIDATE_STATUS)+`

Material Name: `+Q.name+`
Material Type: `+Q.type+`

Program Info Log: `+H+`
`+Le+`
`+Ae)}else H!==""?Oe("WebGLProgram: Program Info Log:",H):J!==""&&j!==""||(ge=!1);ge&&(Q.diagnostics={runnable:pe,programLog:H,vertexShader:{log:J,prefix:E},fragmentShader:{log:j,prefix:_}})}r.deleteShader(P),r.deleteShader(T),W=new lr(r,m),L=(function(z,ne){const R={},H=z.getProgramParameter(ne,z.ACTIVE_ATTRIBUTES);for(let J=0;J<H;J++){const j=z.getActiveAttrib(ne,J),pe=j.name;let ge=1;j.type===z.FLOAT_MAT2&&(ge=2),j.type===z.FLOAT_MAT3&&(ge=3),j.type===z.FLOAT_MAT4&&(ge=4),R[pe]={type:j.type,location:z.getAttribLocation(ne,pe),locationSize:ge}}return R})(r,m)}let W,L;r.attachShader(m,P),r.attachShader(m,T),t.index0AttributeName!==void 0?r.bindAttribLocation(m,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(m,0,"position"),r.linkProgram(m),this.getUniforms=function(){return W===void 0&&F(this),W},this.getAttributes=function(){return L===void 0&&F(this),L};let O=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return O===!1&&(O=r.getProgramParameter(m,37297)),O},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Ul++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=P,this.fragmentShader=T,this}let Yl=0;class Kl{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),a=this._getShaderStage(i),s=this._getShaderCacheForMaterial(e);return s.has(r)===!1&&(s.add(r),r.usedTimes++),s.has(a)===!1&&(s.add(a),a.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Zl(e),t.set(e,i)),i}}class Zl{constructor(e){this.id=Yl++,this.code=e,this.usedTimes=0}}function Jl(n,e,t,i,r,a){const s=new sa,c=new Kl,l=new Set,o=[],u=new Map,p=i.logarithmicDepthBuffer;let f=i.precision;const d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(m){return l.add(m),m===0?"uv":`uv${m}`}return{getParameters:function(m,E,_,v,C,U){const P=v.fog,T=C.geometry,F=m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial?v.environment:null,W=m.isMeshStandardMaterial||m.isMeshLambertMaterial&&!m.envMap||m.isMeshPhongMaterial&&!m.envMap,L=e.get(m.envMap||F,W),O=L&&L.mapping===306?L.image.height:null,Q=d[m.type];m.precision!==null&&(f=i.getMaxPrecision(m.precision),f!==m.precision&&Oe("WebGLProgram.getParameters:",m.precision,"not supported, using",f,"instead."));const z=T.morphAttributes.position||T.morphAttributes.normal||T.morphAttributes.color,ne=z!==void 0?z.length:0;let R,H,J,j,pe=0;if(T.morphAttributes.position!==void 0&&(pe=1),T.morphAttributes.normal!==void 0&&(pe=2),T.morphAttributes.color!==void 0&&(pe=3),Q){const yt=on[Q];R=yt.vertexShader,H=yt.fragmentShader}else R=m.vertexShader,H=m.fragmentShader,c.update(m),J=c.getVertexShaderID(m),j=c.getFragmentShaderID(m);const ge=n.getRenderTarget(),Le=n.state.buffers.depth.getReversed(),Ae=C.isInstancedMesh===!0,Te=C.isBatchedMesh===!0,oe=!!m.map,ue=!!m.matcap,B=!!L,le=!!m.aoMap,ye=!!m.lightMap,N=!!m.bumpMap,b=!!m.normalMap,S=!!m.displacementMap,D=!!m.emissiveMap,q=!!m.metalnessMap,y=!!m.roughnessMap,G=m.anisotropy>0,V=m.clearcoat>0,A=m.dispersion>0,te=m.iridescence>0,Y=m.sheen>0,ie=m.transmission>0,de=G&&!!m.anisotropyMap,ve=V&&!!m.clearcoatMap,ae=V&&!!m.clearcoatNormalMap,Pe=V&&!!m.clearcoatRoughnessMap,xe=te&&!!m.iridescenceMap,Ee=te&&!!m.iridescenceThicknessMap,me=Y&&!!m.sheenColorMap,Ie=Y&&!!m.sheenRoughnessMap,Ye=!!m.specularMap,lt=!!m.specularColorMap,Ke=!!m.specularIntensityMap,ct=ie&&!!m.transmissionMap,Mt=ie&&!!m.thicknessMap,Ce=!!m.gradientMap,We=!!m.alphaMap,De=m.alphaTest>0,rt=!!m.alphaHash,ht=!!m.extensions;let Ut=0;m.toneMapped&&(ge!==null&&ge.isXRRenderTarget!==!0||(Ut=n.toneMapping));const Rt={shaderID:Q,shaderType:m.type,shaderName:m.name,vertexShader:R,fragmentShader:H,defines:m.defines,customVertexShaderID:J,customFragmentShaderID:j,isRawShaderMaterial:m.isRawShaderMaterial===!0,glslVersion:m.glslVersion,precision:f,batching:Te,batchingColor:Te&&C._colorsTexture!==null,instancing:Ae,instancingColor:Ae&&C.instanceColor!==null,instancingMorph:Ae&&C.morphTexture!==null,outputColorSpace:ge===null?n.outputColorSpace:ge.isXRRenderTarget===!0?ge.texture.colorSpace:Ze.workingColorSpace,alphaToCoverage:!!m.alphaToCoverage,map:oe,matcap:ue,envMap:B,envMapMode:B&&L.mapping,envMapCubeUVHeight:O,aoMap:le,lightMap:ye,bumpMap:N,normalMap:b,displacementMap:S,emissiveMap:D,normalMapObjectSpace:b&&m.normalMapType===1,normalMapTangentSpace:b&&m.normalMapType===0,packedNormalMap:b&&m.normalMapType===0&&(pt=m.normalMap.format,pt===1030||pt===37490||pt===36285),metalnessMap:q,roughnessMap:y,anisotropy:G,anisotropyMap:de,clearcoat:V,clearcoatMap:ve,clearcoatNormalMap:ae,clearcoatRoughnessMap:Pe,dispersion:A,iridescence:te,iridescenceMap:xe,iridescenceThicknessMap:Ee,sheen:Y,sheenColorMap:me,sheenRoughnessMap:Ie,specularMap:Ye,specularColorMap:lt,specularIntensityMap:Ke,transmission:ie,transmissionMap:ct,thicknessMap:Mt,gradientMap:Ce,opaque:m.transparent===!1&&m.blending===1&&m.alphaToCoverage===!1,alphaMap:We,alphaTest:De,alphaHash:rt,combine:m.combine,mapUv:oe&&M(m.map.channel),aoMapUv:le&&M(m.aoMap.channel),lightMapUv:ye&&M(m.lightMap.channel),bumpMapUv:N&&M(m.bumpMap.channel),normalMapUv:b&&M(m.normalMap.channel),displacementMapUv:S&&M(m.displacementMap.channel),emissiveMapUv:D&&M(m.emissiveMap.channel),metalnessMapUv:q&&M(m.metalnessMap.channel),roughnessMapUv:y&&M(m.roughnessMap.channel),anisotropyMapUv:de&&M(m.anisotropyMap.channel),clearcoatMapUv:ve&&M(m.clearcoatMap.channel),clearcoatNormalMapUv:ae&&M(m.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Pe&&M(m.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&M(m.iridescenceMap.channel),iridescenceThicknessMapUv:Ee&&M(m.iridescenceThicknessMap.channel),sheenColorMapUv:me&&M(m.sheenColorMap.channel),sheenRoughnessMapUv:Ie&&M(m.sheenRoughnessMap.channel),specularMapUv:Ye&&M(m.specularMap.channel),specularColorMapUv:lt&&M(m.specularColorMap.channel),specularIntensityMapUv:Ke&&M(m.specularIntensityMap.channel),transmissionMapUv:ct&&M(m.transmissionMap.channel),thicknessMapUv:Mt&&M(m.thicknessMap.channel),alphaMapUv:We&&M(m.alphaMap.channel),vertexTangents:!!T.attributes.tangent&&(b||G),vertexNormals:!!T.attributes.normal,vertexColors:m.vertexColors,vertexAlphas:m.vertexColors===!0&&!!T.attributes.color&&T.attributes.color.itemSize===4,pointsUvs:C.isPoints===!0&&!!T.attributes.uv&&(oe||We),fog:!!P,useFog:m.fog===!0,fogExp2:!!P&&P.isFogExp2,flatShading:m.wireframe===!1&&(m.flatShading===!0||T.attributes.normal===void 0&&b===!1&&(m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)),sizeAttenuation:m.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:Le,skinning:C.isSkinnedMesh===!0,morphTargets:T.morphAttributes.position!==void 0,morphNormals:T.morphAttributes.normal!==void 0,morphColors:T.morphAttributes.color!==void 0,morphTargetsCount:ne,morphTextureStride:pe,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:U.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:m.dithering,shadowMapEnabled:n.shadowMap.enabled&&_.length>0,shadowMapType:n.shadowMap.type,toneMapping:Ut,decodeVideoTexture:oe&&m.map.isVideoTexture===!0&&Ze.getTransfer(m.map.colorSpace)===it,decodeVideoTextureEmissive:D&&m.emissiveMap.isVideoTexture===!0&&Ze.getTransfer(m.emissiveMap.colorSpace)===it,premultipliedAlpha:m.premultipliedAlpha,doubleSided:m.side===2,flipSided:m.side===1,useDepthPacking:m.depthPacking>=0,depthPacking:m.depthPacking||0,index0AttributeName:m.index0AttributeName,extensionClipCullDistance:ht&&m.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ht&&m.extensions.multiDraw===!0||Te)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:m.customProgramCacheKey()};var pt;return Rt.vertexUv1s=l.has(1),Rt.vertexUv2s=l.has(2),Rt.vertexUv3s=l.has(3),l.clear(),Rt},getProgramCacheKey:function(m){const E=[];if(m.shaderID?E.push(m.shaderID):(E.push(m.customVertexShaderID),E.push(m.customFragmentShaderID)),m.defines!==void 0)for(const _ in m.defines)E.push(_),E.push(m.defines[_]);return m.isRawShaderMaterial===!1&&((function(_,v){_.push(v.precision),_.push(v.outputColorSpace),_.push(v.envMapMode),_.push(v.envMapCubeUVHeight),_.push(v.mapUv),_.push(v.alphaMapUv),_.push(v.lightMapUv),_.push(v.aoMapUv),_.push(v.bumpMapUv),_.push(v.normalMapUv),_.push(v.displacementMapUv),_.push(v.emissiveMapUv),_.push(v.metalnessMapUv),_.push(v.roughnessMapUv),_.push(v.anisotropyMapUv),_.push(v.clearcoatMapUv),_.push(v.clearcoatNormalMapUv),_.push(v.clearcoatRoughnessMapUv),_.push(v.iridescenceMapUv),_.push(v.iridescenceThicknessMapUv),_.push(v.sheenColorMapUv),_.push(v.sheenRoughnessMapUv),_.push(v.specularMapUv),_.push(v.specularColorMapUv),_.push(v.specularIntensityMapUv),_.push(v.transmissionMapUv),_.push(v.thicknessMapUv),_.push(v.combine),_.push(v.fogExp2),_.push(v.sizeAttenuation),_.push(v.morphTargetsCount),_.push(v.morphAttributeCount),_.push(v.numDirLights),_.push(v.numPointLights),_.push(v.numSpotLights),_.push(v.numSpotLightMaps),_.push(v.numHemiLights),_.push(v.numRectAreaLights),_.push(v.numDirLightShadows),_.push(v.numPointLightShadows),_.push(v.numSpotLightShadows),_.push(v.numSpotLightShadowsWithMaps),_.push(v.numLightProbes),_.push(v.shadowMapType),_.push(v.toneMapping),_.push(v.numClippingPlanes),_.push(v.numClipIntersection),_.push(v.depthPacking)})(E,m),(function(_,v){s.disableAll(),v.instancing&&s.enable(0),v.instancingColor&&s.enable(1),v.instancingMorph&&s.enable(2),v.matcap&&s.enable(3),v.envMap&&s.enable(4),v.normalMapObjectSpace&&s.enable(5),v.normalMapTangentSpace&&s.enable(6),v.clearcoat&&s.enable(7),v.iridescence&&s.enable(8),v.alphaTest&&s.enable(9),v.vertexColors&&s.enable(10),v.vertexAlphas&&s.enable(11),v.vertexUv1s&&s.enable(12),v.vertexUv2s&&s.enable(13),v.vertexUv3s&&s.enable(14),v.vertexTangents&&s.enable(15),v.anisotropy&&s.enable(16),v.alphaHash&&s.enable(17),v.batching&&s.enable(18),v.dispersion&&s.enable(19),v.batchingColor&&s.enable(20),v.gradientMap&&s.enable(21),v.packedNormalMap&&s.enable(22),v.vertexNormals&&s.enable(23),_.push(s.mask),s.disableAll(),v.fog&&s.enable(0),v.useFog&&s.enable(1),v.flatShading&&s.enable(2),v.logarithmicDepthBuffer&&s.enable(3),v.reversedDepthBuffer&&s.enable(4),v.skinning&&s.enable(5),v.morphTargets&&s.enable(6),v.morphNormals&&s.enable(7),v.morphColors&&s.enable(8),v.premultipliedAlpha&&s.enable(9),v.shadowMapEnabled&&s.enable(10),v.doubleSided&&s.enable(11),v.flipSided&&s.enable(12),v.useDepthPacking&&s.enable(13),v.dithering&&s.enable(14),v.transmission&&s.enable(15),v.sheen&&s.enable(16),v.opaque&&s.enable(17),v.pointsUvs&&s.enable(18),v.decodeVideoTexture&&s.enable(19),v.decodeVideoTextureEmissive&&s.enable(20),v.alphaToCoverage&&s.enable(21),v.numLightProbeGrids>0&&s.enable(22),_.push(s.mask)})(E,m),E.push(n.outputColorSpace)),E.push(m.customProgramCacheKey),E.join()},getUniforms:function(m){const E=d[m.type];let _;if(E){const v=on[E];_=vo.clone(v.uniforms)}else _=m.uniforms;return _},acquireProgram:function(m,E){let _=u.get(E);return _!==void 0?++_.usedTimes:(_=new jl(n,E,m,r),o.push(_),u.set(E,_)),_},releaseProgram:function(m){if(--m.usedTimes===0){const E=o.indexOf(m);o[E]=o[o.length-1],o.pop(),u.delete(m.cacheKey),m.destroy()}},releaseShaderCache:function(m){c.remove(m)},programs:o,dispose:function(){c.dispose()}}}function Ql(){let n=new WeakMap;return{has:function(e){return n.has(e)},get:function(e){let t=n.get(e);return t===void 0&&(t={},n.set(e,t)),t},remove:function(e){n.delete(e)},update:function(e,t,i){n.get(e)[t]=i},dispose:function(){n=new WeakMap}}}function ec(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function fs(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function ms(){const n=[];let e=0;const t=[],i=[],r=[];function a(c){let l=0;return c.isInstancedMesh&&(l+=2),c.isSkinnedMesh&&(l+=1),l}function s(c,l,o,u,p,f){let d=n[e];return d===void 0?(d={id:c.id,object:c,geometry:l,material:o,materialVariant:a(c),groupOrder:u,renderOrder:c.renderOrder,z:p,group:f},n[e]=d):(d.id=c.id,d.object=c,d.geometry=l,d.material=o,d.materialVariant=a(c),d.groupOrder=u,d.renderOrder=c.renderOrder,d.z=p,d.group=f),e++,d}return{opaque:t,transmissive:i,transparent:r,init:function(){e=0,t.length=0,i.length=0,r.length=0},push:function(c,l,o,u,p,f){const d=s(c,l,o,u,p,f);o.transmission>0?i.push(d):o.transparent===!0?r.push(d):t.push(d)},unshift:function(c,l,o,u,p,f){const d=s(c,l,o,u,p,f);o.transmission>0?i.unshift(d):o.transparent===!0?r.unshift(d):t.unshift(d)},finish:function(){for(let c=e,l=n.length;c<l;c++){const o=n[c];if(o.id===null)break;o.id=null,o.object=null,o.geometry=null,o.material=null,o.group=null}},sort:function(c,l){t.length>1&&t.sort(c||ec),i.length>1&&i.sort(l||fs),r.length>1&&r.sort(l||fs)}}}function tc(){let n=new WeakMap;return{get:function(e,t){const i=n.get(e);let r;return i===void 0?(r=new ms,n.set(e,[r])):t>=i.length?(r=new ms,i.push(r)):r=i[t],r},dispose:function(){n=new WeakMap}}}function nc(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new X,color:new je};break;case"SpotLight":t={position:new X,direction:new X,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new X,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new X,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new X,halfWidth:new X,halfHeight:new X}}return n[e.id]=t,t}}}let ic=0;function rc(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function ac(n){const e=new nc,t=(function(){const c={};return{get:function(l){if(c[l.id]!==void 0)return c[l.id];let o;switch(l.type){case"DirectionalLight":case"SpotLight":o={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new tt};break;case"PointLight":o={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new tt,shadowCameraNear:1,shadowCameraFar:1e3}}return c[l.id]=o,o}}})(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new X);const r=new X,a=new $e,s=new $e;return{setup:function(c){let l=0,o=0,u=0;for(let F=0;F<9;F++)i.probe[F].set(0,0,0);let p=0,f=0,d=0,M=0,m=0,E=0,_=0,v=0,C=0,U=0,P=0;c.sort(rc);for(let F=0,W=c.length;F<W;F++){const L=c[F],O=L.color,Q=L.intensity,z=L.distance;let ne=null;if(L.shadow&&L.shadow.map&&(ne=L.shadow.map.texture.format===1030?L.shadow.map.texture:L.shadow.map.depthTexture||L.shadow.map.texture),L.isAmbientLight)l+=O.r*Q,o+=O.g*Q,u+=O.b*Q;else if(L.isLightProbe){for(let R=0;R<9;R++)i.probe[R].addScaledVector(L.sh.coefficients[R],Q);P++}else if(L.isDirectionalLight){const R=e.get(L);if(R.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const H=L.shadow,J=t.get(L);J.shadowIntensity=H.intensity,J.shadowBias=H.bias,J.shadowNormalBias=H.normalBias,J.shadowRadius=H.radius,J.shadowMapSize=H.mapSize,i.directionalShadow[p]=J,i.directionalShadowMap[p]=ne,i.directionalShadowMatrix[p]=L.shadow.matrix,E++}i.directional[p]=R,p++}else if(L.isSpotLight){const R=e.get(L);R.position.setFromMatrixPosition(L.matrixWorld),R.color.copy(O).multiplyScalar(Q),R.distance=z,R.coneCos=Math.cos(L.angle),R.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),R.decay=L.decay,i.spot[d]=R;const H=L.shadow;if(L.map&&(i.spotLightMap[C]=L.map,C++,H.updateMatrices(L),L.castShadow&&U++),i.spotLightMatrix[d]=H.matrix,L.castShadow){const J=t.get(L);J.shadowIntensity=H.intensity,J.shadowBias=H.bias,J.shadowNormalBias=H.normalBias,J.shadowRadius=H.radius,J.shadowMapSize=H.mapSize,i.spotShadow[d]=J,i.spotShadowMap[d]=ne,v++}d++}else if(L.isRectAreaLight){const R=e.get(L);R.color.copy(O).multiplyScalar(Q),R.halfWidth.set(.5*L.width,0,0),R.halfHeight.set(0,.5*L.height,0),i.rectArea[M]=R,M++}else if(L.isPointLight){const R=e.get(L);if(R.color.copy(L.color).multiplyScalar(L.intensity),R.distance=L.distance,R.decay=L.decay,L.castShadow){const H=L.shadow,J=t.get(L);J.shadowIntensity=H.intensity,J.shadowBias=H.bias,J.shadowNormalBias=H.normalBias,J.shadowRadius=H.radius,J.shadowMapSize=H.mapSize,J.shadowCameraNear=H.camera.near,J.shadowCameraFar=H.camera.far,i.pointShadow[f]=J,i.pointShadowMap[f]=ne,i.pointShadowMatrix[f]=L.shadow.matrix,_++}i.point[f]=R,f++}else if(L.isHemisphereLight){const R=e.get(L);R.skyColor.copy(L.color).multiplyScalar(Q),R.groundColor.copy(L.groundColor).multiplyScalar(Q),i.hemi[m]=R,m++}}M>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=_e.LTC_FLOAT_1,i.rectAreaLTC2=_e.LTC_FLOAT_2):(i.rectAreaLTC1=_e.LTC_HALF_1,i.rectAreaLTC2=_e.LTC_HALF_2)),i.ambient[0]=l,i.ambient[1]=o,i.ambient[2]=u;const T=i.hash;T.directionalLength===p&&T.pointLength===f&&T.spotLength===d&&T.rectAreaLength===M&&T.hemiLength===m&&T.numDirectionalShadows===E&&T.numPointShadows===_&&T.numSpotShadows===v&&T.numSpotMaps===C&&T.numLightProbes===P||(i.directional.length=p,i.spot.length=d,i.rectArea.length=M,i.point.length=f,i.hemi.length=m,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.pointShadow.length=_,i.pointShadowMap.length=_,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=E,i.pointShadowMatrix.length=_,i.spotLightMatrix.length=v+C-U,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=U,i.numLightProbes=P,T.directionalLength=p,T.pointLength=f,T.spotLength=d,T.rectAreaLength=M,T.hemiLength=m,T.numDirectionalShadows=E,T.numPointShadows=_,T.numSpotShadows=v,T.numSpotMaps=C,T.numLightProbes=P,i.version=ic++)},setupView:function(c,l){let o=0,u=0,p=0,f=0,d=0;const M=l.matrixWorldInverse;for(let m=0,E=c.length;m<E;m++){const _=c[m];if(_.isDirectionalLight){const v=i.directional[o];v.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(M),o++}else if(_.isSpotLight){const v=i.spot[p];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(M),v.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(M),p++}else if(_.isRectAreaLight){const v=i.rectArea[f];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(M),s.identity(),a.copy(_.matrixWorld),a.premultiply(M),s.extractRotation(a),v.halfWidth.set(.5*_.width,0,0),v.halfHeight.set(0,.5*_.height,0),v.halfWidth.applyMatrix4(s),v.halfHeight.applyMatrix4(s),f++}else if(_.isPointLight){const v=i.point[u];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(M),u++}else if(_.isHemisphereLight){const v=i.hemi[d];v.direction.setFromMatrixPosition(_.matrixWorld),v.direction.transformDirection(M),d++}}},state:i}}function gs(n){const e=new ac(n),t=[],i=[],r=[],a={lightsArray:t,shadowsArray:i,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:function(s){a.camera=s,t.length=0,i.length=0,r.length=0},state:a,setupLights:function(){e.setup(t)},setupLightsView:function(s){e.setupView(t,s)},pushLight:function(s){t.push(s)},pushShadow:function(s){i.push(s)},pushLightProbeGrid:function(s){r.push(s)}}}function sc(n){let e=new WeakMap;return{get:function(t,i=0){const r=e.get(t);let a;return r===void 0?(a=new gs(n),e.set(t,[a])):i>=r.length?(a=new gs(n),r.push(a)):a=r[i],a},dispose:function(){e=new WeakMap}}}const oc=[new X(1,0,0),new X(-1,0,0),new X(0,1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1)],lc=[new X(0,-1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1),new X(0,-1,0),new X(0,-1,0)],_s=new $e,bi=new X,Qr=new X;function cc(n,e,t){let i=new ca;const r=new tt,a=new tt,s=new ft,c=new Mo,l=new So,o={},u=t.maxTextureSize,p={0:1,1:0,2:2},f=new un({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new tt},radius:{value:4}},vertexShader:`void main() {
	gl_Position = vec4( position, 1.0 );
}`,fragmentShader:`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`}),d=f.clone();d.defines.HORIZONTAL_PASS=1;const M=new _n;M.setAttribute("position",new cn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const m=new $t(M,f),E=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;function v(T,F){const W=e.update(m);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,d.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new ln(r.x,r.y,{format:1030,type:1016})),f.uniforms.shadow_pass.value=T.map.depthTexture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(F,null,W,f,m,null),d.uniforms.shadow_pass.value=T.mapPass.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(F,null,W,d,m,null)}function C(T,F,W,L){let O=null;const Q=W.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(Q!==void 0)O=Q;else if(O=W.isPointLight===!0?l:c,n.localClippingEnabled&&F.clipShadows===!0&&Array.isArray(F.clippingPlanes)&&F.clippingPlanes.length!==0||F.displacementMap&&F.displacementScale!==0||F.alphaMap&&F.alphaTest>0||F.map&&F.alphaTest>0||F.alphaToCoverage===!0){const z=O.uuid,ne=F.uuid;let R=o[z];R===void 0&&(R={},o[z]=R);let H=R[ne];H===void 0&&(H=O.clone(),R[ne]=H,F.addEventListener("dispose",P)),O=H}return O.visible=F.visible,O.wireframe=F.wireframe,O.side=L===3?F.shadowSide!==null?F.shadowSide:F.side:F.shadowSide!==null?F.shadowSide:p[F.side],O.alphaMap=F.alphaMap,O.alphaTest=F.alphaToCoverage===!0?.5:F.alphaTest,O.map=F.map,O.clipShadows=F.clipShadows,O.clippingPlanes=F.clippingPlanes,O.clipIntersection=F.clipIntersection,O.displacementMap=F.displacementMap,O.displacementScale=F.displacementScale,O.displacementBias=F.displacementBias,O.wireframeLinewidth=F.wireframeLinewidth,O.linewidth=F.linewidth,W.isPointLight===!0&&O.isMeshDistanceMaterial===!0&&(n.properties.get(O).light=W),O}function U(T,F,W,L,O){if(T.visible===!1)return;if(T.layers.test(F.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&O===3)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,T.matrixWorld);const z=e.update(T),ne=T.material;if(Array.isArray(ne)){const R=z.groups;for(let H=0,J=R.length;H<J;H++){const j=R[H],pe=ne[j.materialIndex];if(pe&&pe.visible){const ge=C(T,pe,L,O);T.onBeforeShadow(n,T,F,W,z,ge,j),n.renderBufferDirect(W,null,z,ge,T,j),T.onAfterShadow(n,T,F,W,z,ge,j)}}}else if(ne.visible){const R=C(T,ne,L,O);T.onBeforeShadow(n,T,F,W,z,R,null),n.renderBufferDirect(W,null,z,R,T,null),T.onAfterShadow(n,T,F,W,z,R,null)}}const Q=T.children;for(let z=0,ne=Q.length;z<ne;z++)U(Q[z],F,W,L,O)}function P(T){T.target.removeEventListener("dispose",P);for(const F in o){const W=o[F],L=T.target.uuid;L in W&&(W[L].dispose(),delete W[L])}}this.render=function(T,F,W){if(E.enabled===!1||E.autoUpdate===!1&&E.needsUpdate===!1||T.length===0)return;this.type===2&&(Oe("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=1);const L=n.getRenderTarget(),O=n.getActiveCubeFace(),Q=n.getActiveMipmapLevel(),z=n.state;z.setBlending(0),z.buffers.depth.getReversed()===!0?z.buffers.color.setClear(0,0,0,0):z.buffers.color.setClear(1,1,1,1),z.buffers.depth.setTest(!0),z.setScissorTest(!1);const ne=_!==this.type;ne&&F.traverse(function(R){R.material&&(Array.isArray(R.material)?R.material.forEach(H=>H.needsUpdate=!0):R.material.needsUpdate=!0)});for(let R=0,H=T.length;R<H;R++){const J=T[R],j=J.shadow;if(j===void 0){Oe("WebGLShadowMap:",J,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);const pe=j.getFrameExtents();r.multiply(pe),a.copy(j.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(a.x=Math.floor(u/pe.x),r.x=a.x*pe.x,j.mapSize.x=a.x),r.y>u&&(a.y=Math.floor(u/pe.y),r.y=a.y*pe.y,j.mapSize.y=a.y));const ge=n.state.buffers.depth.getReversed();if(j.camera._reversedDepth=ge,j.map===null||ne===!0){if(j.map!==null&&(j.map.depthTexture!==null&&(j.map.depthTexture.dispose(),j.map.depthTexture=null),j.map.dispose()),this.type===3){if(J.isPointLight){Oe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}j.map=new ln(r.x,r.y,{format:1030,type:1016,minFilter:1006,magFilter:1006,generateMipmaps:!1}),j.map.texture.name=J.name+".shadowMap",j.map.depthTexture=new Qn(r.x,r.y,1015),j.map.depthTexture.name=J.name+".shadowMapDepth",j.map.depthTexture.format=1026,j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=1003,j.map.depthTexture.magFilter=1003}else J.isPointLight?(j.map=new Ds(r.x),j.map.depthTexture=new go(r.x,1014)):(j.map=new ln(r.x,r.y),j.map.depthTexture=new Qn(r.x,r.y,1014)),j.map.depthTexture.name=J.name+".shadowMap",j.map.depthTexture.format=1026,this.type===1?(j.map.depthTexture.compareFunction=ge?518:515,j.map.depthTexture.minFilter=1006,j.map.depthTexture.magFilter=1006):(j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=1003,j.map.depthTexture.magFilter=1003);j.camera.updateProjectionMatrix()}const Le=j.map.isWebGLCubeRenderTarget?6:1;for(let Ae=0;Ae<Le;Ae++){if(j.map.isWebGLCubeRenderTarget)n.setRenderTarget(j.map,Ae),n.clear();else{Ae===0&&(n.setRenderTarget(j.map),n.clear());const Te=j.getViewport(Ae);s.set(a.x*Te.x,a.y*Te.y,a.x*Te.z,a.y*Te.w),z.viewport(s)}if(J.isPointLight){const Te=j.camera,oe=j.matrix,ue=J.distance||Te.far;ue!==Te.far&&(Te.far=ue,Te.updateProjectionMatrix()),bi.setFromMatrixPosition(J.matrixWorld),Te.position.copy(bi),Qr.copy(Te.position),Qr.add(oc[Ae]),Te.up.copy(lc[Ae]),Te.lookAt(Qr),Te.updateMatrixWorld(),oe.makeTranslation(-bi.x,-bi.y,-bi.z),_s.multiplyMatrices(Te.projectionMatrix,Te.matrixWorldInverse),j._frustum.setFromProjectionMatrix(_s,Te.coordinateSystem,Te.reversedDepth)}else j.updateMatrices(J);i=j.getFrustum(),U(F,W,j.camera,J,this.type)}j.isPointLightShadow!==!0&&this.type===3&&v(j,W),j.needsUpdate=!1}_=this.type,E.needsUpdate=!1,n.setRenderTarget(L,O,Q)}}function uc(n,e){const t=new function(){let y=!1;const G=new ft;let V=null;const A=new ft(0,0,0,0);return{setMask:function(te){V===te||y||(n.colorMask(te,te,te,te),V=te)},setLocked:function(te){y=te},setClear:function(te,Y,ie,de,ve){ve===!0&&(te*=de,Y*=de,ie*=de),G.set(te,Y,ie,de),A.equals(G)===!1&&(n.clearColor(te,Y,ie,de),A.copy(G))},reset:function(){y=!1,V=null,A.set(-1,0,0,0)}}},i=new function(){let y=!1,G=!1,V=null,A=null,te=null;return{setReversed:function(Y){if(G!==Y){const ie=e.get("EXT_clip_control");Y?ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.ZERO_TO_ONE_EXT):ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.NEGATIVE_ONE_TO_ONE_EXT),G=Y;const de=te;te=null,this.setClear(de)}},getReversed:function(){return G},setTest:function(Y){Y?B(n.DEPTH_TEST):le(n.DEPTH_TEST)},setMask:function(Y){V===Y||y||(n.depthMask(Y),V=Y)},setFunc:function(Y){if(G&&(Y=Gs[Y]),A!==Y){switch(Y){case 0:n.depthFunc(n.NEVER);break;case 1:n.depthFunc(n.ALWAYS);break;case 2:n.depthFunc(n.LESS);break;case 3:n.depthFunc(n.LEQUAL);break;case 4:n.depthFunc(n.EQUAL);break;case 5:n.depthFunc(n.GEQUAL);break;case 6:n.depthFunc(n.GREATER);break;case 7:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}A=Y}},setLocked:function(Y){y=Y},setClear:function(Y){te!==Y&&(te=Y,G&&(Y=1-Y),n.clearDepth(Y))},reset:function(){y=!1,V=null,A=null,te=null,G=!1}}},r=new function(){let y=!1,G=null,V=null,A=null,te=null,Y=null,ie=null,de=null,ve=null;return{setTest:function(ae){y||(ae?B(n.STENCIL_TEST):le(n.STENCIL_TEST))},setMask:function(ae){G===ae||y||(n.stencilMask(ae),G=ae)},setFunc:function(ae,Pe,xe){V===ae&&A===Pe&&te===xe||(n.stencilFunc(ae,Pe,xe),V=ae,A=Pe,te=xe)},setOp:function(ae,Pe,xe){Y===ae&&ie===Pe&&de===xe||(n.stencilOp(ae,Pe,xe),Y=ae,ie=Pe,de=xe)},setLocked:function(ae){y=ae},setClear:function(ae){ve!==ae&&(n.clearStencil(ae),ve=ae)},reset:function(){y=!1,G=null,V=null,A=null,te=null,Y=null,ie=null,de=null,ve=null}}},a=new WeakMap,s=new WeakMap;let c={},l={},o={},u=new WeakMap,p=[],f=null,d=!1,M=null,m=null,E=null,_=null,v=null,C=null,U=null,P=new je(0,0,0),T=0,F=!1,W=null,L=null,O=null,Q=null,z=null;const ne=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let R=!1,H=0;const J=n.getParameter(n.VERSION);J.indexOf("WebGL")!==-1?(H=parseFloat(/^WebGL (\d)/.exec(J)[1]),R=H>=1):J.indexOf("OpenGL ES")!==-1&&(H=parseFloat(/^OpenGL ES (\d)/.exec(J)[1]),R=H>=2);let j=null,pe={};const ge=n.getParameter(n.SCISSOR_BOX),Le=n.getParameter(n.VIEWPORT),Ae=new ft().fromArray(ge),Te=new ft().fromArray(Le);function oe(y,G,V,A){const te=new Uint8Array(4),Y=n.createTexture();n.bindTexture(y,Y),n.texParameteri(y,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(y,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let ie=0;ie<V;ie++)y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY?n.texImage3D(G,0,n.RGBA,1,1,A,0,n.RGBA,n.UNSIGNED_BYTE,te):n.texImage2D(G+ie,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,te);return Y}const ue={};function B(y){c[y]!==!0&&(n.enable(y),c[y]=!0)}function le(y){c[y]!==!1&&(n.disable(y),c[y]=!1)}ue[n.TEXTURE_2D]=oe(n.TEXTURE_2D,n.TEXTURE_2D,1),ue[n.TEXTURE_CUBE_MAP]=oe(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[n.TEXTURE_2D_ARRAY]=oe(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),ue[n.TEXTURE_3D]=oe(n.TEXTURE_3D,n.TEXTURE_3D,1,1),t.setClear(0,0,0,1),i.setClear(1),r.setClear(0),B(n.DEPTH_TEST),i.setFunc(3),S(!1),D(1),B(n.CULL_FACE),b(0);const ye={100:n.FUNC_ADD,101:n.FUNC_SUBTRACT,102:n.FUNC_REVERSE_SUBTRACT};ye[103]=n.MIN,ye[104]=n.MAX;const N={200:n.ZERO,201:n.ONE,202:n.SRC_COLOR,204:n.SRC_ALPHA,210:n.SRC_ALPHA_SATURATE,208:n.DST_COLOR,206:n.DST_ALPHA,203:n.ONE_MINUS_SRC_COLOR,205:n.ONE_MINUS_SRC_ALPHA,209:n.ONE_MINUS_DST_COLOR,207:n.ONE_MINUS_DST_ALPHA,211:n.CONSTANT_COLOR,212:n.ONE_MINUS_CONSTANT_COLOR,213:n.CONSTANT_ALPHA,214:n.ONE_MINUS_CONSTANT_ALPHA};function b(y,G,V,A,te,Y,ie,de,ve,ae){if(y!==0){if(d===!1&&(B(n.BLEND),d=!0),y===5)te=te||G,Y=Y||V,ie=ie||A,G===m&&te===v||(n.blendEquationSeparate(ye[G],ye[te]),m=G,v=te),V===E&&A===_&&Y===C&&ie===U||(n.blendFuncSeparate(N[V],N[A],N[Y],N[ie]),E=V,_=A,C=Y,U=ie),de.equals(P)!==!1&&ve===T||(n.blendColor(de.r,de.g,de.b,ve),P.copy(de),T=ve),M=y,F=!1;else if(y!==M||ae!==F){if(m===100&&v===100||(n.blendEquation(n.FUNC_ADD),m=100,v=100),ae)switch(y){case 1:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:n.blendFunc(n.ONE,n.ONE);break;case 3:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case 4:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Je("WebGLState: Invalid blending: ",y)}else switch(y){case 1:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case 3:Je("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case 4:Je("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Je("WebGLState: Invalid blending: ",y)}E=null,_=null,C=null,U=null,P.set(0,0,0),T=0,M=y,F=ae}}else d===!0&&(le(n.BLEND),d=!1)}function S(y){W!==y&&(y?n.frontFace(n.CW):n.frontFace(n.CCW),W=y)}function D(y){y!==0?(B(n.CULL_FACE),y!==L&&(y===1?n.cullFace(n.BACK):y===2?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):le(n.CULL_FACE),L=y}function q(y,G,V){y?(B(n.POLYGON_OFFSET_FILL),Q===G&&z===V||(Q=G,z=V,i.getReversed()&&(G=-G),n.polygonOffset(G,V))):le(n.POLYGON_OFFSET_FILL)}return{buffers:{color:t,depth:i,stencil:r},enable:B,disable:le,bindFramebuffer:function(y,G){return o[y]!==G&&(n.bindFramebuffer(y,G),o[y]=G,y===n.DRAW_FRAMEBUFFER&&(o[n.FRAMEBUFFER]=G),y===n.FRAMEBUFFER&&(o[n.DRAW_FRAMEBUFFER]=G),!0)},drawBuffers:function(y,G){let V=p,A=!1;if(y){V=u.get(G),V===void 0&&(V=[],u.set(G,V));const te=y.textures;if(V.length!==te.length||V[0]!==n.COLOR_ATTACHMENT0){for(let Y=0,ie=te.length;Y<ie;Y++)V[Y]=n.COLOR_ATTACHMENT0+Y;V.length=te.length,A=!0}}else V[0]!==n.BACK&&(V[0]=n.BACK,A=!0);A&&n.drawBuffers(V)},useProgram:function(y){return f!==y&&(n.useProgram(y),f=y,!0)},setBlending:b,setMaterial:function(y,G){y.side===2?le(n.CULL_FACE):B(n.CULL_FACE);let V=y.side===1;G&&(V=!V),S(V),y.blending===1&&y.transparent===!1?b(0):b(y.blending,y.blendEquation,y.blendSrc,y.blendDst,y.blendEquationAlpha,y.blendSrcAlpha,y.blendDstAlpha,y.blendColor,y.blendAlpha,y.premultipliedAlpha),i.setFunc(y.depthFunc),i.setTest(y.depthTest),i.setMask(y.depthWrite),t.setMask(y.colorWrite);const A=y.stencilWrite;r.setTest(A),A&&(r.setMask(y.stencilWriteMask),r.setFunc(y.stencilFunc,y.stencilRef,y.stencilFuncMask),r.setOp(y.stencilFail,y.stencilZFail,y.stencilZPass)),q(y.polygonOffset,y.polygonOffsetFactor,y.polygonOffsetUnits),y.alphaToCoverage===!0?B(n.SAMPLE_ALPHA_TO_COVERAGE):le(n.SAMPLE_ALPHA_TO_COVERAGE)},setFlipSided:S,setCullFace:D,setLineWidth:function(y){y!==O&&(R&&n.lineWidth(y),O=y)},setPolygonOffset:q,setScissorTest:function(y){y?B(n.SCISSOR_TEST):le(n.SCISSOR_TEST)},activeTexture:function(y){y===void 0&&(y=n.TEXTURE0+ne-1),j!==y&&(n.activeTexture(y),j=y)},bindTexture:function(y,G,V){V===void 0&&(V=j===null?n.TEXTURE0+ne-1:j);let A=pe[V];A===void 0&&(A={type:void 0,texture:void 0},pe[V]=A),A.type===y&&A.texture===G||(j!==V&&(n.activeTexture(V),j=V),n.bindTexture(y,G||ue[y]),A.type=y,A.texture=G)},unbindTexture:function(){const y=pe[j];y!==void 0&&y.type!==void 0&&(n.bindTexture(y.type,null),y.type=void 0,y.texture=void 0)},compressedTexImage2D:function(){try{n.compressedTexImage2D(...arguments)}catch(y){Je("WebGLState:",y)}},compressedTexImage3D:function(){try{n.compressedTexImage3D(...arguments)}catch(y){Je("WebGLState:",y)}},texImage2D:function(){try{n.texImage2D(...arguments)}catch(y){Je("WebGLState:",y)}},texImage3D:function(){try{n.texImage3D(...arguments)}catch(y){Je("WebGLState:",y)}},pixelStorei:function(y,G){l[y]!==G&&(n.pixelStorei(y,G),l[y]=G)},getParameter:function(y){return l[y]!==void 0?l[y]:n.getParameter(y)},updateUBOMapping:function(y,G){let V=s.get(G);V===void 0&&(V=new WeakMap,s.set(G,V));let A=V.get(y);A===void 0&&(A=n.getUniformBlockIndex(G,y.name),V.set(y,A))},uniformBlockBinding:function(y,G){const V=s.get(G).get(y);a.get(G)!==V&&(n.uniformBlockBinding(G,V,y.__bindingPointIndex),a.set(G,V))},texStorage2D:function(){try{n.texStorage2D(...arguments)}catch(y){Je("WebGLState:",y)}},texStorage3D:function(){try{n.texStorage3D(...arguments)}catch(y){Je("WebGLState:",y)}},texSubImage2D:function(){try{n.texSubImage2D(...arguments)}catch(y){Je("WebGLState:",y)}},texSubImage3D:function(){try{n.texSubImage3D(...arguments)}catch(y){Je("WebGLState:",y)}},compressedTexSubImage2D:function(){try{n.compressedTexSubImage2D(...arguments)}catch(y){Je("WebGLState:",y)}},compressedTexSubImage3D:function(){try{n.compressedTexSubImage3D(...arguments)}catch(y){Je("WebGLState:",y)}},scissor:function(y){Ae.equals(y)===!1&&(n.scissor(y.x,y.y,y.z,y.w),Ae.copy(y))},viewport:function(y){Te.equals(y)===!1&&(n.viewport(y.x,y.y,y.z,y.w),Te.copy(y))},reset:function(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),i.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),c={},l={},j=null,pe={},o={},u=new WeakMap,p=[],f=null,d=!1,M=null,m=null,E=null,_=null,v=null,C=null,U=null,P=new je(0,0,0),T=0,F=!1,W=null,L=null,O=null,Q=null,z=null,Ae.set(0,0,n.canvas.width,n.canvas.height),Te.set(0,0,n.canvas.width,n.canvas.height),t.reset(),i.reset(),r.reset()}}}function dc(n,e,t,i,r,a,s){const c=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator<"u"&&/OculusBrowser/g.test(navigator.userAgent),o=new tt,u=new WeakMap,p=new Set;let f;const d=new WeakMap;let M=!1;try{M=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(b,S){return M?new OffscreenCanvas(b,S):dr("canvas")}function E(b,S,D){let q=1;const y=N(b);if((y.width>D||y.height>D)&&(q=D/Math.max(y.width,y.height)),q<1){if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const G=Math.floor(q*y.width),V=Math.floor(q*y.height);f===void 0&&(f=m(G,V));const A=S?m(G,V):f;return A.width=G,A.height=V,A.getContext("2d").drawImage(b,0,0,G,V),Oe("WebGLRenderer: Texture has been resized from ("+y.width+"x"+y.height+") to ("+G+"x"+V+")."),A}return"data"in b&&Oe("WebGLRenderer: Image in DataTexture is too big ("+y.width+"x"+y.height+")."),b}return b}function _(b){return b.generateMipmaps}function v(b){n.generateMipmap(b)}function C(b){return b.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?n.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function U(b,S,D,q,y,G=!1){if(b!==null){if(n[b]!==void 0)return n[b];Oe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let V;q&&(V=e.get("EXT_texture_norm16"),V||Oe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let A=S;if(S===n.RED&&(D===n.FLOAT&&(A=n.R32F),D===n.HALF_FLOAT&&(A=n.R16F),D===n.UNSIGNED_BYTE&&(A=n.R8),D===n.UNSIGNED_SHORT&&V&&(A=V.R16_EXT),D===n.SHORT&&V&&(A=V.R16_SNORM_EXT)),S===n.RED_INTEGER&&(D===n.UNSIGNED_BYTE&&(A=n.R8UI),D===n.UNSIGNED_SHORT&&(A=n.R16UI),D===n.UNSIGNED_INT&&(A=n.R32UI),D===n.BYTE&&(A=n.R8I),D===n.SHORT&&(A=n.R16I),D===n.INT&&(A=n.R32I)),S===n.RG&&(D===n.FLOAT&&(A=n.RG32F),D===n.HALF_FLOAT&&(A=n.RG16F),D===n.UNSIGNED_BYTE&&(A=n.RG8),D===n.UNSIGNED_SHORT&&V&&(A=V.RG16_EXT),D===n.SHORT&&V&&(A=V.RG16_SNORM_EXT)),S===n.RG_INTEGER&&(D===n.UNSIGNED_BYTE&&(A=n.RG8UI),D===n.UNSIGNED_SHORT&&(A=n.RG16UI),D===n.UNSIGNED_INT&&(A=n.RG32UI),D===n.BYTE&&(A=n.RG8I),D===n.SHORT&&(A=n.RG16I),D===n.INT&&(A=n.RG32I)),S===n.RGB_INTEGER&&(D===n.UNSIGNED_BYTE&&(A=n.RGB8UI),D===n.UNSIGNED_SHORT&&(A=n.RGB16UI),D===n.UNSIGNED_INT&&(A=n.RGB32UI),D===n.BYTE&&(A=n.RGB8I),D===n.SHORT&&(A=n.RGB16I),D===n.INT&&(A=n.RGB32I)),S===n.RGBA_INTEGER&&(D===n.UNSIGNED_BYTE&&(A=n.RGBA8UI),D===n.UNSIGNED_SHORT&&(A=n.RGBA16UI),D===n.UNSIGNED_INT&&(A=n.RGBA32UI),D===n.BYTE&&(A=n.RGBA8I),D===n.SHORT&&(A=n.RGBA16I),D===n.INT&&(A=n.RGBA32I)),S===n.RGB&&(D===n.UNSIGNED_SHORT&&V&&(A=V.RGB16_EXT),D===n.SHORT&&V&&(A=V.RGB16_SNORM_EXT),D===n.UNSIGNED_INT_5_9_9_9_REV&&(A=n.RGB9_E5),D===n.UNSIGNED_INT_10F_11F_11F_REV&&(A=n.R11F_G11F_B10F)),S===n.RGBA){const te=G?ur:Ze.getTransfer(y);D===n.FLOAT&&(A=n.RGBA32F),D===n.HALF_FLOAT&&(A=n.RGBA16F),D===n.UNSIGNED_BYTE&&(A=te===it?n.SRGB8_ALPHA8:n.RGBA8),D===n.UNSIGNED_SHORT&&V&&(A=V.RGBA16_EXT),D===n.SHORT&&V&&(A=V.RGBA16_SNORM_EXT),D===n.UNSIGNED_SHORT_4_4_4_4&&(A=n.RGBA4),D===n.UNSIGNED_SHORT_5_5_5_1&&(A=n.RGB5_A1)}return A!==n.R16F&&A!==n.R32F&&A!==n.RG16F&&A!==n.RG32F&&A!==n.RGBA16F&&A!==n.RGBA32F||e.get("EXT_color_buffer_float"),A}function P(b,S){let D;return b?S===null||S===1014||S===1020?D=n.DEPTH24_STENCIL8:S===1015?D=n.DEPTH32F_STENCIL8:S===1012&&(D=n.DEPTH24_STENCIL8,Oe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===1014||S===1020?D=n.DEPTH_COMPONENT24:S===1015?D=n.DEPTH_COMPONENT32F:S===1012&&(D=n.DEPTH_COMPONENT16),D}function T(b,S){return _(b)===!0||b.isFramebufferTexture&&b.minFilter!==1003&&b.minFilter!==1006?Math.log2(Math.max(S.width,S.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?S.mipmaps.length:1}function F(b){const S=b.target;S.removeEventListener("dispose",F),(function(D){const q=i.get(D);if(q.__webglInit===void 0)return;const y=D.source,G=d.get(y);if(G){const V=G[q.__cacheKey];V.usedTimes--,V.usedTimes===0&&L(D),Object.keys(G).length===0&&d.delete(y)}i.remove(D)})(S),S.isVideoTexture&&u.delete(S),S.isHTMLTexture&&p.delete(S)}function W(b){const S=b.target;S.removeEventListener("dispose",W),(function(D){const q=i.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),i.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(q.__webglFramebuffer[G]))for(let V=0;V<q.__webglFramebuffer[G].length;V++)n.deleteFramebuffer(q.__webglFramebuffer[G][V]);else n.deleteFramebuffer(q.__webglFramebuffer[G]);q.__webglDepthbuffer&&n.deleteRenderbuffer(q.__webglDepthbuffer[G])}else{if(Array.isArray(q.__webglFramebuffer))for(let G=0;G<q.__webglFramebuffer.length;G++)n.deleteFramebuffer(q.__webglFramebuffer[G]);else n.deleteFramebuffer(q.__webglFramebuffer);if(q.__webglDepthbuffer&&n.deleteRenderbuffer(q.__webglDepthbuffer),q.__webglMultisampledFramebuffer&&n.deleteFramebuffer(q.__webglMultisampledFramebuffer),q.__webglColorRenderbuffer)for(let G=0;G<q.__webglColorRenderbuffer.length;G++)q.__webglColorRenderbuffer[G]&&n.deleteRenderbuffer(q.__webglColorRenderbuffer[G]);q.__webglDepthRenderbuffer&&n.deleteRenderbuffer(q.__webglDepthRenderbuffer)}const y=D.textures;for(let G=0,V=y.length;G<V;G++){const A=i.get(y[G]);A.__webglTexture&&(n.deleteTexture(A.__webglTexture),s.memory.textures--),i.remove(y[G])}i.remove(D)})(S)}function L(b){const S=i.get(b);n.deleteTexture(S.__webglTexture);const D=b.source;delete d.get(D)[S.__cacheKey],s.memory.textures--}let O=0;function Q(b,S){const D=i.get(b);if(b.isVideoTexture&&(function(q){const y=s.render.frame;u.get(q)!==y&&(u.set(q,y),q.update())})(b),b.isRenderTargetTexture===!1&&b.isExternalTexture!==!0&&b.version>0&&D.__version!==b.version){const q=b.image;if(q===null)Oe("WebGLRenderer: Texture marked for update but no image data found.");else{if(q.complete!==!1)return void pe(D,b,S);Oe("WebGLRenderer: Texture marked for update but image is incomplete")}}else b.isExternalTexture&&(D.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,D.__webglTexture,n.TEXTURE0+S)}const z={1e3:n.REPEAT,1001:n.CLAMP_TO_EDGE,1002:n.MIRRORED_REPEAT},ne={1003:n.NEAREST,1004:n.NEAREST_MIPMAP_NEAREST,1005:n.NEAREST_MIPMAP_LINEAR,1006:n.LINEAR,1007:n.LINEAR_MIPMAP_NEAREST,1008:n.LINEAR_MIPMAP_LINEAR},R={512:n.NEVER,519:n.ALWAYS,513:n.LESS,515:n.LEQUAL,514:n.EQUAL,518:n.GEQUAL,516:n.GREATER,517:n.NOTEQUAL};function H(b,S){if(S.type!==1015||e.has("OES_texture_float_linear")!==!1||S.magFilter!==1006&&S.magFilter!==1007&&S.magFilter!==1005&&S.magFilter!==1008&&S.minFilter!==1006&&S.minFilter!==1007&&S.minFilter!==1005&&S.minFilter!==1008||Oe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(b,n.TEXTURE_WRAP_S,z[S.wrapS]),n.texParameteri(b,n.TEXTURE_WRAP_T,z[S.wrapT]),b!==n.TEXTURE_3D&&b!==n.TEXTURE_2D_ARRAY||n.texParameteri(b,n.TEXTURE_WRAP_R,z[S.wrapR]),n.texParameteri(b,n.TEXTURE_MAG_FILTER,ne[S.magFilter]),n.texParameteri(b,n.TEXTURE_MIN_FILTER,ne[S.minFilter]),S.compareFunction&&(n.texParameteri(b,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(b,n.TEXTURE_COMPARE_FUNC,R[S.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===1003||S.minFilter!==1005&&S.minFilter!==1008||S.type===1015&&e.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||i.get(S).__currentAnisotropy){const D=e.get("EXT_texture_filter_anisotropic");n.texParameterf(b,D.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,r.getMaxAnisotropy())),i.get(S).__currentAnisotropy=S.anisotropy}}}function J(b,S){let D=!1;b.__webglInit===void 0&&(b.__webglInit=!0,S.addEventListener("dispose",F));const q=S.source;let y=d.get(q);y===void 0&&(y={},d.set(q,y));const G=(function(V){const A=[];return A.push(V.wrapS),A.push(V.wrapT),A.push(V.wrapR||0),A.push(V.magFilter),A.push(V.minFilter),A.push(V.anisotropy),A.push(V.internalFormat),A.push(V.format),A.push(V.type),A.push(V.generateMipmaps),A.push(V.premultiplyAlpha),A.push(V.flipY),A.push(V.unpackAlignment),A.push(V.colorSpace),A.join()})(S);if(G!==b.__cacheKey){y[G]===void 0&&(y[G]={texture:n.createTexture(),usedTimes:0},s.memory.textures++,D=!0),y[G].usedTimes++;const V=y[b.__cacheKey];V!==void 0&&(y[b.__cacheKey].usedTimes--,V.usedTimes===0&&L(S)),b.__cacheKey=G,b.__webglTexture=y[G].texture}return D}function j(b,S,D){return Math.floor(Math.floor(b/D)/S)}function pe(b,S,D){let q=n.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(q=n.TEXTURE_2D_ARRAY),S.isData3DTexture&&(q=n.TEXTURE_3D);const y=J(b,S),G=S.source;t.bindTexture(q,b.__webglTexture,n.TEXTURE0+D);const V=i.get(G);if(G.version!==V.__version||y===!0){if(t.activeTexture(n.TEXTURE0+D),!(typeof ImageBitmap<"u"&&S.image instanceof ImageBitmap)){const me=Ze.getPrimaries(Ze.workingColorSpace),Ie=S.colorSpace===""?null:Ze.getPrimaries(S.colorSpace),Ye=S.colorSpace===""||me===Ie?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,S.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ye)}t.pixelStorei(n.UNPACK_ALIGNMENT,S.unpackAlignment);let A=E(S.image,!1,r.maxTextureSize);A=ye(S,A);const te=a.convert(S.format,S.colorSpace),Y=a.convert(S.type);let ie,de=U(S.internalFormat,te,Y,S.normalized,S.colorSpace,S.isVideoTexture);H(q,S);const ve=S.mipmaps,ae=S.isVideoTexture!==!0,Pe=V.__version===void 0||y===!0,xe=G.dataReady,Ee=T(S,A);if(S.isDepthTexture)de=P(S.format===1027,S.type),Pe&&(ae?t.texStorage2D(n.TEXTURE_2D,1,de,A.width,A.height):t.texImage2D(n.TEXTURE_2D,0,de,A.width,A.height,0,te,Y,null));else if(S.isDataTexture)if(ve.length>0){ae&&Pe&&t.texStorage2D(n.TEXTURE_2D,Ee,de,ve[0].width,ve[0].height);for(let me=0,Ie=ve.length;me<Ie;me++)ie=ve[me],ae?xe&&t.texSubImage2D(n.TEXTURE_2D,me,0,0,ie.width,ie.height,te,Y,ie.data):t.texImage2D(n.TEXTURE_2D,me,de,ie.width,ie.height,0,te,Y,ie.data);S.generateMipmaps=!1}else ae?(Pe&&t.texStorage2D(n.TEXTURE_2D,Ee,de,A.width,A.height),xe&&(function(me,Ie,Ye,lt){const Ke=me.updateRanges;if(Ke.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,Ie.width,Ie.height,Ye,lt,Ie.data);else{Ke.sort((De,rt)=>De.start-rt.start);let ct=0;for(let De=1;De<Ke.length;De++){const rt=Ke[ct],ht=Ke[De],Ut=rt.start+rt.count,Rt=j(ht.start,Ie.width,4),pt=j(rt.start,Ie.width,4);ht.start<=Ut+1&&Rt===pt&&j(ht.start+ht.count-1,Ie.width,4)===Rt?rt.count=Math.max(rt.count,ht.start+ht.count-rt.start):(++ct,Ke[ct]=ht)}Ke.length=ct+1;const Mt=t.getParameter(n.UNPACK_ROW_LENGTH),Ce=t.getParameter(n.UNPACK_SKIP_PIXELS),We=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,Ie.width);for(let De=0,rt=Ke.length;De<rt;De++){const ht=Ke[De],Ut=Math.floor(ht.start/4),Rt=Math.ceil(ht.count/4),pt=Ut%Ie.width,yt=Math.floor(Ut/Ie.width),vn=Rt;t.pixelStorei(n.UNPACK_SKIP_PIXELS,pt),t.pixelStorei(n.UNPACK_SKIP_ROWS,yt),t.texSubImage2D(n.TEXTURE_2D,0,pt,yt,vn,1,Ye,lt,Ie.data)}me.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,Mt),t.pixelStorei(n.UNPACK_SKIP_PIXELS,Ce),t.pixelStorei(n.UNPACK_SKIP_ROWS,We)}})(S,A,te,Y)):t.texImage2D(n.TEXTURE_2D,0,de,A.width,A.height,0,te,Y,A.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){ae&&Pe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ee,de,ve[0].width,ve[0].height,A.depth);for(let me=0,Ie=ve.length;me<Ie;me++)if(ie=ve[me],S.format!==1023)if(te!==null)if(ae){if(xe)if(S.layerUpdates.size>0){const Ye=ja(ie.width,ie.height,S.format,S.type);for(const lt of S.layerUpdates){const Ke=ie.data.subarray(lt*Ye/ie.data.BYTES_PER_ELEMENT,(lt+1)*Ye/ie.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,me,0,0,lt,ie.width,ie.height,1,te,Ke)}S.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,me,0,0,0,ie.width,ie.height,A.depth,te,ie.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,me,de,ie.width,ie.height,A.depth,0,ie.data,0,0);else Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ae?xe&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,me,0,0,0,ie.width,ie.height,A.depth,te,Y,ie.data):t.texImage3D(n.TEXTURE_2D_ARRAY,me,de,ie.width,ie.height,A.depth,0,te,Y,ie.data)}else{ae&&Pe&&t.texStorage2D(n.TEXTURE_2D,Ee,de,ve[0].width,ve[0].height);for(let me=0,Ie=ve.length;me<Ie;me++)ie=ve[me],S.format!==1023?te!==null?ae?xe&&t.compressedTexSubImage2D(n.TEXTURE_2D,me,0,0,ie.width,ie.height,te,ie.data):t.compressedTexImage2D(n.TEXTURE_2D,me,de,ie.width,ie.height,0,ie.data):Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ae?xe&&t.texSubImage2D(n.TEXTURE_2D,me,0,0,ie.width,ie.height,te,Y,ie.data):t.texImage2D(n.TEXTURE_2D,me,de,ie.width,ie.height,0,te,Y,ie.data)}else if(S.isDataArrayTexture)if(ae){if(Pe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ee,de,A.width,A.height,A.depth),xe)if(S.layerUpdates.size>0){const me=ja(A.width,A.height,S.format,S.type);for(const Ie of S.layerUpdates){const Ye=A.data.subarray(Ie*me/A.data.BYTES_PER_ELEMENT,(Ie+1)*me/A.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Ie,A.width,A.height,1,te,Y,Ye)}S.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,A.width,A.height,A.depth,te,Y,A.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,de,A.width,A.height,A.depth,0,te,Y,A.data);else if(S.isData3DTexture)ae?(Pe&&t.texStorage3D(n.TEXTURE_3D,Ee,de,A.width,A.height,A.depth),xe&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,A.width,A.height,A.depth,te,Y,A.data)):t.texImage3D(n.TEXTURE_3D,0,de,A.width,A.height,A.depth,0,te,Y,A.data);else if(S.isFramebufferTexture){if(Pe)if(ae)t.texStorage2D(n.TEXTURE_2D,Ee,de,A.width,A.height);else{let me=A.width,Ie=A.height;for(let Ye=0;Ye<Ee;Ye++)t.texImage2D(n.TEXTURE_2D,Ye,de,me,Ie,0,te,Y,null),me>>=1,Ie>>=1}}else if(S.isHTMLTexture){if("texElementImage2D"in n){const me=n.canvas;if(me.hasAttribute("layoutsubtree")||me.setAttribute("layoutsubtree","true"),A.parentNode!==me)return me.appendChild(A),p.add(S),me.onpaint=ct=>{const Mt=ct.changedElements;for(const Ce of p)Mt.includes(Ce.image)&&(Ce.needsUpdate=!0)},void me.requestPaint();const Ie=0,Ye=n.RGBA,lt=n.RGBA,Ke=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,Ie,Ye,lt,Ke,A),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(ve.length>0){if(ae&&Pe){const me=N(ve[0]);t.texStorage2D(n.TEXTURE_2D,Ee,de,me.width,me.height)}for(let me=0,Ie=ve.length;me<Ie;me++)ie=ve[me],ae?xe&&t.texSubImage2D(n.TEXTURE_2D,me,0,0,te,Y,ie):t.texImage2D(n.TEXTURE_2D,me,de,te,Y,ie);S.generateMipmaps=!1}else if(ae){if(Pe){const me=N(A);t.texStorage2D(n.TEXTURE_2D,Ee,de,me.width,me.height)}xe&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,te,Y,A)}else t.texImage2D(n.TEXTURE_2D,0,de,te,Y,A);_(S)&&v(q),V.__version=G.version,S.onUpdate&&S.onUpdate(S)}b.__version=S.version}function ge(b,S,D,q,y,G){const V=a.convert(D.format,D.colorSpace),A=a.convert(D.type),te=U(D.internalFormat,V,A,D.normalized,D.colorSpace),Y=i.get(S),ie=i.get(D);if(ie.__renderTarget=S,!Y.__hasExternalTextures){const de=Math.max(1,S.width>>G),ve=Math.max(1,S.height>>G);y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY?t.texImage3D(y,G,te,de,ve,S.depth,0,V,A,null):t.texImage2D(y,G,te,de,ve,0,V,A,null)}t.bindFramebuffer(n.FRAMEBUFFER,b),le(S)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,q,y,ie.__webglTexture,0,B(S)):(y===n.TEXTURE_2D||y>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&y<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,q,y,ie.__webglTexture,G),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Le(b,S,D){if(n.bindRenderbuffer(n.RENDERBUFFER,b),S.depthBuffer){const q=S.depthTexture,y=q&&q.isDepthTexture?q.type:null,G=P(S.stencilBuffer,y),V=S.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;le(S)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,B(S),G,S.width,S.height):D?n.renderbufferStorageMultisample(n.RENDERBUFFER,B(S),G,S.width,S.height):n.renderbufferStorage(n.RENDERBUFFER,G,S.width,S.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,V,n.RENDERBUFFER,b)}else{const q=S.textures;for(let y=0;y<q.length;y++){const G=q[y],V=a.convert(G.format,G.colorSpace),A=a.convert(G.type),te=U(G.internalFormat,V,A,G.normalized,G.colorSpace);le(S)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,B(S),te,S.width,S.height):D?n.renderbufferStorageMultisample(n.RENDERBUFFER,B(S),te,S.width,S.height):n.renderbufferStorage(n.RENDERBUFFER,te,S.width,S.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Ae(b,S,D){const q=S.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,b),!S.depthTexture||!S.depthTexture.isDepthTexture)throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const y=i.get(S.depthTexture);if(y.__renderTarget=S,y.__webglTexture&&S.depthTexture.image.width===S.width&&S.depthTexture.image.height===S.height||(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),q){if(y.__webglInit===void 0&&(y.__webglInit=!0,S.depthTexture.addEventListener("dispose",F)),y.__webglTexture===void 0){y.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,y.__webglTexture),H(n.TEXTURE_CUBE_MAP,S.depthTexture);const Y=a.convert(S.depthTexture.format),ie=a.convert(S.depthTexture.type);let de;S.depthTexture.format===1026?de=n.DEPTH_COMPONENT24:S.depthTexture.format===1027&&(de=n.DEPTH24_STENCIL8);for(let ve=0;ve<6;ve++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0,de,S.width,S.height,0,Y,ie,null)}}else Q(S.depthTexture,0);const G=y.__webglTexture,V=B(S),A=q?n.TEXTURE_CUBE_MAP_POSITIVE_X+D:n.TEXTURE_2D,te=S.depthTexture.format===1027?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(S.depthTexture.format===1026)le(S)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,te,A,G,0,V):n.framebufferTexture2D(n.FRAMEBUFFER,te,A,G,0);else{if(S.depthTexture.format!==1027)throw new Error("Unknown depthTexture format");le(S)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,te,A,G,0,V):n.framebufferTexture2D(n.FRAMEBUFFER,te,A,G,0)}}function Te(b){const S=i.get(b),D=b.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==b.depthTexture){const q=b.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),q){const y=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,q.removeEventListener("dispose",y)};q.addEventListener("dispose",y),S.__depthDisposeCallback=y}S.__boundDepthTexture=q}if(b.depthTexture&&!S.__autoAllocateDepthBuffer)if(D)for(let q=0;q<6;q++)Ae(S.__webglFramebuffer[q],b,q);else{const q=b.texture.mipmaps;q&&q.length>0?Ae(S.__webglFramebuffer[0],b,0):Ae(S.__webglFramebuffer,b,0)}else if(D){S.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(n.FRAMEBUFFER,S.__webglFramebuffer[q]),S.__webglDepthbuffer[q]===void 0)S.__webglDepthbuffer[q]=n.createRenderbuffer(),Le(S.__webglDepthbuffer[q],b,!1);else{const y=b.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,G=S.__webglDepthbuffer[q];n.bindRenderbuffer(n.RENDERBUFFER,G),n.framebufferRenderbuffer(n.FRAMEBUFFER,y,n.RENDERBUFFER,G)}}else{const q=b.texture.mipmaps;if(q&&q.length>0?t.bindFramebuffer(n.FRAMEBUFFER,S.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=n.createRenderbuffer(),Le(S.__webglDepthbuffer,b,!1);else{const y=b.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,G=S.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,G),n.framebufferRenderbuffer(n.FRAMEBUFFER,y,n.RENDERBUFFER,G)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}const oe=[],ue=[];function B(b){return Math.min(r.maxSamples,b.samples)}function le(b){const S=i.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function ye(b,S){const D=b.colorSpace,q=b.format,y=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||D!==cr&&D!==""&&(Ze.getTransfer(D)===it?q===1023&&y===1009||Oe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Je("WebGLTextures: Unsupported texture color space:",D)),S}function N(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(o.width=b.naturalWidth||b.width,o.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(o.width=b.displayWidth,o.height=b.displayHeight):(o.width=b.width,o.height=b.height),o}this.allocateTextureUnit=function(){const b=O;return b>=r.maxTextures&&Oe("WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+r.maxTextures),O+=1,b},this.resetTextureUnits=function(){O=0},this.getTextureUnits=function(){return O},this.setTextureUnits=function(b){O=b},this.setTexture2D=Q,this.setTexture2DArray=function(b,S){const D=i.get(b);b.isRenderTargetTexture===!1&&b.version>0&&D.__version!==b.version?pe(D,b,S):(b.isExternalTexture&&(D.__webglTexture=b.sourceTexture?b.sourceTexture:null),t.bindTexture(n.TEXTURE_2D_ARRAY,D.__webglTexture,n.TEXTURE0+S))},this.setTexture3D=function(b,S){const D=i.get(b);b.isRenderTargetTexture===!1&&b.version>0&&D.__version!==b.version?pe(D,b,S):t.bindTexture(n.TEXTURE_3D,D.__webglTexture,n.TEXTURE0+S)},this.setTextureCube=function(b,S){const D=i.get(b);b.isCubeDepthTexture!==!0&&b.version>0&&D.__version!==b.version?(function(q,y,G){if(y.image.length!==6)return;const V=J(q,y),A=y.source;t.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture,n.TEXTURE0+G);const te=i.get(A);if(A.version!==te.__version||V===!0){t.activeTexture(n.TEXTURE0+G);const Y=Ze.getPrimaries(Ze.workingColorSpace),ie=y.colorSpace===""?null:Ze.getPrimaries(y.colorSpace),de=y.colorSpace===""||Y===ie?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,de);const ve=y.isCompressedTexture||y.image[0].isCompressedTexture,ae=y.image[0]&&y.image[0].isDataTexture,Pe=[];for(let Ce=0;Ce<6;Ce++)Pe[Ce]=ve||ae?ae?y.image[Ce].image:y.image[Ce]:E(y.image[Ce],!0,r.maxCubemapSize),Pe[Ce]=ye(y,Pe[Ce]);const xe=Pe[0],Ee=a.convert(y.format,y.colorSpace),me=a.convert(y.type),Ie=U(y.internalFormat,Ee,me,y.normalized,y.colorSpace),Ye=y.isVideoTexture!==!0,lt=te.__version===void 0||V===!0,Ke=A.dataReady;let ct,Mt=T(y,xe);if(H(n.TEXTURE_CUBE_MAP,y),ve){Ye&&lt&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Mt,Ie,xe.width,xe.height);for(let Ce=0;Ce<6;Ce++){ct=Pe[Ce].mipmaps;for(let We=0;We<ct.length;We++){const De=ct[We];y.format!==1023?Ee!==null?Ye?Ke&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We,0,0,De.width,De.height,Ee,De.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We,Ie,De.width,De.height,0,De.data):Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ye?Ke&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We,0,0,De.width,De.height,Ee,me,De.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We,Ie,De.width,De.height,0,Ee,me,De.data)}}}else{if(ct=y.mipmaps,Ye&&lt){ct.length>0&&Mt++;const Ce=N(Pe[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Mt,Ie,Ce.width,Ce.height)}for(let Ce=0;Ce<6;Ce++)if(ae){Ye?Ke&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,0,0,0,Pe[Ce].width,Pe[Ce].height,Ee,me,Pe[Ce].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,0,Ie,Pe[Ce].width,Pe[Ce].height,0,Ee,me,Pe[Ce].data);for(let We=0;We<ct.length;We++){const De=ct[We].image[Ce].image;Ye?Ke&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We+1,0,0,De.width,De.height,Ee,me,De.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We+1,Ie,De.width,De.height,0,Ee,me,De.data)}}else{Ye?Ke&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,0,0,0,Ee,me,Pe[Ce]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,0,Ie,Ee,me,Pe[Ce]);for(let We=0;We<ct.length;We++){const De=ct[We];Ye?Ke&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We+1,0,0,Ee,me,De.image[Ce]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ce,We+1,Ie,Ee,me,De.image[Ce])}}}_(y)&&v(n.TEXTURE_CUBE_MAP),te.__version=A.version,y.onUpdate&&y.onUpdate(y)}q.__version=y.version})(D,b,S):t.bindTexture(n.TEXTURE_CUBE_MAP,D.__webglTexture,n.TEXTURE0+S)},this.rebindTextures=function(b,S,D){const q=i.get(b);S!==void 0&&ge(q.__webglFramebuffer,b,b.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),D!==void 0&&Te(b)},this.setupRenderTarget=function(b){const S=b.texture,D=i.get(b),q=i.get(S);b.addEventListener("dispose",W);const y=b.textures,G=b.isWebGLCubeRenderTarget===!0,V=y.length>1;if(V||(q.__webglTexture===void 0&&(q.__webglTexture=n.createTexture()),q.__version=S.version,s.memory.textures++),G){D.__webglFramebuffer=[];for(let A=0;A<6;A++)if(S.mipmaps&&S.mipmaps.length>0){D.__webglFramebuffer[A]=[];for(let te=0;te<S.mipmaps.length;te++)D.__webglFramebuffer[A][te]=n.createFramebuffer()}else D.__webglFramebuffer[A]=n.createFramebuffer()}else{if(S.mipmaps&&S.mipmaps.length>0){D.__webglFramebuffer=[];for(let A=0;A<S.mipmaps.length;A++)D.__webglFramebuffer[A]=n.createFramebuffer()}else D.__webglFramebuffer=n.createFramebuffer();if(V)for(let A=0,te=y.length;A<te;A++){const Y=i.get(y[A]);Y.__webglTexture===void 0&&(Y.__webglTexture=n.createTexture(),s.memory.textures++)}if(b.samples>0&&le(b)===!1){D.__webglMultisampledFramebuffer=n.createFramebuffer(),D.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,D.__webglMultisampledFramebuffer);for(let A=0;A<y.length;A++){const te=y[A];D.__webglColorRenderbuffer[A]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,D.__webglColorRenderbuffer[A]);const Y=a.convert(te.format,te.colorSpace),ie=a.convert(te.type),de=U(te.internalFormat,Y,ie,te.normalized,te.colorSpace,b.isXRRenderTarget===!0),ve=B(b);n.renderbufferStorageMultisample(n.RENDERBUFFER,ve,de,b.width,b.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+A,n.RENDERBUFFER,D.__webglColorRenderbuffer[A])}n.bindRenderbuffer(n.RENDERBUFFER,null),b.depthBuffer&&(D.__webglDepthRenderbuffer=n.createRenderbuffer(),Le(D.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(G){t.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),H(n.TEXTURE_CUBE_MAP,S);for(let A=0;A<6;A++)if(S.mipmaps&&S.mipmaps.length>0)for(let te=0;te<S.mipmaps.length;te++)ge(D.__webglFramebuffer[A][te],b,S,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+A,te);else ge(D.__webglFramebuffer[A],b,S,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+A,0);_(S)&&v(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(V){for(let A=0,te=y.length;A<te;A++){const Y=y[A],ie=i.get(Y);let de=n.TEXTURE_2D;(b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(de=b.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(de,ie.__webglTexture),H(de,Y),ge(D.__webglFramebuffer,b,Y,n.COLOR_ATTACHMENT0+A,de,0),_(Y)&&v(de)}t.unbindTexture()}else{let A=n.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(A=b.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(A,q.__webglTexture),H(A,S),S.mipmaps&&S.mipmaps.length>0)for(let te=0;te<S.mipmaps.length;te++)ge(D.__webglFramebuffer[te],b,S,n.COLOR_ATTACHMENT0,A,te);else ge(D.__webglFramebuffer,b,S,n.COLOR_ATTACHMENT0,A,0);_(S)&&v(A),t.unbindTexture()}b.depthBuffer&&Te(b)},this.updateRenderTargetMipmap=function(b){const S=b.textures;for(let D=0,q=S.length;D<q;D++){const y=S[D];if(_(y)){const G=C(b),V=i.get(y).__webglTexture;t.bindTexture(G,V),v(G),t.unbindTexture()}}},this.updateMultisampleRenderTarget=function(b){if(b.samples>0){if(le(b)===!1){const S=b.textures,D=b.width,q=b.height;let y=n.COLOR_BUFFER_BIT;const G=b.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,V=i.get(b),A=S.length>1;if(A)for(let Y=0;Y<S.length;Y++)t.bindFramebuffer(n.FRAMEBUFFER,V.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,V.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,V.__webglMultisampledFramebuffer);const te=b.texture.mipmaps;te&&te.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,V.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,V.__webglFramebuffer);for(let Y=0;Y<S.length;Y++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(y|=n.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(y|=n.STENCIL_BUFFER_BIT)),A){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,V.__webglColorRenderbuffer[Y]);const ie=i.get(S[Y]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,ie,0)}n.blitFramebuffer(0,0,D,q,0,0,D,q,y,n.NEAREST),l===!0&&(oe.length=0,ue.length=0,oe.push(n.COLOR_ATTACHMENT0+Y),b.depthBuffer&&b.resolveDepthBuffer===!1&&(oe.push(G),ue.push(G),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,ue)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,oe))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),A)for(let Y=0;Y<S.length;Y++){t.bindFramebuffer(n.FRAMEBUFFER,V.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,V.__webglColorRenderbuffer[Y]);const ie=i.get(S[Y]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,V.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.TEXTURE_2D,ie,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,V.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&l){const S=b.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[S])}}},this.setupDepthRenderbuffer=Te,this.setupFrameBufferTexture=ge,this.useMultisampledRTT=le,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function hc(n,e){return{convert:function(t,i=""){let r;const a=Ze.getTransfer(i);if(t===1009)return n.UNSIGNED_BYTE;if(t===1017)return n.UNSIGNED_SHORT_4_4_4_4;if(t===1018)return n.UNSIGNED_SHORT_5_5_5_1;if(t===35902)return n.UNSIGNED_INT_5_9_9_9_REV;if(t===35899)return n.UNSIGNED_INT_10F_11F_11F_REV;if(t===1010)return n.BYTE;if(t===1011)return n.SHORT;if(t===1012)return n.UNSIGNED_SHORT;if(t===1013)return n.INT;if(t===1014)return n.UNSIGNED_INT;if(t===1015)return n.FLOAT;if(t===1016)return n.HALF_FLOAT;if(t===1021)return n.ALPHA;if(t===1022)return n.RGB;if(t===1023)return n.RGBA;if(t===1026)return n.DEPTH_COMPONENT;if(t===1027)return n.DEPTH_STENCIL;if(t===1028)return n.RED;if(t===1029)return n.RED_INTEGER;if(t===1030)return n.RG;if(t===1031)return n.RG_INTEGER;if(t===1033)return n.RGBA_INTEGER;if(t===33776||t===33777||t===33778||t===33779)if(a===it){if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r===null)return null;if(t===33776)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(t===33777)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(t===33778)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(t===33779)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else{if(r=e.get("WEBGL_compressed_texture_s3tc"),r===null)return null;if(t===33776)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(t===33777)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(t===33778)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(t===33779)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}if(t===35840||t===35841||t===35842||t===35843){if(r=e.get("WEBGL_compressed_texture_pvrtc"),r===null)return null;if(t===35840)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(t===35841)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(t===35842)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(t===35843)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}if(t===36196||t===37492||t===37496||t===37488||t===37489||t===37490||t===37491){if(r=e.get("WEBGL_compressed_texture_etc"),r===null)return null;if(t===36196||t===37492)return a===it?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(t===37496)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(t===37488)return r.COMPRESSED_R11_EAC;if(t===37489)return r.COMPRESSED_SIGNED_R11_EAC;if(t===37490)return r.COMPRESSED_RG11_EAC;if(t===37491)return r.COMPRESSED_SIGNED_RG11_EAC}if(t===37808||t===37809||t===37810||t===37811||t===37812||t===37813||t===37814||t===37815||t===37816||t===37817||t===37818||t===37819||t===37820||t===37821){if(r=e.get("WEBGL_compressed_texture_astc"),r===null)return null;if(t===37808)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(t===37809)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(t===37810)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(t===37811)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(t===37812)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(t===37813)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(t===37814)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(t===37815)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(t===37816)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(t===37817)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(t===37818)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(t===37819)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(t===37820)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(t===37821)return a===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}if(t===36492||t===36494||t===36495){if(r=e.get("EXT_texture_compression_bptc"),r===null)return null;if(t===36492)return a===it?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(t===36494)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(t===36495)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}if(t===36283||t===36284||t===36285||t===36286){if(r=e.get("EXT_texture_compression_rgtc"),r===null)return null;if(t===36283)return r.COMPRESSED_RED_RGTC1_EXT;if(t===36284)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(t===36285)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(t===36286)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}return t===1020?n.UNSIGNED_INT_24_8:n[t]!==void 0?n[t]:null}}}class pc{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new As(e.texture);e.depthNear===t.depthNear&&e.depthFar===t.depthFar||(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new un({vertexShader:`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,fragmentShader:`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new $t(new _r(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class fc extends In{constructor(e,t){super();const i=this;let r=null,a=1,s=null,c="local-floor",l=1,o=null,u=null,p=null,f=null,d=null,M=null;const m=typeof XRWebGLBinding<"u",E=new pc,_={},v=t.getContextAttributes();let C=null,U=null;const P=[],T=[],F=new tt;let W=null;const L=new Wt;L.viewport=new ft;const O=new Wt;O.viewport=new ft;const Q=[L,O],z=new wo;let ne=null,R=null;function H(oe){const ue=T.indexOf(oe.inputSource);if(ue===-1)return;const B=P[ue];B!==void 0&&(B.update(oe.inputSource,oe.frame,o||s),B.dispatchEvent({type:oe.type,data:oe.inputSource}))}function J(){r.removeEventListener("select",H),r.removeEventListener("selectstart",H),r.removeEventListener("selectend",H),r.removeEventListener("squeeze",H),r.removeEventListener("squeezestart",H),r.removeEventListener("squeezeend",H),r.removeEventListener("end",J),r.removeEventListener("inputsourceschange",j);for(let oe=0;oe<P.length;oe++){const ue=T[oe];ue!==null&&(T[oe]=null,P[oe].disconnect(ue))}ne=null,R=null,E.reset();for(const oe in _)delete _[oe];e.setRenderTarget(C),d=null,f=null,p=null,r=null,U=null,Te.stop(),i.isPresenting=!1,e.setPixelRatio(W),e.setSize(F.width,F.height,!1),i.dispatchEvent({type:"sessionend"})}function j(oe){for(let ue=0;ue<oe.removed.length;ue++){const B=oe.removed[ue],le=T.indexOf(B);le>=0&&(T[le]=null,P[le].disconnect(B))}for(let ue=0;ue<oe.added.length;ue++){const B=oe.added[ue];let le=T.indexOf(B);if(le===-1){for(let N=0;N<P.length;N++){if(N>=T.length){T.push(B),le=N;break}if(T[N]===null){T[N]=B,le=N;break}}if(le===-1)break}const ye=P[le];ye&&ye.connect(B)}}this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(oe){let ue=P[oe];return ue===void 0&&(ue=new wr,P[oe]=ue),ue.getTargetRaySpace()},this.getControllerGrip=function(oe){let ue=P[oe];return ue===void 0&&(ue=new wr,P[oe]=ue),ue.getGripSpace()},this.getHand=function(oe){let ue=P[oe];return ue===void 0&&(ue=new wr,P[oe]=ue),ue.getHandSpace()},this.setFramebufferScaleFactor=function(oe){a=oe,i.isPresenting===!0&&Oe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(oe){c=oe,i.isPresenting===!0&&Oe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return o||s},this.setReferenceSpace=function(oe){o=oe},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return p===null&&m&&(p=new XRWebGLBinding(r,t)),p},this.getFrame=function(){return M},this.getSession=function(){return r},this.setSession=async function(oe){if(r=oe,r!==null){if(C=e.getRenderTarget(),r.addEventListener("select",H),r.addEventListener("selectstart",H),r.addEventListener("selectend",H),r.addEventListener("squeeze",H),r.addEventListener("squeezestart",H),r.addEventListener("squeezeend",H),r.addEventListener("end",J),r.addEventListener("inputsourceschange",j),v.xrCompatible!==!0&&await t.makeXRCompatible(),W=e.getPixelRatio(),e.getSize(F),m&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,B=null,le=null;v.depth&&(le=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=v.stencil?1027:1026,B=v.stencil?1020:1014);const ye={colorFormat:t.RGBA8,depthFormat:le,scaleFactor:a};p=this.getBinding(),f=p.createProjectionLayer(ye),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),U=new ln(f.textureWidth,f.textureHeight,{format:1023,type:1009,depthTexture:new Qn(f.textureWidth,f.textureHeight,B,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const ue={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:a};d=new XRWebGLLayer(r,t,ue),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),U=new ln(d.framebufferWidth,d.framebufferHeight,{format:1023,type:1009,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}U.isXRRenderTarget=!0,this.setFoveation(l),o=null,s=await r.requestReferenceSpace(c),Te.setContext(r),Te.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return E.getDepthTexture()};const pe=new X,ge=new X;function Le(oe,ue){ue===null?oe.matrixWorld.copy(oe.matrix):oe.matrixWorld.multiplyMatrices(ue.matrixWorld,oe.matrix),oe.matrixWorldInverse.copy(oe.matrixWorld).invert()}this.updateCamera=function(oe){if(r===null)return;let ue=oe.near,B=oe.far;E.texture!==null&&(E.depthNear>0&&(ue=E.depthNear),E.depthFar>0&&(B=E.depthFar)),z.near=O.near=L.near=ue,z.far=O.far=L.far=B,ne===z.near&&R===z.far||(r.updateRenderState({depthNear:z.near,depthFar:z.far}),ne=z.near,R=z.far),z.layers.mask=6|oe.layers.mask,L.layers.mask=-5&z.layers.mask,O.layers.mask=-3&z.layers.mask;const le=oe.parent,ye=z.cameras;Le(z,le);for(let N=0;N<ye.length;N++)Le(ye[N],le);ye.length===2?(function(N,b,S){pe.setFromMatrixPosition(b.matrixWorld),ge.setFromMatrixPosition(S.matrixWorld);const D=pe.distanceTo(ge),q=b.projectionMatrix.elements,y=S.projectionMatrix.elements,G=q[14]/(q[10]-1),V=q[14]/(q[10]+1),A=(q[9]+1)/q[5],te=(q[9]-1)/q[5],Y=(q[8]-1)/q[0],ie=(y[8]+1)/y[0],de=G*Y,ve=G*ie,ae=D/(-Y+ie),Pe=ae*-Y;if(b.matrixWorld.decompose(N.position,N.quaternion,N.scale),N.translateX(Pe),N.translateZ(ae),N.matrixWorld.compose(N.position,N.quaternion,N.scale),N.matrixWorldInverse.copy(N.matrixWorld).invert(),q[10]===-1)N.projectionMatrix.copy(b.projectionMatrix),N.projectionMatrixInverse.copy(b.projectionMatrixInverse);else{const xe=G+ae,Ee=V+ae,me=de-Pe,Ie=ve+(D-Pe),Ye=A*V/Ee*xe,lt=te*V/Ee*xe;N.projectionMatrix.makePerspective(me,Ie,Ye,lt,xe,Ee),N.projectionMatrixInverse.copy(N.projectionMatrix).invert()}})(z,L,O):z.projectionMatrix.copy(L.projectionMatrix),(function(N,b,S){S===null?N.matrix.copy(b.matrixWorld):(N.matrix.copy(S.matrixWorld),N.matrix.invert(),N.matrix.multiply(b.matrixWorld)),N.matrix.decompose(N.position,N.quaternion,N.scale),N.updateMatrixWorld(!0),N.projectionMatrix.copy(b.projectionMatrix),N.projectionMatrixInverse.copy(b.projectionMatrixInverse),N.isPerspectiveCamera&&(N.fov=2*wi*Math.atan(1/N.projectionMatrix.elements[5]),N.zoom=1)})(oe,z,le)},this.getCamera=function(){return z},this.getFoveation=function(){if(f!==null||d!==null)return l},this.setFoveation=function(oe){l=oe,f!==null&&(f.fixedFoveation=oe),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=oe)},this.hasDepthSensing=function(){return E.texture!==null},this.getDepthSensingMesh=function(){return E.getMesh(z)},this.getCameraTexture=function(oe){return _[oe]};let Ae=null;const Te=new Ls;Te.setAnimationLoop(function(oe,ue){if(u=ue.getViewerPose(o||s),M=ue,u!==null){const B=u.views;d!==null&&(e.setRenderTargetFramebuffer(U,d.framebuffer),e.setRenderTarget(U));let le=!1;B.length!==z.cameras.length&&(z.cameras.length=0,le=!0);for(let N=0;N<B.length;N++){const b=B[N];let S=null;if(d!==null)S=d.getViewport(b);else{const q=p.getViewSubImage(f,b);S=q.viewport,N===0&&(e.setRenderTargetTextures(U,q.colorTexture,q.depthStencilTexture),e.setRenderTarget(U))}let D=Q[N];D===void 0&&(D=new Wt,D.layers.enable(N),D.viewport=new ft,Q[N]=D),D.matrix.fromArray(b.transform.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale),D.projectionMatrix.fromArray(b.projectionMatrix),D.projectionMatrixInverse.copy(D.projectionMatrix).invert(),D.viewport.set(S.x,S.y,S.width,S.height),N===0&&(z.matrix.copy(D.matrix),z.matrix.decompose(z.position,z.quaternion,z.scale)),le===!0&&z.cameras.push(D)}const ye=r.enabledFeatures;if(ye&&ye.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&m){p=i.getBinding();const N=p.getDepthInformation(B[0]);N&&N.isValid&&N.texture&&E.init(N,r.renderState)}if(ye&&ye.includes("camera-access")&&m){e.state.unbindTexture(),p=i.getBinding();for(let N=0;N<B.length;N++){const b=B[N].camera;if(b){let S=_[b];S||(S=new As,_[b]=S);const D=p.getCameraImage(b);S.sourceTexture=D}}}}for(let B=0;B<P.length;B++){const le=T[B],ye=P[B];le!==null&&ye!==void 0&&ye.update(le,ue,o||s)}Ae&&Ae(oe,ue),ue.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ue}),M=null}),this.setAnimationLoop=function(oe){Ae=oe},this.dispose=function(){}}}const mc=new $e,Bs=new Ge;function gc(n,e){function t(r,a){r.matrixAutoUpdate===!0&&r.updateMatrix(),a.value.copy(r.matrix)}function i(r,a){r.opacity.value=a.opacity,a.color&&r.diffuse.value.copy(a.color),a.emissive&&r.emissive.value.copy(a.emissive).multiplyScalar(a.emissiveIntensity),a.map&&(r.map.value=a.map,t(a.map,r.mapTransform)),a.alphaMap&&(r.alphaMap.value=a.alphaMap,t(a.alphaMap,r.alphaMapTransform)),a.bumpMap&&(r.bumpMap.value=a.bumpMap,t(a.bumpMap,r.bumpMapTransform),r.bumpScale.value=a.bumpScale,a.side===1&&(r.bumpScale.value*=-1)),a.normalMap&&(r.normalMap.value=a.normalMap,t(a.normalMap,r.normalMapTransform),r.normalScale.value.copy(a.normalScale),a.side===1&&r.normalScale.value.negate()),a.displacementMap&&(r.displacementMap.value=a.displacementMap,t(a.displacementMap,r.displacementMapTransform),r.displacementScale.value=a.displacementScale,r.displacementBias.value=a.displacementBias),a.emissiveMap&&(r.emissiveMap.value=a.emissiveMap,t(a.emissiveMap,r.emissiveMapTransform)),a.specularMap&&(r.specularMap.value=a.specularMap,t(a.specularMap,r.specularMapTransform)),a.alphaTest>0&&(r.alphaTest.value=a.alphaTest);const s=e.get(a),c=s.envMap,l=s.envMapRotation;c&&(r.envMap.value=c,r.envMapRotation.value.setFromMatrix4(mc.makeRotationFromEuler(l)).transpose(),c.isCubeTexture&&c.isRenderTargetTexture===!1&&r.envMapRotation.value.premultiply(Bs),r.reflectivity.value=a.reflectivity,r.ior.value=a.ior,r.refractionRatio.value=a.refractionRatio),a.lightMap&&(r.lightMap.value=a.lightMap,r.lightMapIntensity.value=a.lightMapIntensity,t(a.lightMap,r.lightMapTransform)),a.aoMap&&(r.aoMap.value=a.aoMap,r.aoMapIntensity.value=a.aoMapIntensity,t(a.aoMap,r.aoMapTransform))}return{refreshFogUniforms:function(r,a){a.color.getRGB(r.fogColor.value,Rs(n)),a.isFog?(r.fogNear.value=a.near,r.fogFar.value=a.far):a.isFogExp2&&(r.fogDensity.value=a.density)},refreshMaterialUniforms:function(r,a,s,c,l){a.isNodeMaterial?a.uniformsNeedUpdate=!1:a.isMeshBasicMaterial?i(r,a):a.isMeshLambertMaterial?(i(r,a),a.envMap&&(r.envMapIntensity.value=a.envMapIntensity)):a.isMeshToonMaterial?(i(r,a),(function(o,u){u.gradientMap&&(o.gradientMap.value=u.gradientMap)})(r,a)):a.isMeshPhongMaterial?(i(r,a),(function(o,u){o.specular.value.copy(u.specular),o.shininess.value=Math.max(u.shininess,1e-4)})(r,a),a.envMap&&(r.envMapIntensity.value=a.envMapIntensity)):a.isMeshStandardMaterial?(i(r,a),(function(o,u){o.metalness.value=u.metalness,u.metalnessMap&&(o.metalnessMap.value=u.metalnessMap,t(u.metalnessMap,o.metalnessMapTransform)),o.roughness.value=u.roughness,u.roughnessMap&&(o.roughnessMap.value=u.roughnessMap,t(u.roughnessMap,o.roughnessMapTransform)),u.envMap&&(o.envMapIntensity.value=u.envMapIntensity)})(r,a),a.isMeshPhysicalMaterial&&(function(o,u,p){o.ior.value=u.ior,u.sheen>0&&(o.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),o.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(o.sheenColorMap.value=u.sheenColorMap,t(u.sheenColorMap,o.sheenColorMapTransform)),u.sheenRoughnessMap&&(o.sheenRoughnessMap.value=u.sheenRoughnessMap,t(u.sheenRoughnessMap,o.sheenRoughnessMapTransform))),u.clearcoat>0&&(o.clearcoat.value=u.clearcoat,o.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(o.clearcoatMap.value=u.clearcoatMap,t(u.clearcoatMap,o.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(o.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,t(u.clearcoatRoughnessMap,o.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(o.clearcoatNormalMap.value=u.clearcoatNormalMap,t(u.clearcoatNormalMap,o.clearcoatNormalMapTransform),o.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===1&&o.clearcoatNormalScale.value.negate())),u.dispersion>0&&(o.dispersion.value=u.dispersion),u.iridescence>0&&(o.iridescence.value=u.iridescence,o.iridescenceIOR.value=u.iridescenceIOR,o.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],o.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(o.iridescenceMap.value=u.iridescenceMap,t(u.iridescenceMap,o.iridescenceMapTransform)),u.iridescenceThicknessMap&&(o.iridescenceThicknessMap.value=u.iridescenceThicknessMap,t(u.iridescenceThicknessMap,o.iridescenceThicknessMapTransform))),u.transmission>0&&(o.transmission.value=u.transmission,o.transmissionSamplerMap.value=p.texture,o.transmissionSamplerSize.value.set(p.width,p.height),u.transmissionMap&&(o.transmissionMap.value=u.transmissionMap,t(u.transmissionMap,o.transmissionMapTransform)),o.thickness.value=u.thickness,u.thicknessMap&&(o.thicknessMap.value=u.thicknessMap,t(u.thicknessMap,o.thicknessMapTransform)),o.attenuationDistance.value=u.attenuationDistance,o.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(o.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(o.anisotropyMap.value=u.anisotropyMap,t(u.anisotropyMap,o.anisotropyMapTransform))),o.specularIntensity.value=u.specularIntensity,o.specularColor.value.copy(u.specularColor),u.specularColorMap&&(o.specularColorMap.value=u.specularColorMap,t(u.specularColorMap,o.specularColorMapTransform)),u.specularIntensityMap&&(o.specularIntensityMap.value=u.specularIntensityMap,t(u.specularIntensityMap,o.specularIntensityMapTransform))})(r,a,l)):a.isMeshMatcapMaterial?(i(r,a),(function(o,u){u.matcap&&(o.matcap.value=u.matcap)})(r,a)):a.isMeshDepthMaterial?i(r,a):a.isMeshDistanceMaterial?(i(r,a),(function(o,u){const p=e.get(u).light;o.referencePosition.value.setFromMatrixPosition(p.matrixWorld),o.nearDistance.value=p.shadow.camera.near,o.farDistance.value=p.shadow.camera.far})(r,a)):a.isMeshNormalMaterial?i(r,a):a.isLineBasicMaterial?((function(o,u){o.diffuse.value.copy(u.color),o.opacity.value=u.opacity,u.map&&(o.map.value=u.map,t(u.map,o.mapTransform))})(r,a),a.isLineDashedMaterial&&(function(o,u){o.dashSize.value=u.dashSize,o.totalSize.value=u.dashSize+u.gapSize,o.scale.value=u.scale})(r,a)):a.isPointsMaterial?(function(o,u,p,f){o.diffuse.value.copy(u.color),o.opacity.value=u.opacity,o.size.value=u.size*p,o.scale.value=.5*f,u.map&&(o.map.value=u.map,t(u.map,o.uvTransform)),u.alphaMap&&(o.alphaMap.value=u.alphaMap,t(u.alphaMap,o.alphaMapTransform)),u.alphaTest>0&&(o.alphaTest.value=u.alphaTest)})(r,a,s,c):a.isSpriteMaterial?(function(o,u){o.diffuse.value.copy(u.color),o.opacity.value=u.opacity,o.rotation.value=u.rotation,u.map&&(o.map.value=u.map,t(u.map,o.mapTransform)),u.alphaMap&&(o.alphaMap.value=u.alphaMap,t(u.alphaMap,o.alphaMapTransform)),u.alphaTest>0&&(o.alphaTest.value=u.alphaTest)})(r,a):a.isShadowMaterial?(r.color.value.copy(a.color),r.opacity.value=a.opacity):a.isShaderMaterial&&(a.uniformsNeedUpdate=!1)}}}function _c(n,e,t,i){let r={},a={},s=[];const c=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(p,f,d,M){const m=p.value,E=f+"_"+d;if(M[E]===void 0)return typeof m=="number"||typeof m=="boolean"?M[E]=m:ArrayBuffer.isView(m)?M[E]=m.slice():M[E]=m.clone(),!0;{const _=M[E];if(typeof m=="number"||typeof m=="boolean"){if(_!==m)return M[E]=m,!0}else{if(ArrayBuffer.isView(m))return!0;if(_.equals(m)===!1)return _.copy(m),!0}}return!1}function o(p){const f={boundary:0,storage:0};return typeof p=="number"||typeof p=="boolean"?(f.boundary=4,f.storage=4):p.isVector2?(f.boundary=8,f.storage=8):p.isVector3||p.isColor?(f.boundary=16,f.storage=12):p.isVector4?(f.boundary=16,f.storage=16):p.isMatrix3?(f.boundary=48,f.storage=48):p.isMatrix4?(f.boundary=64,f.storage=64):p.isTexture?Oe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(p)?(f.boundary=16,f.storage=p.byteLength):Oe("WebGLRenderer: Unsupported uniform value type.",p),f}function u(p){const f=p.target;f.removeEventListener("dispose",u);const d=s.indexOf(f.__bindingPointIndex);s.splice(d,1),n.deleteBuffer(r[f.id]),delete r[f.id],delete a[f.id]}return{bind:function(p,f){const d=f.program;i.uniformBlockBinding(p,d)},update:function(p,f){let d=r[p.id];d===void 0&&((function(E){const _=E.uniforms;let v=0;const C=16;for(let P=0,T=_.length;P<T;P++){const F=Array.isArray(_[P])?_[P]:[_[P]];for(let W=0,L=F.length;W<L;W++){const O=F[W],Q=Array.isArray(O.value)?O.value:[O.value];for(let z=0,ne=Q.length;z<ne;z++){const R=o(Q[z]),H=v%C,J=H%R.boundary,j=H+J;v+=J,j!==0&&C-j<R.storage&&(v+=C-j),O.__data=new Float32Array(R.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=v,v+=R.storage}}}const U=v%C;U>0&&(v+=C-U),E.__size=v,E.__cache={}})(p),d=(function(E){const _=(function(){for(let P=0;P<c;P++)if(s.indexOf(P)===-1)return s.push(P),P;return Je("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0})();E.__bindingPointIndex=_;const v=n.createBuffer(),C=E.__size,U=E.usage;return n.bindBuffer(n.UNIFORM_BUFFER,v),n.bufferData(n.UNIFORM_BUFFER,C,U),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,_,v),v})(p),r[p.id]=d,p.addEventListener("dispose",u));const M=f.program;i.updateUBOMapping(p,M);const m=e.render.frame;a[p.id]!==m&&((function(E){const _=r[E.id],v=E.uniforms,C=E.__cache;n.bindBuffer(n.UNIFORM_BUFFER,_);for(let U=0,P=v.length;U<P;U++){const T=Array.isArray(v[U])?v[U]:[v[U]];for(let F=0,W=T.length;F<W;F++){const L=T[F];if(l(L,U,F,C)===!0){const O=L.__offset,Q=Array.isArray(L.value)?L.value:[L.value];let z=0;for(let ne=0;ne<Q.length;ne++){const R=Q[ne],H=o(R);typeof R=="number"||typeof R=="boolean"?(L.__data[0]=R,n.bufferSubData(n.UNIFORM_BUFFER,O+z,L.__data)):R.isMatrix3?(L.__data[0]=R.elements[0],L.__data[1]=R.elements[1],L.__data[2]=R.elements[2],L.__data[3]=0,L.__data[4]=R.elements[3],L.__data[5]=R.elements[4],L.__data[6]=R.elements[5],L.__data[7]=0,L.__data[8]=R.elements[6],L.__data[9]=R.elements[7],L.__data[10]=R.elements[8],L.__data[11]=0):ArrayBuffer.isView(R)?L.__data.set(new R.constructor(R.buffer,R.byteOffset,L.__data.length)):(R.toArray(L.__data,z),z+=H.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,O,L.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)})(p),a[p.id]=m)},dispose:function(){for(const p in r)n.deleteBuffer(r[p]);s=[],r={},a={}}}}Bs.set(-1,0,0,0,1,0,0,0,1);const vc=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let sn=null;class xc{constructor(e={}){const{canvas:t=Hs(),context:i=null,depth:r=!0,stencil:a=!1,alpha:s=!1,antialias:c=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:o=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:f=!1,outputBufferType:d=1009}=e;let M;if(this.isWebGLRenderer=!0,i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");M=i.getContextAttributes().alpha}else M=s;const m=d,E=new Set([1033,1031,1029]),_=new Set([1009,1014,1012,1020,1017,1018]),v=new Uint32Array(4),C=new Int32Array(4),U=new X;let P=null,T=null;const F=[],W=[];let L=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const O=this;let Q=!1,z=null;this._outputColorSpace=It;let ne=0,R=0,H=null,J=-1,j=null;const pe=new ft,ge=new ft;let Le=null;const Ae=new je(0);let Te=0,oe=t.width,ue=t.height,B=1,le=null,ye=null;const N=new ft(0,0,oe,ue),b=new ft(0,0,oe,ue);let S=!1;const D=new ca;let q=!1,y=!1;const G=new $e,V=new X,A=new ft,te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Y=!1;function ie(){return H===null?B:1}let de,ve,ae,Pe,xe,Ee,me,Ie,Ye,lt,Ke,ct,Mt,Ce,We,De,rt,ht,Ut,Rt,pt,yt,vn,x=i;function Ai(g,I){return t.getContext(g,I)}try{const g={alpha:!0,depth:r,stencil:a,antialias:c,premultipliedAlpha:l,preserveDrawingBuffer:o,powerPreference:u,failIfMajorPerformanceCaveat:p};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r184"),t.addEventListener("webglcontextlost",Ci,!1),t.addEventListener("webglcontextrestored",Pi,!1),t.addEventListener("webglcontextcreationerror",oi,!1),x===null){const I="webgl2";if(x=Ai(I,g),x===null)throw Ai(I)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(g){throw Je("WebGLRenderer: "+g.message),g}function Ri(){de=new Bo(x),de.init(),pt=new hc(x,de),ve=new Uo(x,de,e,pt),ae=new uc(x,de),ve.reversedDepthBuffer&&f&&ae.buffers.depth.setReversed(!0),Pe=new Vo(x),xe=new Ql,Ee=new dc(x,de,ae,xe,ve,pt,Pe),me=new Oo(O),Ie=new Co(x),yt=new Io(x,Ie),Ye=new zo(x,Ie,Pe,yt),lt=new Wo(x,Ye,Ie,yt,Pe),ht=new Go(x,ve,Ee),We=new No(xe),Ke=new Jl(O,me,de,ve,yt,We),ct=new gc(O,xe),Mt=new tc,Ce=new sc(de),rt=new Lo(O,me,ae,lt,M,l),De=new cc(O,lt,ve),vn=new _c(x,Pe,ve,ae),Ut=new Do(x,de,Pe),Rt=new Ho(x,de,Pe),Pe.programs=Ke.programs,O.capabilities=ve,O.extensions=de,O.properties=xe,O.renderLists=Mt,O.shadowMap=De,O.state=ae,O.info=Pe}Ri(),m!==1009&&(L=new $o(m,t.width,t.height,r,a));const ut=new fc(O,x);function Ci(g){g.preventDefault(),xa("WebGLRenderer: Context Lost."),Q=!0}function Pi(){xa("WebGLRenderer: Context Restored."),Q=!1;const g=Pe.autoReset,I=De.enabled,$=De.autoUpdate,ee=De.needsUpdate,Z=De.type;Ri(),Pe.autoReset=g,De.enabled=I,De.autoUpdate=$,De.needsUpdate=ee,De.type=Z}function oi(g){Je("WebGLRenderer: A WebGL context could not be created. Reason: ",g.statusMessage)}function li(g){const I=g.target;I.removeEventListener("dispose",li),(function($){(function(ee){const Z=xe.get(ee).programs;Z!==void 0&&(Z.forEach(function(ce){Ke.releaseProgram(ce)}),ee.isShaderMaterial&&Ke.releaseShaderCache(ee))})($),xe.remove($)})(I)}function Li(g,I,$){g.transparent===!0&&g.side===2&&g.forceSinglePass===!1?(g.side=1,g.needsUpdate=!0,k(g,I,$),g.side=0,g.needsUpdate=!0,k(g,I,$),g.side=2):k(g,I,$)}this.xr=ut,this.getContext=function(){return x},this.getContextAttributes=function(){return x.getContextAttributes()},this.forceContextLoss=function(){const g=de.get("WEBGL_lose_context");g&&g.loseContext()},this.forceContextRestore=function(){const g=de.get("WEBGL_lose_context");g&&g.restoreContext()},this.getPixelRatio=function(){return B},this.setPixelRatio=function(g){g!==void 0&&(B=g,this.setSize(oe,ue,!1))},this.getSize=function(g){return g.set(oe,ue)},this.setSize=function(g,I,$=!0){ut.isPresenting?Oe("WebGLRenderer: Can't change size while VR device is presenting."):(oe=g,ue=I,t.width=Math.floor(g*B),t.height=Math.floor(I*B),$===!0&&(t.style.width=g+"px",t.style.height=I+"px"),L!==null&&L.setSize(t.width,t.height),this.setViewport(0,0,g,I))},this.getDrawingBufferSize=function(g){return g.set(oe*B,ue*B).floor()},this.setDrawingBufferSize=function(g,I,$){oe=g,ue=I,B=$,t.width=Math.floor(g*$),t.height=Math.floor(I*$),this.setViewport(0,0,g,I)},this.setEffects=function(g){if(m!==1009){if(g){for(let I=0;I<g.length;I++)if(g[I].isOutputPass===!0){Oe("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}L.setEffects(g||[])}else Je("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.")},this.getCurrentViewport=function(g){return g.copy(pe)},this.getViewport=function(g){return g.copy(N)},this.setViewport=function(g,I,$,ee){g.isVector4?N.set(g.x,g.y,g.z,g.w):N.set(g,I,$,ee),ae.viewport(pe.copy(N).multiplyScalar(B).round())},this.getScissor=function(g){return g.copy(b)},this.setScissor=function(g,I,$,ee){g.isVector4?b.set(g.x,g.y,g.z,g.w):b.set(g,I,$,ee),ae.scissor(ge.copy(b).multiplyScalar(B).round())},this.getScissorTest=function(){return S},this.setScissorTest=function(g){ae.setScissorTest(S=g)},this.setOpaqueSort=function(g){le=g},this.setTransparentSort=function(g){ye=g},this.getClearColor=function(g){return g.copy(rt.getClearColor())},this.setClearColor=function(){rt.setClearColor(...arguments)},this.getClearAlpha=function(){return rt.getClearAlpha()},this.setClearAlpha=function(){rt.setClearAlpha(...arguments)},this.clear=function(g=!0,I=!0,$=!0){let ee=0;if(g){let Z=!1;if(H!==null){const ce=H.texture.format;Z=E.has(ce)}if(Z){const ce=H.texture.type,he=_.has(ce),fe=rt.getClearColor(),Me=rt.getClearAlpha(),we=fe.r,Ue=fe.g,Ve=fe.b;he?(v[0]=we,v[1]=Ue,v[2]=Ve,v[3]=Me,x.clearBufferuiv(x.COLOR,0,v)):(C[0]=we,C[1]=Ue,C[2]=Ve,C[3]=Me,x.clearBufferiv(x.COLOR,0,C))}else ee|=x.COLOR_BUFFER_BIT}I&&(ee|=x.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),$&&(ee|=x.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),ee!==0&&x.clear(ee)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(g){g.setRenderer(this),z=g},this.dispose=function(){t.removeEventListener("webglcontextlost",Ci,!1),t.removeEventListener("webglcontextrestored",Pi,!1),t.removeEventListener("webglcontextcreationerror",oi,!1),rt.dispose(),Mt.dispose(),Ce.dispose(),xe.dispose(),me.dispose(),lt.dispose(),yt.dispose(),vn.dispose(),Ke.dispose(),ut.dispose(),ut.removeEventListener("sessionstart",Nt),ut.removeEventListener("sessionend",Ii),Ht.stop()},this.renderBufferDirect=function(g,I,$,ee,Z,ce){I===null&&(I=te);const he=Z.isMesh&&Z.matrixWorld.determinant()<0,fe=(function(ze,Qe,dt,Ne,Fe){Qe.isScene!==!0&&(Qe=te),Ee.resetTextureUnits();const St=Qe.fog,en=Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial||Ne.isMeshPhongMaterial?Qe.environment:null,Xt=H===null?O.outputColorSpace:H.isXRRenderTarget===!0?H.texture.colorSpace:Ze.workingColorSpace,tn=Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial&&!Ne.envMap||Ne.isMeshPhongMaterial&&!Ne.envMap,Ct=me.get(Ne.envMap||en,tn),qt=Ne.vertexColors===!0&&!!dt.attributes.color&&dt.attributes.color.itemSize===4,Pt=!!dt.attributes.tangent&&(!!Ne.normalMap||Ne.anisotropy>0),xn=!!dt.morphAttributes.position,jt=!!dt.morphAttributes.normal,di=!!dt.morphAttributes.color;let hi=0;Ne.toneMapped&&(H!==null&&H.isXRRenderTarget!==!0||(hi=O.toneMapping));const pi=dt.morphAttributes.position||dt.morphAttributes.normal||dt.morphAttributes.color,Di=pi!==void 0?pi.length:0,Be=xe.get(Ne),Yt=T.state.lights;if(q===!0&&(y===!0||ze!==j)){const ot=ze===j&&Ne.id===J;We.setState(Ne,ze,ot)}let Ft=!1;Ne.version===Be.__version?Be.needsLights&&Be.lightsStateVersion!==Yt.state.version||Be.outputColorSpace!==Xt||Fe.isBatchedMesh&&Be.batching===!1?Ft=!0:Fe.isBatchedMesh||Be.batching!==!0?Fe.isBatchedMesh&&Be.batchingColor===!0&&Fe.colorTexture===null||Fe.isBatchedMesh&&Be.batchingColor===!1&&Fe.colorTexture!==null||Fe.isInstancedMesh&&Be.instancing===!1?Ft=!0:Fe.isInstancedMesh||Be.instancing!==!0?Fe.isSkinnedMesh&&Be.skinning===!1?Ft=!0:Fe.isSkinnedMesh||Be.skinning!==!0?Fe.isInstancedMesh&&Be.instancingColor===!0&&Fe.instanceColor===null||Fe.isInstancedMesh&&Be.instancingColor===!1&&Fe.instanceColor!==null||Fe.isInstancedMesh&&Be.instancingMorph===!0&&Fe.morphTexture===null||Fe.isInstancedMesh&&Be.instancingMorph===!1&&Fe.morphTexture!==null||Be.envMap!==Ct||Ne.fog===!0&&Be.fog!==St?Ft=!0:Be.numClippingPlanes===void 0||Be.numClippingPlanes===We.numPlanes&&Be.numIntersection===We.numIntersection?(Be.vertexAlphas!==qt||Be.vertexTangents!==Pt||Be.morphTargets!==xn||Be.morphNormals!==jt||Be.morphColors!==di||Be.toneMapping!==hi||Be.morphTargetsCount!==Di||!!Be.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(Ft=!0):Ft=!0:Ft=!0:Ft=!0:Ft=!0:(Ft=!0,Be.__version=Ne.version);let nn=Be.currentProgram;Ft===!0&&(nn=k(Ne,Qe,Fe),z&&Ne.isNodeMaterial&&z.onUpdateProgram(Ne,nn,Be));let fi=!1,Mn=!1,Kt=!1;const He=nn.getUniforms(),vt=Be.uniforms;if(ae.useProgram(nn.program)&&(fi=!0,Mn=!0,Kt=!0),Ne.id!==J&&(J=Ne.id,Mn=!0),Be.needsLights){const ot=(function(Vt,xr){if(Vt.length===0)return null;if(Vt.length===1)return Vt[0].texture!==null?Vt[0]:null;U.setFromMatrixPosition(xr.matrixWorld);for(let Un=0,zs=Vt.length;Un<zs;Un++){const Mr=Vt[Un];if(Mr.texture!==null&&Mr.boundingBox.containsPoint(U))return Mr}return null})(T.state.lightProbeGridArray,Fe);Be.lightProbeGrid!==ot&&(Be.lightProbeGrid=ot,Mn=!0)}if(fi||j!==ze){ae.buffers.depth.getReversed()&&ze.reversedDepth!==!0&&(ze._reversedDepth=!0,ze.updateProjectionMatrix()),He.setValue(x,"projectionMatrix",ze.projectionMatrix),He.setValue(x,"viewMatrix",ze.matrixWorldInverse);const ot=He.map.cameraPosition;ot!==void 0&&ot.setValue(x,V.setFromMatrixPosition(ze.matrixWorld)),ve.logarithmicDepthBuffer&&He.setValue(x,"logDepthBufFC",2/(Math.log(ze.far+1)/Math.LN2)),(Ne.isMeshPhongMaterial||Ne.isMeshToonMaterial||Ne.isMeshLambertMaterial||Ne.isMeshBasicMaterial||Ne.isMeshStandardMaterial||Ne.isShaderMaterial)&&He.setValue(x,"isOrthographic",ze.isOrthographicCamera===!0),j!==ze&&(j=ze,Mn=!0,Kt=!0)}if(Be.needsLights&&(Yt.state.directionalShadowMap.length>0&&He.setValue(x,"directionalShadowMap",Yt.state.directionalShadowMap,Ee),Yt.state.spotShadowMap.length>0&&He.setValue(x,"spotShadowMap",Yt.state.spotShadowMap,Ee),Yt.state.pointShadowMap.length>0&&He.setValue(x,"pointShadowMap",Yt.state.pointShadowMap,Ee)),Fe.isSkinnedMesh){He.setOptional(x,Fe,"bindMatrix"),He.setOptional(x,Fe,"bindMatrixInverse");const ot=Fe.skeleton;ot&&(ot.boneTexture===null&&ot.computeBoneTexture(),He.setValue(x,"boneTexture",ot.boneTexture,Ee))}Fe.isBatchedMesh&&(He.setOptional(x,Fe,"batchingTexture"),He.setValue(x,"batchingTexture",Fe._matricesTexture,Ee),He.setOptional(x,Fe,"batchingIdTexture"),He.setValue(x,"batchingIdTexture",Fe._indirectTexture,Ee),He.setOptional(x,Fe,"batchingColorTexture"),Fe._colorsTexture!==null&&He.setValue(x,"batchingColorTexture",Fe._colorsTexture,Ee));const rn=dt.morphAttributes;if(rn.position===void 0&&rn.normal===void 0&&rn.color===void 0||ht.update(Fe,dt,nn),(Mn||Be.receiveShadow!==Fe.receiveShadow)&&(Be.receiveShadow=Fe.receiveShadow,He.setValue(x,"receiveShadow",Fe.receiveShadow)),(Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial||Ne.isMeshPhongMaterial)&&Ne.envMap===null&&Qe.environment!==null&&(vt.envMapIntensity.value=Qe.environmentIntensity),vt.dfgLUT!==void 0&&(vt.dfgLUT.value=(sn===null&&(sn=new lo(vc,16,16,1030,1016),sn.name="DFG_LUT",sn.minFilter=1006,sn.magFilter=1006,sn.wrapS=1001,sn.wrapT=1001,sn.generateMipmaps=!1,sn.needsUpdate=!0),sn)),Mn){if(He.setValue(x,"toneMappingExposure",O.toneMappingExposure),Be.needsLights&&(Lt=Kt,(et=vt).ambientLightColor.needsUpdate=Lt,et.lightProbe.needsUpdate=Lt,et.directionalLights.needsUpdate=Lt,et.directionalLightShadows.needsUpdate=Lt,et.pointLights.needsUpdate=Lt,et.pointLightShadows.needsUpdate=Lt,et.spotLights.needsUpdate=Lt,et.spotLightShadows.needsUpdate=Lt,et.rectAreaLights.needsUpdate=Lt,et.hemisphereLights.needsUpdate=Lt),St&&Ne.fog===!0&&ct.refreshFogUniforms(vt,St),ct.refreshMaterialUniforms(vt,Ne,B,ue,T.state.transmissionRenderTarget[ze.id]),Be.needsLights&&Be.lightProbeGrid){const ot=Be.lightProbeGrid;vt.probesSH.value=ot.texture,vt.probesMin.value.copy(ot.boundingBox.min),vt.probesMax.value.copy(ot.boundingBox.max),vt.probesResolution.value.copy(ot.resolution)}lr.upload(x,K(Be),vt,Ee)}var et,Lt;if(Ne.isShaderMaterial&&Ne.uniformsNeedUpdate===!0&&(lr.upload(x,K(Be),vt,Ee),Ne.uniformsNeedUpdate=!1),Ne.isSpriteMaterial&&He.setValue(x,"center",Fe.center),He.setValue(x,"modelViewMatrix",Fe.modelViewMatrix),He.setValue(x,"normalMatrix",Fe.normalMatrix),He.setValue(x,"modelMatrix",Fe.matrixWorld),Ne.uniformsGroups!==void 0){const ot=Ne.uniformsGroups;for(let Vt=0,xr=ot.length;Vt<xr;Vt++){const Un=ot[Vt];vn.update(Un,nn),vn.bind(Un,nn)}}return nn})(g,I,$,ee,Z);ae.setMaterial(ee,he);let Me=$.index,we=1;if(ee.wireframe===!0){if(Me=Ye.getWireframeAttribute($),Me===void 0)return;we=2}const Ue=$.drawRange,Ve=$.attributes.position;let Re=Ue.start*we,Xe=(Ue.start+Ue.count)*we;ce!==null&&(Re=Math.max(Re,ce.start*we),Xe=Math.min(Xe,(ce.start+ce.count)*we)),Me!==null?(Re=Math.max(Re,0),Xe=Math.min(Xe,Me.count)):Ve!=null&&(Re=Math.max(Re,0),Xe=Math.min(Xe,Ve.count));const at=Xe-Re;if(at<0||at===1/0)return;let st;yt.setup(Z,ee,fe,$,Me);let nt=Ut;if(Me!==null&&(st=Ie.get(Me),nt=Rt,nt.setIndex(st)),Z.isMesh)ee.wireframe===!0?(ae.setLineWidth(ee.wireframeLinewidth*ie()),nt.setMode(x.LINES)):nt.setMode(x.TRIANGLES);else if(Z.isLine){let ze=ee.linewidth;ze===void 0&&(ze=1),ae.setLineWidth(ze*ie()),Z.isLineSegments?nt.setMode(x.LINES):Z.isLineLoop?nt.setMode(x.LINE_LOOP):nt.setMode(x.LINE_STRIP)}else Z.isPoints?nt.setMode(x.POINTS):Z.isSprite&&nt.setMode(x.TRIANGLES);if(Z.isBatchedMesh)if(de.get("WEBGL_multi_draw"))nt.renderMultiDraw(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount);else{const ze=Z._multiDrawStarts,Qe=Z._multiDrawCounts,dt=Z._multiDrawCount,Ne=Me?Ie.get(Me).bytesPerElement:1,Fe=xe.get(ee).currentProgram.getUniforms();for(let St=0;St<dt;St++)Fe.setValue(x,"_gl_DrawID",St),nt.render(ze[St]/Ne,Qe[St])}else if(Z.isInstancedMesh)nt.renderInstances(Re,at,Z.count);else if($.isInstancedBufferGeometry){const ze=$._maxInstanceCount!==void 0?$._maxInstanceCount:1/0,Qe=Math.min($.instanceCount,ze);nt.renderInstances(Re,at,Qe)}else nt.render(Re,at)},this.compile=function(g,I,$=null){$===null&&($=g),T=Ce.get($),T.init(I),W.push(T),$.traverseVisible(function(Z){Z.isLight&&Z.layers.test(I.layers)&&(T.pushLight(Z),Z.castShadow&&T.pushShadow(Z))}),g!==$&&g.traverseVisible(function(Z){Z.isLight&&Z.layers.test(I.layers)&&(T.pushLight(Z),Z.castShadow&&T.pushShadow(Z))}),T.setupLights();const ee=new Set;return g.traverse(function(Z){if(!(Z.isMesh||Z.isPoints||Z.isLine||Z.isSprite))return;const ce=Z.material;if(ce)if(Array.isArray(ce))for(let he=0;he<ce.length;he++){const fe=ce[he];Li(fe,$,Z),ee.add(fe)}else Li(ce,$,Z),ee.add(ce)}),T=W.pop(),ee},this.compileAsync=function(g,I,$=null){const ee=this.compile(g,I,$);return new Promise(Z=>{function ce(){ee.forEach(function(he){xe.get(he).currentProgram.isReady()&&ee.delete(he)}),ee.size!==0?setTimeout(ce,10):Z(g)}de.get("KHR_parallel_shader_compile")!==null?ce():setTimeout(ce,10)})};let zt=null;function Nt(){Ht.stop()}function Ii(){Ht.start()}const Ht=new Ls;function ci(g,I,$,ee){if(g.visible===!1)return;if(g.layers.test(I.layers)){if(g.isGroup)$=g.renderOrder;else if(g.isLOD)g.autoUpdate===!0&&g.update(I);else if(g.isLightProbeGrid)T.pushLightProbeGrid(g);else if(g.isLight)T.pushLight(g),g.castShadow&&T.pushShadow(g);else if(g.isSprite){if(!g.frustumCulled||D.intersectsSprite(g)){ee&&A.setFromMatrixPosition(g.matrixWorld).applyMatrix4(G);const ce=lt.update(g),he=g.material;he.visible&&P.push(g,ce,he,$,A.z,null)}}else if((g.isMesh||g.isLine||g.isPoints)&&(!g.frustumCulled||D.intersectsObject(g))){const ce=lt.update(g),he=g.material;if(ee&&(g.boundingSphere!==void 0?(g.boundingSphere===null&&g.computeBoundingSphere(),A.copy(g.boundingSphere.center)):(ce.boundingSphere===null&&ce.computeBoundingSphere(),A.copy(ce.boundingSphere.center)),A.applyMatrix4(g.matrixWorld).applyMatrix4(G)),Array.isArray(he)){const fe=ce.groups;for(let Me=0,we=fe.length;Me<we;Me++){const Ue=fe[Me],Ve=he[Ue.materialIndex];Ve&&Ve.visible&&P.push(g,ce,Ve,$,A.z,Ue)}}else he.visible&&P.push(g,ce,he,$,A.z,null)}}const Z=g.children;for(let ce=0,he=Z.length;ce<he;ce++)ci(Z[ce],I,$,ee)}function Dn(g,I,$,ee){const{opaque:Z,transmissive:ce,transparent:he}=g;T.setupLightsView($),q===!0&&We.setGlobalState(O.clippingPlanes,$),ee&&ae.viewport(pe.copy(ee)),Z.length>0&&h(Z,I,$),ce.length>0&&h(ce,I,$),he.length>0&&h(he,I,$),ae.buffers.depth.setTest(!0),ae.buffers.depth.setMask(!0),ae.buffers.color.setMask(!0),ae.setPolygonOffset(!1)}function ui(g,I,$,ee){if(($.isScene===!0?$.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[ee.id]===void 0){const Ve=de.has("EXT_color_buffer_half_float")||de.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[ee.id]=new ln(1,1,{generateMipmaps:!0,type:Ve?1016:1009,minFilter:1008,samples:Math.max(4,ve.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ze.workingColorSpace})}const Z=T.state.transmissionRenderTarget[ee.id],ce=ee.viewport||pe;Z.setSize(ce.z*O.transmissionResolutionScale,ce.w*O.transmissionResolutionScale);const he=O.getRenderTarget(),fe=O.getActiveCubeFace(),Me=O.getActiveMipmapLevel();O.setRenderTarget(Z),O.getClearColor(Ae),Te=O.getClearAlpha(),Te<1&&O.setClearColor(16777215,.5),O.clear(),Y&&rt.render($);const we=O.toneMapping;O.toneMapping=0;const Ue=ee.viewport;if(ee.viewport!==void 0&&(ee.viewport=void 0),T.setupLightsView(ee),q===!0&&We.setGlobalState(O.clippingPlanes,ee),h(g,$,ee),Ee.updateMultisampleRenderTarget(Z),Ee.updateRenderTargetMipmap(Z),de.has("WEBGL_multisampled_render_to_texture")===!1){let Ve=!1;for(let Re=0,Xe=I.length;Re<Xe;Re++){const at=I[Re],{object:st,geometry:nt,material:ze,group:Qe}=at;if(ze.side===2&&st.layers.test(ee.layers)){const dt=ze.side;ze.side=1,ze.needsUpdate=!0,w(st,$,ee,nt,ze,Qe),ze.side=dt,ze.needsUpdate=!0,Ve=!0}}Ve===!0&&(Ee.updateMultisampleRenderTarget(Z),Ee.updateRenderTargetMipmap(Z))}O.setRenderTarget(he,fe,Me),O.setClearColor(Ae,Te),Ue!==void 0&&(ee.viewport=Ue),O.toneMapping=we}function h(g,I,$){const ee=I.isScene===!0?I.overrideMaterial:null;for(let Z=0,ce=g.length;Z<ce;Z++){const he=g[Z],{object:fe,geometry:Me,group:we}=he;let Ue=he.material;Ue.allowOverride===!0&&ee!==null&&(Ue=ee),fe.layers.test($.layers)&&w(fe,I,$,Me,Ue,we)}}function w(g,I,$,ee,Z,ce){g.onBeforeRender(O,I,$,ee,Z,ce),g.modelViewMatrix.multiplyMatrices($.matrixWorldInverse,g.matrixWorld),g.normalMatrix.getNormalMatrix(g.modelViewMatrix),Z.onBeforeRender(O,I,$,ee,g,ce),Z.transparent===!0&&Z.side===2&&Z.forceSinglePass===!1?(Z.side=1,Z.needsUpdate=!0,O.renderBufferDirect($,I,ee,Z,g,ce),Z.side=0,Z.needsUpdate=!0,O.renderBufferDirect($,I,ee,Z,g,ce),Z.side=2):O.renderBufferDirect($,I,ee,Z,g,ce),g.onAfterRender(O,I,$,ee,Z,ce)}function k(g,I,$){I.isScene!==!0&&(I=te);const ee=xe.get(g),Z=T.state.lights,ce=T.state.shadowsArray,he=Z.state.version,fe=Ke.getParameters(g,Z.state,ce,I,$,T.state.lightProbeGridArray),Me=Ke.getProgramCacheKey(fe);let we=ee.programs;ee.environment=g.isMeshStandardMaterial||g.isMeshLambertMaterial||g.isMeshPhongMaterial?I.environment:null,ee.fog=I.fog;const Ue=g.isMeshStandardMaterial||g.isMeshLambertMaterial&&!g.envMap||g.isMeshPhongMaterial&&!g.envMap;ee.envMap=me.get(g.envMap||ee.environment,Ue),ee.envMapRotation=ee.environment!==null&&g.envMap===null?I.environmentRotation:g.envMapRotation,we===void 0&&(g.addEventListener("dispose",li),we=new Map,ee.programs=we);let Ve=we.get(Me);if(Ve!==void 0){if(ee.currentProgram===Ve&&ee.lightsStateVersion===he)return re(g,fe),Ve}else fe.uniforms=Ke.getUniforms(g),z!==null&&g.isNodeMaterial&&z.build(g,$,fe),g.onBeforeCompile(fe,O),Ve=Ke.acquireProgram(fe,Me),we.set(Me,Ve),ee.uniforms=fe.uniforms;const Re=ee.uniforms;return(g.isShaderMaterial||g.isRawShaderMaterial)&&g.clipping!==!0||(Re.clippingPlanes=We.uniform),re(g,fe),ee.needsLights=(function(Xe){return Xe.isMeshLambertMaterial||Xe.isMeshToonMaterial||Xe.isMeshPhongMaterial||Xe.isMeshStandardMaterial||Xe.isShadowMaterial||Xe.isShaderMaterial&&Xe.lights===!0})(g),ee.lightsStateVersion=he,ee.needsLights&&(Re.ambientLightColor.value=Z.state.ambient,Re.lightProbe.value=Z.state.probe,Re.directionalLights.value=Z.state.directional,Re.directionalLightShadows.value=Z.state.directionalShadow,Re.spotLights.value=Z.state.spot,Re.spotLightShadows.value=Z.state.spotShadow,Re.rectAreaLights.value=Z.state.rectArea,Re.ltc_1.value=Z.state.rectAreaLTC1,Re.ltc_2.value=Z.state.rectAreaLTC2,Re.pointLights.value=Z.state.point,Re.pointLightShadows.value=Z.state.pointShadow,Re.hemisphereLights.value=Z.state.hemi,Re.directionalShadowMatrix.value=Z.state.directionalShadowMatrix,Re.spotLightMatrix.value=Z.state.spotLightMatrix,Re.spotLightMap.value=Z.state.spotLightMap,Re.pointShadowMatrix.value=Z.state.pointShadowMatrix),ee.lightProbeGrid=T.state.lightProbeGridArray.length>0,ee.currentProgram=Ve,ee.uniformsList=null,Ve}function K(g){if(g.uniformsList===null){const I=g.currentProgram.getUniforms();g.uniformsList=lr.seqWithValue(I.seq,g.uniforms)}return g.uniformsList}function re(g,I){const $=xe.get(g);$.outputColorSpace=I.outputColorSpace,$.batching=I.batching,$.batchingColor=I.batchingColor,$.instancing=I.instancing,$.instancingColor=I.instancingColor,$.instancingMorph=I.instancingMorph,$.skinning=I.skinning,$.morphTargets=I.morphTargets,$.morphNormals=I.morphNormals,$.morphColors=I.morphColors,$.morphTargetsCount=I.morphTargetsCount,$.numClippingPlanes=I.numClippingPlanes,$.numIntersection=I.numClipIntersection,$.vertexAlphas=I.vertexAlphas,$.vertexTangents=I.vertexTangents,$.toneMapping=I.toneMapping}Ht.setAnimationLoop(function(g){zt&&zt(g)}),typeof self<"u"&&Ht.setContext(self),this.setAnimationLoop=function(g){zt=g,ut.setAnimationLoop(g),g===null?Ht.stop():Ht.start()},ut.addEventListener("sessionstart",Nt),ut.addEventListener("sessionend",Ii),this.render=function(g,I){if(I!==void 0&&I.isCamera!==!0)return void Je("WebGLRenderer.render: camera is not an instance of THREE.Camera.");if(Q===!0)return;z!==null&&z.renderStart(g,I);const $=ut.enabled===!0&&ut.isPresenting===!0,ee=L!==null&&(H===null||$)&&L.begin(O,H);if(g.matrixWorldAutoUpdate===!0&&g.updateMatrixWorld(),I.parent===null&&I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),ut.enabled!==!0||ut.isPresenting!==!0||L!==null&&L.isCompositing()!==!1||(ut.cameraAutoUpdate===!0&&ut.updateCamera(I),I=ut.getCamera()),g.isScene===!0&&g.onBeforeRender(O,g,I,H),T=Ce.get(g,W.length),T.init(I),T.state.textureUnits=Ee.getTextureUnits(),W.push(T),G.multiplyMatrices(I.projectionMatrix,I.matrixWorldInverse),D.setFromProjectionMatrix(G,2e3,I.reversedDepth),y=this.localClippingEnabled,q=We.init(this.clippingPlanes,y),P=Mt.get(g,F.length),P.init(),F.push(P),ut.enabled===!0&&ut.isPresenting===!0){const ce=O.xr.getDepthSensingMesh();ce!==null&&ci(ce,I,-1/0,O.sortObjects)}ci(g,I,0,O.sortObjects),P.finish(),O.sortObjects===!0&&P.sort(le,ye),Y=ut.enabled===!1||ut.isPresenting===!1||ut.hasDepthSensing()===!1,Y&&rt.addToRenderList(P,g),this.info.render.frame++,q===!0&&We.beginShadows();const Z=T.state.shadowsArray;if(De.render(Z,g,I),q===!0&&We.endShadows(),this.info.autoReset===!0&&this.info.reset(),(ee&&L.hasRenderPass())===!1){const ce=P.opaque,he=P.transmissive;if(T.setupLights(),I.isArrayCamera){const fe=I.cameras;if(he.length>0)for(let Me=0,we=fe.length;Me<we;Me++)ui(ce,he,g,fe[Me]);Y&&rt.render(g);for(let Me=0,we=fe.length;Me<we;Me++){const Ue=fe[Me];Dn(P,g,Ue,Ue.viewport)}}else he.length>0&&ui(ce,he,g,I),Y&&rt.render(g),Dn(P,g,I)}H!==null&&R===0&&(Ee.updateMultisampleRenderTarget(H),Ee.updateRenderTargetMipmap(H)),ee&&L.end(O),g.isScene===!0&&g.onAfterRender(O,g,I),yt.resetDefaultState(),J=-1,j=null,W.pop(),W.length>0?(T=W[W.length-1],Ee.setTextureUnits(T.state.textureUnits),q===!0&&We.setGlobalState(O.clippingPlanes,T.state.camera)):T=null,F.pop(),P=F.length>0?F[F.length-1]:null,z!==null&&z.renderEnd()},this.getActiveCubeFace=function(){return ne},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return H},this.setRenderTargetTextures=function(g,I,$){const ee=xe.get(g);ee.__autoAllocateDepthBuffer=g.resolveDepthBuffer===!1,ee.__autoAllocateDepthBuffer===!1&&(ee.__useRenderToTexture=!1),xe.get(g.texture).__webglTexture=I,xe.get(g.depthTexture).__webglTexture=ee.__autoAllocateDepthBuffer?void 0:$,ee.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(g,I){const $=xe.get(g);$.__webglFramebuffer=I,$.__useDefaultFramebuffer=I===void 0};const se=x.createFramebuffer();this.setRenderTarget=function(g,I=0,$=0){H=g,ne=I,R=$;let ee=null,Z=!1,ce=!1;if(g){const he=xe.get(g);if(he.__useDefaultFramebuffer!==void 0)return ae.bindFramebuffer(x.FRAMEBUFFER,he.__webglFramebuffer),pe.copy(g.viewport),ge.copy(g.scissor),Le=g.scissorTest,ae.viewport(pe),ae.scissor(ge),ae.setScissorTest(Le),void(J=-1);if(he.__webglFramebuffer===void 0)Ee.setupRenderTarget(g);else if(he.__hasExternalTextures)Ee.rebindTextures(g,xe.get(g.texture).__webglTexture,xe.get(g.depthTexture).__webglTexture);else if(g.depthBuffer){const we=g.depthTexture;if(he.__boundDepthTexture!==we){if(we!==null&&xe.has(we)&&(g.width!==we.image.width||g.height!==we.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ee.setupDepthRenderbuffer(g)}}const fe=g.texture;(fe.isData3DTexture||fe.isDataArrayTexture||fe.isCompressedArrayTexture)&&(ce=!0);const Me=xe.get(g).__webglFramebuffer;g.isWebGLCubeRenderTarget?(ee=Array.isArray(Me[I])?Me[I][$]:Me[I],Z=!0):ee=g.samples>0&&Ee.useMultisampledRTT(g)===!1?xe.get(g).__webglMultisampledFramebuffer:Array.isArray(Me)?Me[$]:Me,pe.copy(g.viewport),ge.copy(g.scissor),Le=g.scissorTest}else pe.copy(N).multiplyScalar(B).floor(),ge.copy(b).multiplyScalar(B).floor(),Le=S;if($!==0&&(ee=se),ae.bindFramebuffer(x.FRAMEBUFFER,ee)&&ae.drawBuffers(g,ee),ae.viewport(pe),ae.scissor(ge),ae.setScissorTest(Le),Z){const he=xe.get(g.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_CUBE_MAP_POSITIVE_X+I,he.__webglTexture,$)}else if(ce){const he=I;for(let fe=0;fe<g.textures.length;fe++){const Me=xe.get(g.textures[fe]);x.framebufferTextureLayer(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0+fe,Me.__webglTexture,$,he)}}else if(g!==null&&$!==0){const he=xe.get(g.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,he.__webglTexture,$)}J=-1},this.readRenderTargetPixels=function(g,I,$,ee,Z,ce,he,fe=0){if(!g||!g.isWebGLRenderTarget)return void Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=xe.get(g).__webglFramebuffer;if(g.isWebGLCubeRenderTarget&&he!==void 0&&(Me=Me[he]),Me){ae.bindFramebuffer(x.FRAMEBUFFER,Me);try{const we=g.textures[fe],Ue=we.format,Ve=we.type;if(g.textures.length>1&&x.readBuffer(x.COLOR_ATTACHMENT0+fe),!ve.textureFormatReadable(Ue))return void Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");if(!ve.textureTypeReadable(Ve))return void Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");I>=0&&I<=g.width-ee&&$>=0&&$<=g.height-Z&&x.readPixels(I,$,ee,Z,pt.convert(Ue),pt.convert(Ve),ce)}finally{const we=H!==null?xe.get(H).__webglFramebuffer:null;ae.bindFramebuffer(x.FRAMEBUFFER,we)}}},this.readRenderTargetPixelsAsync=async function(g,I,$,ee,Z,ce,he,fe=0){if(!g||!g.isWebGLRenderTarget)throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=xe.get(g).__webglFramebuffer;if(g.isWebGLCubeRenderTarget&&he!==void 0&&(Me=Me[he]),Me){if(I>=0&&I<=g.width-ee&&$>=0&&$<=g.height-Z){ae.bindFramebuffer(x.FRAMEBUFFER,Me);const we=g.textures[fe],Ue=we.format,Ve=we.type;if(g.textures.length>1&&x.readBuffer(x.COLOR_ATTACHMENT0+fe),!ve.textureFormatReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ve.textureTypeReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Re=x.createBuffer();x.bindBuffer(x.PIXEL_PACK_BUFFER,Re),x.bufferData(x.PIXEL_PACK_BUFFER,ce.byteLength,x.STREAM_READ),x.readPixels(I,$,ee,Z,pt.convert(Ue),pt.convert(Ve),0);const Xe=H!==null?xe.get(H).__webglFramebuffer:null;ae.bindFramebuffer(x.FRAMEBUFFER,Xe);const at=x.fenceSync(x.SYNC_GPU_COMMANDS_COMPLETE,0);return x.flush(),await Vs(x,at,4),x.bindBuffer(x.PIXEL_PACK_BUFFER,Re),x.getBufferSubData(x.PIXEL_PACK_BUFFER,0,ce),x.deleteBuffer(Re),x.deleteSync(at),ce}throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(g,I=null,$=0){const ee=Math.pow(2,-$),Z=Math.floor(g.image.width*ee),ce=Math.floor(g.image.height*ee),he=I!==null?I.x:0,fe=I!==null?I.y:0;Ee.setTexture2D(g,0),x.copyTexSubImage2D(x.TEXTURE_2D,$,0,0,he,fe,Z,ce),ae.unbindTexture()};const Se=x.createFramebuffer(),be=x.createFramebuffer();this.copyTextureToTexture=function(g,I,$=null,ee=null,Z=0,ce=0){let he,fe,Me,we,Ue,Ve,Re,Xe,at;const st=g.isCompressedTexture?g.mipmaps[ce]:g.image;if($!==null)he=$.max.x-$.min.x,fe=$.max.y-$.min.y,Me=$.isBox3?$.max.z-$.min.z:1,we=$.min.x,Ue=$.min.y,Ve=$.isBox3?$.min.z:0;else{const Ct=Math.pow(2,-Z);he=Math.floor(st.width*Ct),fe=Math.floor(st.height*Ct),Me=g.isDataArrayTexture?st.depth:g.isData3DTexture?Math.floor(st.depth*Ct):1,we=0,Ue=0,Ve=0}ee!==null?(Re=ee.x,Xe=ee.y,at=ee.z):(Re=0,Xe=0,at=0);const nt=pt.convert(I.format),ze=pt.convert(I.type);let Qe;I.isData3DTexture?(Ee.setTexture3D(I,0),Qe=x.TEXTURE_3D):I.isDataArrayTexture||I.isCompressedArrayTexture?(Ee.setTexture2DArray(I,0),Qe=x.TEXTURE_2D_ARRAY):(Ee.setTexture2D(I,0),Qe=x.TEXTURE_2D),ae.activeTexture(x.TEXTURE0),ae.pixelStorei(x.UNPACK_FLIP_Y_WEBGL,I.flipY),ae.pixelStorei(x.UNPACK_PREMULTIPLY_ALPHA_WEBGL,I.premultiplyAlpha),ae.pixelStorei(x.UNPACK_ALIGNMENT,I.unpackAlignment);const dt=ae.getParameter(x.UNPACK_ROW_LENGTH),Ne=ae.getParameter(x.UNPACK_IMAGE_HEIGHT),Fe=ae.getParameter(x.UNPACK_SKIP_PIXELS),St=ae.getParameter(x.UNPACK_SKIP_ROWS),en=ae.getParameter(x.UNPACK_SKIP_IMAGES);ae.pixelStorei(x.UNPACK_ROW_LENGTH,st.width),ae.pixelStorei(x.UNPACK_IMAGE_HEIGHT,st.height),ae.pixelStorei(x.UNPACK_SKIP_PIXELS,we),ae.pixelStorei(x.UNPACK_SKIP_ROWS,Ue),ae.pixelStorei(x.UNPACK_SKIP_IMAGES,Ve);const Xt=g.isDataArrayTexture||g.isData3DTexture,tn=I.isDataArrayTexture||I.isData3DTexture;if(g.isDepthTexture){const Ct=xe.get(g),qt=xe.get(I),Pt=xe.get(Ct.__renderTarget),xn=xe.get(qt.__renderTarget);ae.bindFramebuffer(x.READ_FRAMEBUFFER,Pt.__webglFramebuffer),ae.bindFramebuffer(x.DRAW_FRAMEBUFFER,xn.__webglFramebuffer);for(let jt=0;jt<Me;jt++)Xt&&(x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,xe.get(g).__webglTexture,Z,Ve+jt),x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,xe.get(I).__webglTexture,ce,at+jt)),x.blitFramebuffer(we,Ue,he,fe,Re,Xe,he,fe,x.DEPTH_BUFFER_BIT,x.NEAREST);ae.bindFramebuffer(x.READ_FRAMEBUFFER,null),ae.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else if(Z!==0||g.isRenderTargetTexture||xe.has(g)){const Ct=xe.get(g),qt=xe.get(I);ae.bindFramebuffer(x.READ_FRAMEBUFFER,Se),ae.bindFramebuffer(x.DRAW_FRAMEBUFFER,be);for(let Pt=0;Pt<Me;Pt++)Xt?x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,Ct.__webglTexture,Z,Ve+Pt):x.framebufferTexture2D(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,Ct.__webglTexture,Z),tn?x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,qt.__webglTexture,ce,at+Pt):x.framebufferTexture2D(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,qt.__webglTexture,ce),Z!==0?x.blitFramebuffer(we,Ue,he,fe,Re,Xe,he,fe,x.COLOR_BUFFER_BIT,x.NEAREST):tn?x.copyTexSubImage3D(Qe,ce,Re,Xe,at+Pt,we,Ue,he,fe):x.copyTexSubImage2D(Qe,ce,Re,Xe,we,Ue,he,fe);ae.bindFramebuffer(x.READ_FRAMEBUFFER,null),ae.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else tn?g.isDataTexture||g.isData3DTexture?x.texSubImage3D(Qe,ce,Re,Xe,at,he,fe,Me,nt,ze,st.data):I.isCompressedArrayTexture?x.compressedTexSubImage3D(Qe,ce,Re,Xe,at,he,fe,Me,nt,st.data):x.texSubImage3D(Qe,ce,Re,Xe,at,he,fe,Me,nt,ze,st):g.isDataTexture?x.texSubImage2D(x.TEXTURE_2D,ce,Re,Xe,he,fe,nt,ze,st.data):g.isCompressedTexture?x.compressedTexSubImage2D(x.TEXTURE_2D,ce,Re,Xe,st.width,st.height,nt,st.data):x.texSubImage2D(x.TEXTURE_2D,ce,Re,Xe,he,fe,nt,ze,st);ae.pixelStorei(x.UNPACK_ROW_LENGTH,dt),ae.pixelStorei(x.UNPACK_IMAGE_HEIGHT,Ne),ae.pixelStorei(x.UNPACK_SKIP_PIXELS,Fe),ae.pixelStorei(x.UNPACK_SKIP_ROWS,St),ae.pixelStorei(x.UNPACK_SKIP_IMAGES,en),ce===0&&I.generateMipmaps&&x.generateMipmap(Qe),ae.unbindTexture()},this.initRenderTarget=function(g){xe.get(g).__webglFramebuffer===void 0&&Ee.setupRenderTarget(g)},this.initTexture=function(g){g.isCubeTexture?Ee.setTextureCube(g,0):g.isData3DTexture?Ee.setTexture3D(g,0):g.isDataArrayTexture||g.isCompressedArrayTexture?Ee.setTexture2DArray(g,0):Ee.setTexture2D(g,0),ae.unbindTexture()},this.resetState=function(){ne=0,R=0,H=null,ae.reset(),yt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2e3}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ze._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ze._getUnpackColorSpace()}}function Lc(n,e){(()=>{function l(p){if(typeof p.checkVisibility=="function")return p.checkVisibility();if(!p.getClientRects().length)return!1;for(let f=p.parentElement;f;f=f.parentElement)if(getComputedStyle(f).contentVisibility==="hidden")return!1;return!0}function o(p,f,{units:d,label:M,hiddenClass:m="av-page-away",navClass:E="av-pages",beforeMeasure:_=()=>{},singlePageLabel:v="All controls"}){const C=n.createElement("nav");C.className=E,C.setAttribute("aria-label",`${M} pages`);const U=n.createElement("button");U.type="button",U.textContent="Previous";const P=n.createElement("button");P.type="button",P.textContent="Next";const T=n.createElement("output");T.setAttribute("aria-live","polite"),C.append(U,T,P),p.append(f,C);let F=0,W=[],L=[];function O(){F=Math.max(0,Math.min(F,Math.max(0,W.length-1))),L.forEach(J=>{var j;return J.classList.toggle(m,!((j=W[F])!=null&&j.includes(J)))}),U.disabled=F===0,P.disabled=F>=W.length-1,T.textContent=W.length>1?`${F+1} / ${W.length}`:v,p.dataset.pages=String(W.length),p.dataset.page=String(F+1)}function Q(){if(matchMedia("print").matches||p.hidden||!l(p))return;L=typeof d=="function"?d():d,L.forEach(ue=>ue.classList.remove(m));const J=f.clientHeight;_(J);const j=getComputedStyle(f),pe=parseFloat(j.rowGap)||0,ge=j.gridTemplateColumns.split(" ").length,Le=L.filter(ue=>!ue.hidden&&l(ue));W=[];let Ae=[],Te=0;for(let ue=0;ue<Le.length;ue+=ge){const B=Le.slice(ue,ue+ge),le=Math.max(...B.map(ye=>ye.getBoundingClientRect().height));Ae.length&&Te+le+pe>J&&(W.push(Ae),Ae=[],Te=0),Ae.push(...B),Te+=le+(Te?pe:0)}Ae.length&&W.push(Ae);const oe=W.findIndex(ue=>ue.some(B=>B.contains(n.activeElement)));oe>=0&&(F=oe),O()}U.addEventListener("click",()=>{U.focus({preventScroll:!0}),F--,O()}),P.addEventListener("click",()=>{P.focus({preventScroll:!0}),F++,O()});let z=0;function ne(){z||(z=requestAnimationFrame(()=>{z=0,Q()}))}const R=new ResizeObserver(ne);R.observe(f);const H=new MutationObserver(ne);return H.observe(f,{subtree:!0,childList:!0,characterData:!0,attributes:!0,attributeFilter:["hidden","data-open","data-sbd-suite-compact"]}),{refresh:Q,destroy(){R.disconnect(),H.disconnect(),cancelAnimationFrame(z)},reveal(J){Q();const j=W.findIndex(pe=>pe.some(ge=>ge.contains(J)));j>=0&&(F=j,O())}}}function u(p,f,{label:d,selectId:M="taskView",className:m="av-tabs",parameter:E="taskView",hash:_=!1,onChange:v=()=>{},beforeChange:C=()=>{},onTarget:U=()=>{},additionalVisible:P=()=>!1}){const T=n.createElement("div");T.className=m,T.setAttribute("role","tablist"),T.setAttribute("aria-label",d);const F=n.createElement("select");F.id=M,F.setAttribute("aria-label",`${d} view`);let W=0;f.forEach(({node:Q,name:z},ne)=>{const R=n.createElement("button");R.type="button",R.id=`${Q.id}Tab`,R.textContent=z,R.setAttribute("role","tab"),R.setAttribute("aria-controls",Q.id),R.addEventListener("click",()=>L(ne,!0)),T.append(R),F.add(new Option(z,String(ne))),Q.setAttribute("role","tabpanel"),Q.setAttribute("aria-labelledby",R.id)}),p.replaceChildren(T,F);function L(Q,z=!1){if(C(),W=Math.max(0,Math.min(f.length-1,Q)),f.forEach(({node:ne},R)=>{ne.hidden=R!==W&&!P(R,W),T.children[R].tabIndex=R===W?0:-1,T.children[R].setAttribute("aria-selected",String(R===W))}),F.value=String(W),z){const ne=new URL(location.href);_?ne.hash=f[W].node.id:ne.searchParams.set(E,f[W].node.id),history.pushState(null,"",ne)}v(W)}function O(){let Q=_?location.hash.slice(1):new URL(location.href).searchParams.get(E)||location.hash.slice(1);try{Q=decodeURIComponent(Q||"")}catch{Q=""}const z=n.getElementById(Q),ne=f.findIndex(({node:R})=>R===z||R.contains(z));L(ne<0?0:ne),z&&U(z,ne)}return F.addEventListener("change",()=>L(Number(F.value),!0)),T.addEventListener("keydown",Q=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(Q.key))return;Q.preventDefault();const z=Q.key==="Home"?0:Q.key==="End"?f.length-1:(W+(Q.key==="ArrowRight"?1:-1)+f.length)%f.length;L(z,!0),T.children[z].focus()}),window.addEventListener("popstate",O),window.addEventListener("hashchange",O),{activate:L,fromLocation:O,refresh:()=>L(W)}}window.addEventListener("beforeprint",()=>{n.querySelectorAll(".av-print-text").forEach(p=>p.remove()),n.querySelectorAll("textarea,select,input:not([type=file]):not([type=hidden]):not([type=checkbox]):not([type=radio])").forEach(p=>{var d;const f=n.createElement("pre");f.className="av-print-text",f.textContent=p.tagName==="SELECT"&&((d=p.selectedOptions[0])==null?void 0:d.textContent)||p.value,p.after(f)})}),window.addEventListener("afterprint",()=>n.querySelectorAll(".av-print-text").forEach(p=>p.remove())),window.AVViewport={paginate:o,tabs:u,isVisible:l}})(),(()=>{const l="avCalculator.v1",o={delayDistance:72,delayUnit:"ft",delayTemp:68,delayFrameRate:30,screenWidth:16,aspectRatio:1.7777777778,throwRatio:1.5,throwDistance:24,bitrate:50,recordHours:2,cameraCount:3,storageHeadroom:20,powerMethod:"amps",deviceAmps:0,deviceWatts:350,powerFactor:0,deviceCount:4,voltage:120,circuitAmps:20,dropAmps:12,dropLength:100,dropGauge:"10",dropVoltage:120,splRef:100,splRefDist:3,splTargetDist:50,ledMode:"layout",ledProductName:"Custom P2.9 500 mm",ledPitchMm:2.9,ledCabinetWidthMm:500,ledCabinetHeightMm:500,ledCabinetPixelsWide:172,ledCabinetPixelsHigh:172,ledSpecSource:"",ledWeightKg:null,ledCatalogId:null,ledCabinetRotation:"0",ledCabinetsWide:8,ledCabinetsHigh:5,ledTargetWidthFt:16,ledTargetHeightFt:9,ledTargetWidthPx:1920,ledTargetHeightPx:1080,ledContentWidthPx:1920,ledContentHeightPx:1080,ledFitPolicy:"contain",ledRefreshHz:60,ledBitDepth:8,ledPortBasePixels:65e4,ledPortSafetyPercent:80,ledProcessorPortCount:null,ledReceiverPixelsWide:null,ledReceiverPixelsHigh:null,ledMaxWattsEach:180,ledTypicalWattsEach:65,ledVoltage:120,ledCircuitAmps:20,ledContinuousPercent:80,ledPhaseMode:"singlePhase",ledPowerFactor:null,ledPowerFactorEntered:!1,ledCabinetsPerHomeRun:null,ledClosestViewer:15,ledClosestViewerUnit:"ft"},u=Array.from(n.querySelectorAll("[data-key]")),p=n.documentElement.dataset.avTool==="led-wall-calculator",f=new Set(u.map(h=>h.dataset.key));p&&(f.add("ledPowerFactorEntered"),f.add("ledCatalogId"));const d={delayMs:n.getElementById("delayMs"),delayFrames:n.getElementById("delayFrames"),delaySamples:n.getElementById("delaySamples"),delayHint:n.getElementById("delayHint"),screenHeight:n.getElementById("screenHeight"),screenDiagonal:n.getElementById("screenDiagonal"),idealThrow:n.getElementById("idealThrow"),projectionHint:n.getElementById("projectionHint"),baseStorage:n.getElementById("baseStorage"),totalStorage:n.getElementById("totalStorage"),perHourStorage:n.getElementById("perHourStorage"),storageHint:n.getElementById("storageHint"),powerMethodBadge:n.getElementById("powerMethodBadge"),nameplateAmpsField:n.getElementById("nameplateAmpsField"),wattsField:n.getElementById("wattsField"),powerFactorField:n.getElementById("powerFactorField"),deviceAmps:n.getElementById("deviceAmps"),deviceWatts:n.getElementById("deviceWatts"),powerFactor:n.getElementById("powerFactor"),powerInputLabel:n.getElementById("powerInputLabel"),powerCurrentLabel:n.getElementById("powerCurrentLabel"),powerWarningLabel:n.getElementById("powerWarningLabel"),powerWarningText:n.getElementById("powerWarningText"),totalWatts:n.getElementById("totalWatts"),totalAmps:n.getElementById("totalAmps"),circuitPercent:n.getElementById("circuitPercent"),voltageDrop:n.getElementById("voltageDrop"),dropPercent:n.getElementById("dropPercent"),dropResult:n.getElementById("dropResult"),dropEndV:n.getElementById("dropEndV"),dropHint:n.getElementById("dropHint"),splOut:n.getElementById("splOut"),splLoss:n.getElementById("splLoss"),splDoublings:n.getElementById("splDoublings"),splHint:n.getElementById("splHint"),ledProfileSelect:n.getElementById("ledProfileSelect"),ledProfileEvidence:n.getElementById("ledProfileEvidence"),ledCabinetMass:n.getElementById("ledCabinetMass"),ledSupportNote:n.getElementById("ledSupportNote"),ledLayoutFields:n.getElementById("ledLayoutFields"),ledTargetSizeFields:n.getElementById("ledTargetSizeFields"),ledTargetRasterFields:n.getElementById("ledTargetRasterFields"),ledModeNote:n.getElementById("ledModeNote"),ledPowerFactor:n.getElementById("ledPowerFactor"),ledWallResult:n.getElementById("ledWallResult"),ledRasterResult:n.getElementById("ledRasterResult"),ledContentResult:n.getElementById("ledContentResult"),ledProcessingResult:n.getElementById("ledProcessingResult"),ledPowerResult:n.getElementById("ledPowerResult"),ledWallPreview:n.getElementById("ledWallPreview"),ledPreviewRows:n.getElementById("ledPreviewRows"),ledPreviewColumns:n.getElementById("ledPreviewColumns"),ledPreviewArray:n.getElementById("ledPreviewArray"),ledPreviewCanvas:n.getElementById("ledPreviewCanvas"),ledPreviewPortRail:n.getElementById("ledPreviewPortRail"),ledPreviewPort:n.getElementById("ledPreviewPort"),ledPreviewViewerRail:n.getElementById("ledPreviewViewerRail"),ledPreviewViewer:n.getElementById("ledPreviewViewer"),ledPreviewIsoBtn:n.getElementById("ledPreviewIsoBtn"),ledPreviewFrontBtn:n.getElementById("ledPreviewFrontBtn"),ledInspectRow:n.getElementById("ledInspectRow"),ledInspectColumn:n.getElementById("ledInspectColumn"),ledCabinetInspection:n.getElementById("ledCabinetInspection"),ledWallDimensions:n.getElementById("ledWallDimensions"),ledWallDimensionsMetric:n.getElementById("ledWallDimensionsMetric"),ledNativeRaster:n.getElementById("ledNativeRaster"),ledNativeMeta:n.getElementById("ledNativeMeta"),ledContentFit:n.getElementById("ledContentFit"),ledContentMeta:n.getElementById("ledContentMeta"),ledProcessing:n.getElementById("ledProcessing"),ledProcessingMeta:n.getElementById("ledProcessingMeta"),ledPower:n.getElementById("ledPower"),ledPowerMeta:n.getElementById("ledPowerMeta"),ledBuildArray:n.getElementById("ledBuildArray"),ledCabinetCount:n.getElementById("ledCabinetCount"),ledMetricSize:n.getElementById("ledMetricSize"),ledImperialSize:n.getElementById("ledImperialSize"),ledArea:n.getElementById("ledArea"),ledDiagonal:n.getElementById("ledDiagonal"),ledCabinetRaster:n.getElementById("ledCabinetRaster"),ledPitchDerivedRaster:n.getElementById("ledPitchDerivedRaster"),ledImpliedPitch:n.getElementById("ledImpliedPitch"),ledTargetOutcome:n.getElementById("ledTargetOutcome"),ledSourceToWall:n.getElementById("ledSourceToWall"),ledScaleFactors:n.getElementById("ledScaleFactors"),ledPixelUtilization:n.getElementById("ledPixelUtilization"),ledAspectMismatch:n.getElementById("ledAspectMismatch"),ledSuggestedCanvas:n.getElementById("ledSuggestedCanvas"),ledSourceBandwidth:n.getElementById("ledSourceBandwidth"),ledContentGuidance:n.getElementById("ledContentGuidance"),ledSafePixelsPerPort:n.getElementById("ledSafePixelsPerPort"),ledAveragePortLoad:n.getElementById("ledAveragePortLoad"),ledPortUtilization:n.getElementById("ledPortUtilization"),ledWallPayload:n.getElementById("ledWallPayload"),ledChainCount:n.getElementById("ledChainCount"),ledChainPeak:n.getElementById("ledChainPeak"),ledChainList:n.getElementById("ledChainList"),ledProcessorGuidance:n.getElementById("ledProcessorGuidance"),ledMaxLoad:n.getElementById("ledMaxLoad"),ledTypicalLoad:n.getElementById("ledTypicalLoad"),ledCircuitPlan:n.getElementById("ledCircuitPlan"),ledHomeRuns:n.getElementById("ledHomeRuns"),ledViewingRange:n.getElementById("ledViewingRange"),ledAudienceCheck:n.getElementById("ledAudienceCheck"),ledWarnings:n.getElementById("ledWarnings"),saveLedPresetBtn:n.getElementById("saveLedPresetBtn"),copyLedSummaryBtn:n.getElementById("copyLedSummaryBtn"),downloadLedSummaryBtn:n.getElementById("downloadLedSummaryBtn"),sendLedTypicalPowerBtn:n.getElementById("sendLedTypicalPowerBtn"),sendLedMaxPowerBtn:n.getElementById("sendLedMaxPowerBtn"),summaryOutput:n.getElementById("summaryOutput"),saveStatus:n.getElementById("saveStatus"),actionStatus:n.getElementById("actionStatus"),resetBtn:n.getElementById("resetBtn"),copyButtons:[n.getElementById("copySummaryBtn"),n.getElementById("copySummaryBtn2")],downloadSummaryBtn:n.getElementById("downloadSummaryBtn")};let M="defaults",m=0,E="",_=null,v=null,C={row:1,column:1},U=null,P=!1;const T="avCalculator.ledProfiles.v1",F=["ledProductName","ledPitchMm","ledCabinetWidthMm","ledCabinetHeightMm","ledCabinetPixelsWide","ledCabinetPixelsHigh","ledMaxWattsEach","ledTypicalWattsEach","ledVoltage","ledPortBasePixels","ledReceiverPixelsWide","ledReceiverPixelsHigh","ledCabinetsPerHomeRun","ledSpecSource","ledWeightKg","ledPowerFactor","ledPowerFactorEntered"],W=new Set(["ledProductName","ledPitchMm","ledCabinetWidthMm","ledCabinetHeightMm","ledCabinetPixelsWide","ledCabinetPixelsHigh","ledMaxWattsEach","ledTypicalWattsEach","ledSpecSource","ledWeightKg","ledPowerFactor","ledReceiverPixelsWide","ledReceiverPixelsHigh","ledCabinetsPerHomeRun"]),L=(()=>{try{const h="avCalculator.storage.probe";return window.localStorage.setItem(h,"1"),window.localStorage.removeItem(h),{available:!0,get:w=>{try{return window.localStorage.getItem(w)}catch{return null}},set:(w,k)=>{try{return window.localStorage.setItem(w,k),!0}catch{return!1}},remove:w=>{try{return window.localStorage.removeItem(w),!0}catch{return!1}}}}catch{return{available:!1,get:()=>null,set:()=>!1,remove:()=>{}}}})(),O=n.getElementById("themeToggle"),Q=L.get("av-theme-mode.v1");["light","dark","white","black","system"].includes(Q)||(n.documentElement.dataset.avTheme="dark");function z(){const h=n.documentElement.dataset.avTheme,k=h==="dark"||h==="black"||h==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"Light mode":"Dark mode";O.textContent=k,O.setAttribute("aria-label",`Switch to ${k.toLowerCase()}`)}z(),O.addEventListener("click",()=>{const h=O.textContent==="Dark mode"?"dark":"light";n.documentElement.dataset.avTheme=h,L.set("av-theme-mode.v1",h),z()});const ne=window.matchMedia("(prefers-color-scheme: dark)");ne.addEventListener&&ne.addEventListener("change",z);let R=pe(),H=Le(),J=[],j=!1;function pe(){const h=L.get(l);if(!h)return{...o};try{const w=JSON.parse(h);if(!w||typeof w!="object"||Array.isArray(w))throw new TypeError("Saved calculator state must be an object.");return Object.prototype.hasOwnProperty.call(w,"powerMethod")?(M="loaded",ge({...o,...w})):(M="migrated",ge({...o,...w,powerMethod:"watts",powerFactor:0}))}catch{return M="invalid",{...o}}}function ge(h){const w=Number(h.ledPowerFactor);return(h.ledPowerFactorEntered!==!0||!Number.isFinite(w)||w<.1||w>1)&&(P=h.ledPowerFactor!==null&&h.ledPowerFactor!==void 0,h.ledPowerFactor=null,h.ledPowerFactorEntered=!1),h}function Le(){const h=L.get(T);if(!h)return[];try{const w=JSON.parse(h);return Array.isArray(w)?w.filter(k=>k&&typeof k=="object"&&typeof k.id=="string"&&typeof k.name=="string").slice(0,20):[]}catch{return[]}}function Ae(h){if(!h||typeof h!="object"||!/^[a-z0-9-]+$/.test(h.id||"")||typeof h.manufacturer!="string"||typeof h.name!="string"||typeof h.sourceRevision!="string"||typeof h.powerEvidence!="string")return!1;try{if(new URL(h.sourceUrl).protocol!=="https:")return!1}catch{return!1}const w=h.cabinet;return!w||!["pitchMm","widthMm","heightMm","pixelsWide","pixelsHigh","weightKg","maxWatts","typicalWatts"].every(k=>Number.isFinite(w[k])&&w[k]>0)||w.typicalWatts>w.maxWatts?!1:Math.abs(w.widthMm/w.pixelsWide-w.pitchMm)/w.pitchMm<.005&&Math.abs(w.heightMm/w.pixelsHigh-w.pitchMm)/w.pitchMm<.005}async function Te(){try{const h=await e("data/led-cabinet-catalog.v1.json");if(!h.ok)throw new Error(`Catalog request failed: ${h.status}`);const w=await h.json();if(w.schemaVersion!==1||!Array.isArray(w.records)||!w.records.length||!w.records.every(Ae))throw new Error("Cabinet catalog failed validation.");J=w.records,ue(),ve()}catch{j=!0,ue(),ve()}}function oe(){const h=J.find(k=>k.id===R.ledCatalogId);if(!h)return null;const w={ledProductName:`${h.manufacturer} ${h.name}`,ledPitchMm:h.cabinet.pitchMm,ledCabinetWidthMm:h.cabinet.widthMm,ledCabinetHeightMm:h.cabinet.heightMm,ledCabinetPixelsWide:h.cabinet.pixelsWide,ledCabinetPixelsHigh:h.cabinet.pixelsHigh,ledWeightKg:h.cabinet.weightKg,ledMaxWattsEach:h.cabinet.maxWatts,ledTypicalWattsEach:h.cabinet.typicalWatts,ledSpecSource:h.sourceUrl};return Object.entries(w).every(([k,K])=>R[k]===K)?h:null}function ue(h=R.ledCatalogId?`catalog:${R.ledCatalogId}`:""){const w=n.createElement("option");w.value="",w.textContent="Current custom profile";const k=n.createElement("optgroup");k.label="Manufacturer planning profiles",J.forEach(re=>{const se=n.createElement("option");se.value=`catalog:${re.id}`,se.textContent=`${re.manufacturer} · ${re.name} · ${re.environment}`,k.append(se)});const K=n.createElement("optgroup");K.label="Your saved profiles",H.forEach(re=>{const se=n.createElement("option");se.value=re.id,se.textContent=re.name,K.append(se)}),d.ledProfileSelect.replaceChildren(w,k,K),d.ledProfileSelect.value=h}function B(){const h=V();R.ledCatalogId=null;const w=String(R.ledProductName||o.ledProductName).trim(),k=w.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,56)||`led-profile-${Date.now()}`,K=Object.fromEntries(F.map(g=>[g,R[g]])),re={id:k,name:w,values:K},se=H.findIndex(g=>g.id===k);se>=0?H.splice(se,1,re):H.unshift(re),H=H.slice(0,20);const Se=L.set(T,JSON.stringify(H));ye(),ve(),ue(Se?k:"");const be=h.length?` ${h.join(" ")}`:"";Nt(Se?`LED profile “${w}” saved.${be}`:"LED profile could not be saved because browser storage is unavailable.",Se?"success":"error"),Ht(d.saveLedPresetBtn,Se?"success":"error")}function le(){const h=J.find(se=>`catalog:${se.id}`===d.ledProfileSelect.value);if(h){const se=h.cabinet;Object.assign(R,{ledCatalogId:h.id,ledProductName:`${h.manufacturer} ${h.name}`,ledPitchMm:se.pitchMm,ledCabinetWidthMm:se.widthMm,ledCabinetHeightMm:se.heightMm,ledCabinetPixelsWide:se.pixelsWide,ledCabinetPixelsHigh:se.pixelsHigh,ledWeightKg:se.weightKg,ledMaxWattsEach:se.maxWatts,ledTypicalWattsEach:se.typicalWatts,ledSpecSource:h.sourceUrl,ledPowerFactor:null,ledPowerFactorEntered:!1,ledReceiverPixelsWide:null,ledReceiverPixelsHigh:null,ledCabinetsPerHomeRun:null}),te();const Se=V(),be=ye();ve(),Nt(`${h.manufacturer} ${h.name} planning profile loaded.${Se.length?` ${Se.join(" ")}`:""}${be?"":" Browser storage is unavailable."}`,be?"success":"error");return}const w=H.find(se=>se.id===d.ledProfileSelect.value);if(!w||!w.values||typeof w.values!="object")return;R.ledCatalogId=null,F.forEach(se=>{Object.prototype.hasOwnProperty.call(w.values,se)?R[se]=w.values[se]:["ledSpecSource","ledWeightKg","ledPowerFactor","ledPowerFactorEntered"].includes(se)&&(R[se]=o[se])}),(w.values.ledPowerFactorEntered!==!0||!Number.isFinite(Number(R.ledPowerFactor))||Number(R.ledPowerFactor)<.1||Number(R.ledPowerFactor)>1)&&(R.ledPowerFactor=null,R.ledPowerFactorEntered=!1),te(),ie();const k=V(),K=ye();ve();const re=k.length?` ${k.join(" ")}`:"";Nt(`LED profile “${w.name}” loaded.${re}${K?"":" Calculator storage is unavailable."}`,K?"success":"error")}function ye(h=[]){const w=L.get(l);if(w)try{const K=JSON.parse(w);K&&typeof K=="object"&&!Array.isArray(K)&&Object.keys(o).forEach(re=>{!f.has(re)&&!h.includes(re)&&Object.prototype.hasOwnProperty.call(K,re)&&(R[re]=K[re])})}catch{}const k=L.set(l,JSON.stringify(R));return d.saveStatus.textContent=k?"Saved":"Storage blocked",k}p||(window.AvCalculatorFieldSets=Object.freeze({keys:Object.freeze([...f]),capture:()=>Object.fromEntries([...f].map(h=>[h,R[h]])),restore(h){if(!h||typeof h!="object"||Array.isArray(h)||[...f].some(re=>!Object.prototype.hasOwnProperty.call(h,re)))return!1;const w={...R};if(f.forEach(re=>{R[re]=h[re]}),te(),Y(),V().length)return R=w,te(),Y(),!1;const K=ye();return ve(),Nt(K?"Field set recalled and saved.":"Field set recalled, but browser storage is unavailable.",K?"success":"error"),!0}}));function N(h){const w=Number(R[h]);return Number.isFinite(w)?w:Number(o[h])}function b(h){if(R[h]===null||R[h]===void 0||R[h]==="")return null;const w=Number(R[h]);return Number.isFinite(w)?w:null}function S(h){const w=Array.from(n.querySelectorAll("label")).find(k=>k.htmlFor===h.id);return w?w.textContent.trim():h.dataset.key}function D(h){const w=String(h),k=w.indexOf(".");return k===-1?0:w.length-k-1}function q(h,w){const k=(h.getAttribute("aria-describedby")||"").split(/\s+/).filter(K=>K&&K!=="actionStatus");w&&k.push("actionStatus"),k.length?h.setAttribute("aria-describedby",k.join(" ")):h.removeAttribute("aria-describedby")}function y(h){if(!h)return!0;try{return["https:","http:"].includes(new URL(h).protocol)}catch{return!1}}function G(h){const w=h.dataset.key,k=h.value.trim();if(h.dataset.optional==="true"&&k==="")return h.removeAttribute("aria-invalid"),q(h,!1),{value:null,message:""};const K=Number(o[w]),re=h.min===""?Number.NEGATIVE_INFINITY:Number(h.min),se=h.max===""?Number.POSITIVE_INFINITY:Number(h.max),Se=h.step===""||h.step==="any"?0:Number(h.step),be=S(h);let g=Number(k),I="";if(w==="ledPowerFactor"&&(k===""||!Number.isFinite(g)||g<re||g>se))return h.value="",h.removeAttribute("aria-invalid"),q(h,!0),{value:null,message:"Manufacturer Power Factor was invalid and cleared. Enter the equipment specification before using current or circuit estimates."};if(k===""||!Number.isFinite(g)?(g=K,I="fallback"):g<re?(g=re,I="minimum"):g>se&&(g=se,I="maximum"),Number.isFinite(Se)&&Se>0){const Z=Number.isFinite(re)?re:0,ce=(g-Z)/Se,he=Number.EPSILON*Math.max(1,Math.abs(ce))*8,fe=Z+Math.round(ce+he)*Se,Me=Math.max(1,Math.abs(g))*Number.EPSILON*16;!I&&Math.abs(fe-g)>Me&&(I="step"),g=fe}g=Math.min(se,Math.max(re,g));const $=Math.min(8,Math.max(D(Se),Number.isFinite(re)?D(re):0));g=Number(g.toFixed($));const ee=String(g);return h.value=ee,h.removeAttribute("aria-invalid"),q(h,!!I),I==="fallback"?{value:g,message:`${be} was blank or invalid and reset to ${ee}.`}:I==="minimum"?{value:g,message:`${be} was below ${re} and clamped to ${ee}.`}:I==="maximum"?{value:g,message:`${be} was above ${se} and clamped to ${ee}.`}:I==="step"?{value:g,message:`${be} was normalized to ${ee} to match ${Se} increments.`}:{value:g,message:""}}function V(){const h=[];return u.forEach(w=>{if(w.disabled)return;const k=w.dataset.key;if(w.dataset.kind==="url"){const re=w.value.trim().slice(0,w.maxLength),se=y(re);R[k]=se?re:"",w.value=R[k],w.removeAttribute("aria-invalid"),se||h.push("Manufacturer Specification URL was invalid and cleared. Use a full http or https URL.");return}if(w.dataset.kind==="text"){const re=w.maxLength>0?w.maxLength:120,se=String(o[k]||"Custom LED profile"),Se=w.value.replace(/\s+/g," ").slice(0,re),be=Se.trim()||se;w.value=Se||se,R[k]=be,w.removeAttribute("aria-invalid");return}if(w.tagName==="SELECT"){Array.from(w.options,se=>se.value).includes(w.value)||(w.value=String(o[k]),h.push(`${S(w)} was invalid and reset to ${w.options[w.selectedIndex].text}.`)),R[k]=w.value;return}const K=G(w);R[k]=K.value,K.message&&h.push(K.message)}),h}function A(){let h=!0;return u.forEach(w=>{if(w.disabled)return;const k=w.dataset.key;w.dataset.kind==="url"?y(w.value.trim())?R[k]=w.value.trim():h=!1:w.dataset.kind==="text"?R[k]=w.value.replace(/\s+/g," ").trim()||o[k]:w.tagName==="SELECT"?R[k]=w.value:w.dataset.optional==="true"&&w.value===""?(R[k]=null,q(w,!1)):w.value!==""&&w.validity.valid&&Number.isFinite(Number(w.value))?(R[k]=Number(w.value),q(w,!1)):h=!1}),h}function te(){u.forEach(h=>{const w=h.dataset.key;R[w]!==void 0&&(h.value=R[w]===null?"":String(R[w]))})}function Y(){const h=R.powerMethod==="watts";d.nameplateAmpsField.hidden=h,d.wattsField.hidden=!h,d.powerFactorField.hidden=!h,d.deviceAmps.disabled=h,d.deviceAmps.required=!h,d.deviceWatts.disabled=!h,d.powerFactor.disabled=!h,d.powerFactor.required=h,d.powerMethodBadge.textContent=h?"Watts + PF estimate":"Nameplate current"}function ie(){const h=["layout","targetSize","targetRaster","custom"].includes(R.ledMode)?R.ledMode:"layout",w=h==="layout"||h==="custom";[[d.ledLayoutFields,w],[d.ledTargetSizeFields,h==="targetSize"],[d.ledTargetRasterFields,h==="targetRaster"]].forEach(([K,re])=>{K.hidden=!re,Array.from(K.querySelectorAll("[data-key]")).forEach(se=>{se.disabled=!re})}),h==="targetSize"?d.ledModeNote.textContent="Columns and rows are independently rounded up from the requested physical size. Actual build dimensions and overbuild stay visible.":h==="targetRaster"?d.ledModeNote.textContent="Columns and rows are independently rounded up from the requested raster. The result is the nearest whole-cabinet canvas at or above the target.":h==="custom"?d.ledModeNote.textContent="Custom panel layout uses the entered cabinet geometry, raster, pitch, and whole-cabinet array without requiring a product database.":d.ledModeNote.textContent="Cabinet layout uses the entered whole-cabinet array directly."}function de(h){if(p&&F.includes(h.target.dataset.key)&&(R.ledCatalogId?W.has(h.target.dataset.key)&&(R.ledCatalogId=null,d.ledProfileSelect.value=""):d.ledProfileSelect.value=""),h.type==="input"){if(p&&h.target===d.ledPowerFactor&&(R.ledPowerFactorEntered=h.target.value!==""&&h.target.validity.valid),!A()){d.saveStatus.textContent="Editing";return}p?ie():Y();const K=ye();ve(),K||zt("Calculations updated. Browser storage is unavailable, so values were not saved.","error");return}const w=V();p&&h.target===d.ledPowerFactor?R.ledPowerFactorEntered=R.ledPowerFactor!==null:p&&R.ledPowerFactor===null&&(R.ledPowerFactorEntered=!1),p?ie():Y();const k=ye();ve(),Ii(w,k)}function ve(){if(p){Ye();return}const h=ae(),w=Pe(),k=xe(),K=Ee(),re=me(),se=Ie();vn(h,w,k,K,re,se)}function ae(){const h=N("delayDistance"),w=R.delayUnit==="m"?"m":"ft",k=N("delayTemp"),se=(331.3+.606*((k-32)*5/9))*3.28084,Se=w==="m"?h*3.28084:h,be=se>0?Se/se*1e3:0,g=N("delayFrameRate"),I=be/1e3*g,$=be/1e3*48e3;return d.delayMs.textContent=`${x(be,1)} ms`,d.delayFrames.textContent=`${x(I,2)} fr`,d.delaySamples.textContent=String(Math.round($)),d.delayHint.textContent=be>35?"This is beyond a Haas range. Treat it as a real delay zone.":"Short delay range. Check alignment by ear in the room.",{delayMs:be,frames:I,samples:$,distanceInput:h,unit:w,tempF:k}}function Pe(){const h=N("screenWidth"),w=N("aspectRatio"),k=N("throwRatio"),K=N("throwDistance"),re=h/w,se=Math.sqrt((h*12)**2+(re*12)**2),Se=h*k,be=K/h,g=K-Se;return d.screenHeight.textContent=`${x(re,2)} ft`,d.screenDiagonal.textContent=`${x(se,0)} in`,d.idealThrow.textContent=`${x(Se,1)} ft`,d.projectionHint.textContent=`Actual distance needs a ${x(be,2)}:1 lens. Variance from selected ratio is ${x(g,1)} ft.`,{widthFt:h,heightFt:re,diagonalIn:se,throwRatio:k,idealThrowFt:Se,actualDistance:K,requiredRatio:be,varianceFt:g}}function xe(){const h=N("bitrate"),w=N("recordHours"),k=N("cameraCount"),K=N("storageHeadroom"),re=h*w*3600/8/1e3*k,se=re*(1+K/100),Se=h*3600/8/1e3*k;return d.baseStorage.textContent=`${x(re,1)} GB`,d.totalStorage.textContent=`${x(se,1)} GB`,d.perHourStorage.textContent=`${x(Se,1)} GB`,d.storageHint.textContent=se>=1e3?`Plan about ${x(se/1e3,2)} TB with headroom.`:`Plan about ${x(se,1)} GB with headroom.`,{bitrate:h,hours:w,feeds:k,headroom:K,baseGb:re,totalGb:se,perHourGb:Se}}function Ee(){const h=R.powerMethod==="watts"?"watts":"amps",w=N("deviceAmps"),k=N("deviceWatts"),K=N("powerFactor"),re=N("deviceCount"),se=N("voltage"),Se=N("circuitAmps"),be=k*re,g=h==="amps"?w>0:k>0&&K>0,I=h==="amps"?w*re:g&&se>0?be/(se*K):0,$=Se*.8,ee=g&&$>0?I/$*100:0;return h==="amps"?(d.powerInputLabel.textContent="Per Device Current",d.powerCurrentLabel.textContent="Total Nameplate",d.totalWatts.textContent=g?`${x(w,2)} A`:"—",d.totalAmps.textContent=g?`${x(I,2)} A`:"—",d.powerWarningLabel.textContent="Planning reference:",d.powerWarningText.textContent="Sum equipment nameplate current, include startup or inrush demand, and verify the distribution before assigning circuits."):(d.powerInputLabel.textContent="Total Real Power",d.powerCurrentLabel.textContent="Estimated Current",d.totalWatts.textContent=g?`${x(be,0)} W`:"—",d.totalAmps.textContent=g?`~${x(I,2)} A`:"—",d.powerWarningLabel.textContent=g?"Single-phase estimate:":"Power factor required:",d.powerWarningText.textContent=g?`Current uses watts ÷ (${x(se,0)} V × ${x(K,2)} PF). Include startup or inrush demand and verify the distribution.`:"Enter the manufacturer power factor; the calculator will not silently assume PF 1. Include startup or inrush demand before assigning circuits."),d.circuitPercent.textContent=g?`${x(ee,0)}%`:"—",{method:h,complete:g,ampsEach:w,wattsEach:k,powerFactor:K,count:re,voltage:se,circuitAmps:Se,totalWatts:be,ampsEstimate:I,referenceAmps:$,percentOfReference:ee}}function me(){const h={14:2.525,12:1.588,10:.999,8:.628,6:.395,4:.249,2:.156},w=N("dropAmps"),k=N("dropLength"),K=String(R.dropGauge||o.dropGauge),re=N("dropVoltage"),se=(h[K]||h[10])/1e3,Se=2*k*w*se,be=re>0?Se/re*100:0,g=re-Se;return d.voltageDrop.textContent=`${x(Se,2)} V`,d.dropPercent.textContent=`${x(be,1)}%`,d.dropEndV.textContent=`${x(g,1)} V`,d.dropResult.classList.remove("good","warn","bad"),d.dropResult.classList.add(be<=3?"good":be<=5?"warn":"bad"),d.dropHint.textContent=be<=3?"Drop is within the 3 percent target for sensitive gear.":be<=5?"Acceptable for general loads but high for sensitive gear. Consider a heavier gauge.":"Drop is too high. Use a heavier gauge, a shorter run, or higher voltage.",{amps:w,lengthFt:k,gauge:K,voltage:re,dropV:Se,percent:be,endV:g}}function Ie(){const h=N("splRef"),w=N("splRefDist"),k=N("splTargetDist"),K=w>0?k/w:1,re=20*Math.log10(K),se=h-re,Se=Math.log2(K);return d.splOut.textContent=`${x(se,1)} dB`,d.splLoss.textContent=`${re>=0?"-":"+"}${x(Math.abs(re),1)} dB`,d.splDoublings.textContent=x(Se,2),d.splHint.textContent=k>=w?`Free field: about 6 dB lost per distance doubling (${x(Se,1)} doublings here).`:"Target is closer than the reference, so the level rises above the reference SPL.",{refSpl:h,refDist:w,targetDist:k,loss:re,splAt:se,doublings:Se}}function Ye(){const h=["layout","targetSize","targetRaster","custom"].includes(R.ledMode)?R.ledMode:"layout",w=String(R.ledProductName||o.ledProductName),k=N("ledPitchMm"),K=N("ledCabinetWidthMm"),re=N("ledCabinetHeightMm"),se=b("ledCabinetPixelsWide"),Se=b("ledCabinetPixelsHigh"),be=!!se!=!!Se,g=!!(se&&Se),I=K/k,$=re/k,ee=g?se:Math.max(1,Math.round(I)),Z=g?Se:Math.max(1,Math.round($)),ce=K/ee,he=re/Z,fe=String(R.ledCabinetRotation)==="90",Me=fe?re:K,we=fe?K:re,Ue=fe?Z:ee,Ve=fe?ee:Z,Re=N("ledTargetWidthFt"),Xe=N("ledTargetHeightFt"),at=N("ledTargetWidthPx"),st=N("ledTargetHeightPx"),nt=ot=>Math.max(1,Math.ceil(ot-1e-10));let ze=N("ledCabinetsWide"),Qe=N("ledCabinetsHigh"),dt="The entered whole-cabinet layout is used directly.";h==="targetSize"?(ze=nt(Re*304.8/Me),Qe=nt(Xe*304.8/we)):h==="targetRaster"&&(ze=nt(at/Ue),Qe=nt(st/Ve));const Ne=ze*Qe,Fe=Me*ze,St=we*Qe,en=Ue*ze,Xt=Ve*Qe,tn=en*Xt,Ct=en/Xt,qt=Fe/1e3,Pt=St/1e3,xn=Fe/304.8,jt=St/304.8,di=qt*Pt,hi=xn*jt,pi=Math.hypot(qt,Pt),Di=Math.hypot(xn,jt);if(h==="targetSize"){const ot=Fe-Re*304.8,Vt=St-Xe*304.8;dt=`Requested ${x(Re,1)} × ${x(Xe,1)} ft; independent column and row ceiling produces ${ze} × ${Qe} cabinets, adding ${x(ot,0)} mm width and ${x(Vt,0)} mm height.`}else h==="targetRaster"?dt=`Requested ${x(at,0)} × ${x(st,0)} px; independent column and row ceiling produces ${ze} × ${Qe} cabinets and ${x(en-at,0)} × ${x(Xt-st,0)} extra pixels.`:h==="custom"&&(dt="Custom panel mode uses the entered cabinet geometry, raster, pitch, rotation, and whole-cabinet array directly.");const Be=fe?$:I,Yt=fe?I:$,Ft=g?Math.abs(ee-I)/I*100:0,nn=g?Math.abs(Z-$)/$*100:0,fi=Math.max(Ft,nn),Mn=Math.max(Math.abs(I-Math.round(I)),Math.abs($-Math.round($))),Kt=lt({wallWidthPx:en,wallHeightPx:Xt,totalPixels:tn,aspectRatio:Ct}),He=Ke({totalPixels:tn,cabinetPixelsWide:Ue,cabinetPixelsHigh:Ve,cabinetsTotal:Ne}),vt=ct({cabinetsTotal:Ne,areaM2:di}),rn=Mt(k),et=[];if((I<1||$<1)&&et.push({severity:"bad",label:"PITCH",text:"Cabinet dimensions are smaller than one pixel at the entered pitch. Verify cabinet size and pixel pitch against the product specification before using this plan."}),vt.typicalWattsEach>vt.maxWattsEach&&et.push({severity:"bad",label:"POWER",text:"Typical watts per cabinet exceed maximum watts per cabinet. Verify both ratings before using the power or circuit plan."}),Mn>.05){const ot=g?"The entered cabinet raster remains authoritative.":"A whole-pixel pitch-derived raster is being used; verify it against the product specification.";et.push({severity:"warn",label:"PITCH",text:`Cabinet dimensions ÷ P${x(k,2)} do not land on whole pixels (${x(Be,2)} × ${x(Yt,2)}). ${ot}`})}be&&et.push({severity:"warn",label:"RASTER",text:"Enter both cabinet raster dimensions or leave both blank. Pitch-derived width and height are being used together for this calculation."}),fi>1&&et.push({severity:"bad",label:"RASTER",text:`Entered cabinet raster differs from the pitch-derived check by up to ${x(fi,1)}%. Verify the exact product specification.`}),Kt.aspectMismatchPercent>1&&et.push({severity:"warn",label:"CONTENT",text:`Source and wall aspect ratios differ by ${x(Kt.aspectMismatchPercent,1)}%. ${Kt.fitLabel} requires deliberate scaling, crop, or letterbox review.`}),Kt.sourceLarger&&et.push({severity:"info",label:"SOURCE",text:"Source raster is larger than the native wall raster, so the processor or playback chain must downscale it. This is not inherently an error."}),Kt.standardNativeRaster||et.push({severity:"info",label:"CANVAS",text:"Native wall raster is nonstandard. Confirm playback, switcher-scaling, graphics-canvas, and IMAG workflows at the exact native resolution."}),He.chainPortsRequired===null?et.push({severity:"bad",label:"CHAINS",text:"One complete cabinet exceeds the adjusted planning pixels per port. No whole-cabinet chain can be mapped with these inputs."}):He.processorPortCount&&He.chainPortsRequired>He.processorPortCount?et.push({severity:"bad",label:"CHAINS",text:`${He.chainPortsRequired} whole-cabinet planning chains exceed the ${He.processorPortCount} physical ports entered for the processor.`}):He.chainPortsRequired>He.portsRequired?et.push({severity:"warn",label:"CHAINS",text:`Whole-cabinet chains need ${He.chainPortsRequired} ports; the even-pixel lower bound is ${He.portsRequired}. Verify the actual processor and cable topology.`}):He.heaviestChainUtilization>80?et.push({severity:"bad",label:"PORTS",text:`Heaviest planned chain is ${x(He.heaviestChainUtilization,1)}% of nominal capacity. Review the processor and chain plan.`}):He.heaviestChainUtilization>70&&et.push({severity:"warn",label:"PORTS",text:`Heaviest planned chain is ${x(He.heaviestChainUtilization,1)}% of nominal capacity. Verify that output in manufacturer software.`}),He.receiverIncomplete?et.push({severity:"warn",label:"RECEIVER",text:"Enter both receiver-card width and height limits to validate cabinet loading."}):He.receiverExceeded&&et.push({severity:"bad",label:"RECEIVER",text:`The ${Ue} × ${Ve} cabinet raster exceeds the entered ${He.receiverPixelsWide} × ${He.receiverPixelsHigh} receiver-card limit.`}),rn.status==="bad"?et.push({severity:"bad",label:"VIEWING",text:rn.message}):rn.status==="warn"&&et.push({severity:"warn",label:"VIEWING",text:rn.message}),et.length||et.push({severity:"info",label:"CHECK",text:"No generic planning thresholds are exceeded. Product-specific verification is still required."}),Ce({mode:h,productName:w,pitchMm:k,rotated:fe,cabinetWidthMm:Me,cabinetHeightMm:we,cabinetPixelsWide:Ue,cabinetPixelsHigh:Ve,cabinetsWide:ze,cabinetsHigh:Qe,cabinetsTotal:Ne,wallWidthMm:Fe,wallHeightMm:St,wallWidthM:qt,wallHeightM:Pt,wallWidthFt:xn,wallHeightFt:jt,wallWidthPx:en,wallHeightPx:Xt,totalPixels:tn,aspectRatio:Ct,areaM2:di,areaFt2:hi,diagonalM:pi,diagonalFt:Di,pitchDerivedWide:Be,pitchDerivedHigh:Yt,targetOutcome:dt,content:Kt,processing:He,power:vt,viewing:rn,warnings:et,enteredRasterProvided:g,rasterIncomplete:be,impliedPitchWideMm:ce,impliedPitchHighMm:he});const Lt={mode:h,productName:w,pitchMm:k,rotated:fe,cabinetWidthMm:Me,cabinetHeightMm:we,cabinetPixelsWide:Ue,cabinetPixelsHigh:Ve,cabinetsWide:ze,cabinetsHigh:Qe,cabinetsTotal:Ne,wallWidthMm:Fe,wallHeightMm:St,wallWidthM:qt,wallHeightM:Pt,wallWidthFt:xn,wallHeightFt:jt,wallWidthPx:en,wallHeightPx:Xt,totalPixels:tn,aspectRatio:Ct,areaM2:di,areaFt2:hi,diagonalM:pi,diagonalFt:Di,pitchDerivedWide:Be,pitchDerivedHigh:Yt,targetOutcome:dt,content:Kt,processing:He,power:vt,viewing:rn,warnings:et,enteredRasterProvided:g,rasterIncomplete:be,impliedPitchWideMm:ce,impliedPitchHighMm:he};return _=vt,E=yt(Lt),Lt}function lt(h){const w=N("ledContentWidthPx"),k=N("ledContentHeightPx"),K=w/k,re=h.wallWidthPx/w,se=h.wallHeightPx/k,Se=Math.abs(h.aspectRatio-K)/K*100,be=["contain","cover","stretch"].includes(R.ledFitPolicy)?R.ledFitPolicy:"contain",g=w===h.wallWidthPx&&k===h.wallHeightPx,I=w>h.wallWidthPx||k>h.wallHeightPx,$=be==="cover"?Math.max(re,se):Math.min(re,se),ee=be==="stretch"?h.wallWidthPx:Math.min(h.wallWidthPx,w*$),Z=be==="stretch"?h.wallHeightPx:Math.min(h.wallHeightPx,k*$),ce=be==="cover"||be==="stretch"?100:ee*Z/h.totalPixels*100;let he=g?"Native":I?"Downscale":"Upscale";Se>1&&(he=be==="cover"?"Crop / scale review":be==="stretch"?"Non-uniform scale":"Letterbox review");const fe=new Set(["1280x720","1920x1080","2560x1440","3840x2160","7680x4320"]).has(`${h.wallWidthPx}x${h.wallHeightPx}`),Me=3*N("ledBitDepth"),we=w*k*N("ledRefreshHz")*Me/1e9/.95;return{sourceWidthPx:w,sourceHeightPx:k,sourceAspect:K,scaleX:re,scaleY:se,aspectMismatchPercent:Se,fitPolicy:be,fitLabel:he,exactRaster:g,sourceLarger:I,activePixelUtilization:ce,standardNativeRaster:fe,sourceBandwidthGbps:we}}function Ke(h){const w=N("ledRefreshHz"),k=N("ledBitDepth"),K=N("ledPortBasePixels"),re=N("ledPortSafetyPercent")/100,se=b("ledProcessorPortCount"),Se=b("ledReceiverPixelsWide"),be=b("ledReceiverPixelsHigh"),g=.95,I=3*k,$=1e9*g/(w*I),ee=K*(60/w)*(8/k),Z=Math.min($,ee),ce=Z*re,he=Math.max(1,Math.ceil(h.totalPixels/ce)),fe=h.totalPixels/he,Me=fe/Z*100,we=h.cabinetPixelsWide*h.cabinetPixelsHigh,Ue=Math.floor(ce/we),Ve=Ue>0?Math.ceil(h.cabinetsTotal/Ue):null,Re=Ue>0?Math.min(Ue,h.cabinetsTotal)*we:null,Xe=Re===null?null:Re/Z*100,at=h.totalPixels*w*I/1e9,st=at/g,nt=!!Se!=!!be,ze=!!(Se&&be)&&(h.cabinetPixelsWide>Se||h.cabinetPixelsHigh>be);return{refreshHz:w,bitDepth:k,nominalPixelsPerPort:K,planningUtilization:re,processorPortCount:se,receiverPixelsWide:Se,receiverPixelsHigh:be,theoreticalPixelsPerPort:$,adjustedNominalPixelsPerPort:ee,cappedPixelsPerPort:Z,safePixelsPerPort:ce,portsRequired:he,averagePixelsPerPort:fe,portUtilization:Me,rawPayloadGbps:at,plannedPayloadGbps:st,receiverIncomplete:nt,receiverExceeded:ze,pixelsPerCabinet:we,cabinetsPerChain:Ue,chainPortsRequired:Ve,heaviestChainPixels:Re,heaviestChainUtilization:Xe}}function ct(h){const w=N("ledMaxWattsEach"),k=N("ledTypicalWattsEach"),K=N("ledVoltage"),re=N("ledCircuitAmps"),se=N("ledContinuousPercent")/100,Se=R.ledPhaseMode==="threePhase"?"threePhase":"singlePhase",be=R.ledPowerFactorEntered?b("ledPowerFactor"):null,g=b("ledCabinetsPerHomeRun"),I=h.cabinetsTotal*w,$=h.cabinetsTotal*k,ee=re*se,Z=Ue=>be===null?null:Se==="threePhase"?Ue/(Math.sqrt(3)*K*be):Ue/(K*be),ce=Z(I),he=Z($),fe=ce===null?null:I>0?Math.max(1,Math.ceil(ce/ee)):0,Me=he===null?null:$>0?Math.max(1,Math.ceil(he/ee)):0,we=g?Math.ceil(h.cabinetsTotal/g):null;return{maxWattsEach:w,typicalWattsEach:k,voltage:K,breakerAmps:re,continuousFactor:se,phaseMode:Se,powerFactor:be,cabinetsPerHomeRun:g,maxWatts:I,typicalWatts:$,maxAmps:ce,typicalAmps:he,usableCircuitAmps:ee,maxCircuits:fe,typicalCircuits:Me,homeRunsRequired:we,maxPowerDensity:h.areaM2>0?I/h.areaM2:0}}function Mt(h){const w=N("ledClosestViewer"),k=R.ledClosestViewerUnit==="m"?"m":"ft",K=h,re=h*3,se=K*3.28084,Se=re*3.28084,be=k==="ft"?w*.3048:w;let g="good",I="At or beyond optimal",$="Closest viewing position is at or beyond the optimal rule-of-thumb distance.";return be<K?(g="bad",I="Inside minimum",$="Closest viewer is inside the minimum planning distance; individual pixels may be obvious."):be<re&&(g="warn",I="Between minimum and optimal",$="Closest viewer is between minimum and optimal planning distances; validate with the actual product, content, and sightlines."),{closestDistance:w,closestUnit:k,closestM:be,minimumM:K,optimalM:re,minimumFt:se,optimalFt:Se,status:g,label:I,message:$}}function Ce(h){v=h;const w=oe(),k=Math.max(4,Math.min(100,h.viewing.closestM/h.viewing.optimalM*100));d.ledWallPreview.style.setProperty("--wall-cols",h.cabinetsWide),d.ledWallPreview.style.setProperty("--wall-rows",h.cabinetsHigh),d.ledWallPreview.style.setProperty("--wall-ratio",h.wallWidthMm/h.wallHeightMm),d.ledWallPreview.setAttribute("aria-label",`${h.cabinetsWide} by ${h.cabinetsHigh} cabinet LED wall preview; ${x(h.wallWidthPx,0)} by ${x(h.wallHeightPx,0)} pixel native canvas.`),d.ledWallPreview.dataset.columns=String(h.cabinetsWide),d.ledWallPreview.dataset.rows=String(h.cabinetsHigh),d.ledWallPreview.dataset.cabinetWidthMm=String(h.cabinetWidthMm),d.ledWallPreview.dataset.cabinetHeightMm=String(h.cabinetHeightMm),d.ledWallPreview.dataset.cabinetsPerChain=String(h.processing.cabinetsPerChain),d.ledWallPreview.dispatchEvent(new Event("led-wall:geometry")),De(),d.ledPreviewRows.textContent=`${h.cabinetsHigh} cabinet${h.cabinetsHigh===1?"":"s"} high`,d.ledPreviewColumns.textContent=`${h.cabinetsWide} cabinet${h.cabinetsWide===1?"":"s"} wide`,d.ledPreviewArray.textContent=`${h.cabinetsWide} × ${h.cabinetsHigh}`,d.ledPreviewCanvas.innerHTML=`${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} native canvas<br>${x(h.wallWidthM,2)} × ${x(h.wallHeightM,2)} m build`;const K=h.processing.heaviestChainUtilization??h.processing.portUtilization;d.ledPreviewPortRail.style.setProperty("--rail-fill",`${Math.min(100,K)}%`),d.ledPreviewPort.textContent=h.processing.chainPortsRequired===null?"No chain":`${x(K,0)}%`,d.ledPreviewViewerRail.style.setProperty("--rail-fill",`${k}%`),d.ledPreviewViewer.textContent=h.viewing.status==="good"?"Optimal":h.viewing.status==="warn"?"Review":"Too close",d.ledWallDimensions.textContent=`${x(h.wallWidthFt,2)} × ${x(h.wallHeightFt,2)} ft`,d.ledWallDimensionsMetric.textContent=`${x(h.wallWidthM,2)} × ${x(h.wallHeightM,2)} m`,d.ledNativeRaster.textContent=`${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} px`,d.ledNativeMeta.textContent=`${x(h.totalPixels/1e6,2)} MP · ${x(h.aspectRatio,3)}:1`,d.ledContentFit.textContent=h.content.fitLabel,d.ledContentMeta.textContent=`${x(h.content.sourceWidthPx,0)} × ${x(h.content.sourceHeightPx,0)} source`,d.ledProcessing.textContent=h.processing.chainPortsRequired===null?"No valid chain":`${h.processing.chainPortsRequired} planned chain${h.processing.chainPortsRequired===1?"":"s"}`,d.ledProcessingMeta.textContent=`${h.processing.portsRequired} even-pixel lower bound · verify topology`,d.ledPower.textContent=`${x(h.power.maxWatts/1e3,2)} kW max`,d.ledPowerMeta.textContent=h.power.powerFactor===null?`${x(h.power.typicalWatts/1e3,2)} kW typical · PF needed for current`:`${x(h.power.typicalWatts/1e3,2)} kW typical · ~${x(h.power.typicalAmps,1)} A est.`,(w==null?void 0:w.manufacturer)==="Absen"&&(d.ledPowerMeta.textContent+=" · ±15% spec tolerance"),d.ledBuildArray.textContent=`${h.cabinetsWide} × ${h.cabinetsHigh} cabinets${h.rotated?" · rotated":""}`,d.ledCabinetCount.textContent=x(h.cabinetsTotal,0),d.ledMetricSize.textContent=`${x(h.wallWidthM,3)} × ${x(h.wallHeightM,3)} m`,d.ledImperialSize.textContent=`${pt(h.wallWidthMm)} × ${pt(h.wallHeightMm)}`,d.ledArea.textContent=`${x(h.areaM2,2)} m² · ${x(h.areaFt2,2)} ft²`,d.ledDiagonal.textContent=`${x(h.diagonalM,2)} m · ${x(h.diagonalFt,2)} ft`,d.ledCabinetRaster.textContent=`${x(h.cabinetPixelsWide,0)} × ${x(h.cabinetPixelsHigh,0)} px · ${h.enteredRasterProvided?"entered":"pitch derived"}`,d.ledPitchDerivedRaster.textContent=`${x(h.pitchDerivedWide,2)} × ${x(h.pitchDerivedHigh,2)} px`,d.ledImpliedPitch.textContent=`${x(h.impliedPitchWideMm,3)} × ${x(h.impliedPitchHighMm,3)} mm`,d.ledTargetOutcome.textContent=h.targetOutcome,d.ledSourceToWall.textContent=`${x(h.content.sourceWidthPx,0)} × ${x(h.content.sourceHeightPx,0)} → ${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)}`,d.ledScaleFactors.textContent=`${x(h.content.scaleX,3)}× / ${x(h.content.scaleY,3)}×`,d.ledPixelUtilization.textContent=`${x(h.content.activePixelUtilization,1)}%`,d.ledAspectMismatch.textContent=`${x(h.content.aspectMismatchPercent,2)}%`,d.ledSuggestedCanvas.textContent=`${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} px`,d.ledSourceBandwidth.textContent=`${x(h.content.sourceBandwidthGbps,2)} Gbps uncompressed`,d.ledContentGuidance.textContent=h.content.exactRaster?"Source and wall rasters match exactly. Native wall raster remains the first-choice graphics canvas.":`${h.content.fitLabel}: use the native ${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} canvas when possible and confirm the selected fit policy end to end.`,d.ledSafePixelsPerPort.textContent=x(h.processing.safePixelsPerPort,0),d.ledAveragePortLoad.textContent=x(h.processing.averagePixelsPerPort,0),d.ledPortUtilization.textContent=`${x(h.processing.portUtilization,1)}%`,d.ledWallPayload.textContent=`${x(h.processing.plannedPayloadGbps,2)} Gbps planned payload`,d.ledChainCount.textContent=h.processing.chainPortsRequired===null?"No valid chain":`${h.processing.chainPortsRequired} planned port${h.processing.chainPortsRequired===1?"":"s"}`,d.ledChainPeak.textContent=h.processing.heaviestChainPixels===null?"Cabinet exceeds limit":`${x(h.processing.heaviestChainPixels,0)} px · ${x(h.processing.heaviestChainUtilization,1)}% nominal`,rt(h),d.ledProcessorGuidance.textContent=`${h.processing.portsRequired} even-pixel lower-bound port(s) at ${x(h.processing.refreshHz,2)} Hz / ${x(h.processing.bitDepth,0)} bit. The color map assigns whole cabinets in an automatic row-serpentine order at ${x(h.processing.safePixelsPerPort,0)} planning pixels per port. It is a planning sequence, not a verified cable route; confirm chain direction, receiver limits, and the heaviest output in manufacturer software.`;const re=w?`${w.manufacturer} ${w.name} · ${w.sourceRevision}. ${w.powerEvidence}. ${w.evidenceNote}`:j?"Manufacturer catalog is unavailable; custom and saved profiles still work. Operator-supplied values require confirmation.":"Operator-supplied values; a source link does not verify them automatically.";if(d.ledProfileEvidence.replaceChildren(n.createTextNode(re)),R.ledSpecSource&&y(R.ledSpecSource)){const g=n.createElement("a");g.href=R.ledSpecSource,g.target="_blank",g.rel="noopener noreferrer",g.textContent=w?" Open manufacturer specification":" Open supplied specification",d.ledProfileEvidence.append(g)}const se=b("ledWeightKg");d.ledCabinetMass.textContent=se===null?"Cabinet weight needed":`${x(se*h.cabinetsTotal,2)} kg cabinets only`,d.ledSupportNote.textContent=w?`${w.evidenceNote} ${w.supportNote} Hardware, cables, ballast, wind, and structure are excluded from the cabinet-only mass.`:"Cabinet-only mass excludes hardware, cables, ballast, wind, and supporting structure. Confirm installation conditions with a qualified person.";const Se=h.power.phaseMode==="threePhase"?`balanced 3-phase line-to-line voltage${h.power.powerFactor===null?"":`, PF ${x(h.power.powerFactor,2)}`}`:`single-phase supply voltage${h.power.powerFactor===null?"":`, PF ${x(h.power.powerFactor,2)}`}`;d.ledMaxLoad.textContent=h.power.maxAmps===null?`${x(h.power.maxWatts/1e3,2)} kW · current pending PF`:`${x(h.power.maxWatts/1e3,2)} kW · ~${x(h.power.maxAmps,1)} A estimate`,d.ledTypicalLoad.textContent=h.power.typicalAmps===null?`${x(h.power.typicalWatts/1e3,2)} kW · current pending PF`:`${x(h.power.typicalWatts/1e3,2)} kW · ~${x(h.power.typicalAmps,1)} A estimate`,d.ledCircuitPlan.textContent=h.power.maxCircuits===null?"Enter manufacturer PF for circuit estimate":`${h.power.maxCircuits} max · ${h.power.typicalCircuits} typical (${x(h.power.breakerAmps,0)} A)`,d.ledHomeRuns.textContent=h.power.homeRunsRequired?`${h.power.homeRunsRequired} product run${h.power.homeRunsRequired===1?"":"s"} · ${x(h.power.cabinetsPerHomeRun,0)} cabinets each`:"Not specified",d.ledViewingRange.textContent=`${x(h.viewing.minimumFt,1)}–${x(h.viewing.optimalFt,1)} ft · ${x(h.viewing.minimumM,1)}–${x(h.viewing.optimalM,1)} m`,d.ledAudienceCheck.textContent=h.viewing.label,d.ledPowerResult.title=`${Se}; ${x(h.power.maxPowerDensity,0)} W/m² maximum density`,ht(d.ledContentResult,h.content.exactRaster?"good":h.content.aspectMismatchPercent>1?"warn":"good");const be=h.processing.chainPortsRequired===null||h.processing.processorPortCount&&h.processing.chainPortsRequired>h.processing.processorPortCount;ht(d.ledProcessingResult,be?"bad":h.processing.heaviestChainUtilization>70?"warn":"good"),ht(d.ledPowerResult,""),ht(d.ledWallResult,""),ht(d.ledRasterResult,""),Rt(h.warnings)}function We(h,w){const k=Math.floor(h/w)+1,K=h%w;return{row:k,column:k%2?K+1:w-K}}function De(){const h=v;if(!h)return;C.row=Math.max(1,Math.min(h.cabinetsHigh,C.row)),C.column=Math.max(1,Math.min(h.cabinetsWide,C.column)),d.ledInspectRow.max=String(h.cabinetsHigh),d.ledInspectColumn.max=String(h.cabinetsWide),d.ledInspectRow.value=String(C.row),d.ledInspectColumn.value=String(C.column);const w=(C.row-1)*h.cabinetsWide+(C.row%2?C.column-1:h.cabinetsWide-C.column),k=h.processing.cabinetsPerChain>0?Math.floor(w/h.processing.cabinetsPerChain)+1:null,K=(C.column-1)*h.cabinetPixelsWide,re=(C.row-1)*h.cabinetPixelsHigh;d.ledCabinetInspection.textContent=`R${C.row} C${C.column} · ${k?`planned port ${k}`:"no valid port"} · x ${x(K,0)}–${x(K+h.cabinetPixelsWide-1,0)}, y ${x(re,0)}–${x(re+h.cabinetPixelsHigh-1,0)} px`,d.ledWallPreview.dataset.selectedRow=String(C.row),d.ledWallPreview.dataset.selectedColumn=String(C.column),d.ledWallPreview.dispatchEvent(new Event("led-wall:plan"))}function rt(h){const w=h.processing;if(w.chainPortsRequired===null){d.ledChainList.replaceChildren();return}const k=[];for(let K=1;K<=Math.min(w.chainPortsRequired,12);K+=1){const re=(K-1)*w.cabinetsPerChain,se=Math.min(h.cabinetsTotal,K*w.cabinetsPerChain)-1,Se=We(re,h.cabinetsWide),be=We(se,h.cabinetsWide),g=n.createElement("button");g.type="button",g.style.borderLeft=`6px solid hsl(${(218+(K-1)*47)%360} 65% ${(K-1)%2?55:48}%)`,g.textContent=`Port ${K} · ${se-re+1} cabinets · R${Se.row} C${Se.column} → R${be.row} C${be.column}`,g.addEventListener("click",()=>{C=Se,De()});const I=n.createElement("li");I.append(g),k.push(I)}if(w.chainPortsRequired>12){const K=n.createElement("li");K.className="led-chain-list-note",K.textContent=`First 12 of ${x(w.chainPortsRequired,0)} planning chains shown. Use row and column above to inspect any cabinet.`,k.push(K)}d.ledChainList.replaceChildren(...k)}function ht(h,w){h.classList.remove("good","warn","bad"),w&&h.classList.add(w)}function Ut(h){const w=h==="front";if(d.ledWallPreview.parentElement.classList.toggle("front-view",w),d.ledPreviewFrontBtn.setAttribute("aria-pressed",String(w)),d.ledPreviewIsoBtn.setAttribute("aria-pressed",String(!w)),d.ledWallPreview.dispatchEvent(new CustomEvent("led-wall:view",{detail:h})),window.gsap&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){U&&U.kill();const k=[d.ledPreviewRows,d.ledPreviewColumns,d.ledPreviewArray,d.ledPreviewCanvas];U=window.gsap.timeline().fromTo(k,{opacity:.45,y:5},{opacity:1,y:0,duration:.28,ease:"power2.out",stagger:.045,clearProps:"opacity,transform"})}Nt(`LED cabinet map switched to ${w?"front":"isometric"} view.`,"success")}function Rt(h){d.ledWarnings.replaceChildren(...h.map(w=>{const k=n.createElement("li");return k.dataset.severity=w.severity,k.dataset.label=w.label,k.textContent=w.text,k}))}function pt(h){const w=h/25.4;let k=Math.floor(w/12),K=w-k*12;return K>=11.95&&(k+=1,K=0),`${k} ft ${x(K,1)} in`}function yt(h){const w=oe(),k=h.power.phaseMode==="threePhase"?"balanced three-phase at line-to-line voltage":"single-phase at supply voltage",K=h.power.powerFactor===null?"current and circuit estimates pending manufacturer power factor":`PF ${x(h.power.powerFactor,2)}; ${x(h.power.maxAmps,1)} A maximum and ${x(h.power.typicalAmps,1)} A typical estimate; ${h.power.maxCircuits} maximum-load and ${h.power.typicalCircuits} typical-load ${x(h.power.breakerAmps,0)} A circuit(s) at a ${x(h.power.continuousFactor*100,0)} percent planning target`;return[`LED profile: ${h.productName}; P${x(h.pitchMm,2)}, ${x(h.cabinetWidthMm,0)} × ${x(h.cabinetHeightMm,0)} mm effective cabinet, ${x(h.cabinetPixelsWide,0)} × ${x(h.cabinetPixelsHigh,0)} px${h.rotated?", rotated 90 degrees":""}.`,`Product evidence: ${R.ledSpecSource||"manufacturer specification URL not supplied"}; ${R.ledWeightKg?`${x(R.ledWeightKg,2)} kg per cabinet, ${x(R.ledWeightKg*h.cabinetsTotal,2)} kg cabinets only`:"cabinet weight not supplied"}. ${w?`${w.sourceRevision}; ${w.powerEvidence}. ${w.evidenceNote} ${w.supportNote}`:"All values are operator supplied and require confirmation."} Hardware, cables, ballast, wind, and structure are excluded.`,`LED wall: ${h.cabinetsWide} × ${h.cabinetsHigh} cabinets (${h.cabinetsTotal} total), ${x(h.wallWidthM,2)} × ${x(h.wallHeightM,2)} m / ${x(h.wallWidthFt,2)} × ${x(h.wallHeightFt,2)} ft, ${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} px native raster (${x(h.totalPixels/1e6,2)} MP).`,`LED content: ${x(h.content.sourceWidthPx,0)} × ${x(h.content.sourceHeightPx,0)} source to ${x(h.wallWidthPx,0)} × ${x(h.wallHeightPx,0)} native is ${h.content.fitLabel.toLowerCase()}; ${x(h.content.aspectMismatchPercent,2)} percent aspect difference.`,`Generic data-port planning estimate: ${h.processing.portsRequired} minimum 1 GbE data port(s) at ${x(h.processing.safePixelsPerPort,0)} planning pixels per port; average adjusted-capacity loading ${x(h.processing.portUtilization,1)} percent. Verify complete-cabinet chains and actual processor compatibility.`,`Whole-cabinet data plan: ${h.processing.chainPortsRequired===null?"no valid chain because one cabinet exceeds the planning capacity":`${h.processing.chainPortsRequired} automatic row-serpentine chain(s), up to ${h.processing.cabinetsPerChain} complete cabinet(s) each; heaviest chain ${x(h.processing.heaviestChainPixels,0)} px`}. Confirm the actual cable order and processor output allocation.`,`LED power planning estimate: ${x(h.power.maxWatts/1e3,2)} kW maximum and ${x(h.power.typicalWatts/1e3,2)} kW typical at ${x(h.power.voltage,0)} V ${k}; ${K}.`,`LED viewing estimate: P${x(h.pitchMm,2)} gives ${x(h.viewing.minimumFt,1)} ft minimum and ${x(h.viewing.optimalFt,1)} ft optimal rule-of-thumb distances; closest audience is ${x(h.viewing.closestDistance,1)} ${h.viewing.closestUnit} (${h.viewing.label.toLowerCase()}).`,"LED verification required: confirm cabinet, receiver-card, processor, signal, power, daisy-chain, and venue distribution specifications against actual product documentation."].join(`
`)}function vn(h,w,k,K,re,se){const Se=K.method==="amps"?K.complete?`Power planning: ${K.count} device(s) at ${x(K.ampsEach,2)} nameplate A each total ${x(K.ampsEstimate,2)} A, or ${x(K.percentOfReference,0)} percent of an 80 percent circuit-rating reference. Include startup or inrush demand and verify the distribution.`:"Power planning: enter the equipment nameplate current. Include startup or inrush demand and verify the distribution before assigning circuits.":K.complete?`Power estimate: ${K.count} device(s) at ${x(K.wattsEach,0)} W each total ${x(K.totalWatts,0)} W. Watts ÷ (${x(K.voltage,0)} V × ${x(K.powerFactor,2)} PF) estimates ~${x(K.ampsEstimate,2)} A, or ${x(K.percentOfReference,0)} percent of an 80 percent circuit-rating reference. Include startup or inrush demand and verify the distribution.`:"Power estimate: enter the manufacturer power factor; the calculator will not silently assume PF 1. Include startup or inrush demand and verify the distribution before assigning circuits.";d.summaryOutput.textContent=[`Audio delay: ${x(h.delayMs,1)} ms for ${x(h.distanceInput,1)} ${h.unit} at ${x(h.tempF,0)} F (${x(h.frames,2)} frames at ${R.delayFrameRate} fps).`,`Projection: ${x(w.widthFt,1)} ft wide screen is ${x(w.heightFt,2)} ft high, ${x(w.diagonalIn,0)} in diagonal. Ideal throw at ${x(w.throwRatio,2)}:1 is ${x(w.idealThrowFt,1)} ft. Actual distance needs ${x(w.requiredRatio,2)}:1.`,`Record storage: ${k.feeds} feed(s) at ${x(k.bitrate,0)} Mbps for ${x(k.hours,2)} hr needs ${x(k.totalGb,1)} GB with ${x(k.headroom,0)} percent headroom.`,Se,`Voltage drop: ${x(re.amps,1)} A over ${x(re.lengthFt,0)} ft of ${re.gauge} AWG at ${x(re.voltage,0)} V drops ${x(re.dropV,2)} V (${x(re.percent,1)} percent), ending at ${x(re.endV,1)} V.`,`SPL distance: ${x(se.refSpl,0)} dB at ${x(se.refDist,1)} ft is about ${x(se.splAt,1)} dB at ${x(se.targetDist,0)} ft (${x(se.loss,1)} dB loss).`].join(`
`)}function x(h,w){return Number.isFinite(h)?h.toLocaleString(void 0,{minimumFractionDigits:w,maximumFractionDigits:w}):"0"}async function Ai(h){await ut(h,d.summaryOutput.textContent,"Summary copied.")}async function Ri(){await ut(d.copyLedSummaryBtn,E,"LED wall summary copied.")}async function ut(h,w,k){try{await navigator.clipboard.writeText(w),Nt(k,"success"),Ht(h,"success")}catch{const re=n.createElement("textarea");re.value=w,n.body.appendChild(re),re.select();let se=!1;try{se=n.execCommand("copy")}catch{se=!1}re.remove(),Nt(se?k:"Copy failed.",se?"success":"error"),Ht(h,se?"success":"error")}}function Ci(){oi(d.summaryOutput.textContent,"av-calculator-summary.txt","Summary downloaded.")}function Pi(){oi(E,"led-wall-configuration.txt","LED wall summary download started.")}function oi(h,w,k){const K=new Blob([h],{type:"text/plain"}),re=URL.createObjectURL(K),se=n.createElement("a");se.href=re,se.download=w,n.body.appendChild(se),se.click(),se.remove(),window.setTimeout(()=>URL.revokeObjectURL(re),250),Nt(k,"success")}function li(h){if(!_)return;const w=h==="maximum";if(R.powerMethod="watts",R.deviceAmps=0,R.deviceWatts=w?_.maxWatts:_.typicalWatts,R.powerFactor=0,R.deviceCount=1,R.voltage=_.voltage,R.circuitAmps=_.breakerAmps,!ye(["powerMethod","deviceAmps","deviceWatts","powerFactor","deviceCount","voltage","circuitAmps"])){Nt("Browser storage is unavailable. Power Load cannot receive this value.","error");return}const K=new URL("/av-calculator.html",window.location.href);K.search=window.location.search,K.hash="powerCard",window.location.assign(K.href)}function Li(){f.forEach(w=>{R[w]=o[w]}),te(),p?(ie(),ue()):Y(),V();const h=ye();ve(),Nt(h?`${p?"LED planner":"Quick calculators"} reset. Default values saved in this browser.`:"Calculator reset. Browser storage is unavailable, so defaults were not saved.",h?"success":"error"),Ht(d.resetBtn,"success")}function zt(h,w){d.actionStatus.textContent=h,d.actionStatus.classList.remove("success","error"),w&&d.actionStatus.classList.add(w)}function Nt(h,w){window.clearTimeout(m),zt(h,w)}function Ii(h,w){window.clearTimeout(m);const k=h.length?`${h.join(" ")} `:"",K=p?`LED plan updated: ${d.ledPreviewArray.textContent} cabinets, ${d.ledNativeRaster.textContent} native raster. `:"Calculations updated. ",re=p?d.ledWarnings.querySelector('[data-severity="bad"]'):null,se=re?`Planning warning: ${re.textContent} `:"",Se=w?"Values saved in this browser.":"Browser storage is unavailable, so values were not saved.";m=window.setTimeout(()=>{zt(`${k}${K}${se}${Se}`,w?"success":"error")},250)}function Ht(h,w){if(!h)return;const k=w==="error"?"feedback-error":"feedback-success";h.classList.remove("feedback-error","feedback-success"),h.offsetWidth,h.classList.add(k),window.setTimeout(()=>h.classList.remove(k),220)}function ci(h){h.addEventListener("pointerdown",()=>h.classList.add("is-pressing")),["pointerup","pointercancel","pointerleave","blur"].forEach(w=>{h.addEventListener(w,()=>h.classList.remove("is-pressing"))})}if(u.forEach(h=>{h.addEventListener("input",de),h.addEventListener("change",de)}),d.resetBtn.addEventListener("click",Li),p){d.saveLedPresetBtn.addEventListener("click",B),d.copyLedSummaryBtn.addEventListener("click",Ri),d.downloadLedSummaryBtn.addEventListener("click",Pi),d.ledProfileSelect.addEventListener("change",le),d.sendLedTypicalPowerBtn.addEventListener("click",()=>li("typical")),d.sendLedMaxPowerBtn.addEventListener("click",()=>li("maximum")),d.ledPreviewIsoBtn.addEventListener("click",()=>Ut("isometric")),d.ledPreviewFrontBtn.addEventListener("click",()=>Ut("front"));const h=()=>{C={row:Number.isFinite(d.ledInspectRow.valueAsNumber)?Math.round(d.ledInspectRow.valueAsNumber):1,column:Number.isFinite(d.ledInspectColumn.valueAsNumber)?Math.round(d.ledInspectColumn.valueAsNumber):1},De()};d.ledInspectRow.addEventListener("change",h),d.ledInspectColumn.addEventListener("change",h),d.ledWallPreview.addEventListener("led-wall:select",K=>{C=K.detail,n.getElementById("ledCabinetInspector").open=!0,De()});const w=(K,re)=>{const se=K.querySelector(".led-module-toggle"),Se=n.getElementById(se.getAttribute("aria-controls"));se.setAttribute("aria-expanded",String(re)),Se.hidden=!re};n.querySelectorAll(".led-module-toggle").forEach(K=>{K.addEventListener("click",()=>{w(K.closest(".led-module"),K.getAttribute("aria-expanded")!=="true")})}),n.querySelectorAll("[data-led-jump]").forEach(K=>{K.addEventListener("click",()=>{d.ledWallPreview.closest(".led-suite").dispatchEvent(new CustomEvent("led-section-request",{detail:{id:K.dataset.ledJump}}))})}),window.addEventListener("pagehide",()=>{U&&U.kill()},{once:!0})}else d.copyButtons.forEach(h=>h.addEventListener("click",()=>Ai(h))),d.downloadSummaryBtn.addEventListener("click",Ci);Array.from(n.querySelectorAll("button")).forEach(ci),L.available||(d.saveStatus.textContent="Storage blocked"),p&&ue(),te(),p?ie():Y();const Dn=V(),ui=ye();if(ve(),p&&Te(),!L.available)zt("Calculators work, but browser storage is unavailable. Values will not persist.","error");else if(M==="invalid")zt("Saved calculator data was invalid. Default values were restored, calculated, and saved.","error");else if(M==="loaded"){const h=Dn.length?`${Dn.join(" ")} `:"";zt(`${h}Saved calculator values loaded and calculations updated.${p&&P?" Enter manufacturer power factor before using current or circuit estimates.":""}`,Dn.length?"error":"success")}else M==="migrated"?zt("Saved watts were migrated to Watts + Power Factor mode. Enter the manufacturer power factor to calculate current.","success"):zt(ui?"Default calculator values loaded, calculated, and saved.":"Default calculator values loaded and calculated, but storage is unavailable.",ui?"success":"error")})();const t=n.getElementById("ledWallPreview"),i=n.getElementById("ledViewerHint"),r=n.getElementById("ledPreviewFrontBtn"),a=n.getElementById("ledPreviewIsoBtn"),s=n.createElement("canvas"),c=s.getContext("webgl2",{alpha:!0,antialias:!0});if(!c)i.textContent="3D is unavailable in this browser. The cabinet grid remains visible; use the calculated dimensions for planning.",t.dataset.viewerState="fallback";else{let ne=function(){T||n.hidden||W||!t.classList.contains("has-3d")||(T=requestAnimationFrame(()=>{T=0,l.render(o,u)}))},R=function(){const B=v*C;u.position.set(B*Math.sin(U)*Math.cos(P),B*Math.sin(P),B*Math.cos(U)*Math.cos(P)),u.lookAt(0,0,0),s.dataset.yaw=U.toFixed(3),s.dataset.pitch=P.toFixed(3),s.dataset.zoom=C.toFixed(3),ne()},H=function(){r.setAttribute("aria-pressed","false"),a.setAttribute("aria-pressed","false")},J=function(){F&&cancelAnimationFrame(F),F=0},j=function(B){J();const le=B==="front"?0:-.38,ye=B==="front"?0:.16;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches||n.hidden){U=le,P=ye,R();return}const N=U,b=P,S=performance.now(),D=q=>{const y=Math.min(1,(q-S)/220),G=1-(1-y)**3;U=N+(le-N)*G,P=b+(ye-b)*G,R(),F=y<1?requestAnimationFrame(D):0};F=requestAnimationFrame(D)},pe=function(B,le,ye){const N=n.createElement("canvas");N.width=Math.min(2048,Math.max(512,Math.round(1024*Math.sqrt(ye)))),N.height=Math.min(2048,Math.max(512,Math.round(1024/Math.sqrt(ye))));const b=N.getContext("2d"),S=b.createLinearGradient(0,0,N.width,N.height);S.addColorStop(0,"#263c77"),S.addColorStop(.48,"#704493"),S.addColorStop(1,"#b84d30"),b.fillStyle=S,b.fillRect(0,0,N.width,N.height);const D=b.createRadialGradient(N.width*.7,N.height*.2,0,N.width*.7,N.height*.2,N.width*.7);D.addColorStop(0,"rgba(255,255,255,.32)"),D.addColorStop(1,"rgba(255,255,255,0)"),b.fillStyle=D,b.fillRect(0,0,N.width,N.height);const q=Number(t.dataset.cabinetsPerChain);if(q>0&&B*le<=2e3)for(let Y=0;Y<le;Y+=1)for(let ie=0;ie<B;ie+=1){const de=Y*B+(Y%2?B-ie-1:ie),ve=Math.floor(de/q);b.fillStyle=`hsla(${(218+ve*47)%360}, 65%, ${ve%2?55:48}%, .68)`,b.fillRect(ie*N.width/B,Y*N.height/le,Math.ceil(N.width/B),Math.ceil(N.height/le))}const y=Math.max(1,Math.ceil(B/180)),G=Math.max(1,Math.ceil(le/180));b.strokeStyle="rgba(9,15,29,.8)",b.lineWidth=Math.max(1,N.width/B*.018),b.beginPath();for(let Y=y;Y<B;Y+=y){const ie=Math.round(Y*N.width/B)+.5;b.moveTo(ie,0),b.lineTo(ie,N.height)}for(let Y=G;Y<le;Y+=G){const ie=Math.round(Y*N.height/le)+.5;b.moveTo(0,ie),b.lineTo(N.width,ie)}b.stroke();const V=Number(t.dataset.selectedRow),A=Number(t.dataset.selectedColumn);if(V>=1&&V<=le&&A>=1&&A<=B){const Y=N.width/B,ie=N.height/le;b.strokeStyle="#fff3aa",b.lineWidth=Math.max(2,Math.min(Y,ie)*.13),b.strokeRect((A-1)*Y+1,(V-1)*ie+1,Math.max(1,Y-2),Math.max(1,ie-2))}const te=new mo(N);return te.colorSpace=It,te},ge=function(){if(!d)return;const B=`${t.dataset.cabinetsPerChain}:${t.dataset.selectedRow}:${t.dataset.selectedColumn}`;if(_===B)return;_=B;const le=pe(Number(t.dataset.columns),Number(t.dataset.rows),Number(t.dataset.columns)*Number(t.dataset.cabinetWidthMm)/(Number(t.dataset.rows)*Number(t.dataset.cabinetHeightMm)));d.material[4].map=le,d.material[4].needsUpdate=!0,m.dispose(),m=le,ne()},Le=function(){const B=Math.max(1,Math.round(t.clientWidth)),le=Math.max(1,Math.round(t.clientHeight));if(u.aspect=B/le,u.updateProjectionMatrix(),(B!==Math.round(l.domElement.width/l.getPixelRatio())||le!==Math.round(l.domElement.height/l.getPixelRatio()))&&l.setSize(B,le,!1),d){const ye=new ii().setFromObject(d).getSize(new X),N=ye.y/(2*Math.tan(mi.degToRad(u.fov/2))),b=ye.x/(2*Math.tan(mi.degToRad(u.fov/2))*u.aspect);v=Math.max(N,b,ye.z*2)*1.42}R()},Ae=function(){const B=Number(t.dataset.columns),le=Number(t.dataset.rows),ye=Number(t.dataset.cabinetWidthMm),N=Number(t.dataset.cabinetHeightMm);if(![B,le,ye,N].every(Number.isFinite)||B<1||le<1||ye<=0||N<=0)return;const b=`${B}:${le}:${ye}:${N}`;if(s.setAttribute("aria-label",`${t.getAttribute("aria-label")} Drag or use arrow keys to rotate; scroll or pinch to zoom.`),E===b){ge();return}E=b,d&&(o.remove(d,M),d.geometry.dispose(),d.material.forEach(de=>de.dispose()),M.geometry.dispose(),M.material.dispose(),m.dispose());const S=B*ye,D=le*N,q=3/Math.max(S,D),y=S*q,G=D*q,V=Math.min(.28,Math.max(.1,N*q*.7));m=pe(B,le,S/D),_=`${t.dataset.cabinetsPerChain}:${t.dataset.selectedRow}:${t.dataset.selectedColumn}`;const A=new $r({color:3160907,metalness:.48,roughness:.58}),te=new $r({color:2240061,metalness:.48,roughness:.58}),Y=new la({map:m}),ie=new $r({color:1383980,metalness:.38,roughness:.7});d=new $t(new ai(y,G,V),[te,te,A,te,Y,ie]),M=new fo(new _o(d.geometry),new Ts({color:7439260,transparent:!0,opacity:.8})),o.add(d,M),t.dataset.viewerColumns=String(B),t.dataset.viewerRows=String(le),Le(),R()},Te=function(B){C=mi.clamp(C*B,.65,2.7),R()};const l=new xc({canvas:s,context:c,alpha:!0,antialias:!0,powerPreference:"low-power"});l.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),l.outputColorSpace=It,l.shadowMap.type=1;const o=new no,u=new Wt(42,1,.01,100);o.add(new yo(14477567,2633799,2.3));const p=new ka(16777215,2.1);p.position.set(-3,5,7),o.add(p);const f=new ka(9406975,1.25);f.position.set(4,2,-4),o.add(f);let d=null,M=null,m=null,E="",_="",v=5,C=1,U=-.38,P=.16,T=0,F=0,W=!1;const L=new Map,O=new Map;let Q=0;const z=new Ro;s.tabIndex=0,s.setAttribute("role","img"),s.setAttribute("aria-describedby","ledViewerHint"),t.setAttribute("role","group"),t.append(s),t.classList.add("has-3d"),t.dataset.viewerState="ready",i.textContent="Drag to orbit · scroll or pinch to zoom · arrow keys rotate.",Ae(),Le();const oe=new ResizeObserver(Le);oe.observe(t),t.addEventListener("led-wall:geometry",Ae),t.addEventListener("led-wall:plan",ge),t.addEventListener("led-wall:view",B=>j(B.detail)),n.addEventListener("visibilitychange",()=>{n.hidden?J():ne()}),s.addEventListener("pointerdown",B=>{if(J(),L.set(B.pointerId,{x:B.clientX,y:B.clientY}),O.set(B.pointerId,{x:B.clientX,y:B.clientY}),s.setPointerCapture(B.pointerId),L.size===2){const[le,ye]=[...L.values()];Q=Math.hypot(le.x-ye.x,le.y-ye.y)}}),s.addEventListener("pointermove",B=>{const le=L.get(B.pointerId);if(le){if(L.set(B.pointerId,{x:B.clientX,y:B.clientY}),L.size===2){const[ye,N]=[...L.values()],b=Math.hypot(ye.x-N.x,ye.y-N.y);Q&&Te(Q/Math.max(b,1)),Q=b;return}U-=(B.clientX-le.x)*.009,P=mi.clamp(P+(B.clientY-le.y)*.009,-1.3,1.3),H(),R()}});const ue=B=>{var ye;const le=O.get(B.pointerId);if(B.type==="pointerup"&&le&&L.size===1&&Math.hypot(B.clientX-le.x,B.clientY-le.y)<7&&d){const N=s.getBoundingClientRect(),b=new tt((B.clientX-N.left)/N.width*2-1,-((B.clientY-N.top)/N.height*2-1));z.setFromCamera(b,u);const S=z.intersectObject(d)[0];if(((ye=S==null?void 0:S.face)==null?void 0:ye.materialIndex)===4&&S.uv){const D=Number(t.dataset.columns),q=Number(t.dataset.rows),y=Math.min(D,Math.max(1,Math.floor(S.uv.x*D)+1)),G=Math.min(q,Math.max(1,Math.floor((1-S.uv.y)*q)+1));t.dispatchEvent(new CustomEvent("led-wall:select",{detail:{row:G,column:y}}))}}L.delete(B.pointerId),O.delete(B.pointerId),Q=0,s.hasPointerCapture(B.pointerId)&&s.releasePointerCapture(B.pointerId)};s.addEventListener("pointerup",ue),s.addEventListener("pointercancel",ue),s.addEventListener("wheel",B=>{B.preventDefault(),Te(Math.exp(B.deltaY*.001))},{passive:!1}),s.addEventListener("keydown",B=>{const le=mi.degToRad(10);if(B.key==="ArrowLeft")U-=le;else if(B.key==="ArrowRight")U+=le;else if(B.key==="ArrowUp")P=Math.min(1.3,P+le);else if(B.key==="ArrowDown")P=Math.max(-1.3,P-le);else if(B.key==="+"||B.key==="=")Te(.88);else if(B.key==="-")Te(1.12);else return;B.preventDefault(),H(),R()}),s.addEventListener("webglcontextlost",B=>{B.preventDefault(),J(),T&&cancelAnimationFrame(T),T=0,t.classList.remove("has-3d"),t.setAttribute("role","img"),t.dataset.viewerState="fallback",i.textContent="3D connection was lost. The cabinet grid remains visible while the viewer recovers."}),s.addEventListener("webglcontextrestored",()=>{t.classList.add("has-3d"),t.setAttribute("role","group"),t.dataset.viewerState="ready",i.textContent="Drag to orbit · scroll or pinch to zoom · arrow keys rotate.",Le(),ne()}),window.addEventListener("pagehide",B=>{B.persisted||W||(J(),T&&cancelAnimationFrame(T),W=!0,oe.disconnect(),d&&(d.geometry.dispose(),d.material.forEach(le=>le.dispose()),M.geometry.dispose(),M.material.dispose(),m.dispose()),l.dispose())}),window.addEventListener("pageshow",()=>ne())}}export{Lc as initializeLED};
