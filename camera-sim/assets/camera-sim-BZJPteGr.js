var LS=Object.defineProperty;var NS=(s,e,t)=>e in s?LS(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var ge=(s,e,t)=>NS(s,typeof e!="symbol"?e+"":e,t);var eh={exports:{}},Aa={},th={exports:{}},Mt={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var qg;function IS(){if(qg)return Mt;qg=1;var s=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),i=Symbol.for("react.strict_mode"),o=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),g=Symbol.for("react.lazy"),m=Symbol.iterator;function v(I){return I===null||typeof I!="object"?null:(I=m&&I[m]||I["@@iterator"],typeof I=="function"?I:null)}var _={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},M=Object.assign,w={};function y(I,Z,ve){this.props=I,this.context=Z,this.refs=w,this.updater=ve||_}y.prototype.isReactComponent={},y.prototype.setState=function(I,Z){if(typeof I!="object"&&typeof I!="function"&&I!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,I,Z,"setState")},y.prototype.forceUpdate=function(I){this.updater.enqueueForceUpdate(this,I,"forceUpdate")};function S(){}S.prototype=y.prototype;function C(I,Z,ve){this.props=I,this.context=Z,this.refs=w,this.updater=ve||_}var L=C.prototype=new S;L.constructor=C,M(L,y.prototype),L.isPureReactComponent=!0;var P=Array.isArray,O=Object.prototype.hasOwnProperty,N={current:null},B={key:!0,ref:!0,__self:!0,__source:!0};function A(I,Z,ve){var Pe,Fe={},ie=null,_e=null;if(Z!=null)for(Pe in Z.ref!==void 0&&(_e=Z.ref),Z.key!==void 0&&(ie=""+Z.key),Z)O.call(Z,Pe)&&!B.hasOwnProperty(Pe)&&(Fe[Pe]=Z[Pe]);var fe=arguments.length-2;if(fe===1)Fe.children=ve;else if(1<fe){for(var Oe=Array(fe),qe=0;qe<fe;qe++)Oe[qe]=arguments[qe+2];Fe.children=Oe}if(I&&I.defaultProps)for(Pe in fe=I.defaultProps,fe)Fe[Pe]===void 0&&(Fe[Pe]=fe[Pe]);return{$$typeof:s,type:I,key:ie,ref:_e,props:Fe,_owner:N.current}}function U(I,Z){return{$$typeof:s,type:I.type,key:Z,ref:I.ref,props:I.props,_owner:I._owner}}function z(I){return typeof I=="object"&&I!==null&&I.$$typeof===s}function k(I){var Z={"=":"=0",":":"=2"};return"$"+I.replace(/[=:]/g,function(ve){return Z[ve]})}var X=/\/+/g;function re(I,Z){return typeof I=="object"&&I!==null&&I.key!=null?k(""+I.key):Z.toString(36)}function ue(I,Z,ve,Pe,Fe){var ie=typeof I;(ie==="undefined"||ie==="boolean")&&(I=null);var _e=!1;if(I===null)_e=!0;else switch(ie){case"string":case"number":_e=!0;break;case"object":switch(I.$$typeof){case s:case e:_e=!0}}if(_e)return _e=I,Fe=Fe(_e),I=Pe===""?"."+re(_e,0):Pe,P(Fe)?(ve="",I!=null&&(ve=I.replace(X,"$&/")+"/"),ue(Fe,Z,ve,"",function(qe){return qe})):Fe!=null&&(z(Fe)&&(Fe=U(Fe,ve+(!Fe.key||_e&&_e.key===Fe.key?"":(""+Fe.key).replace(X,"$&/")+"/")+I)),Z.push(Fe)),1;if(_e=0,Pe=Pe===""?".":Pe+":",P(I))for(var fe=0;fe<I.length;fe++){ie=I[fe];var Oe=Pe+re(ie,fe);_e+=ue(ie,Z,ve,Oe,Fe)}else if(Oe=v(I),typeof Oe=="function")for(I=Oe.call(I),fe=0;!(ie=I.next()).done;)ie=ie.value,Oe=Pe+re(ie,fe++),_e+=ue(ie,Z,ve,Oe,Fe);else if(ie==="object")throw Z=String(I),Error("Objects are not valid as a React child (found: "+(Z==="[object Object]"?"object with keys {"+Object.keys(I).join(", ")+"}":Z)+"). If you meant to render a collection of children, use an array instead.");return _e}function G(I,Z,ve){if(I==null)return I;var Pe=[],Fe=0;return ue(I,Pe,"","",function(ie){return Z.call(ve,ie,Fe++)}),Pe}function Q(I){if(I._status===-1){var Z=I._result;Z=Z(),Z.then(function(ve){(I._status===0||I._status===-1)&&(I._status=1,I._result=ve)},function(ve){(I._status===0||I._status===-1)&&(I._status=2,I._result=ve)}),I._status===-1&&(I._status=0,I._result=Z)}if(I._status===1)return I._result.default;throw I._result}var q={current:null},K={transition:null},ae={ReactCurrentDispatcher:q,ReactCurrentBatchConfig:K,ReactCurrentOwner:N};function le(){throw Error("act(...) is not supported in production builds of React.")}return Mt.Children={map:G,forEach:function(I,Z,ve){G(I,function(){Z.apply(this,arguments)},ve)},count:function(I){var Z=0;return G(I,function(){Z++}),Z},toArray:function(I){return G(I,function(Z){return Z})||[]},only:function(I){if(!z(I))throw Error("React.Children.only expected to receive a single React element child.");return I}},Mt.Component=y,Mt.Fragment=t,Mt.Profiler=o,Mt.PureComponent=C,Mt.StrictMode=i,Mt.Suspense=h,Mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ae,Mt.act=le,Mt.cloneElement=function(I,Z,ve){if(I==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+I+".");var Pe=M({},I.props),Fe=I.key,ie=I.ref,_e=I._owner;if(Z!=null){if(Z.ref!==void 0&&(ie=Z.ref,_e=N.current),Z.key!==void 0&&(Fe=""+Z.key),I.type&&I.type.defaultProps)var fe=I.type.defaultProps;for(Oe in Z)O.call(Z,Oe)&&!B.hasOwnProperty(Oe)&&(Pe[Oe]=Z[Oe]===void 0&&fe!==void 0?fe[Oe]:Z[Oe])}var Oe=arguments.length-2;if(Oe===1)Pe.children=ve;else if(1<Oe){fe=Array(Oe);for(var qe=0;qe<Oe;qe++)fe[qe]=arguments[qe+2];Pe.children=fe}return{$$typeof:s,type:I.type,key:Fe,ref:ie,props:Pe,_owner:_e}},Mt.createContext=function(I){return I={$$typeof:c,_currentValue:I,_currentValue2:I,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},I.Provider={$$typeof:l,_context:I},I.Consumer=I},Mt.createElement=A,Mt.createFactory=function(I){var Z=A.bind(null,I);return Z.type=I,Z},Mt.createRef=function(){return{current:null}},Mt.forwardRef=function(I){return{$$typeof:d,render:I}},Mt.isValidElement=z,Mt.lazy=function(I){return{$$typeof:g,_payload:{_status:-1,_result:I},_init:Q}},Mt.memo=function(I,Z){return{$$typeof:f,type:I,compare:Z===void 0?null:Z}},Mt.startTransition=function(I){var Z=K.transition;K.transition={};try{I()}finally{K.transition=Z}},Mt.unstable_act=le,Mt.useCallback=function(I,Z){return q.current.useCallback(I,Z)},Mt.useContext=function(I){return q.current.useContext(I)},Mt.useDebugValue=function(){},Mt.useDeferredValue=function(I){return q.current.useDeferredValue(I)},Mt.useEffect=function(I,Z){return q.current.useEffect(I,Z)},Mt.useId=function(){return q.current.useId()},Mt.useImperativeHandle=function(I,Z,ve){return q.current.useImperativeHandle(I,Z,ve)},Mt.useInsertionEffect=function(I,Z){return q.current.useInsertionEffect(I,Z)},Mt.useLayoutEffect=function(I,Z){return q.current.useLayoutEffect(I,Z)},Mt.useMemo=function(I,Z){return q.current.useMemo(I,Z)},Mt.useReducer=function(I,Z,ve){return q.current.useReducer(I,Z,ve)},Mt.useRef=function(I){return q.current.useRef(I)},Mt.useState=function(I){return q.current.useState(I)},Mt.useSyncExternalStore=function(I,Z,ve){return q.current.useSyncExternalStore(I,Z,ve)},Mt.useTransition=function(){return q.current.useTransition()},Mt.version="18.3.1",Mt}var Kg;function ep(){return Kg||(Kg=1,th.exports=IS()),th.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Zg;function US(){if(Zg)return Aa;Zg=1;var s=ep(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),i=Object.prototype.hasOwnProperty,o=s.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var g,m={},v=null,_=null;f!==void 0&&(v=""+f),h.key!==void 0&&(v=""+h.key),h.ref!==void 0&&(_=h.ref);for(g in h)i.call(h,g)&&!l.hasOwnProperty(g)&&(m[g]=h[g]);if(d&&d.defaultProps)for(g in h=d.defaultProps,h)m[g]===void 0&&(m[g]=h[g]);return{$$typeof:e,type:d,key:v,ref:_,props:m,_owner:o.current}}return Aa.Fragment=t,Aa.jsx=c,Aa.jsxs=c,Aa}var Jg;function FS(){return Jg||(Jg=1,eh.exports=US()),eh.exports}var E=FS(),He=ep(),ic={},nh={exports:{}},ni={},ih={exports:{}},rh={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Qg;function OS(){return Qg||(Qg=1,(function(s){function e(K,ae){var le=K.length;K.push(ae);e:for(;0<le;){var I=le-1>>>1,Z=K[I];if(0<o(Z,ae))K[I]=ae,K[le]=Z,le=I;else break e}}function t(K){return K.length===0?null:K[0]}function i(K){if(K.length===0)return null;var ae=K[0],le=K.pop();if(le!==ae){K[0]=le;e:for(var I=0,Z=K.length,ve=Z>>>1;I<ve;){var Pe=2*(I+1)-1,Fe=K[Pe],ie=Pe+1,_e=K[ie];if(0>o(Fe,le))ie<Z&&0>o(_e,Fe)?(K[I]=_e,K[ie]=le,I=ie):(K[I]=Fe,K[Pe]=le,I=Pe);else if(ie<Z&&0>o(_e,le))K[I]=_e,K[ie]=le,I=ie;else break e}}return ae}function o(K,ae){var le=K.sortIndex-ae.sortIndex;return le!==0?le:K.id-ae.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;s.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();s.unstable_now=function(){return c.now()-d}}var h=[],f=[],g=1,m=null,v=3,_=!1,M=!1,w=!1,y=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,C=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function L(K){for(var ae=t(f);ae!==null;){if(ae.callback===null)i(f);else if(ae.startTime<=K)i(f),ae.sortIndex=ae.expirationTime,e(h,ae);else break;ae=t(f)}}function P(K){if(w=!1,L(K),!M)if(t(h)!==null)M=!0,Q(O);else{var ae=t(f);ae!==null&&q(P,ae.startTime-K)}}function O(K,ae){M=!1,w&&(w=!1,S(A),A=-1),_=!0;var le=v;try{for(L(ae),m=t(h);m!==null&&(!(m.expirationTime>ae)||K&&!k());){var I=m.callback;if(typeof I=="function"){m.callback=null,v=m.priorityLevel;var Z=I(m.expirationTime<=ae);ae=s.unstable_now(),typeof Z=="function"?m.callback=Z:m===t(h)&&i(h),L(ae)}else i(h);m=t(h)}if(m!==null)var ve=!0;else{var Pe=t(f);Pe!==null&&q(P,Pe.startTime-ae),ve=!1}return ve}finally{m=null,v=le,_=!1}}var N=!1,B=null,A=-1,U=5,z=-1;function k(){return!(s.unstable_now()-z<U)}function X(){if(B!==null){var K=s.unstable_now();z=K;var ae=!0;try{ae=B(!0,K)}finally{ae?re():(N=!1,B=null)}}else N=!1}var re;if(typeof C=="function")re=function(){C(X)};else if(typeof MessageChannel<"u"){var ue=new MessageChannel,G=ue.port2;ue.port1.onmessage=X,re=function(){G.postMessage(null)}}else re=function(){y(X,0)};function Q(K){B=K,N||(N=!0,re())}function q(K,ae){A=y(function(){K(s.unstable_now())},ae)}s.unstable_IdlePriority=5,s.unstable_ImmediatePriority=1,s.unstable_LowPriority=4,s.unstable_NormalPriority=3,s.unstable_Profiling=null,s.unstable_UserBlockingPriority=2,s.unstable_cancelCallback=function(K){K.callback=null},s.unstable_continueExecution=function(){M||_||(M=!0,Q(O))},s.unstable_forceFrameRate=function(K){0>K||125<K?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):U=0<K?Math.floor(1e3/K):5},s.unstable_getCurrentPriorityLevel=function(){return v},s.unstable_getFirstCallbackNode=function(){return t(h)},s.unstable_next=function(K){switch(v){case 1:case 2:case 3:var ae=3;break;default:ae=v}var le=v;v=ae;try{return K()}finally{v=le}},s.unstable_pauseExecution=function(){},s.unstable_requestPaint=function(){},s.unstable_runWithPriority=function(K,ae){switch(K){case 1:case 2:case 3:case 4:case 5:break;default:K=3}var le=v;v=K;try{return ae()}finally{v=le}},s.unstable_scheduleCallback=function(K,ae,le){var I=s.unstable_now();switch(typeof le=="object"&&le!==null?(le=le.delay,le=typeof le=="number"&&0<le?I+le:I):le=I,K){case 1:var Z=-1;break;case 2:Z=250;break;case 5:Z=1073741823;break;case 4:Z=1e4;break;default:Z=5e3}return Z=le+Z,K={id:g++,callback:ae,priorityLevel:K,startTime:le,expirationTime:Z,sortIndex:-1},le>I?(K.sortIndex=le,e(f,K),t(h)===null&&K===t(f)&&(w?(S(A),A=-1):w=!0,q(P,le-I))):(K.sortIndex=Z,e(h,K),M||_||(M=!0,Q(O))),K},s.unstable_shouldYield=k,s.unstable_wrapCallback=function(K){var ae=v;return function(){var le=v;v=ae;try{return K.apply(this,arguments)}finally{v=le}}}})(rh)),rh}var e0;function kS(){return e0||(e0=1,ih.exports=OS()),ih.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var t0;function BS(){if(t0)return ni;t0=1;var s=ep(),e=kS();function t(n){for(var r="https://reactjs.org/docs/error-decoder.html?invariant="+n,a=1;a<arguments.length;a++)r+="&args[]="+encodeURIComponent(arguments[a]);return"Minified React error #"+n+"; visit "+r+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var i=new Set,o={};function l(n,r){c(n,r),c(n+"Capture",r)}function c(n,r){for(o[n]=r,n=0;n<r.length;n++)i.add(r[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,g={},m={};function v(n){return h.call(m,n)?!0:h.call(g,n)?!1:f.test(n)?m[n]=!0:(g[n]=!0,!1)}function _(n,r,a,u){if(a!==null&&a.type===0)return!1;switch(typeof r){case"function":case"symbol":return!0;case"boolean":return u?!1:a!==null?!a.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function M(n,r,a,u){if(r===null||typeof r>"u"||_(n,r,a,u))return!0;if(u)return!1;if(a!==null)switch(a.type){case 3:return!r;case 4:return r===!1;case 5:return isNaN(r);case 6:return isNaN(r)||1>r}return!1}function w(n,r,a,u,p,x,b){this.acceptsBooleans=r===2||r===3||r===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=a,this.propertyName=n,this.type=r,this.sanitizeURL=x,this.removeEmptyString=b}var y={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){y[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var r=n[0];y[r]=new w(r,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){y[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){y[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){y[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){y[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){y[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){y[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){y[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function C(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var r=n.replace(S,C);y[r]=new w(r,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var r=n.replace(S,C);y[r]=new w(r,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var r=n.replace(S,C);y[r]=new w(r,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){y[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),y.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){y[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function L(n,r,a,u){var p=y.hasOwnProperty(r)?y[r]:null;(p!==null?p.type!==0:u||!(2<r.length)||r[0]!=="o"&&r[0]!=="O"||r[1]!=="n"&&r[1]!=="N")&&(M(r,a,p,u)&&(a=null),u||p===null?v(r)&&(a===null?n.removeAttribute(r):n.setAttribute(r,""+a)):p.mustUseProperty?n[p.propertyName]=a===null?p.type===3?!1:"":a:(r=p.attributeName,u=p.attributeNamespace,a===null?n.removeAttribute(r):(p=p.type,a=p===3||p===4&&a===!0?"":""+a,u?n.setAttributeNS(u,r,a):n.setAttribute(r,a))))}var P=s.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,O=Symbol.for("react.element"),N=Symbol.for("react.portal"),B=Symbol.for("react.fragment"),A=Symbol.for("react.strict_mode"),U=Symbol.for("react.profiler"),z=Symbol.for("react.provider"),k=Symbol.for("react.context"),X=Symbol.for("react.forward_ref"),re=Symbol.for("react.suspense"),ue=Symbol.for("react.suspense_list"),G=Symbol.for("react.memo"),Q=Symbol.for("react.lazy"),q=Symbol.for("react.offscreen"),K=Symbol.iterator;function ae(n){return n===null||typeof n!="object"?null:(n=K&&n[K]||n["@@iterator"],typeof n=="function"?n:null)}var le=Object.assign,I;function Z(n){if(I===void 0)try{throw Error()}catch(a){var r=a.stack.trim().match(/\n( *(at )?)/);I=r&&r[1]||""}return`
`+I+n}var ve=!1;function Pe(n,r){if(!n||ve)return"";ve=!0;var a=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(r)if(r=function(){throw Error()},Object.defineProperty(r.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(r,[])}catch(ce){var u=ce}Reflect.construct(n,[],r)}else{try{r.call()}catch(ce){u=ce}n.call(r.prototype)}else{try{throw Error()}catch(ce){u=ce}n()}}catch(ce){if(ce&&u&&typeof ce.stack=="string"){for(var p=ce.stack.split(`
`),x=u.stack.split(`
`),b=p.length-1,F=x.length-1;1<=b&&0<=F&&p[b]!==x[F];)F--;for(;1<=b&&0<=F;b--,F--)if(p[b]!==x[F]){if(b!==1||F!==1)do if(b--,F--,0>F||p[b]!==x[F]){var H=`
`+p[b].replace(" at new "," at ");return n.displayName&&H.includes("<anonymous>")&&(H=H.replace("<anonymous>",n.displayName)),H}while(1<=b&&0<=F);break}}}finally{ve=!1,Error.prepareStackTrace=a}return(n=n?n.displayName||n.name:"")?Z(n):""}function Fe(n){switch(n.tag){case 5:return Z(n.type);case 16:return Z("Lazy");case 13:return Z("Suspense");case 19:return Z("SuspenseList");case 0:case 2:case 15:return n=Pe(n.type,!1),n;case 11:return n=Pe(n.type.render,!1),n;case 1:return n=Pe(n.type,!0),n;default:return""}}function ie(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case B:return"Fragment";case N:return"Portal";case U:return"Profiler";case A:return"StrictMode";case re:return"Suspense";case ue:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case k:return(n.displayName||"Context")+".Consumer";case z:return(n._context.displayName||"Context")+".Provider";case X:var r=n.render;return n=n.displayName,n||(n=r.displayName||r.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case G:return r=n.displayName||null,r!==null?r:ie(n.type)||"Memo";case Q:r=n._payload,n=n._init;try{return ie(n(r))}catch{}}return null}function _e(n){var r=n.type;switch(n.tag){case 24:return"Cache";case 9:return(r.displayName||"Context")+".Consumer";case 10:return(r._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=r.render,n=n.displayName||n.name||"",r.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return r;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ie(r);case 8:return r===A?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof r=="function")return r.displayName||r.name||null;if(typeof r=="string")return r}return null}function fe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Oe(n){var r=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(r==="checkbox"||r==="radio")}function qe(n){var r=Oe(n)?"checked":"value",a=Object.getOwnPropertyDescriptor(n.constructor.prototype,r),u=""+n[r];if(!n.hasOwnProperty(r)&&typeof a<"u"&&typeof a.get=="function"&&typeof a.set=="function"){var p=a.get,x=a.set;return Object.defineProperty(n,r,{configurable:!0,get:function(){return p.call(this)},set:function(b){u=""+b,x.call(this,b)}}),Object.defineProperty(n,r,{enumerable:a.enumerable}),{getValue:function(){return u},setValue:function(b){u=""+b},stopTracking:function(){n._valueTracker=null,delete n[r]}}}}function nt(n){n._valueTracker||(n._valueTracker=qe(n))}function Ot(n){if(!n)return!1;var r=n._valueTracker;if(!r)return!0;var a=r.getValue(),u="";return n&&(u=Oe(n)?n.checked?"true":"false":n.value),n=u,n!==a?(r.setValue(n),!0):!1}function ft(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function bt(n,r){var a=r.checked;return le({},r,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:a??n._wrapperState.initialChecked})}function Le(n,r){var a=r.defaultValue==null?"":r.defaultValue,u=r.checked!=null?r.checked:r.defaultChecked;a=fe(r.value!=null?r.value:a),n._wrapperState={initialChecked:u,initialValue:a,controlled:r.type==="checkbox"||r.type==="radio"?r.checked!=null:r.value!=null}}function We(n,r){r=r.checked,r!=null&&L(n,"checked",r,!1)}function vt(n,r){We(n,r);var a=fe(r.value),u=r.type;if(a!=null)u==="number"?(a===0&&n.value===""||n.value!=a)&&(n.value=""+a):n.value!==""+a&&(n.value=""+a);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}r.hasOwnProperty("value")?Gt(n,r.type,a):r.hasOwnProperty("defaultValue")&&Gt(n,r.type,fe(r.defaultValue)),r.checked==null&&r.defaultChecked!=null&&(n.defaultChecked=!!r.defaultChecked)}function At(n,r,a){if(r.hasOwnProperty("value")||r.hasOwnProperty("defaultValue")){var u=r.type;if(!(u!=="submit"&&u!=="reset"||r.value!==void 0&&r.value!==null))return;r=""+n._wrapperState.initialValue,a||r===n.value||(n.value=r),n.defaultValue=r}a=n.name,a!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,a!==""&&(n.name=a)}function Gt(n,r,a){(r!=="number"||ft(n.ownerDocument)!==n)&&(a==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+a&&(n.defaultValue=""+a))}var j=Array.isArray;function It(n,r,a,u){if(n=n.options,r){r={};for(var p=0;p<a.length;p++)r["$"+a[p]]=!0;for(a=0;a<n.length;a++)p=r.hasOwnProperty("$"+n[a].value),n[a].selected!==p&&(n[a].selected=p),p&&u&&(n[a].defaultSelected=!0)}else{for(a=""+fe(a),r=null,p=0;p<n.length;p++){if(n[p].value===a){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}r!==null||n[p].disabled||(r=n[p])}r!==null&&(r.selected=!0)}}function ct(n,r){if(r.dangerouslySetInnerHTML!=null)throw Error(t(91));return le({},r,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Pt(n,r){var a=r.value;if(a==null){if(a=r.children,r=r.defaultValue,a!=null){if(r!=null)throw Error(t(92));if(j(a)){if(1<a.length)throw Error(t(93));a=a[0]}r=a}r==null&&(r=""),a=r}n._wrapperState={initialValue:fe(a)}}function Ie(n,r){var a=fe(r.value),u=fe(r.defaultValue);a!=null&&(a=""+a,a!==n.value&&(n.value=a),r.defaultValue==null&&n.defaultValue!==a&&(n.defaultValue=a)),u!=null&&(n.defaultValue=""+u)}function Ut(n){var r=n.textContent;r===n._wrapperState.initialValue&&r!==""&&r!==null&&(n.value=r)}function D(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,r){return n==null||n==="http://www.w3.org/1999/xhtml"?D(r):n==="http://www.w3.org/2000/svg"&&r==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var J,pe=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(r,a,u,p){MSApp.execUnsafeLocalFunction(function(){return n(r,a,u,p)})}:n})(function(n,r){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=r;else{for(J=J||document.createElement("div"),J.innerHTML="<svg>"+r.valueOf().toString()+"</svg>",r=J.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;r.firstChild;)n.appendChild(r.firstChild)}});function xe(n,r){if(r){var a=n.firstChild;if(a&&a===n.lastChild&&a.nodeType===3){a.nodeValue=r;return}}n.textContent=r}var we={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ue=["Webkit","ms","Moz","O"];Object.keys(we).forEach(function(n){Ue.forEach(function(r){r=r+n.charAt(0).toUpperCase()+n.substring(1),we[r]=we[n]})});function de(n,r,a){return r==null||typeof r=="boolean"||r===""?"":a||typeof r!="number"||r===0||we.hasOwnProperty(n)&&we[n]?(""+r).trim():r+"px"}function me(n,r){n=n.style;for(var a in r)if(r.hasOwnProperty(a)){var u=a.indexOf("--")===0,p=de(a,r[a],u);a==="float"&&(a="cssFloat"),u?n.setProperty(a,p):n[a]=p}}var Be=le({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ve(n,r){if(r){if(Be[n]&&(r.children!=null||r.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(r.dangerouslySetInnerHTML!=null){if(r.children!=null)throw Error(t(60));if(typeof r.dangerouslySetInnerHTML!="object"||!("__html"in r.dangerouslySetInnerHTML))throw Error(t(61))}if(r.style!=null&&typeof r.style!="object")throw Error(t(62))}}function Ce(n,r){if(n.indexOf("-")===-1)return typeof r.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Te=null;function lt(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var dt=null,xt=null,V=null;function Ae(n){if(n=ha(n)){if(typeof dt!="function")throw Error(t(280));var r=n.stateNode;r&&(r=_l(r),dt(n.stateNode,n.type,r))}}function he(n){xt?V?V.push(n):V=[n]:xt=n}function ze(){if(xt){var n=xt,r=V;if(V=xt=null,Ae(n),r)for(n=0;n<r.length;n++)Ae(r[n])}}function De(n,r){return n(r)}function Se(){}var Ke=!1;function ht(n,r,a){if(Ke)return n(r,a);Ke=!0;try{return De(n,r,a)}finally{Ke=!1,(xt!==null||V!==null)&&(Se(),ze())}}function jt(n,r){var a=n.stateNode;if(a===null)return null;var u=_l(a);if(u===null)return null;a=u[r];e:switch(r){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(a&&typeof a!="function")throw Error(t(231,r,typeof a));return a}var Lt=!1;if(d)try{var Hn={};Object.defineProperty(Hn,"passive",{get:function(){Lt=!0}}),window.addEventListener("test",Hn,Hn),window.removeEventListener("test",Hn,Hn)}catch{Lt=!1}function vi(n,r,a,u,p,x,b,F,H){var ce=Array.prototype.slice.call(arguments,3);try{r.apply(a,ce)}catch(Me){this.onError(Me)}}var cr=!1,Hs=null,ds=!1,Vs=null,ur={onError:function(n){cr=!0,Hs=n}};function Wo(n,r,a,u,p,x,b,F,H){cr=!1,Hs=null,vi.apply(ur,arguments)}function tl(n,r,a,u,p,x,b,F,H){if(Wo.apply(this,arguments),cr){if(cr){var ce=Hs;cr=!1,Hs=null}else throw Error(t(198));ds||(ds=!0,Vs=ce)}}function Hi(n){var r=n,a=n;if(n.alternate)for(;r.return;)r=r.return;else{n=r;do r=n,(r.flags&4098)!==0&&(a=r.return),n=r.return;while(n)}return r.tag===3?a:null}function hs(n){if(n.tag===13){var r=n.memoizedState;if(r===null&&(n=n.alternate,n!==null&&(r=n.memoizedState)),r!==null)return r.dehydrated}return null}function Xo(n){if(Hi(n)!==n)throw Error(t(188))}function Gs(n){var r=n.alternate;if(!r){if(r=Hi(n),r===null)throw Error(t(188));return r!==n?null:n}for(var a=n,u=r;;){var p=a.return;if(p===null)break;var x=p.alternate;if(x===null){if(u=p.return,u!==null){a=u;continue}break}if(p.child===x.child){for(x=p.child;x;){if(x===a)return Xo(p),n;if(x===u)return Xo(p),r;x=x.sibling}throw Error(t(188))}if(a.return!==u.return)a=p,u=x;else{for(var b=!1,F=p.child;F;){if(F===a){b=!0,a=p,u=x;break}if(F===u){b=!0,u=p,a=x;break}F=F.sibling}if(!b){for(F=x.child;F;){if(F===a){b=!0,a=x,u=p;break}if(F===u){b=!0,u=x,a=p;break}F=F.sibling}if(!b)throw Error(t(189))}}if(a.alternate!==u)throw Error(t(190))}if(a.tag!==3)throw Error(t(188));return a.stateNode.current===a?n:r}function $o(n){return n=Gs(n),n!==null?Yo(n):null}function Yo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var r=Yo(n);if(r!==null)return r;n=n.sibling}return null}var nl=e.unstable_scheduleCallback,il=e.unstable_cancelCallback,Eu=e.unstable_shouldYield,wu=e.unstable_requestPaint,Qt=e.unstable_now,Tu=e.unstable_getCurrentPriorityLevel,qo=e.unstable_ImmediatePriority,R=e.unstable_UserBlockingPriority,$=e.unstable_NormalPriority,oe=e.unstable_LowPriority,ne=e.unstable_IdlePriority,te=null,Ne=null;function Xe(n){if(Ne&&typeof Ne.onCommitFiberRoot=="function")try{Ne.onCommitFiberRoot(te,n,void 0,(n.current.flags&128)===128)}catch{}}var Re=Math.clz32?Math.clz32:pt,Ze=Math.log,tt=Math.LN2;function pt(n){return n>>>=0,n===0?32:31-(Ze(n)/tt|0)|0}var mt=64,Qe=4194304;function Ct(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Xt(n,r){var a=n.pendingLanes;if(a===0)return 0;var u=0,p=n.suspendedLanes,x=n.pingedLanes,b=a&268435455;if(b!==0){var F=b&~p;F!==0?u=Ct(F):(x&=b,x!==0&&(u=Ct(x)))}else b=a&~p,b!==0?u=Ct(b):x!==0&&(u=Ct(x));if(u===0)return 0;if(r!==0&&r!==u&&(r&p)===0&&(p=u&-u,x=r&-r,p>=x||p===16&&(x&4194240)!==0))return r;if((u&4)!==0&&(u|=a&16),r=n.entangledLanes,r!==0)for(n=n.entanglements,r&=u;0<r;)a=31-Re(r),p=1<<a,u|=n[a],r&=~p;return u}function Zt(n,r){switch(n){case 1:case 2:case 4:return r+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return r+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function kt(n,r){for(var a=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,x=n.pendingLanes;0<x;){var b=31-Re(x),F=1<<b,H=p[b];H===-1?((F&a)===0||(F&u)!==0)&&(p[b]=Zt(F,r)):H<=r&&(n.expiredLanes|=F),x&=~F}}function dn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function Ge(){var n=mt;return mt<<=1,(mt&4194240)===0&&(mt=64),n}function An(n){for(var r=[],a=0;31>a;a++)r.push(n);return r}function St(n,r,a){n.pendingLanes|=r,r!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,r=31-Re(r),n[r]=a}function qn(n,r){var a=n.pendingLanes&~r;n.pendingLanes=r,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=r,n.mutableReadLanes&=r,n.entangledLanes&=r,r=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<a;){var p=31-Re(a),x=1<<p;r[p]=0,u[p]=-1,n[p]=-1,a&=~x}}function Kn(n,r){var a=n.entangledLanes|=r;for(n=n.entanglements;a;){var u=31-Re(a),p=1<<u;p&r|n[u]&r&&(n[u]|=r),a&=~p}}var yt=0;function dr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ft,Yt,bi,Bt,Ai,Vi=!1,fs=[],Lr=null,Nr=null,Ir=null,Ko=new Map,Zo=new Map,Ur=[],ex="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Lp(n,r){switch(n){case"focusin":case"focusout":Lr=null;break;case"dragenter":case"dragleave":Nr=null;break;case"mouseover":case"mouseout":Ir=null;break;case"pointerover":case"pointerout":Ko.delete(r.pointerId);break;case"gotpointercapture":case"lostpointercapture":Zo.delete(r.pointerId)}}function Jo(n,r,a,u,p,x){return n===null||n.nativeEvent!==x?(n={blockedOn:r,domEventName:a,eventSystemFlags:u,nativeEvent:x,targetContainers:[p]},r!==null&&(r=ha(r),r!==null&&Yt(r)),n):(n.eventSystemFlags|=u,r=n.targetContainers,p!==null&&r.indexOf(p)===-1&&r.push(p),n)}function tx(n,r,a,u,p){switch(r){case"focusin":return Lr=Jo(Lr,n,r,a,u,p),!0;case"dragenter":return Nr=Jo(Nr,n,r,a,u,p),!0;case"mouseover":return Ir=Jo(Ir,n,r,a,u,p),!0;case"pointerover":var x=p.pointerId;return Ko.set(x,Jo(Ko.get(x)||null,n,r,a,u,p)),!0;case"gotpointercapture":return x=p.pointerId,Zo.set(x,Jo(Zo.get(x)||null,n,r,a,u,p)),!0}return!1}function Np(n){var r=ps(n.target);if(r!==null){var a=Hi(r);if(a!==null){if(r=a.tag,r===13){if(r=hs(a),r!==null){n.blockedOn=r,Ai(n.priority,function(){bi(a)});return}}else if(r===3&&a.stateNode.current.memoizedState.isDehydrated){n.blockedOn=a.tag===3?a.stateNode.containerInfo:null;return}}}n.blockedOn=null}function rl(n){if(n.blockedOn!==null)return!1;for(var r=n.targetContainers;0<r.length;){var a=Au(n.domEventName,n.eventSystemFlags,r[0],n.nativeEvent);if(a===null){a=n.nativeEvent;var u=new a.constructor(a.type,a);Te=u,a.target.dispatchEvent(u),Te=null}else return r=ha(a),r!==null&&Yt(r),n.blockedOn=a,!1;r.shift()}return!0}function Ip(n,r,a){rl(n)&&a.delete(r)}function nx(){Vi=!1,Lr!==null&&rl(Lr)&&(Lr=null),Nr!==null&&rl(Nr)&&(Nr=null),Ir!==null&&rl(Ir)&&(Ir=null),Ko.forEach(Ip),Zo.forEach(Ip)}function Qo(n,r){n.blockedOn===r&&(n.blockedOn=null,Vi||(Vi=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,nx)))}function ea(n){function r(p){return Qo(p,n)}if(0<fs.length){Qo(fs[0],n);for(var a=1;a<fs.length;a++){var u=fs[a];u.blockedOn===n&&(u.blockedOn=null)}}for(Lr!==null&&Qo(Lr,n),Nr!==null&&Qo(Nr,n),Ir!==null&&Qo(Ir,n),Ko.forEach(r),Zo.forEach(r),a=0;a<Ur.length;a++)u=Ur[a],u.blockedOn===n&&(u.blockedOn=null);for(;0<Ur.length&&(a=Ur[0],a.blockedOn===null);)Np(a),a.blockedOn===null&&Ur.shift()}var js=P.ReactCurrentBatchConfig,sl=!0;function ix(n,r,a,u){var p=yt,x=js.transition;js.transition=null;try{yt=1,bu(n,r,a,u)}finally{yt=p,js.transition=x}}function rx(n,r,a,u){var p=yt,x=js.transition;js.transition=null;try{yt=4,bu(n,r,a,u)}finally{yt=p,js.transition=x}}function bu(n,r,a,u){if(sl){var p=Au(n,r,a,u);if(p===null)ju(n,r,u,ol,a),Lp(n,u);else if(tx(p,n,r,a,u))u.stopPropagation();else if(Lp(n,u),r&4&&-1<ex.indexOf(n)){for(;p!==null;){var x=ha(p);if(x!==null&&Ft(x),x=Au(n,r,a,u),x===null&&ju(n,r,u,ol,a),x===p)break;p=x}p!==null&&u.stopPropagation()}else ju(n,r,u,null,a)}}var ol=null;function Au(n,r,a,u){if(ol=null,n=lt(u),n=ps(n),n!==null)if(r=Hi(n),r===null)n=null;else if(a=r.tag,a===13){if(n=hs(r),n!==null)return n;n=null}else if(a===3){if(r.stateNode.current.memoizedState.isDehydrated)return r.tag===3?r.stateNode.containerInfo:null;n=null}else r!==n&&(n=null);return ol=n,null}function Up(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Tu()){case qo:return 1;case R:return 4;case $:case oe:return 16;case ne:return 536870912;default:return 16}default:return 16}}var Fr=null,Cu=null,al=null;function Fp(){if(al)return al;var n,r=Cu,a=r.length,u,p="value"in Fr?Fr.value:Fr.textContent,x=p.length;for(n=0;n<a&&r[n]===p[n];n++);var b=a-n;for(u=1;u<=b&&r[a-u]===p[x-u];u++);return al=p.slice(n,1<u?1-u:void 0)}function ll(n){var r=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&r===13&&(n=13)):n=r,n===10&&(n=13),32<=n||n===13?n:0}function cl(){return!0}function Op(){return!1}function ci(n){function r(a,u,p,x,b){this._reactName=a,this._targetInst=p,this.type=u,this.nativeEvent=x,this.target=b,this.currentTarget=null;for(var F in n)n.hasOwnProperty(F)&&(a=n[F],this[F]=a?a(x):x[F]);return this.isDefaultPrevented=(x.defaultPrevented!=null?x.defaultPrevented:x.returnValue===!1)?cl:Op,this.isPropagationStopped=Op,this}return le(r.prototype,{preventDefault:function(){this.defaultPrevented=!0;var a=this.nativeEvent;a&&(a.preventDefault?a.preventDefault():typeof a.returnValue!="unknown"&&(a.returnValue=!1),this.isDefaultPrevented=cl)},stopPropagation:function(){var a=this.nativeEvent;a&&(a.stopPropagation?a.stopPropagation():typeof a.cancelBubble!="unknown"&&(a.cancelBubble=!0),this.isPropagationStopped=cl)},persist:function(){},isPersistent:cl}),r}var Ws={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ru=ci(Ws),ta=le({},Ws,{view:0,detail:0}),sx=ci(ta),Pu,Du,na,ul=le({},ta,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Nu,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==na&&(na&&n.type==="mousemove"?(Pu=n.screenX-na.screenX,Du=n.screenY-na.screenY):Du=Pu=0,na=n),Pu)},movementY:function(n){return"movementY"in n?n.movementY:Du}}),kp=ci(ul),ox=le({},ul,{dataTransfer:0}),ax=ci(ox),lx=le({},ta,{relatedTarget:0}),Lu=ci(lx),cx=le({},Ws,{animationName:0,elapsedTime:0,pseudoElement:0}),ux=ci(cx),dx=le({},Ws,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),hx=ci(dx),fx=le({},Ws,{data:0}),Bp=ci(fx),px={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},mx={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},gx={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function vx(n){var r=this.nativeEvent;return r.getModifierState?r.getModifierState(n):(n=gx[n])?!!r[n]:!1}function Nu(){return vx}var _x=le({},ta,{key:function(n){if(n.key){var r=px[n.key]||n.key;if(r!=="Unidentified")return r}return n.type==="keypress"?(n=ll(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?mx[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Nu,charCode:function(n){return n.type==="keypress"?ll(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?ll(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),xx=ci(_x),Sx=le({},ul,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),zp=ci(Sx),yx=le({},ta,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Nu}),Mx=ci(yx),Ex=le({},Ws,{propertyName:0,elapsedTime:0,pseudoElement:0}),wx=ci(Ex),Tx=le({},ul,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),bx=ci(Tx),Ax=[9,13,27,32],Iu=d&&"CompositionEvent"in window,ia=null;d&&"documentMode"in document&&(ia=document.documentMode);var Cx=d&&"TextEvent"in window&&!ia,Hp=d&&(!Iu||ia&&8<ia&&11>=ia),Vp=" ",Gp=!1;function jp(n,r){switch(n){case"keyup":return Ax.indexOf(r.keyCode)!==-1;case"keydown":return r.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Wp(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Xs=!1;function Rx(n,r){switch(n){case"compositionend":return Wp(r);case"keypress":return r.which!==32?null:(Gp=!0,Vp);case"textInput":return n=r.data,n===Vp&&Gp?null:n;default:return null}}function Px(n,r){if(Xs)return n==="compositionend"||!Iu&&jp(n,r)?(n=Fp(),al=Cu=Fr=null,Xs=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(r.ctrlKey||r.altKey||r.metaKey)||r.ctrlKey&&r.altKey){if(r.char&&1<r.char.length)return r.char;if(r.which)return String.fromCharCode(r.which)}return null;case"compositionend":return Hp&&r.locale!=="ko"?null:r.data;default:return null}}var Dx={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Xp(n){var r=n&&n.nodeName&&n.nodeName.toLowerCase();return r==="input"?!!Dx[n.type]:r==="textarea"}function $p(n,r,a,u){he(u),r=ml(r,"onChange"),0<r.length&&(a=new Ru("onChange","change",null,a,u),n.push({event:a,listeners:r}))}var ra=null,sa=null;function Lx(n){dm(n,0)}function dl(n){var r=Zs(n);if(Ot(r))return n}function Nx(n,r){if(n==="change")return r}var Yp=!1;if(d){var Uu;if(d){var Fu="oninput"in document;if(!Fu){var qp=document.createElement("div");qp.setAttribute("oninput","return;"),Fu=typeof qp.oninput=="function"}Uu=Fu}else Uu=!1;Yp=Uu&&(!document.documentMode||9<document.documentMode)}function Kp(){ra&&(ra.detachEvent("onpropertychange",Zp),sa=ra=null)}function Zp(n){if(n.propertyName==="value"&&dl(sa)){var r=[];$p(r,sa,n,lt(n)),ht(Lx,r)}}function Ix(n,r,a){n==="focusin"?(Kp(),ra=r,sa=a,ra.attachEvent("onpropertychange",Zp)):n==="focusout"&&Kp()}function Ux(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return dl(sa)}function Fx(n,r){if(n==="click")return dl(r)}function Ox(n,r){if(n==="input"||n==="change")return dl(r)}function kx(n,r){return n===r&&(n!==0||1/n===1/r)||n!==n&&r!==r}var Ci=typeof Object.is=="function"?Object.is:kx;function oa(n,r){if(Ci(n,r))return!0;if(typeof n!="object"||n===null||typeof r!="object"||r===null)return!1;var a=Object.keys(n),u=Object.keys(r);if(a.length!==u.length)return!1;for(u=0;u<a.length;u++){var p=a[u];if(!h.call(r,p)||!Ci(n[p],r[p]))return!1}return!0}function Jp(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function Qp(n,r){var a=Jp(n);n=0;for(var u;a;){if(a.nodeType===3){if(u=n+a.textContent.length,n<=r&&u>=r)return{node:a,offset:r-n};n=u}e:{for(;a;){if(a.nextSibling){a=a.nextSibling;break e}a=a.parentNode}a=void 0}a=Jp(a)}}function em(n,r){return n&&r?n===r?!0:n&&n.nodeType===3?!1:r&&r.nodeType===3?em(n,r.parentNode):"contains"in n?n.contains(r):n.compareDocumentPosition?!!(n.compareDocumentPosition(r)&16):!1:!1}function tm(){for(var n=window,r=ft();r instanceof n.HTMLIFrameElement;){try{var a=typeof r.contentWindow.location.href=="string"}catch{a=!1}if(a)n=r.contentWindow;else break;r=ft(n.document)}return r}function Ou(n){var r=n&&n.nodeName&&n.nodeName.toLowerCase();return r&&(r==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||r==="textarea"||n.contentEditable==="true")}function Bx(n){var r=tm(),a=n.focusedElem,u=n.selectionRange;if(r!==a&&a&&a.ownerDocument&&em(a.ownerDocument.documentElement,a)){if(u!==null&&Ou(a)){if(r=u.start,n=u.end,n===void 0&&(n=r),"selectionStart"in a)a.selectionStart=r,a.selectionEnd=Math.min(n,a.value.length);else if(n=(r=a.ownerDocument||document)&&r.defaultView||window,n.getSelection){n=n.getSelection();var p=a.textContent.length,x=Math.min(u.start,p);u=u.end===void 0?x:Math.min(u.end,p),!n.extend&&x>u&&(p=u,u=x,x=p),p=Qp(a,x);var b=Qp(a,u);p&&b&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==b.node||n.focusOffset!==b.offset)&&(r=r.createRange(),r.setStart(p.node,p.offset),n.removeAllRanges(),x>u?(n.addRange(r),n.extend(b.node,b.offset)):(r.setEnd(b.node,b.offset),n.addRange(r)))}}for(r=[],n=a;n=n.parentNode;)n.nodeType===1&&r.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof a.focus=="function"&&a.focus(),a=0;a<r.length;a++)n=r[a],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var zx=d&&"documentMode"in document&&11>=document.documentMode,$s=null,ku=null,aa=null,Bu=!1;function nm(n,r,a){var u=a.window===a?a.document:a.nodeType===9?a:a.ownerDocument;Bu||$s==null||$s!==ft(u)||(u=$s,"selectionStart"in u&&Ou(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),aa&&oa(aa,u)||(aa=u,u=ml(ku,"onSelect"),0<u.length&&(r=new Ru("onSelect","select",null,r,a),n.push({event:r,listeners:u}),r.target=$s)))}function hl(n,r){var a={};return a[n.toLowerCase()]=r.toLowerCase(),a["Webkit"+n]="webkit"+r,a["Moz"+n]="moz"+r,a}var Ys={animationend:hl("Animation","AnimationEnd"),animationiteration:hl("Animation","AnimationIteration"),animationstart:hl("Animation","AnimationStart"),transitionend:hl("Transition","TransitionEnd")},zu={},im={};d&&(im=document.createElement("div").style,"AnimationEvent"in window||(delete Ys.animationend.animation,delete Ys.animationiteration.animation,delete Ys.animationstart.animation),"TransitionEvent"in window||delete Ys.transitionend.transition);function fl(n){if(zu[n])return zu[n];if(!Ys[n])return n;var r=Ys[n],a;for(a in r)if(r.hasOwnProperty(a)&&a in im)return zu[n]=r[a];return n}var rm=fl("animationend"),sm=fl("animationiteration"),om=fl("animationstart"),am=fl("transitionend"),lm=new Map,cm="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Or(n,r){lm.set(n,r),l(r,[n])}for(var Hu=0;Hu<cm.length;Hu++){var Vu=cm[Hu],Hx=Vu.toLowerCase(),Vx=Vu[0].toUpperCase()+Vu.slice(1);Or(Hx,"on"+Vx)}Or(rm,"onAnimationEnd"),Or(sm,"onAnimationIteration"),Or(om,"onAnimationStart"),Or("dblclick","onDoubleClick"),Or("focusin","onFocus"),Or("focusout","onBlur"),Or(am,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var la="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Gx=new Set("cancel close invalid load scroll toggle".split(" ").concat(la));function um(n,r,a){var u=n.type||"unknown-event";n.currentTarget=a,tl(u,r,void 0,n),n.currentTarget=null}function dm(n,r){r=(r&4)!==0;for(var a=0;a<n.length;a++){var u=n[a],p=u.event;u=u.listeners;e:{var x=void 0;if(r)for(var b=u.length-1;0<=b;b--){var F=u[b],H=F.instance,ce=F.currentTarget;if(F=F.listener,H!==x&&p.isPropagationStopped())break e;um(p,F,ce),x=H}else for(b=0;b<u.length;b++){if(F=u[b],H=F.instance,ce=F.currentTarget,F=F.listener,H!==x&&p.isPropagationStopped())break e;um(p,F,ce),x=H}}}if(ds)throw n=Vs,ds=!1,Vs=null,n}function qt(n,r){var a=r[Ku];a===void 0&&(a=r[Ku]=new Set);var u=n+"__bubble";a.has(u)||(hm(r,n,2,!1),a.add(u))}function Gu(n,r,a){var u=0;r&&(u|=4),hm(a,n,u,r)}var pl="_reactListening"+Math.random().toString(36).slice(2);function ca(n){if(!n[pl]){n[pl]=!0,i.forEach(function(a){a!=="selectionchange"&&(Gx.has(a)||Gu(a,!1,n),Gu(a,!0,n))});var r=n.nodeType===9?n:n.ownerDocument;r===null||r[pl]||(r[pl]=!0,Gu("selectionchange",!1,r))}}function hm(n,r,a,u){switch(Up(r)){case 1:var p=ix;break;case 4:p=rx;break;default:p=bu}a=p.bind(null,r,a,n),p=void 0,!Lt||r!=="touchstart"&&r!=="touchmove"&&r!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(r,a,{capture:!0,passive:p}):n.addEventListener(r,a,!0):p!==void 0?n.addEventListener(r,a,{passive:p}):n.addEventListener(r,a,!1)}function ju(n,r,a,u,p){var x=u;if((r&1)===0&&(r&2)===0&&u!==null)e:for(;;){if(u===null)return;var b=u.tag;if(b===3||b===4){var F=u.stateNode.containerInfo;if(F===p||F.nodeType===8&&F.parentNode===p)break;if(b===4)for(b=u.return;b!==null;){var H=b.tag;if((H===3||H===4)&&(H=b.stateNode.containerInfo,H===p||H.nodeType===8&&H.parentNode===p))return;b=b.return}for(;F!==null;){if(b=ps(F),b===null)return;if(H=b.tag,H===5||H===6){u=x=b;continue e}F=F.parentNode}}u=u.return}ht(function(){var ce=x,Me=lt(a),Ee=[];e:{var ye=lm.get(n);if(ye!==void 0){var je=Ru,Ye=n;switch(n){case"keypress":if(ll(a)===0)break e;case"keydown":case"keyup":je=xx;break;case"focusin":Ye="focus",je=Lu;break;case"focusout":Ye="blur",je=Lu;break;case"beforeblur":case"afterblur":je=Lu;break;case"click":if(a.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":je=kp;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":je=ax;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":je=Mx;break;case rm:case sm:case om:je=ux;break;case am:je=wx;break;case"scroll":je=sx;break;case"wheel":je=bx;break;case"copy":case"cut":case"paste":je=hx;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":je=zp}var Je=(r&4)!==0,ln=!Je&&n==="scroll",ee=Je?ye!==null?ye+"Capture":null:ye;Je=[];for(var W=ce,se;W!==null;){se=W;var be=se.stateNode;if(se.tag===5&&be!==null&&(se=be,ee!==null&&(be=jt(W,ee),be!=null&&Je.push(ua(W,be,se)))),ln)break;W=W.return}0<Je.length&&(ye=new je(ye,Ye,null,a,Me),Ee.push({event:ye,listeners:Je}))}}if((r&7)===0){e:{if(ye=n==="mouseover"||n==="pointerover",je=n==="mouseout"||n==="pointerout",ye&&a!==Te&&(Ye=a.relatedTarget||a.fromElement)&&(ps(Ye)||Ye[hr]))break e;if((je||ye)&&(ye=Me.window===Me?Me:(ye=Me.ownerDocument)?ye.defaultView||ye.parentWindow:window,je?(Ye=a.relatedTarget||a.toElement,je=ce,Ye=Ye?ps(Ye):null,Ye!==null&&(ln=Hi(Ye),Ye!==ln||Ye.tag!==5&&Ye.tag!==6)&&(Ye=null)):(je=null,Ye=ce),je!==Ye)){if(Je=kp,be="onMouseLeave",ee="onMouseEnter",W="mouse",(n==="pointerout"||n==="pointerover")&&(Je=zp,be="onPointerLeave",ee="onPointerEnter",W="pointer"),ln=je==null?ye:Zs(je),se=Ye==null?ye:Zs(Ye),ye=new Je(be,W+"leave",je,a,Me),ye.target=ln,ye.relatedTarget=se,be=null,ps(Me)===ce&&(Je=new Je(ee,W+"enter",Ye,a,Me),Je.target=se,Je.relatedTarget=ln,be=Je),ln=be,je&&Ye)t:{for(Je=je,ee=Ye,W=0,se=Je;se;se=qs(se))W++;for(se=0,be=ee;be;be=qs(be))se++;for(;0<W-se;)Je=qs(Je),W--;for(;0<se-W;)ee=qs(ee),se--;for(;W--;){if(Je===ee||ee!==null&&Je===ee.alternate)break t;Je=qs(Je),ee=qs(ee)}Je=null}else Je=null;je!==null&&fm(Ee,ye,je,Je,!1),Ye!==null&&ln!==null&&fm(Ee,ln,Ye,Je,!0)}}e:{if(ye=ce?Zs(ce):window,je=ye.nodeName&&ye.nodeName.toLowerCase(),je==="select"||je==="input"&&ye.type==="file")var et=Nx;else if(Xp(ye))if(Yp)et=Ox;else{et=Ux;var rt=Ix}else(je=ye.nodeName)&&je.toLowerCase()==="input"&&(ye.type==="checkbox"||ye.type==="radio")&&(et=Fx);if(et&&(et=et(n,ce))){$p(Ee,et,a,Me);break e}rt&&rt(n,ye,ce),n==="focusout"&&(rt=ye._wrapperState)&&rt.controlled&&ye.type==="number"&&Gt(ye,"number",ye.value)}switch(rt=ce?Zs(ce):window,n){case"focusin":(Xp(rt)||rt.contentEditable==="true")&&($s=rt,ku=ce,aa=null);break;case"focusout":aa=ku=$s=null;break;case"mousedown":Bu=!0;break;case"contextmenu":case"mouseup":case"dragend":Bu=!1,nm(Ee,a,Me);break;case"selectionchange":if(zx)break;case"keydown":case"keyup":nm(Ee,a,Me)}var st;if(Iu)e:{switch(n){case"compositionstart":var ut="onCompositionStart";break e;case"compositionend":ut="onCompositionEnd";break e;case"compositionupdate":ut="onCompositionUpdate";break e}ut=void 0}else Xs?jp(n,a)&&(ut="onCompositionEnd"):n==="keydown"&&a.keyCode===229&&(ut="onCompositionStart");ut&&(Hp&&a.locale!=="ko"&&(Xs||ut!=="onCompositionStart"?ut==="onCompositionEnd"&&Xs&&(st=Fp()):(Fr=Me,Cu="value"in Fr?Fr.value:Fr.textContent,Xs=!0)),rt=ml(ce,ut),0<rt.length&&(ut=new Bp(ut,n,null,a,Me),Ee.push({event:ut,listeners:rt}),st?ut.data=st:(st=Wp(a),st!==null&&(ut.data=st)))),(st=Cx?Rx(n,a):Px(n,a))&&(ce=ml(ce,"onBeforeInput"),0<ce.length&&(Me=new Bp("onBeforeInput","beforeinput",null,a,Me),Ee.push({event:Me,listeners:ce}),Me.data=st))}dm(Ee,r)})}function ua(n,r,a){return{instance:n,listener:r,currentTarget:a}}function ml(n,r){for(var a=r+"Capture",u=[];n!==null;){var p=n,x=p.stateNode;p.tag===5&&x!==null&&(p=x,x=jt(n,a),x!=null&&u.unshift(ua(n,x,p)),x=jt(n,r),x!=null&&u.push(ua(n,x,p))),n=n.return}return u}function qs(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function fm(n,r,a,u,p){for(var x=r._reactName,b=[];a!==null&&a!==u;){var F=a,H=F.alternate,ce=F.stateNode;if(H!==null&&H===u)break;F.tag===5&&ce!==null&&(F=ce,p?(H=jt(a,x),H!=null&&b.unshift(ua(a,H,F))):p||(H=jt(a,x),H!=null&&b.push(ua(a,H,F)))),a=a.return}b.length!==0&&n.push({event:r,listeners:b})}var jx=/\r\n?/g,Wx=/\u0000|\uFFFD/g;function pm(n){return(typeof n=="string"?n:""+n).replace(jx,`
`).replace(Wx,"")}function gl(n,r,a){if(r=pm(r),pm(n)!==r&&a)throw Error(t(425))}function vl(){}var Wu=null,Xu=null;function $u(n,r){return n==="textarea"||n==="noscript"||typeof r.children=="string"||typeof r.children=="number"||typeof r.dangerouslySetInnerHTML=="object"&&r.dangerouslySetInnerHTML!==null&&r.dangerouslySetInnerHTML.__html!=null}var Yu=typeof setTimeout=="function"?setTimeout:void 0,Xx=typeof clearTimeout=="function"?clearTimeout:void 0,mm=typeof Promise=="function"?Promise:void 0,$x=typeof queueMicrotask=="function"?queueMicrotask:typeof mm<"u"?function(n){return mm.resolve(null).then(n).catch(Yx)}:Yu;function Yx(n){setTimeout(function(){throw n})}function qu(n,r){var a=r,u=0;do{var p=a.nextSibling;if(n.removeChild(a),p&&p.nodeType===8)if(a=p.data,a==="/$"){if(u===0){n.removeChild(p),ea(r);return}u--}else a!=="$"&&a!=="$?"&&a!=="$!"||u++;a=p}while(a);ea(r)}function kr(n){for(;n!=null;n=n.nextSibling){var r=n.nodeType;if(r===1||r===3)break;if(r===8){if(r=n.data,r==="$"||r==="$!"||r==="$?")break;if(r==="/$")return null}}return n}function gm(n){n=n.previousSibling;for(var r=0;n;){if(n.nodeType===8){var a=n.data;if(a==="$"||a==="$!"||a==="$?"){if(r===0)return n;r--}else a==="/$"&&r++}n=n.previousSibling}return null}var Ks=Math.random().toString(36).slice(2),Gi="__reactFiber$"+Ks,da="__reactProps$"+Ks,hr="__reactContainer$"+Ks,Ku="__reactEvents$"+Ks,qx="__reactListeners$"+Ks,Kx="__reactHandles$"+Ks;function ps(n){var r=n[Gi];if(r)return r;for(var a=n.parentNode;a;){if(r=a[hr]||a[Gi]){if(a=r.alternate,r.child!==null||a!==null&&a.child!==null)for(n=gm(n);n!==null;){if(a=n[Gi])return a;n=gm(n)}return r}n=a,a=n.parentNode}return null}function ha(n){return n=n[Gi]||n[hr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Zs(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function _l(n){return n[da]||null}var Zu=[],Js=-1;function Br(n){return{current:n}}function Kt(n){0>Js||(n.current=Zu[Js],Zu[Js]=null,Js--)}function $t(n,r){Js++,Zu[Js]=n.current,n.current=r}var zr={},Nn=Br(zr),Zn=Br(!1),ms=zr;function Qs(n,r){var a=n.type.contextTypes;if(!a)return zr;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===r)return u.__reactInternalMemoizedMaskedChildContext;var p={},x;for(x in a)p[x]=r[x];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=r,n.__reactInternalMemoizedMaskedChildContext=p),p}function Jn(n){return n=n.childContextTypes,n!=null}function xl(){Kt(Zn),Kt(Nn)}function vm(n,r,a){if(Nn.current!==zr)throw Error(t(168));$t(Nn,r),$t(Zn,a)}function _m(n,r,a){var u=n.stateNode;if(r=r.childContextTypes,typeof u.getChildContext!="function")return a;u=u.getChildContext();for(var p in u)if(!(p in r))throw Error(t(108,_e(n)||"Unknown",p));return le({},a,u)}function Sl(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||zr,ms=Nn.current,$t(Nn,n),$t(Zn,Zn.current),!0}function xm(n,r,a){var u=n.stateNode;if(!u)throw Error(t(169));a?(n=_m(n,r,ms),u.__reactInternalMemoizedMergedChildContext=n,Kt(Zn),Kt(Nn),$t(Nn,n)):Kt(Zn),$t(Zn,a)}var fr=null,yl=!1,Ju=!1;function Sm(n){fr===null?fr=[n]:fr.push(n)}function Zx(n){yl=!0,Sm(n)}function Hr(){if(!Ju&&fr!==null){Ju=!0;var n=0,r=yt;try{var a=fr;for(yt=1;n<a.length;n++){var u=a[n];do u=u(!0);while(u!==null)}fr=null,yl=!1}catch(p){throw fr!==null&&(fr=fr.slice(n+1)),nl(qo,Hr),p}finally{yt=r,Ju=!1}}return null}var eo=[],to=0,Ml=null,El=0,_i=[],xi=0,gs=null,pr=1,mr="";function vs(n,r){eo[to++]=El,eo[to++]=Ml,Ml=n,El=r}function ym(n,r,a){_i[xi++]=pr,_i[xi++]=mr,_i[xi++]=gs,gs=n;var u=pr;n=mr;var p=32-Re(u)-1;u&=~(1<<p),a+=1;var x=32-Re(r)+p;if(30<x){var b=p-p%5;x=(u&(1<<b)-1).toString(32),u>>=b,p-=b,pr=1<<32-Re(r)+p|a<<p|u,mr=x+n}else pr=1<<x|a<<p|u,mr=n}function Qu(n){n.return!==null&&(vs(n,1),ym(n,1,0))}function ed(n){for(;n===Ml;)Ml=eo[--to],eo[to]=null,El=eo[--to],eo[to]=null;for(;n===gs;)gs=_i[--xi],_i[xi]=null,mr=_i[--xi],_i[xi]=null,pr=_i[--xi],_i[xi]=null}var ui=null,di=null,Jt=!1,Ri=null;function Mm(n,r){var a=Ei(5,null,null,0);a.elementType="DELETED",a.stateNode=r,a.return=n,r=n.deletions,r===null?(n.deletions=[a],n.flags|=16):r.push(a)}function Em(n,r){switch(n.tag){case 5:var a=n.type;return r=r.nodeType!==1||a.toLowerCase()!==r.nodeName.toLowerCase()?null:r,r!==null?(n.stateNode=r,ui=n,di=kr(r.firstChild),!0):!1;case 6:return r=n.pendingProps===""||r.nodeType!==3?null:r,r!==null?(n.stateNode=r,ui=n,di=null,!0):!1;case 13:return r=r.nodeType!==8?null:r,r!==null?(a=gs!==null?{id:pr,overflow:mr}:null,n.memoizedState={dehydrated:r,treeContext:a,retryLane:1073741824},a=Ei(18,null,null,0),a.stateNode=r,a.return=n,n.child=a,ui=n,di=null,!0):!1;default:return!1}}function td(n){return(n.mode&1)!==0&&(n.flags&128)===0}function nd(n){if(Jt){var r=di;if(r){var a=r;if(!Em(n,r)){if(td(n))throw Error(t(418));r=kr(a.nextSibling);var u=ui;r&&Em(n,r)?Mm(u,a):(n.flags=n.flags&-4097|2,Jt=!1,ui=n)}}else{if(td(n))throw Error(t(418));n.flags=n.flags&-4097|2,Jt=!1,ui=n}}}function wm(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;ui=n}function wl(n){if(n!==ui)return!1;if(!Jt)return wm(n),Jt=!0,!1;var r;if((r=n.tag!==3)&&!(r=n.tag!==5)&&(r=n.type,r=r!=="head"&&r!=="body"&&!$u(n.type,n.memoizedProps)),r&&(r=di)){if(td(n))throw Tm(),Error(t(418));for(;r;)Mm(n,r),r=kr(r.nextSibling)}if(wm(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,r=0;n;){if(n.nodeType===8){var a=n.data;if(a==="/$"){if(r===0){di=kr(n.nextSibling);break e}r--}else a!=="$"&&a!=="$!"&&a!=="$?"||r++}n=n.nextSibling}di=null}}else di=ui?kr(n.stateNode.nextSibling):null;return!0}function Tm(){for(var n=di;n;)n=kr(n.nextSibling)}function no(){di=ui=null,Jt=!1}function id(n){Ri===null?Ri=[n]:Ri.push(n)}var Jx=P.ReactCurrentBatchConfig;function fa(n,r,a){if(n=a.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(a._owner){if(a=a._owner,a){if(a.tag!==1)throw Error(t(309));var u=a.stateNode}if(!u)throw Error(t(147,n));var p=u,x=""+n;return r!==null&&r.ref!==null&&typeof r.ref=="function"&&r.ref._stringRef===x?r.ref:(r=function(b){var F=p.refs;b===null?delete F[x]:F[x]=b},r._stringRef=x,r)}if(typeof n!="string")throw Error(t(284));if(!a._owner)throw Error(t(290,n))}return n}function Tl(n,r){throw n=Object.prototype.toString.call(r),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(r).join(", ")+"}":n))}function bm(n){var r=n._init;return r(n._payload)}function Am(n){function r(ee,W){if(n){var se=ee.deletions;se===null?(ee.deletions=[W],ee.flags|=16):se.push(W)}}function a(ee,W){if(!n)return null;for(;W!==null;)r(ee,W),W=W.sibling;return null}function u(ee,W){for(ee=new Map;W!==null;)W.key!==null?ee.set(W.key,W):ee.set(W.index,W),W=W.sibling;return ee}function p(ee,W){return ee=qr(ee,W),ee.index=0,ee.sibling=null,ee}function x(ee,W,se){return ee.index=se,n?(se=ee.alternate,se!==null?(se=se.index,se<W?(ee.flags|=2,W):se):(ee.flags|=2,W)):(ee.flags|=1048576,W)}function b(ee){return n&&ee.alternate===null&&(ee.flags|=2),ee}function F(ee,W,se,be){return W===null||W.tag!==6?(W=Yd(se,ee.mode,be),W.return=ee,W):(W=p(W,se),W.return=ee,W)}function H(ee,W,se,be){var et=se.type;return et===B?Me(ee,W,se.props.children,be,se.key):W!==null&&(W.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===Q&&bm(et)===W.type)?(be=p(W,se.props),be.ref=fa(ee,W,se),be.return=ee,be):(be=ql(se.type,se.key,se.props,null,ee.mode,be),be.ref=fa(ee,W,se),be.return=ee,be)}function ce(ee,W,se,be){return W===null||W.tag!==4||W.stateNode.containerInfo!==se.containerInfo||W.stateNode.implementation!==se.implementation?(W=qd(se,ee.mode,be),W.return=ee,W):(W=p(W,se.children||[]),W.return=ee,W)}function Me(ee,W,se,be,et){return W===null||W.tag!==7?(W=Ts(se,ee.mode,be,et),W.return=ee,W):(W=p(W,se),W.return=ee,W)}function Ee(ee,W,se){if(typeof W=="string"&&W!==""||typeof W=="number")return W=Yd(""+W,ee.mode,se),W.return=ee,W;if(typeof W=="object"&&W!==null){switch(W.$$typeof){case O:return se=ql(W.type,W.key,W.props,null,ee.mode,se),se.ref=fa(ee,null,W),se.return=ee,se;case N:return W=qd(W,ee.mode,se),W.return=ee,W;case Q:var be=W._init;return Ee(ee,be(W._payload),se)}if(j(W)||ae(W))return W=Ts(W,ee.mode,se,null),W.return=ee,W;Tl(ee,W)}return null}function ye(ee,W,se,be){var et=W!==null?W.key:null;if(typeof se=="string"&&se!==""||typeof se=="number")return et!==null?null:F(ee,W,""+se,be);if(typeof se=="object"&&se!==null){switch(se.$$typeof){case O:return se.key===et?H(ee,W,se,be):null;case N:return se.key===et?ce(ee,W,se,be):null;case Q:return et=se._init,ye(ee,W,et(se._payload),be)}if(j(se)||ae(se))return et!==null?null:Me(ee,W,se,be,null);Tl(ee,se)}return null}function je(ee,W,se,be,et){if(typeof be=="string"&&be!==""||typeof be=="number")return ee=ee.get(se)||null,F(W,ee,""+be,et);if(typeof be=="object"&&be!==null){switch(be.$$typeof){case O:return ee=ee.get(be.key===null?se:be.key)||null,H(W,ee,be,et);case N:return ee=ee.get(be.key===null?se:be.key)||null,ce(W,ee,be,et);case Q:var rt=be._init;return je(ee,W,se,rt(be._payload),et)}if(j(be)||ae(be))return ee=ee.get(se)||null,Me(W,ee,be,et,null);Tl(W,be)}return null}function Ye(ee,W,se,be){for(var et=null,rt=null,st=W,ut=W=0,En=null;st!==null&&ut<se.length;ut++){st.index>ut?(En=st,st=null):En=st.sibling;var Nt=ye(ee,st,se[ut],be);if(Nt===null){st===null&&(st=En);break}n&&st&&Nt.alternate===null&&r(ee,st),W=x(Nt,W,ut),rt===null?et=Nt:rt.sibling=Nt,rt=Nt,st=En}if(ut===se.length)return a(ee,st),Jt&&vs(ee,ut),et;if(st===null){for(;ut<se.length;ut++)st=Ee(ee,se[ut],be),st!==null&&(W=x(st,W,ut),rt===null?et=st:rt.sibling=st,rt=st);return Jt&&vs(ee,ut),et}for(st=u(ee,st);ut<se.length;ut++)En=je(st,ee,ut,se[ut],be),En!==null&&(n&&En.alternate!==null&&st.delete(En.key===null?ut:En.key),W=x(En,W,ut),rt===null?et=En:rt.sibling=En,rt=En);return n&&st.forEach(function(Kr){return r(ee,Kr)}),Jt&&vs(ee,ut),et}function Je(ee,W,se,be){var et=ae(se);if(typeof et!="function")throw Error(t(150));if(se=et.call(se),se==null)throw Error(t(151));for(var rt=et=null,st=W,ut=W=0,En=null,Nt=se.next();st!==null&&!Nt.done;ut++,Nt=se.next()){st.index>ut?(En=st,st=null):En=st.sibling;var Kr=ye(ee,st,Nt.value,be);if(Kr===null){st===null&&(st=En);break}n&&st&&Kr.alternate===null&&r(ee,st),W=x(Kr,W,ut),rt===null?et=Kr:rt.sibling=Kr,rt=Kr,st=En}if(Nt.done)return a(ee,st),Jt&&vs(ee,ut),et;if(st===null){for(;!Nt.done;ut++,Nt=se.next())Nt=Ee(ee,Nt.value,be),Nt!==null&&(W=x(Nt,W,ut),rt===null?et=Nt:rt.sibling=Nt,rt=Nt);return Jt&&vs(ee,ut),et}for(st=u(ee,st);!Nt.done;ut++,Nt=se.next())Nt=je(st,ee,ut,Nt.value,be),Nt!==null&&(n&&Nt.alternate!==null&&st.delete(Nt.key===null?ut:Nt.key),W=x(Nt,W,ut),rt===null?et=Nt:rt.sibling=Nt,rt=Nt);return n&&st.forEach(function(DS){return r(ee,DS)}),Jt&&vs(ee,ut),et}function ln(ee,W,se,be){if(typeof se=="object"&&se!==null&&se.type===B&&se.key===null&&(se=se.props.children),typeof se=="object"&&se!==null){switch(se.$$typeof){case O:e:{for(var et=se.key,rt=W;rt!==null;){if(rt.key===et){if(et=se.type,et===B){if(rt.tag===7){a(ee,rt.sibling),W=p(rt,se.props.children),W.return=ee,ee=W;break e}}else if(rt.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===Q&&bm(et)===rt.type){a(ee,rt.sibling),W=p(rt,se.props),W.ref=fa(ee,rt,se),W.return=ee,ee=W;break e}a(ee,rt);break}else r(ee,rt);rt=rt.sibling}se.type===B?(W=Ts(se.props.children,ee.mode,be,se.key),W.return=ee,ee=W):(be=ql(se.type,se.key,se.props,null,ee.mode,be),be.ref=fa(ee,W,se),be.return=ee,ee=be)}return b(ee);case N:e:{for(rt=se.key;W!==null;){if(W.key===rt)if(W.tag===4&&W.stateNode.containerInfo===se.containerInfo&&W.stateNode.implementation===se.implementation){a(ee,W.sibling),W=p(W,se.children||[]),W.return=ee,ee=W;break e}else{a(ee,W);break}else r(ee,W);W=W.sibling}W=qd(se,ee.mode,be),W.return=ee,ee=W}return b(ee);case Q:return rt=se._init,ln(ee,W,rt(se._payload),be)}if(j(se))return Ye(ee,W,se,be);if(ae(se))return Je(ee,W,se,be);Tl(ee,se)}return typeof se=="string"&&se!==""||typeof se=="number"?(se=""+se,W!==null&&W.tag===6?(a(ee,W.sibling),W=p(W,se),W.return=ee,ee=W):(a(ee,W),W=Yd(se,ee.mode,be),W.return=ee,ee=W),b(ee)):a(ee,W)}return ln}var io=Am(!0),Cm=Am(!1),bl=Br(null),Al=null,ro=null,rd=null;function sd(){rd=ro=Al=null}function od(n){var r=bl.current;Kt(bl),n._currentValue=r}function ad(n,r,a){for(;n!==null;){var u=n.alternate;if((n.childLanes&r)!==r?(n.childLanes|=r,u!==null&&(u.childLanes|=r)):u!==null&&(u.childLanes&r)!==r&&(u.childLanes|=r),n===a)break;n=n.return}}function so(n,r){Al=n,rd=ro=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&r)!==0&&(Qn=!0),n.firstContext=null)}function Si(n){var r=n._currentValue;if(rd!==n)if(n={context:n,memoizedValue:r,next:null},ro===null){if(Al===null)throw Error(t(308));ro=n,Al.dependencies={lanes:0,firstContext:n}}else ro=ro.next=n;return r}var _s=null;function ld(n){_s===null?_s=[n]:_s.push(n)}function Rm(n,r,a,u){var p=r.interleaved;return p===null?(a.next=a,ld(r)):(a.next=p.next,p.next=a),r.interleaved=a,gr(n,u)}function gr(n,r){n.lanes|=r;var a=n.alternate;for(a!==null&&(a.lanes|=r),a=n,n=n.return;n!==null;)n.childLanes|=r,a=n.alternate,a!==null&&(a.childLanes|=r),a=n,n=n.return;return a.tag===3?a.stateNode:null}var Vr=!1;function cd(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Pm(n,r){n=n.updateQueue,r.updateQueue===n&&(r.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function vr(n,r){return{eventTime:n,lane:r,tag:0,payload:null,callback:null,next:null}}function Gr(n,r,a){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Dt&2)!==0){var p=u.pending;return p===null?r.next=r:(r.next=p.next,p.next=r),u.pending=r,gr(n,a)}return p=u.interleaved,p===null?(r.next=r,ld(u)):(r.next=p.next,p.next=r),u.interleaved=r,gr(n,a)}function Cl(n,r,a){if(r=r.updateQueue,r!==null&&(r=r.shared,(a&4194240)!==0)){var u=r.lanes;u&=n.pendingLanes,a|=u,r.lanes=a,Kn(n,a)}}function Dm(n,r){var a=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,a===u)){var p=null,x=null;if(a=a.firstBaseUpdate,a!==null){do{var b={eventTime:a.eventTime,lane:a.lane,tag:a.tag,payload:a.payload,callback:a.callback,next:null};x===null?p=x=b:x=x.next=b,a=a.next}while(a!==null);x===null?p=x=r:x=x.next=r}else p=x=r;a={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:x,shared:u.shared,effects:u.effects},n.updateQueue=a;return}n=a.lastBaseUpdate,n===null?a.firstBaseUpdate=r:n.next=r,a.lastBaseUpdate=r}function Rl(n,r,a,u){var p=n.updateQueue;Vr=!1;var x=p.firstBaseUpdate,b=p.lastBaseUpdate,F=p.shared.pending;if(F!==null){p.shared.pending=null;var H=F,ce=H.next;H.next=null,b===null?x=ce:b.next=ce,b=H;var Me=n.alternate;Me!==null&&(Me=Me.updateQueue,F=Me.lastBaseUpdate,F!==b&&(F===null?Me.firstBaseUpdate=ce:F.next=ce,Me.lastBaseUpdate=H))}if(x!==null){var Ee=p.baseState;b=0,Me=ce=H=null,F=x;do{var ye=F.lane,je=F.eventTime;if((u&ye)===ye){Me!==null&&(Me=Me.next={eventTime:je,lane:0,tag:F.tag,payload:F.payload,callback:F.callback,next:null});e:{var Ye=n,Je=F;switch(ye=r,je=a,Je.tag){case 1:if(Ye=Je.payload,typeof Ye=="function"){Ee=Ye.call(je,Ee,ye);break e}Ee=Ye;break e;case 3:Ye.flags=Ye.flags&-65537|128;case 0:if(Ye=Je.payload,ye=typeof Ye=="function"?Ye.call(je,Ee,ye):Ye,ye==null)break e;Ee=le({},Ee,ye);break e;case 2:Vr=!0}}F.callback!==null&&F.lane!==0&&(n.flags|=64,ye=p.effects,ye===null?p.effects=[F]:ye.push(F))}else je={eventTime:je,lane:ye,tag:F.tag,payload:F.payload,callback:F.callback,next:null},Me===null?(ce=Me=je,H=Ee):Me=Me.next=je,b|=ye;if(F=F.next,F===null){if(F=p.shared.pending,F===null)break;ye=F,F=ye.next,ye.next=null,p.lastBaseUpdate=ye,p.shared.pending=null}}while(!0);if(Me===null&&(H=Ee),p.baseState=H,p.firstBaseUpdate=ce,p.lastBaseUpdate=Me,r=p.shared.interleaved,r!==null){p=r;do b|=p.lane,p=p.next;while(p!==r)}else x===null&&(p.shared.lanes=0);ys|=b,n.lanes=b,n.memoizedState=Ee}}function Lm(n,r,a){if(n=r.effects,r.effects=null,n!==null)for(r=0;r<n.length;r++){var u=n[r],p=u.callback;if(p!==null){if(u.callback=null,u=a,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var pa={},ji=Br(pa),ma=Br(pa),ga=Br(pa);function xs(n){if(n===pa)throw Error(t(174));return n}function ud(n,r){switch($t(ga,r),$t(ma,n),$t(ji,pa),n=r.nodeType,n){case 9:case 11:r=(r=r.documentElement)?r.namespaceURI:T(null,"");break;default:n=n===8?r.parentNode:r,r=n.namespaceURI||null,n=n.tagName,r=T(r,n)}Kt(ji),$t(ji,r)}function oo(){Kt(ji),Kt(ma),Kt(ga)}function Nm(n){xs(ga.current);var r=xs(ji.current),a=T(r,n.type);r!==a&&($t(ma,n),$t(ji,a))}function dd(n){ma.current===n&&(Kt(ji),Kt(ma))}var en=Br(0);function Pl(n){for(var r=n;r!==null;){if(r.tag===13){var a=r.memoizedState;if(a!==null&&(a=a.dehydrated,a===null||a.data==="$?"||a.data==="$!"))return r}else if(r.tag===19&&r.memoizedProps.revealOrder!==void 0){if((r.flags&128)!==0)return r}else if(r.child!==null){r.child.return=r,r=r.child;continue}if(r===n)break;for(;r.sibling===null;){if(r.return===null||r.return===n)return null;r=r.return}r.sibling.return=r.return,r=r.sibling}return null}var hd=[];function fd(){for(var n=0;n<hd.length;n++)hd[n]._workInProgressVersionPrimary=null;hd.length=0}var Dl=P.ReactCurrentDispatcher,pd=P.ReactCurrentBatchConfig,Ss=0,tn=null,mn=null,yn=null,Ll=!1,va=!1,_a=0,Qx=0;function In(){throw Error(t(321))}function md(n,r){if(r===null)return!1;for(var a=0;a<r.length&&a<n.length;a++)if(!Ci(n[a],r[a]))return!1;return!0}function gd(n,r,a,u,p,x){if(Ss=x,tn=r,r.memoizedState=null,r.updateQueue=null,r.lanes=0,Dl.current=n===null||n.memoizedState===null?iS:rS,n=a(u,p),va){x=0;do{if(va=!1,_a=0,25<=x)throw Error(t(301));x+=1,yn=mn=null,r.updateQueue=null,Dl.current=sS,n=a(u,p)}while(va)}if(Dl.current=Ul,r=mn!==null&&mn.next!==null,Ss=0,yn=mn=tn=null,Ll=!1,r)throw Error(t(300));return n}function vd(){var n=_a!==0;return _a=0,n}function Wi(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return yn===null?tn.memoizedState=yn=n:yn=yn.next=n,yn}function yi(){if(mn===null){var n=tn.alternate;n=n!==null?n.memoizedState:null}else n=mn.next;var r=yn===null?tn.memoizedState:yn.next;if(r!==null)yn=r,mn=n;else{if(n===null)throw Error(t(310));mn=n,n={memoizedState:mn.memoizedState,baseState:mn.baseState,baseQueue:mn.baseQueue,queue:mn.queue,next:null},yn===null?tn.memoizedState=yn=n:yn=yn.next=n}return yn}function xa(n,r){return typeof r=="function"?r(n):r}function _d(n){var r=yi(),a=r.queue;if(a===null)throw Error(t(311));a.lastRenderedReducer=n;var u=mn,p=u.baseQueue,x=a.pending;if(x!==null){if(p!==null){var b=p.next;p.next=x.next,x.next=b}u.baseQueue=p=x,a.pending=null}if(p!==null){x=p.next,u=u.baseState;var F=b=null,H=null,ce=x;do{var Me=ce.lane;if((Ss&Me)===Me)H!==null&&(H=H.next={lane:0,action:ce.action,hasEagerState:ce.hasEagerState,eagerState:ce.eagerState,next:null}),u=ce.hasEagerState?ce.eagerState:n(u,ce.action);else{var Ee={lane:Me,action:ce.action,hasEagerState:ce.hasEagerState,eagerState:ce.eagerState,next:null};H===null?(F=H=Ee,b=u):H=H.next=Ee,tn.lanes|=Me,ys|=Me}ce=ce.next}while(ce!==null&&ce!==x);H===null?b=u:H.next=F,Ci(u,r.memoizedState)||(Qn=!0),r.memoizedState=u,r.baseState=b,r.baseQueue=H,a.lastRenderedState=u}if(n=a.interleaved,n!==null){p=n;do x=p.lane,tn.lanes|=x,ys|=x,p=p.next;while(p!==n)}else p===null&&(a.lanes=0);return[r.memoizedState,a.dispatch]}function xd(n){var r=yi(),a=r.queue;if(a===null)throw Error(t(311));a.lastRenderedReducer=n;var u=a.dispatch,p=a.pending,x=r.memoizedState;if(p!==null){a.pending=null;var b=p=p.next;do x=n(x,b.action),b=b.next;while(b!==p);Ci(x,r.memoizedState)||(Qn=!0),r.memoizedState=x,r.baseQueue===null&&(r.baseState=x),a.lastRenderedState=x}return[x,u]}function Im(){}function Um(n,r){var a=tn,u=yi(),p=r(),x=!Ci(u.memoizedState,p);if(x&&(u.memoizedState=p,Qn=!0),u=u.queue,Sd(km.bind(null,a,u,n),[n]),u.getSnapshot!==r||x||yn!==null&&yn.memoizedState.tag&1){if(a.flags|=2048,Sa(9,Om.bind(null,a,u,p,r),void 0,null),Mn===null)throw Error(t(349));(Ss&30)!==0||Fm(a,r,p)}return p}function Fm(n,r,a){n.flags|=16384,n={getSnapshot:r,value:a},r=tn.updateQueue,r===null?(r={lastEffect:null,stores:null},tn.updateQueue=r,r.stores=[n]):(a=r.stores,a===null?r.stores=[n]:a.push(n))}function Om(n,r,a,u){r.value=a,r.getSnapshot=u,Bm(r)&&zm(n)}function km(n,r,a){return a(function(){Bm(r)&&zm(n)})}function Bm(n){var r=n.getSnapshot;n=n.value;try{var a=r();return!Ci(n,a)}catch{return!0}}function zm(n){var r=gr(n,1);r!==null&&Ni(r,n,1,-1)}function Hm(n){var r=Wi();return typeof n=="function"&&(n=n()),r.memoizedState=r.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:xa,lastRenderedState:n},r.queue=n,n=n.dispatch=nS.bind(null,tn,n),[r.memoizedState,n]}function Sa(n,r,a,u){return n={tag:n,create:r,destroy:a,deps:u,next:null},r=tn.updateQueue,r===null?(r={lastEffect:null,stores:null},tn.updateQueue=r,r.lastEffect=n.next=n):(a=r.lastEffect,a===null?r.lastEffect=n.next=n:(u=a.next,a.next=n,n.next=u,r.lastEffect=n)),n}function Vm(){return yi().memoizedState}function Nl(n,r,a,u){var p=Wi();tn.flags|=n,p.memoizedState=Sa(1|r,a,void 0,u===void 0?null:u)}function Il(n,r,a,u){var p=yi();u=u===void 0?null:u;var x=void 0;if(mn!==null){var b=mn.memoizedState;if(x=b.destroy,u!==null&&md(u,b.deps)){p.memoizedState=Sa(r,a,x,u);return}}tn.flags|=n,p.memoizedState=Sa(1|r,a,x,u)}function Gm(n,r){return Nl(8390656,8,n,r)}function Sd(n,r){return Il(2048,8,n,r)}function jm(n,r){return Il(4,2,n,r)}function Wm(n,r){return Il(4,4,n,r)}function Xm(n,r){if(typeof r=="function")return n=n(),r(n),function(){r(null)};if(r!=null)return n=n(),r.current=n,function(){r.current=null}}function $m(n,r,a){return a=a!=null?a.concat([n]):null,Il(4,4,Xm.bind(null,r,n),a)}function yd(){}function Ym(n,r){var a=yi();r=r===void 0?null:r;var u=a.memoizedState;return u!==null&&r!==null&&md(r,u[1])?u[0]:(a.memoizedState=[n,r],n)}function qm(n,r){var a=yi();r=r===void 0?null:r;var u=a.memoizedState;return u!==null&&r!==null&&md(r,u[1])?u[0]:(n=n(),a.memoizedState=[n,r],n)}function Km(n,r,a){return(Ss&21)===0?(n.baseState&&(n.baseState=!1,Qn=!0),n.memoizedState=a):(Ci(a,r)||(a=Ge(),tn.lanes|=a,ys|=a,n.baseState=!0),r)}function eS(n,r){var a=yt;yt=a!==0&&4>a?a:4,n(!0);var u=pd.transition;pd.transition={};try{n(!1),r()}finally{yt=a,pd.transition=u}}function Zm(){return yi().memoizedState}function tS(n,r,a){var u=$r(n);if(a={lane:u,action:a,hasEagerState:!1,eagerState:null,next:null},Jm(n))Qm(r,a);else if(a=Rm(n,r,a,u),a!==null){var p=Gn();Ni(a,n,u,p),eg(a,r,u)}}function nS(n,r,a){var u=$r(n),p={lane:u,action:a,hasEagerState:!1,eagerState:null,next:null};if(Jm(n))Qm(r,p);else{var x=n.alternate;if(n.lanes===0&&(x===null||x.lanes===0)&&(x=r.lastRenderedReducer,x!==null))try{var b=r.lastRenderedState,F=x(b,a);if(p.hasEagerState=!0,p.eagerState=F,Ci(F,b)){var H=r.interleaved;H===null?(p.next=p,ld(r)):(p.next=H.next,H.next=p),r.interleaved=p;return}}catch{}finally{}a=Rm(n,r,p,u),a!==null&&(p=Gn(),Ni(a,n,u,p),eg(a,r,u))}}function Jm(n){var r=n.alternate;return n===tn||r!==null&&r===tn}function Qm(n,r){va=Ll=!0;var a=n.pending;a===null?r.next=r:(r.next=a.next,a.next=r),n.pending=r}function eg(n,r,a){if((a&4194240)!==0){var u=r.lanes;u&=n.pendingLanes,a|=u,r.lanes=a,Kn(n,a)}}var Ul={readContext:Si,useCallback:In,useContext:In,useEffect:In,useImperativeHandle:In,useInsertionEffect:In,useLayoutEffect:In,useMemo:In,useReducer:In,useRef:In,useState:In,useDebugValue:In,useDeferredValue:In,useTransition:In,useMutableSource:In,useSyncExternalStore:In,useId:In,unstable_isNewReconciler:!1},iS={readContext:Si,useCallback:function(n,r){return Wi().memoizedState=[n,r===void 0?null:r],n},useContext:Si,useEffect:Gm,useImperativeHandle:function(n,r,a){return a=a!=null?a.concat([n]):null,Nl(4194308,4,Xm.bind(null,r,n),a)},useLayoutEffect:function(n,r){return Nl(4194308,4,n,r)},useInsertionEffect:function(n,r){return Nl(4,2,n,r)},useMemo:function(n,r){var a=Wi();return r=r===void 0?null:r,n=n(),a.memoizedState=[n,r],n},useReducer:function(n,r,a){var u=Wi();return r=a!==void 0?a(r):r,u.memoizedState=u.baseState=r,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:r},u.queue=n,n=n.dispatch=tS.bind(null,tn,n),[u.memoizedState,n]},useRef:function(n){var r=Wi();return n={current:n},r.memoizedState=n},useState:Hm,useDebugValue:yd,useDeferredValue:function(n){return Wi().memoizedState=n},useTransition:function(){var n=Hm(!1),r=n[0];return n=eS.bind(null,n[1]),Wi().memoizedState=n,[r,n]},useMutableSource:function(){},useSyncExternalStore:function(n,r,a){var u=tn,p=Wi();if(Jt){if(a===void 0)throw Error(t(407));a=a()}else{if(a=r(),Mn===null)throw Error(t(349));(Ss&30)!==0||Fm(u,r,a)}p.memoizedState=a;var x={value:a,getSnapshot:r};return p.queue=x,Gm(km.bind(null,u,x,n),[n]),u.flags|=2048,Sa(9,Om.bind(null,u,x,a,r),void 0,null),a},useId:function(){var n=Wi(),r=Mn.identifierPrefix;if(Jt){var a=mr,u=pr;a=(u&~(1<<32-Re(u)-1)).toString(32)+a,r=":"+r+"R"+a,a=_a++,0<a&&(r+="H"+a.toString(32)),r+=":"}else a=Qx++,r=":"+r+"r"+a.toString(32)+":";return n.memoizedState=r},unstable_isNewReconciler:!1},rS={readContext:Si,useCallback:Ym,useContext:Si,useEffect:Sd,useImperativeHandle:$m,useInsertionEffect:jm,useLayoutEffect:Wm,useMemo:qm,useReducer:_d,useRef:Vm,useState:function(){return _d(xa)},useDebugValue:yd,useDeferredValue:function(n){var r=yi();return Km(r,mn.memoizedState,n)},useTransition:function(){var n=_d(xa)[0],r=yi().memoizedState;return[n,r]},useMutableSource:Im,useSyncExternalStore:Um,useId:Zm,unstable_isNewReconciler:!1},sS={readContext:Si,useCallback:Ym,useContext:Si,useEffect:Sd,useImperativeHandle:$m,useInsertionEffect:jm,useLayoutEffect:Wm,useMemo:qm,useReducer:xd,useRef:Vm,useState:function(){return xd(xa)},useDebugValue:yd,useDeferredValue:function(n){var r=yi();return mn===null?r.memoizedState=n:Km(r,mn.memoizedState,n)},useTransition:function(){var n=xd(xa)[0],r=yi().memoizedState;return[n,r]},useMutableSource:Im,useSyncExternalStore:Um,useId:Zm,unstable_isNewReconciler:!1};function Pi(n,r){if(n&&n.defaultProps){r=le({},r),n=n.defaultProps;for(var a in n)r[a]===void 0&&(r[a]=n[a]);return r}return r}function Md(n,r,a,u){r=n.memoizedState,a=a(u,r),a=a==null?r:le({},r,a),n.memoizedState=a,n.lanes===0&&(n.updateQueue.baseState=a)}var Fl={isMounted:function(n){return(n=n._reactInternals)?Hi(n)===n:!1},enqueueSetState:function(n,r,a){n=n._reactInternals;var u=Gn(),p=$r(n),x=vr(u,p);x.payload=r,a!=null&&(x.callback=a),r=Gr(n,x,p),r!==null&&(Ni(r,n,p,u),Cl(r,n,p))},enqueueReplaceState:function(n,r,a){n=n._reactInternals;var u=Gn(),p=$r(n),x=vr(u,p);x.tag=1,x.payload=r,a!=null&&(x.callback=a),r=Gr(n,x,p),r!==null&&(Ni(r,n,p,u),Cl(r,n,p))},enqueueForceUpdate:function(n,r){n=n._reactInternals;var a=Gn(),u=$r(n),p=vr(a,u);p.tag=2,r!=null&&(p.callback=r),r=Gr(n,p,u),r!==null&&(Ni(r,n,u,a),Cl(r,n,u))}};function tg(n,r,a,u,p,x,b){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,x,b):r.prototype&&r.prototype.isPureReactComponent?!oa(a,u)||!oa(p,x):!0}function ng(n,r,a){var u=!1,p=zr,x=r.contextType;return typeof x=="object"&&x!==null?x=Si(x):(p=Jn(r)?ms:Nn.current,u=r.contextTypes,x=(u=u!=null)?Qs(n,p):zr),r=new r(a,x),n.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,r.updater=Fl,n.stateNode=r,r._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=x),r}function ig(n,r,a,u){n=r.state,typeof r.componentWillReceiveProps=="function"&&r.componentWillReceiveProps(a,u),typeof r.UNSAFE_componentWillReceiveProps=="function"&&r.UNSAFE_componentWillReceiveProps(a,u),r.state!==n&&Fl.enqueueReplaceState(r,r.state,null)}function Ed(n,r,a,u){var p=n.stateNode;p.props=a,p.state=n.memoizedState,p.refs={},cd(n);var x=r.contextType;typeof x=="object"&&x!==null?p.context=Si(x):(x=Jn(r)?ms:Nn.current,p.context=Qs(n,x)),p.state=n.memoizedState,x=r.getDerivedStateFromProps,typeof x=="function"&&(Md(n,r,x,a),p.state=n.memoizedState),typeof r.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(r=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),r!==p.state&&Fl.enqueueReplaceState(p,p.state,null),Rl(n,a,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function ao(n,r){try{var a="",u=r;do a+=Fe(u),u=u.return;while(u);var p=a}catch(x){p=`
Error generating stack: `+x.message+`
`+x.stack}return{value:n,source:r,stack:p,digest:null}}function wd(n,r,a){return{value:n,source:null,stack:a??null,digest:r??null}}function Td(n,r){try{console.error(r.value)}catch(a){setTimeout(function(){throw a})}}var oS=typeof WeakMap=="function"?WeakMap:Map;function rg(n,r,a){a=vr(-1,a),a.tag=3,a.payload={element:null};var u=r.value;return a.callback=function(){Gl||(Gl=!0,zd=u),Td(n,r)},a}function sg(n,r,a){a=vr(-1,a),a.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=r.value;a.payload=function(){return u(p)},a.callback=function(){Td(n,r)}}var x=n.stateNode;return x!==null&&typeof x.componentDidCatch=="function"&&(a.callback=function(){Td(n,r),typeof u!="function"&&(Wr===null?Wr=new Set([this]):Wr.add(this));var b=r.stack;this.componentDidCatch(r.value,{componentStack:b!==null?b:""})}),a}function og(n,r,a){var u=n.pingCache;if(u===null){u=n.pingCache=new oS;var p=new Set;u.set(r,p)}else p=u.get(r),p===void 0&&(p=new Set,u.set(r,p));p.has(a)||(p.add(a),n=SS.bind(null,n,r,a),r.then(n,n))}function ag(n){do{var r;if((r=n.tag===13)&&(r=n.memoizedState,r=r!==null?r.dehydrated!==null:!0),r)return n;n=n.return}while(n!==null);return null}function lg(n,r,a,u,p){return(n.mode&1)===0?(n===r?n.flags|=65536:(n.flags|=128,a.flags|=131072,a.flags&=-52805,a.tag===1&&(a.alternate===null?a.tag=17:(r=vr(-1,1),r.tag=2,Gr(a,r,1))),a.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var aS=P.ReactCurrentOwner,Qn=!1;function Vn(n,r,a,u){r.child=n===null?Cm(r,null,a,u):io(r,n.child,a,u)}function cg(n,r,a,u,p){a=a.render;var x=r.ref;return so(r,p),u=gd(n,r,a,u,x,p),a=vd(),n!==null&&!Qn?(r.updateQueue=n.updateQueue,r.flags&=-2053,n.lanes&=~p,_r(n,r,p)):(Jt&&a&&Qu(r),r.flags|=1,Vn(n,r,u,p),r.child)}function ug(n,r,a,u,p){if(n===null){var x=a.type;return typeof x=="function"&&!$d(x)&&x.defaultProps===void 0&&a.compare===null&&a.defaultProps===void 0?(r.tag=15,r.type=x,dg(n,r,x,u,p)):(n=ql(a.type,null,u,r,r.mode,p),n.ref=r.ref,n.return=r,r.child=n)}if(x=n.child,(n.lanes&p)===0){var b=x.memoizedProps;if(a=a.compare,a=a!==null?a:oa,a(b,u)&&n.ref===r.ref)return _r(n,r,p)}return r.flags|=1,n=qr(x,u),n.ref=r.ref,n.return=r,r.child=n}function dg(n,r,a,u,p){if(n!==null){var x=n.memoizedProps;if(oa(x,u)&&n.ref===r.ref)if(Qn=!1,r.pendingProps=u=x,(n.lanes&p)!==0)(n.flags&131072)!==0&&(Qn=!0);else return r.lanes=n.lanes,_r(n,r,p)}return bd(n,r,a,u,p)}function hg(n,r,a){var u=r.pendingProps,p=u.children,x=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((r.mode&1)===0)r.memoizedState={baseLanes:0,cachePool:null,transitions:null},$t(co,hi),hi|=a;else{if((a&1073741824)===0)return n=x!==null?x.baseLanes|a:a,r.lanes=r.childLanes=1073741824,r.memoizedState={baseLanes:n,cachePool:null,transitions:null},r.updateQueue=null,$t(co,hi),hi|=n,null;r.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=x!==null?x.baseLanes:a,$t(co,hi),hi|=u}else x!==null?(u=x.baseLanes|a,r.memoizedState=null):u=a,$t(co,hi),hi|=u;return Vn(n,r,p,a),r.child}function fg(n,r){var a=r.ref;(n===null&&a!==null||n!==null&&n.ref!==a)&&(r.flags|=512,r.flags|=2097152)}function bd(n,r,a,u,p){var x=Jn(a)?ms:Nn.current;return x=Qs(r,x),so(r,p),a=gd(n,r,a,u,x,p),u=vd(),n!==null&&!Qn?(r.updateQueue=n.updateQueue,r.flags&=-2053,n.lanes&=~p,_r(n,r,p)):(Jt&&u&&Qu(r),r.flags|=1,Vn(n,r,a,p),r.child)}function pg(n,r,a,u,p){if(Jn(a)){var x=!0;Sl(r)}else x=!1;if(so(r,p),r.stateNode===null)kl(n,r),ng(r,a,u),Ed(r,a,u,p),u=!0;else if(n===null){var b=r.stateNode,F=r.memoizedProps;b.props=F;var H=b.context,ce=a.contextType;typeof ce=="object"&&ce!==null?ce=Si(ce):(ce=Jn(a)?ms:Nn.current,ce=Qs(r,ce));var Me=a.getDerivedStateFromProps,Ee=typeof Me=="function"||typeof b.getSnapshotBeforeUpdate=="function";Ee||typeof b.UNSAFE_componentWillReceiveProps!="function"&&typeof b.componentWillReceiveProps!="function"||(F!==u||H!==ce)&&ig(r,b,u,ce),Vr=!1;var ye=r.memoizedState;b.state=ye,Rl(r,u,b,p),H=r.memoizedState,F!==u||ye!==H||Zn.current||Vr?(typeof Me=="function"&&(Md(r,a,Me,u),H=r.memoizedState),(F=Vr||tg(r,a,F,u,ye,H,ce))?(Ee||typeof b.UNSAFE_componentWillMount!="function"&&typeof b.componentWillMount!="function"||(typeof b.componentWillMount=="function"&&b.componentWillMount(),typeof b.UNSAFE_componentWillMount=="function"&&b.UNSAFE_componentWillMount()),typeof b.componentDidMount=="function"&&(r.flags|=4194308)):(typeof b.componentDidMount=="function"&&(r.flags|=4194308),r.memoizedProps=u,r.memoizedState=H),b.props=u,b.state=H,b.context=ce,u=F):(typeof b.componentDidMount=="function"&&(r.flags|=4194308),u=!1)}else{b=r.stateNode,Pm(n,r),F=r.memoizedProps,ce=r.type===r.elementType?F:Pi(r.type,F),b.props=ce,Ee=r.pendingProps,ye=b.context,H=a.contextType,typeof H=="object"&&H!==null?H=Si(H):(H=Jn(a)?ms:Nn.current,H=Qs(r,H));var je=a.getDerivedStateFromProps;(Me=typeof je=="function"||typeof b.getSnapshotBeforeUpdate=="function")||typeof b.UNSAFE_componentWillReceiveProps!="function"&&typeof b.componentWillReceiveProps!="function"||(F!==Ee||ye!==H)&&ig(r,b,u,H),Vr=!1,ye=r.memoizedState,b.state=ye,Rl(r,u,b,p);var Ye=r.memoizedState;F!==Ee||ye!==Ye||Zn.current||Vr?(typeof je=="function"&&(Md(r,a,je,u),Ye=r.memoizedState),(ce=Vr||tg(r,a,ce,u,ye,Ye,H)||!1)?(Me||typeof b.UNSAFE_componentWillUpdate!="function"&&typeof b.componentWillUpdate!="function"||(typeof b.componentWillUpdate=="function"&&b.componentWillUpdate(u,Ye,H),typeof b.UNSAFE_componentWillUpdate=="function"&&b.UNSAFE_componentWillUpdate(u,Ye,H)),typeof b.componentDidUpdate=="function"&&(r.flags|=4),typeof b.getSnapshotBeforeUpdate=="function"&&(r.flags|=1024)):(typeof b.componentDidUpdate!="function"||F===n.memoizedProps&&ye===n.memoizedState||(r.flags|=4),typeof b.getSnapshotBeforeUpdate!="function"||F===n.memoizedProps&&ye===n.memoizedState||(r.flags|=1024),r.memoizedProps=u,r.memoizedState=Ye),b.props=u,b.state=Ye,b.context=H,u=ce):(typeof b.componentDidUpdate!="function"||F===n.memoizedProps&&ye===n.memoizedState||(r.flags|=4),typeof b.getSnapshotBeforeUpdate!="function"||F===n.memoizedProps&&ye===n.memoizedState||(r.flags|=1024),u=!1)}return Ad(n,r,a,u,x,p)}function Ad(n,r,a,u,p,x){fg(n,r);var b=(r.flags&128)!==0;if(!u&&!b)return p&&xm(r,a,!1),_r(n,r,x);u=r.stateNode,aS.current=r;var F=b&&typeof a.getDerivedStateFromError!="function"?null:u.render();return r.flags|=1,n!==null&&b?(r.child=io(r,n.child,null,x),r.child=io(r,null,F,x)):Vn(n,r,F,x),r.memoizedState=u.state,p&&xm(r,a,!0),r.child}function mg(n){var r=n.stateNode;r.pendingContext?vm(n,r.pendingContext,r.pendingContext!==r.context):r.context&&vm(n,r.context,!1),ud(n,r.containerInfo)}function gg(n,r,a,u,p){return no(),id(p),r.flags|=256,Vn(n,r,a,u),r.child}var Cd={dehydrated:null,treeContext:null,retryLane:0};function Rd(n){return{baseLanes:n,cachePool:null,transitions:null}}function vg(n,r,a){var u=r.pendingProps,p=en.current,x=!1,b=(r.flags&128)!==0,F;if((F=b)||(F=n!==null&&n.memoizedState===null?!1:(p&2)!==0),F?(x=!0,r.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),$t(en,p&1),n===null)return nd(r),n=r.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((r.mode&1)===0?r.lanes=1:n.data==="$!"?r.lanes=8:r.lanes=1073741824,null):(b=u.children,n=u.fallback,x?(u=r.mode,x=r.child,b={mode:"hidden",children:b},(u&1)===0&&x!==null?(x.childLanes=0,x.pendingProps=b):x=Kl(b,u,0,null),n=Ts(n,u,a,null),x.return=r,n.return=r,x.sibling=n,r.child=x,r.child.memoizedState=Rd(a),r.memoizedState=Cd,n):Pd(r,b));if(p=n.memoizedState,p!==null&&(F=p.dehydrated,F!==null))return lS(n,r,b,u,F,p,a);if(x){x=u.fallback,b=r.mode,p=n.child,F=p.sibling;var H={mode:"hidden",children:u.children};return(b&1)===0&&r.child!==p?(u=r.child,u.childLanes=0,u.pendingProps=H,r.deletions=null):(u=qr(p,H),u.subtreeFlags=p.subtreeFlags&14680064),F!==null?x=qr(F,x):(x=Ts(x,b,a,null),x.flags|=2),x.return=r,u.return=r,u.sibling=x,r.child=u,u=x,x=r.child,b=n.child.memoizedState,b=b===null?Rd(a):{baseLanes:b.baseLanes|a,cachePool:null,transitions:b.transitions},x.memoizedState=b,x.childLanes=n.childLanes&~a,r.memoizedState=Cd,u}return x=n.child,n=x.sibling,u=qr(x,{mode:"visible",children:u.children}),(r.mode&1)===0&&(u.lanes=a),u.return=r,u.sibling=null,n!==null&&(a=r.deletions,a===null?(r.deletions=[n],r.flags|=16):a.push(n)),r.child=u,r.memoizedState=null,u}function Pd(n,r){return r=Kl({mode:"visible",children:r},n.mode,0,null),r.return=n,n.child=r}function Ol(n,r,a,u){return u!==null&&id(u),io(r,n.child,null,a),n=Pd(r,r.pendingProps.children),n.flags|=2,r.memoizedState=null,n}function lS(n,r,a,u,p,x,b){if(a)return r.flags&256?(r.flags&=-257,u=wd(Error(t(422))),Ol(n,r,b,u)):r.memoizedState!==null?(r.child=n.child,r.flags|=128,null):(x=u.fallback,p=r.mode,u=Kl({mode:"visible",children:u.children},p,0,null),x=Ts(x,p,b,null),x.flags|=2,u.return=r,x.return=r,u.sibling=x,r.child=u,(r.mode&1)!==0&&io(r,n.child,null,b),r.child.memoizedState=Rd(b),r.memoizedState=Cd,x);if((r.mode&1)===0)return Ol(n,r,b,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var F=u.dgst;return u=F,x=Error(t(419)),u=wd(x,u,void 0),Ol(n,r,b,u)}if(F=(b&n.childLanes)!==0,Qn||F){if(u=Mn,u!==null){switch(b&-b){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|b))!==0?0:p,p!==0&&p!==x.retryLane&&(x.retryLane=p,gr(n,p),Ni(u,n,p,-1))}return Xd(),u=wd(Error(t(421))),Ol(n,r,b,u)}return p.data==="$?"?(r.flags|=128,r.child=n.child,r=yS.bind(null,n),p._reactRetry=r,null):(n=x.treeContext,di=kr(p.nextSibling),ui=r,Jt=!0,Ri=null,n!==null&&(_i[xi++]=pr,_i[xi++]=mr,_i[xi++]=gs,pr=n.id,mr=n.overflow,gs=r),r=Pd(r,u.children),r.flags|=4096,r)}function _g(n,r,a){n.lanes|=r;var u=n.alternate;u!==null&&(u.lanes|=r),ad(n.return,r,a)}function Dd(n,r,a,u,p){var x=n.memoizedState;x===null?n.memoizedState={isBackwards:r,rendering:null,renderingStartTime:0,last:u,tail:a,tailMode:p}:(x.isBackwards=r,x.rendering=null,x.renderingStartTime=0,x.last=u,x.tail=a,x.tailMode=p)}function xg(n,r,a){var u=r.pendingProps,p=u.revealOrder,x=u.tail;if(Vn(n,r,u.children,a),u=en.current,(u&2)!==0)u=u&1|2,r.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=r.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&_g(n,a,r);else if(n.tag===19)_g(n,a,r);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===r)break e;for(;n.sibling===null;){if(n.return===null||n.return===r)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if($t(en,u),(r.mode&1)===0)r.memoizedState=null;else switch(p){case"forwards":for(a=r.child,p=null;a!==null;)n=a.alternate,n!==null&&Pl(n)===null&&(p=a),a=a.sibling;a=p,a===null?(p=r.child,r.child=null):(p=a.sibling,a.sibling=null),Dd(r,!1,p,a,x);break;case"backwards":for(a=null,p=r.child,r.child=null;p!==null;){if(n=p.alternate,n!==null&&Pl(n)===null){r.child=p;break}n=p.sibling,p.sibling=a,a=p,p=n}Dd(r,!0,a,null,x);break;case"together":Dd(r,!1,null,null,void 0);break;default:r.memoizedState=null}return r.child}function kl(n,r){(r.mode&1)===0&&n!==null&&(n.alternate=null,r.alternate=null,r.flags|=2)}function _r(n,r,a){if(n!==null&&(r.dependencies=n.dependencies),ys|=r.lanes,(a&r.childLanes)===0)return null;if(n!==null&&r.child!==n.child)throw Error(t(153));if(r.child!==null){for(n=r.child,a=qr(n,n.pendingProps),r.child=a,a.return=r;n.sibling!==null;)n=n.sibling,a=a.sibling=qr(n,n.pendingProps),a.return=r;a.sibling=null}return r.child}function cS(n,r,a){switch(r.tag){case 3:mg(r),no();break;case 5:Nm(r);break;case 1:Jn(r.type)&&Sl(r);break;case 4:ud(r,r.stateNode.containerInfo);break;case 10:var u=r.type._context,p=r.memoizedProps.value;$t(bl,u._currentValue),u._currentValue=p;break;case 13:if(u=r.memoizedState,u!==null)return u.dehydrated!==null?($t(en,en.current&1),r.flags|=128,null):(a&r.child.childLanes)!==0?vg(n,r,a):($t(en,en.current&1),n=_r(n,r,a),n!==null?n.sibling:null);$t(en,en.current&1);break;case 19:if(u=(a&r.childLanes)!==0,(n.flags&128)!==0){if(u)return xg(n,r,a);r.flags|=128}if(p=r.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),$t(en,en.current),u)break;return null;case 22:case 23:return r.lanes=0,hg(n,r,a)}return _r(n,r,a)}var Sg,Ld,yg,Mg;Sg=function(n,r){for(var a=r.child;a!==null;){if(a.tag===5||a.tag===6)n.appendChild(a.stateNode);else if(a.tag!==4&&a.child!==null){a.child.return=a,a=a.child;continue}if(a===r)break;for(;a.sibling===null;){if(a.return===null||a.return===r)return;a=a.return}a.sibling.return=a.return,a=a.sibling}},Ld=function(){},yg=function(n,r,a,u){var p=n.memoizedProps;if(p!==u){n=r.stateNode,xs(ji.current);var x=null;switch(a){case"input":p=bt(n,p),u=bt(n,u),x=[];break;case"select":p=le({},p,{value:void 0}),u=le({},u,{value:void 0}),x=[];break;case"textarea":p=ct(n,p),u=ct(n,u),x=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=vl)}Ve(a,u);var b;a=null;for(ce in p)if(!u.hasOwnProperty(ce)&&p.hasOwnProperty(ce)&&p[ce]!=null)if(ce==="style"){var F=p[ce];for(b in F)F.hasOwnProperty(b)&&(a||(a={}),a[b]="")}else ce!=="dangerouslySetInnerHTML"&&ce!=="children"&&ce!=="suppressContentEditableWarning"&&ce!=="suppressHydrationWarning"&&ce!=="autoFocus"&&(o.hasOwnProperty(ce)?x||(x=[]):(x=x||[]).push(ce,null));for(ce in u){var H=u[ce];if(F=p!=null?p[ce]:void 0,u.hasOwnProperty(ce)&&H!==F&&(H!=null||F!=null))if(ce==="style")if(F){for(b in F)!F.hasOwnProperty(b)||H&&H.hasOwnProperty(b)||(a||(a={}),a[b]="");for(b in H)H.hasOwnProperty(b)&&F[b]!==H[b]&&(a||(a={}),a[b]=H[b])}else a||(x||(x=[]),x.push(ce,a)),a=H;else ce==="dangerouslySetInnerHTML"?(H=H?H.__html:void 0,F=F?F.__html:void 0,H!=null&&F!==H&&(x=x||[]).push(ce,H)):ce==="children"?typeof H!="string"&&typeof H!="number"||(x=x||[]).push(ce,""+H):ce!=="suppressContentEditableWarning"&&ce!=="suppressHydrationWarning"&&(o.hasOwnProperty(ce)?(H!=null&&ce==="onScroll"&&qt("scroll",n),x||F===H||(x=[])):(x=x||[]).push(ce,H))}a&&(x=x||[]).push("style",a);var ce=x;(r.updateQueue=ce)&&(r.flags|=4)}},Mg=function(n,r,a,u){a!==u&&(r.flags|=4)};function ya(n,r){if(!Jt)switch(n.tailMode){case"hidden":r=n.tail;for(var a=null;r!==null;)r.alternate!==null&&(a=r),r=r.sibling;a===null?n.tail=null:a.sibling=null;break;case"collapsed":a=n.tail;for(var u=null;a!==null;)a.alternate!==null&&(u=a),a=a.sibling;u===null?r||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function Un(n){var r=n.alternate!==null&&n.alternate.child===n.child,a=0,u=0;if(r)for(var p=n.child;p!==null;)a|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)a|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=a,r}function uS(n,r,a){var u=r.pendingProps;switch(ed(r),r.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Un(r),null;case 1:return Jn(r.type)&&xl(),Un(r),null;case 3:return u=r.stateNode,oo(),Kt(Zn),Kt(Nn),fd(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(wl(r)?r.flags|=4:n===null||n.memoizedState.isDehydrated&&(r.flags&256)===0||(r.flags|=1024,Ri!==null&&(Gd(Ri),Ri=null))),Ld(n,r),Un(r),null;case 5:dd(r);var p=xs(ga.current);if(a=r.type,n!==null&&r.stateNode!=null)yg(n,r,a,u,p),n.ref!==r.ref&&(r.flags|=512,r.flags|=2097152);else{if(!u){if(r.stateNode===null)throw Error(t(166));return Un(r),null}if(n=xs(ji.current),wl(r)){u=r.stateNode,a=r.type;var x=r.memoizedProps;switch(u[Gi]=r,u[da]=x,n=(r.mode&1)!==0,a){case"dialog":qt("cancel",u),qt("close",u);break;case"iframe":case"object":case"embed":qt("load",u);break;case"video":case"audio":for(p=0;p<la.length;p++)qt(la[p],u);break;case"source":qt("error",u);break;case"img":case"image":case"link":qt("error",u),qt("load",u);break;case"details":qt("toggle",u);break;case"input":Le(u,x),qt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!x.multiple},qt("invalid",u);break;case"textarea":Pt(u,x),qt("invalid",u)}Ve(a,x),p=null;for(var b in x)if(x.hasOwnProperty(b)){var F=x[b];b==="children"?typeof F=="string"?u.textContent!==F&&(x.suppressHydrationWarning!==!0&&gl(u.textContent,F,n),p=["children",F]):typeof F=="number"&&u.textContent!==""+F&&(x.suppressHydrationWarning!==!0&&gl(u.textContent,F,n),p=["children",""+F]):o.hasOwnProperty(b)&&F!=null&&b==="onScroll"&&qt("scroll",u)}switch(a){case"input":nt(u),At(u,x,!0);break;case"textarea":nt(u),Ut(u);break;case"select":case"option":break;default:typeof x.onClick=="function"&&(u.onclick=vl)}u=p,r.updateQueue=u,u!==null&&(r.flags|=4)}else{b=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=D(a)),n==="http://www.w3.org/1999/xhtml"?a==="script"?(n=b.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=b.createElement(a,{is:u.is}):(n=b.createElement(a),a==="select"&&(b=n,u.multiple?b.multiple=!0:u.size&&(b.size=u.size))):n=b.createElementNS(n,a),n[Gi]=r,n[da]=u,Sg(n,r,!1,!1),r.stateNode=n;e:{switch(b=Ce(a,u),a){case"dialog":qt("cancel",n),qt("close",n),p=u;break;case"iframe":case"object":case"embed":qt("load",n),p=u;break;case"video":case"audio":for(p=0;p<la.length;p++)qt(la[p],n);p=u;break;case"source":qt("error",n),p=u;break;case"img":case"image":case"link":qt("error",n),qt("load",n),p=u;break;case"details":qt("toggle",n),p=u;break;case"input":Le(n,u),p=bt(n,u),qt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=le({},u,{value:void 0}),qt("invalid",n);break;case"textarea":Pt(n,u),p=ct(n,u),qt("invalid",n);break;default:p=u}Ve(a,p),F=p;for(x in F)if(F.hasOwnProperty(x)){var H=F[x];x==="style"?me(n,H):x==="dangerouslySetInnerHTML"?(H=H?H.__html:void 0,H!=null&&pe(n,H)):x==="children"?typeof H=="string"?(a!=="textarea"||H!=="")&&xe(n,H):typeof H=="number"&&xe(n,""+H):x!=="suppressContentEditableWarning"&&x!=="suppressHydrationWarning"&&x!=="autoFocus"&&(o.hasOwnProperty(x)?H!=null&&x==="onScroll"&&qt("scroll",n):H!=null&&L(n,x,H,b))}switch(a){case"input":nt(n),At(n,u,!1);break;case"textarea":nt(n),Ut(n);break;case"option":u.value!=null&&n.setAttribute("value",""+fe(u.value));break;case"select":n.multiple=!!u.multiple,x=u.value,x!=null?It(n,!!u.multiple,x,!1):u.defaultValue!=null&&It(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=vl)}switch(a){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(r.flags|=4)}r.ref!==null&&(r.flags|=512,r.flags|=2097152)}return Un(r),null;case 6:if(n&&r.stateNode!=null)Mg(n,r,n.memoizedProps,u);else{if(typeof u!="string"&&r.stateNode===null)throw Error(t(166));if(a=xs(ga.current),xs(ji.current),wl(r)){if(u=r.stateNode,a=r.memoizedProps,u[Gi]=r,(x=u.nodeValue!==a)&&(n=ui,n!==null))switch(n.tag){case 3:gl(u.nodeValue,a,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&gl(u.nodeValue,a,(n.mode&1)!==0)}x&&(r.flags|=4)}else u=(a.nodeType===9?a:a.ownerDocument).createTextNode(u),u[Gi]=r,r.stateNode=u}return Un(r),null;case 13:if(Kt(en),u=r.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(Jt&&di!==null&&(r.mode&1)!==0&&(r.flags&128)===0)Tm(),no(),r.flags|=98560,x=!1;else if(x=wl(r),u!==null&&u.dehydrated!==null){if(n===null){if(!x)throw Error(t(318));if(x=r.memoizedState,x=x!==null?x.dehydrated:null,!x)throw Error(t(317));x[Gi]=r}else no(),(r.flags&128)===0&&(r.memoizedState=null),r.flags|=4;Un(r),x=!1}else Ri!==null&&(Gd(Ri),Ri=null),x=!0;if(!x)return r.flags&65536?r:null}return(r.flags&128)!==0?(r.lanes=a,r):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(r.child.flags|=8192,(r.mode&1)!==0&&(n===null||(en.current&1)!==0?gn===0&&(gn=3):Xd())),r.updateQueue!==null&&(r.flags|=4),Un(r),null);case 4:return oo(),Ld(n,r),n===null&&ca(r.stateNode.containerInfo),Un(r),null;case 10:return od(r.type._context),Un(r),null;case 17:return Jn(r.type)&&xl(),Un(r),null;case 19:if(Kt(en),x=r.memoizedState,x===null)return Un(r),null;if(u=(r.flags&128)!==0,b=x.rendering,b===null)if(u)ya(x,!1);else{if(gn!==0||n!==null&&(n.flags&128)!==0)for(n=r.child;n!==null;){if(b=Pl(n),b!==null){for(r.flags|=128,ya(x,!1),u=b.updateQueue,u!==null&&(r.updateQueue=u,r.flags|=4),r.subtreeFlags=0,u=a,a=r.child;a!==null;)x=a,n=u,x.flags&=14680066,b=x.alternate,b===null?(x.childLanes=0,x.lanes=n,x.child=null,x.subtreeFlags=0,x.memoizedProps=null,x.memoizedState=null,x.updateQueue=null,x.dependencies=null,x.stateNode=null):(x.childLanes=b.childLanes,x.lanes=b.lanes,x.child=b.child,x.subtreeFlags=0,x.deletions=null,x.memoizedProps=b.memoizedProps,x.memoizedState=b.memoizedState,x.updateQueue=b.updateQueue,x.type=b.type,n=b.dependencies,x.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),a=a.sibling;return $t(en,en.current&1|2),r.child}n=n.sibling}x.tail!==null&&Qt()>uo&&(r.flags|=128,u=!0,ya(x,!1),r.lanes=4194304)}else{if(!u)if(n=Pl(b),n!==null){if(r.flags|=128,u=!0,a=n.updateQueue,a!==null&&(r.updateQueue=a,r.flags|=4),ya(x,!0),x.tail===null&&x.tailMode==="hidden"&&!b.alternate&&!Jt)return Un(r),null}else 2*Qt()-x.renderingStartTime>uo&&a!==1073741824&&(r.flags|=128,u=!0,ya(x,!1),r.lanes=4194304);x.isBackwards?(b.sibling=r.child,r.child=b):(a=x.last,a!==null?a.sibling=b:r.child=b,x.last=b)}return x.tail!==null?(r=x.tail,x.rendering=r,x.tail=r.sibling,x.renderingStartTime=Qt(),r.sibling=null,a=en.current,$t(en,u?a&1|2:a&1),r):(Un(r),null);case 22:case 23:return Wd(),u=r.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(r.flags|=8192),u&&(r.mode&1)!==0?(hi&1073741824)!==0&&(Un(r),r.subtreeFlags&6&&(r.flags|=8192)):Un(r),null;case 24:return null;case 25:return null}throw Error(t(156,r.tag))}function dS(n,r){switch(ed(r),r.tag){case 1:return Jn(r.type)&&xl(),n=r.flags,n&65536?(r.flags=n&-65537|128,r):null;case 3:return oo(),Kt(Zn),Kt(Nn),fd(),n=r.flags,(n&65536)!==0&&(n&128)===0?(r.flags=n&-65537|128,r):null;case 5:return dd(r),null;case 13:if(Kt(en),n=r.memoizedState,n!==null&&n.dehydrated!==null){if(r.alternate===null)throw Error(t(340));no()}return n=r.flags,n&65536?(r.flags=n&-65537|128,r):null;case 19:return Kt(en),null;case 4:return oo(),null;case 10:return od(r.type._context),null;case 22:case 23:return Wd(),null;case 24:return null;default:return null}}var Bl=!1,Fn=!1,hS=typeof WeakSet=="function"?WeakSet:Set,$e=null;function lo(n,r){var a=n.ref;if(a!==null)if(typeof a=="function")try{a(null)}catch(u){sn(n,r,u)}else a.current=null}function Nd(n,r,a){try{a()}catch(u){sn(n,r,u)}}var Eg=!1;function fS(n,r){if(Wu=sl,n=tm(),Ou(n)){if("selectionStart"in n)var a={start:n.selectionStart,end:n.selectionEnd};else e:{a=(a=n.ownerDocument)&&a.defaultView||window;var u=a.getSelection&&a.getSelection();if(u&&u.rangeCount!==0){a=u.anchorNode;var p=u.anchorOffset,x=u.focusNode;u=u.focusOffset;try{a.nodeType,x.nodeType}catch{a=null;break e}var b=0,F=-1,H=-1,ce=0,Me=0,Ee=n,ye=null;t:for(;;){for(var je;Ee!==a||p!==0&&Ee.nodeType!==3||(F=b+p),Ee!==x||u!==0&&Ee.nodeType!==3||(H=b+u),Ee.nodeType===3&&(b+=Ee.nodeValue.length),(je=Ee.firstChild)!==null;)ye=Ee,Ee=je;for(;;){if(Ee===n)break t;if(ye===a&&++ce===p&&(F=b),ye===x&&++Me===u&&(H=b),(je=Ee.nextSibling)!==null)break;Ee=ye,ye=Ee.parentNode}Ee=je}a=F===-1||H===-1?null:{start:F,end:H}}else a=null}a=a||{start:0,end:0}}else a=null;for(Xu={focusedElem:n,selectionRange:a},sl=!1,$e=r;$e!==null;)if(r=$e,n=r.child,(r.subtreeFlags&1028)!==0&&n!==null)n.return=r,$e=n;else for(;$e!==null;){r=$e;try{var Ye=r.alternate;if((r.flags&1024)!==0)switch(r.tag){case 0:case 11:case 15:break;case 1:if(Ye!==null){var Je=Ye.memoizedProps,ln=Ye.memoizedState,ee=r.stateNode,W=ee.getSnapshotBeforeUpdate(r.elementType===r.type?Je:Pi(r.type,Je),ln);ee.__reactInternalSnapshotBeforeUpdate=W}break;case 3:var se=r.stateNode.containerInfo;se.nodeType===1?se.textContent="":se.nodeType===9&&se.documentElement&&se.removeChild(se.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(be){sn(r,r.return,be)}if(n=r.sibling,n!==null){n.return=r.return,$e=n;break}$e=r.return}return Ye=Eg,Eg=!1,Ye}function Ma(n,r,a){var u=r.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var x=p.destroy;p.destroy=void 0,x!==void 0&&Nd(r,a,x)}p=p.next}while(p!==u)}}function zl(n,r){if(r=r.updateQueue,r=r!==null?r.lastEffect:null,r!==null){var a=r=r.next;do{if((a.tag&n)===n){var u=a.create;a.destroy=u()}a=a.next}while(a!==r)}}function Id(n){var r=n.ref;if(r!==null){var a=n.stateNode;switch(n.tag){case 5:n=a;break;default:n=a}typeof r=="function"?r(n):r.current=n}}function wg(n){var r=n.alternate;r!==null&&(n.alternate=null,wg(r)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(r=n.stateNode,r!==null&&(delete r[Gi],delete r[da],delete r[Ku],delete r[qx],delete r[Kx])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function Tg(n){return n.tag===5||n.tag===3||n.tag===4}function bg(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||Tg(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Ud(n,r,a){var u=n.tag;if(u===5||u===6)n=n.stateNode,r?a.nodeType===8?a.parentNode.insertBefore(n,r):a.insertBefore(n,r):(a.nodeType===8?(r=a.parentNode,r.insertBefore(n,a)):(r=a,r.appendChild(n)),a=a._reactRootContainer,a!=null||r.onclick!==null||(r.onclick=vl));else if(u!==4&&(n=n.child,n!==null))for(Ud(n,r,a),n=n.sibling;n!==null;)Ud(n,r,a),n=n.sibling}function Fd(n,r,a){var u=n.tag;if(u===5||u===6)n=n.stateNode,r?a.insertBefore(n,r):a.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Fd(n,r,a),n=n.sibling;n!==null;)Fd(n,r,a),n=n.sibling}var Cn=null,Di=!1;function jr(n,r,a){for(a=a.child;a!==null;)Ag(n,r,a),a=a.sibling}function Ag(n,r,a){if(Ne&&typeof Ne.onCommitFiberUnmount=="function")try{Ne.onCommitFiberUnmount(te,a)}catch{}switch(a.tag){case 5:Fn||lo(a,r);case 6:var u=Cn,p=Di;Cn=null,jr(n,r,a),Cn=u,Di=p,Cn!==null&&(Di?(n=Cn,a=a.stateNode,n.nodeType===8?n.parentNode.removeChild(a):n.removeChild(a)):Cn.removeChild(a.stateNode));break;case 18:Cn!==null&&(Di?(n=Cn,a=a.stateNode,n.nodeType===8?qu(n.parentNode,a):n.nodeType===1&&qu(n,a),ea(n)):qu(Cn,a.stateNode));break;case 4:u=Cn,p=Di,Cn=a.stateNode.containerInfo,Di=!0,jr(n,r,a),Cn=u,Di=p;break;case 0:case 11:case 14:case 15:if(!Fn&&(u=a.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var x=p,b=x.destroy;x=x.tag,b!==void 0&&((x&2)!==0||(x&4)!==0)&&Nd(a,r,b),p=p.next}while(p!==u)}jr(n,r,a);break;case 1:if(!Fn&&(lo(a,r),u=a.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=a.memoizedProps,u.state=a.memoizedState,u.componentWillUnmount()}catch(F){sn(a,r,F)}jr(n,r,a);break;case 21:jr(n,r,a);break;case 22:a.mode&1?(Fn=(u=Fn)||a.memoizedState!==null,jr(n,r,a),Fn=u):jr(n,r,a);break;default:jr(n,r,a)}}function Cg(n){var r=n.updateQueue;if(r!==null){n.updateQueue=null;var a=n.stateNode;a===null&&(a=n.stateNode=new hS),r.forEach(function(u){var p=MS.bind(null,n,u);a.has(u)||(a.add(u),u.then(p,p))})}}function Li(n,r){var a=r.deletions;if(a!==null)for(var u=0;u<a.length;u++){var p=a[u];try{var x=n,b=r,F=b;e:for(;F!==null;){switch(F.tag){case 5:Cn=F.stateNode,Di=!1;break e;case 3:Cn=F.stateNode.containerInfo,Di=!0;break e;case 4:Cn=F.stateNode.containerInfo,Di=!0;break e}F=F.return}if(Cn===null)throw Error(t(160));Ag(x,b,p),Cn=null,Di=!1;var H=p.alternate;H!==null&&(H.return=null),p.return=null}catch(ce){sn(p,r,ce)}}if(r.subtreeFlags&12854)for(r=r.child;r!==null;)Rg(r,n),r=r.sibling}function Rg(n,r){var a=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Li(r,n),Xi(n),u&4){try{Ma(3,n,n.return),zl(3,n)}catch(Je){sn(n,n.return,Je)}try{Ma(5,n,n.return)}catch(Je){sn(n,n.return,Je)}}break;case 1:Li(r,n),Xi(n),u&512&&a!==null&&lo(a,a.return);break;case 5:if(Li(r,n),Xi(n),u&512&&a!==null&&lo(a,a.return),n.flags&32){var p=n.stateNode;try{xe(p,"")}catch(Je){sn(n,n.return,Je)}}if(u&4&&(p=n.stateNode,p!=null)){var x=n.memoizedProps,b=a!==null?a.memoizedProps:x,F=n.type,H=n.updateQueue;if(n.updateQueue=null,H!==null)try{F==="input"&&x.type==="radio"&&x.name!=null&&We(p,x),Ce(F,b);var ce=Ce(F,x);for(b=0;b<H.length;b+=2){var Me=H[b],Ee=H[b+1];Me==="style"?me(p,Ee):Me==="dangerouslySetInnerHTML"?pe(p,Ee):Me==="children"?xe(p,Ee):L(p,Me,Ee,ce)}switch(F){case"input":vt(p,x);break;case"textarea":Ie(p,x);break;case"select":var ye=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!x.multiple;var je=x.value;je!=null?It(p,!!x.multiple,je,!1):ye!==!!x.multiple&&(x.defaultValue!=null?It(p,!!x.multiple,x.defaultValue,!0):It(p,!!x.multiple,x.multiple?[]:"",!1))}p[da]=x}catch(Je){sn(n,n.return,Je)}}break;case 6:if(Li(r,n),Xi(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,x=n.memoizedProps;try{p.nodeValue=x}catch(Je){sn(n,n.return,Je)}}break;case 3:if(Li(r,n),Xi(n),u&4&&a!==null&&a.memoizedState.isDehydrated)try{ea(r.containerInfo)}catch(Je){sn(n,n.return,Je)}break;case 4:Li(r,n),Xi(n);break;case 13:Li(r,n),Xi(n),p=n.child,p.flags&8192&&(x=p.memoizedState!==null,p.stateNode.isHidden=x,!x||p.alternate!==null&&p.alternate.memoizedState!==null||(Bd=Qt())),u&4&&Cg(n);break;case 22:if(Me=a!==null&&a.memoizedState!==null,n.mode&1?(Fn=(ce=Fn)||Me,Li(r,n),Fn=ce):Li(r,n),Xi(n),u&8192){if(ce=n.memoizedState!==null,(n.stateNode.isHidden=ce)&&!Me&&(n.mode&1)!==0)for($e=n,Me=n.child;Me!==null;){for(Ee=$e=Me;$e!==null;){switch(ye=$e,je=ye.child,ye.tag){case 0:case 11:case 14:case 15:Ma(4,ye,ye.return);break;case 1:lo(ye,ye.return);var Ye=ye.stateNode;if(typeof Ye.componentWillUnmount=="function"){u=ye,a=ye.return;try{r=u,Ye.props=r.memoizedProps,Ye.state=r.memoizedState,Ye.componentWillUnmount()}catch(Je){sn(u,a,Je)}}break;case 5:lo(ye,ye.return);break;case 22:if(ye.memoizedState!==null){Lg(Ee);continue}}je!==null?(je.return=ye,$e=je):Lg(Ee)}Me=Me.sibling}e:for(Me=null,Ee=n;;){if(Ee.tag===5){if(Me===null){Me=Ee;try{p=Ee.stateNode,ce?(x=p.style,typeof x.setProperty=="function"?x.setProperty("display","none","important"):x.display="none"):(F=Ee.stateNode,H=Ee.memoizedProps.style,b=H!=null&&H.hasOwnProperty("display")?H.display:null,F.style.display=de("display",b))}catch(Je){sn(n,n.return,Je)}}}else if(Ee.tag===6){if(Me===null)try{Ee.stateNode.nodeValue=ce?"":Ee.memoizedProps}catch(Je){sn(n,n.return,Je)}}else if((Ee.tag!==22&&Ee.tag!==23||Ee.memoizedState===null||Ee===n)&&Ee.child!==null){Ee.child.return=Ee,Ee=Ee.child;continue}if(Ee===n)break e;for(;Ee.sibling===null;){if(Ee.return===null||Ee.return===n)break e;Me===Ee&&(Me=null),Ee=Ee.return}Me===Ee&&(Me=null),Ee.sibling.return=Ee.return,Ee=Ee.sibling}}break;case 19:Li(r,n),Xi(n),u&4&&Cg(n);break;case 21:break;default:Li(r,n),Xi(n)}}function Xi(n){var r=n.flags;if(r&2){try{e:{for(var a=n.return;a!==null;){if(Tg(a)){var u=a;break e}a=a.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(xe(p,""),u.flags&=-33);var x=bg(n);Fd(n,x,p);break;case 3:case 4:var b=u.stateNode.containerInfo,F=bg(n);Ud(n,F,b);break;default:throw Error(t(161))}}catch(H){sn(n,n.return,H)}n.flags&=-3}r&4096&&(n.flags&=-4097)}function pS(n,r,a){$e=n,Pg(n)}function Pg(n,r,a){for(var u=(n.mode&1)!==0;$e!==null;){var p=$e,x=p.child;if(p.tag===22&&u){var b=p.memoizedState!==null||Bl;if(!b){var F=p.alternate,H=F!==null&&F.memoizedState!==null||Fn;F=Bl;var ce=Fn;if(Bl=b,(Fn=H)&&!ce)for($e=p;$e!==null;)b=$e,H=b.child,b.tag===22&&b.memoizedState!==null?Ng(p):H!==null?(H.return=b,$e=H):Ng(p);for(;x!==null;)$e=x,Pg(x),x=x.sibling;$e=p,Bl=F,Fn=ce}Dg(n)}else(p.subtreeFlags&8772)!==0&&x!==null?(x.return=p,$e=x):Dg(n)}}function Dg(n){for(;$e!==null;){var r=$e;if((r.flags&8772)!==0){var a=r.alternate;try{if((r.flags&8772)!==0)switch(r.tag){case 0:case 11:case 15:Fn||zl(5,r);break;case 1:var u=r.stateNode;if(r.flags&4&&!Fn)if(a===null)u.componentDidMount();else{var p=r.elementType===r.type?a.memoizedProps:Pi(r.type,a.memoizedProps);u.componentDidUpdate(p,a.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var x=r.updateQueue;x!==null&&Lm(r,x,u);break;case 3:var b=r.updateQueue;if(b!==null){if(a=null,r.child!==null)switch(r.child.tag){case 5:a=r.child.stateNode;break;case 1:a=r.child.stateNode}Lm(r,b,a)}break;case 5:var F=r.stateNode;if(a===null&&r.flags&4){a=F;var H=r.memoizedProps;switch(r.type){case"button":case"input":case"select":case"textarea":H.autoFocus&&a.focus();break;case"img":H.src&&(a.src=H.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(r.memoizedState===null){var ce=r.alternate;if(ce!==null){var Me=ce.memoizedState;if(Me!==null){var Ee=Me.dehydrated;Ee!==null&&ea(Ee)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Fn||r.flags&512&&Id(r)}catch(ye){sn(r,r.return,ye)}}if(r===n){$e=null;break}if(a=r.sibling,a!==null){a.return=r.return,$e=a;break}$e=r.return}}function Lg(n){for(;$e!==null;){var r=$e;if(r===n){$e=null;break}var a=r.sibling;if(a!==null){a.return=r.return,$e=a;break}$e=r.return}}function Ng(n){for(;$e!==null;){var r=$e;try{switch(r.tag){case 0:case 11:case 15:var a=r.return;try{zl(4,r)}catch(H){sn(r,a,H)}break;case 1:var u=r.stateNode;if(typeof u.componentDidMount=="function"){var p=r.return;try{u.componentDidMount()}catch(H){sn(r,p,H)}}var x=r.return;try{Id(r)}catch(H){sn(r,x,H)}break;case 5:var b=r.return;try{Id(r)}catch(H){sn(r,b,H)}}}catch(H){sn(r,r.return,H)}if(r===n){$e=null;break}var F=r.sibling;if(F!==null){F.return=r.return,$e=F;break}$e=r.return}}var mS=Math.ceil,Hl=P.ReactCurrentDispatcher,Od=P.ReactCurrentOwner,Mi=P.ReactCurrentBatchConfig,Dt=0,Mn=null,hn=null,Rn=0,hi=0,co=Br(0),gn=0,Ea=null,ys=0,Vl=0,kd=0,wa=null,ei=null,Bd=0,uo=1/0,xr=null,Gl=!1,zd=null,Wr=null,jl=!1,Xr=null,Wl=0,Ta=0,Hd=null,Xl=-1,$l=0;function Gn(){return(Dt&6)!==0?Qt():Xl!==-1?Xl:Xl=Qt()}function $r(n){return(n.mode&1)===0?1:(Dt&2)!==0&&Rn!==0?Rn&-Rn:Jx.transition!==null?($l===0&&($l=Ge()),$l):(n=yt,n!==0||(n=window.event,n=n===void 0?16:Up(n.type)),n)}function Ni(n,r,a,u){if(50<Ta)throw Ta=0,Hd=null,Error(t(185));St(n,a,u),((Dt&2)===0||n!==Mn)&&(n===Mn&&((Dt&2)===0&&(Vl|=a),gn===4&&Yr(n,Rn)),ti(n,u),a===1&&Dt===0&&(r.mode&1)===0&&(uo=Qt()+500,yl&&Hr()))}function ti(n,r){var a=n.callbackNode;kt(n,r);var u=Xt(n,n===Mn?Rn:0);if(u===0)a!==null&&il(a),n.callbackNode=null,n.callbackPriority=0;else if(r=u&-u,n.callbackPriority!==r){if(a!=null&&il(a),r===1)n.tag===0?Zx(Ug.bind(null,n)):Sm(Ug.bind(null,n)),$x(function(){(Dt&6)===0&&Hr()}),a=null;else{switch(dr(u)){case 1:a=qo;break;case 4:a=R;break;case 16:a=$;break;case 536870912:a=ne;break;default:a=$}a=Gg(a,Ig.bind(null,n))}n.callbackPriority=r,n.callbackNode=a}}function Ig(n,r){if(Xl=-1,$l=0,(Dt&6)!==0)throw Error(t(327));var a=n.callbackNode;if(ho()&&n.callbackNode!==a)return null;var u=Xt(n,n===Mn?Rn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||r)r=Yl(n,u);else{r=u;var p=Dt;Dt|=2;var x=Og();(Mn!==n||Rn!==r)&&(xr=null,uo=Qt()+500,Es(n,r));do try{_S();break}catch(F){Fg(n,F)}while(!0);sd(),Hl.current=x,Dt=p,hn!==null?r=0:(Mn=null,Rn=0,r=gn)}if(r!==0){if(r===2&&(p=dn(n),p!==0&&(u=p,r=Vd(n,p))),r===1)throw a=Ea,Es(n,0),Yr(n,u),ti(n,Qt()),a;if(r===6)Yr(n,u);else{if(p=n.current.alternate,(u&30)===0&&!gS(p)&&(r=Yl(n,u),r===2&&(x=dn(n),x!==0&&(u=x,r=Vd(n,x))),r===1))throw a=Ea,Es(n,0),Yr(n,u),ti(n,Qt()),a;switch(n.finishedWork=p,n.finishedLanes=u,r){case 0:case 1:throw Error(t(345));case 2:ws(n,ei,xr);break;case 3:if(Yr(n,u),(u&130023424)===u&&(r=Bd+500-Qt(),10<r)){if(Xt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){Gn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=Yu(ws.bind(null,n,ei,xr),r);break}ws(n,ei,xr);break;case 4:if(Yr(n,u),(u&4194240)===u)break;for(r=n.eventTimes,p=-1;0<u;){var b=31-Re(u);x=1<<b,b=r[b],b>p&&(p=b),u&=~x}if(u=p,u=Qt()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*mS(u/1960))-u,10<u){n.timeoutHandle=Yu(ws.bind(null,n,ei,xr),u);break}ws(n,ei,xr);break;case 5:ws(n,ei,xr);break;default:throw Error(t(329))}}}return ti(n,Qt()),n.callbackNode===a?Ig.bind(null,n):null}function Vd(n,r){var a=wa;return n.current.memoizedState.isDehydrated&&(Es(n,r).flags|=256),n=Yl(n,r),n!==2&&(r=ei,ei=a,r!==null&&Gd(r)),n}function Gd(n){ei===null?ei=n:ei.push.apply(ei,n)}function gS(n){for(var r=n;;){if(r.flags&16384){var a=r.updateQueue;if(a!==null&&(a=a.stores,a!==null))for(var u=0;u<a.length;u++){var p=a[u],x=p.getSnapshot;p=p.value;try{if(!Ci(x(),p))return!1}catch{return!1}}}if(a=r.child,r.subtreeFlags&16384&&a!==null)a.return=r,r=a;else{if(r===n)break;for(;r.sibling===null;){if(r.return===null||r.return===n)return!0;r=r.return}r.sibling.return=r.return,r=r.sibling}}return!0}function Yr(n,r){for(r&=~kd,r&=~Vl,n.suspendedLanes|=r,n.pingedLanes&=~r,n=n.expirationTimes;0<r;){var a=31-Re(r),u=1<<a;n[a]=-1,r&=~u}}function Ug(n){if((Dt&6)!==0)throw Error(t(327));ho();var r=Xt(n,0);if((r&1)===0)return ti(n,Qt()),null;var a=Yl(n,r);if(n.tag!==0&&a===2){var u=dn(n);u!==0&&(r=u,a=Vd(n,u))}if(a===1)throw a=Ea,Es(n,0),Yr(n,r),ti(n,Qt()),a;if(a===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=r,ws(n,ei,xr),ti(n,Qt()),null}function jd(n,r){var a=Dt;Dt|=1;try{return n(r)}finally{Dt=a,Dt===0&&(uo=Qt()+500,yl&&Hr())}}function Ms(n){Xr!==null&&Xr.tag===0&&(Dt&6)===0&&ho();var r=Dt;Dt|=1;var a=Mi.transition,u=yt;try{if(Mi.transition=null,yt=1,n)return n()}finally{yt=u,Mi.transition=a,Dt=r,(Dt&6)===0&&Hr()}}function Wd(){hi=co.current,Kt(co)}function Es(n,r){n.finishedWork=null,n.finishedLanes=0;var a=n.timeoutHandle;if(a!==-1&&(n.timeoutHandle=-1,Xx(a)),hn!==null)for(a=hn.return;a!==null;){var u=a;switch(ed(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&xl();break;case 3:oo(),Kt(Zn),Kt(Nn),fd();break;case 5:dd(u);break;case 4:oo();break;case 13:Kt(en);break;case 19:Kt(en);break;case 10:od(u.type._context);break;case 22:case 23:Wd()}a=a.return}if(Mn=n,hn=n=qr(n.current,null),Rn=hi=r,gn=0,Ea=null,kd=Vl=ys=0,ei=wa=null,_s!==null){for(r=0;r<_s.length;r++)if(a=_s[r],u=a.interleaved,u!==null){a.interleaved=null;var p=u.next,x=a.pending;if(x!==null){var b=x.next;x.next=p,u.next=b}a.pending=u}_s=null}return n}function Fg(n,r){do{var a=hn;try{if(sd(),Dl.current=Ul,Ll){for(var u=tn.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}Ll=!1}if(Ss=0,yn=mn=tn=null,va=!1,_a=0,Od.current=null,a===null||a.return===null){gn=1,Ea=r,hn=null;break}e:{var x=n,b=a.return,F=a,H=r;if(r=Rn,F.flags|=32768,H!==null&&typeof H=="object"&&typeof H.then=="function"){var ce=H,Me=F,Ee=Me.tag;if((Me.mode&1)===0&&(Ee===0||Ee===11||Ee===15)){var ye=Me.alternate;ye?(Me.updateQueue=ye.updateQueue,Me.memoizedState=ye.memoizedState,Me.lanes=ye.lanes):(Me.updateQueue=null,Me.memoizedState=null)}var je=ag(b);if(je!==null){je.flags&=-257,lg(je,b,F,x,r),je.mode&1&&og(x,ce,r),r=je,H=ce;var Ye=r.updateQueue;if(Ye===null){var Je=new Set;Je.add(H),r.updateQueue=Je}else Ye.add(H);break e}else{if((r&1)===0){og(x,ce,r),Xd();break e}H=Error(t(426))}}else if(Jt&&F.mode&1){var ln=ag(b);if(ln!==null){(ln.flags&65536)===0&&(ln.flags|=256),lg(ln,b,F,x,r),id(ao(H,F));break e}}x=H=ao(H,F),gn!==4&&(gn=2),wa===null?wa=[x]:wa.push(x),x=b;do{switch(x.tag){case 3:x.flags|=65536,r&=-r,x.lanes|=r;var ee=rg(x,H,r);Dm(x,ee);break e;case 1:F=H;var W=x.type,se=x.stateNode;if((x.flags&128)===0&&(typeof W.getDerivedStateFromError=="function"||se!==null&&typeof se.componentDidCatch=="function"&&(Wr===null||!Wr.has(se)))){x.flags|=65536,r&=-r,x.lanes|=r;var be=sg(x,F,r);Dm(x,be);break e}}x=x.return}while(x!==null)}Bg(a)}catch(et){r=et,hn===a&&a!==null&&(hn=a=a.return);continue}break}while(!0)}function Og(){var n=Hl.current;return Hl.current=Ul,n===null?Ul:n}function Xd(){(gn===0||gn===3||gn===2)&&(gn=4),Mn===null||(ys&268435455)===0&&(Vl&268435455)===0||Yr(Mn,Rn)}function Yl(n,r){var a=Dt;Dt|=2;var u=Og();(Mn!==n||Rn!==r)&&(xr=null,Es(n,r));do try{vS();break}catch(p){Fg(n,p)}while(!0);if(sd(),Dt=a,Hl.current=u,hn!==null)throw Error(t(261));return Mn=null,Rn=0,gn}function vS(){for(;hn!==null;)kg(hn)}function _S(){for(;hn!==null&&!Eu();)kg(hn)}function kg(n){var r=Vg(n.alternate,n,hi);n.memoizedProps=n.pendingProps,r===null?Bg(n):hn=r,Od.current=null}function Bg(n){var r=n;do{var a=r.alternate;if(n=r.return,(r.flags&32768)===0){if(a=uS(a,r,hi),a!==null){hn=a;return}}else{if(a=dS(a,r),a!==null){a.flags&=32767,hn=a;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{gn=6,hn=null;return}}if(r=r.sibling,r!==null){hn=r;return}hn=r=n}while(r!==null);gn===0&&(gn=5)}function ws(n,r,a){var u=yt,p=Mi.transition;try{Mi.transition=null,yt=1,xS(n,r,a,u)}finally{Mi.transition=p,yt=u}return null}function xS(n,r,a,u){do ho();while(Xr!==null);if((Dt&6)!==0)throw Error(t(327));a=n.finishedWork;var p=n.finishedLanes;if(a===null)return null;if(n.finishedWork=null,n.finishedLanes=0,a===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var x=a.lanes|a.childLanes;if(qn(n,x),n===Mn&&(hn=Mn=null,Rn=0),(a.subtreeFlags&2064)===0&&(a.flags&2064)===0||jl||(jl=!0,Gg($,function(){return ho(),null})),x=(a.flags&15990)!==0,(a.subtreeFlags&15990)!==0||x){x=Mi.transition,Mi.transition=null;var b=yt;yt=1;var F=Dt;Dt|=4,Od.current=null,fS(n,a),Rg(a,n),Bx(Xu),sl=!!Wu,Xu=Wu=null,n.current=a,pS(a),wu(),Dt=F,yt=b,Mi.transition=x}else n.current=a;if(jl&&(jl=!1,Xr=n,Wl=p),x=n.pendingLanes,x===0&&(Wr=null),Xe(a.stateNode),ti(n,Qt()),r!==null)for(u=n.onRecoverableError,a=0;a<r.length;a++)p=r[a],u(p.value,{componentStack:p.stack,digest:p.digest});if(Gl)throw Gl=!1,n=zd,zd=null,n;return(Wl&1)!==0&&n.tag!==0&&ho(),x=n.pendingLanes,(x&1)!==0?n===Hd?Ta++:(Ta=0,Hd=n):Ta=0,Hr(),null}function ho(){if(Xr!==null){var n=dr(Wl),r=Mi.transition,a=yt;try{if(Mi.transition=null,yt=16>n?16:n,Xr===null)var u=!1;else{if(n=Xr,Xr=null,Wl=0,(Dt&6)!==0)throw Error(t(331));var p=Dt;for(Dt|=4,$e=n.current;$e!==null;){var x=$e,b=x.child;if(($e.flags&16)!==0){var F=x.deletions;if(F!==null){for(var H=0;H<F.length;H++){var ce=F[H];for($e=ce;$e!==null;){var Me=$e;switch(Me.tag){case 0:case 11:case 15:Ma(8,Me,x)}var Ee=Me.child;if(Ee!==null)Ee.return=Me,$e=Ee;else for(;$e!==null;){Me=$e;var ye=Me.sibling,je=Me.return;if(wg(Me),Me===ce){$e=null;break}if(ye!==null){ye.return=je,$e=ye;break}$e=je}}}var Ye=x.alternate;if(Ye!==null){var Je=Ye.child;if(Je!==null){Ye.child=null;do{var ln=Je.sibling;Je.sibling=null,Je=ln}while(Je!==null)}}$e=x}}if((x.subtreeFlags&2064)!==0&&b!==null)b.return=x,$e=b;else e:for(;$e!==null;){if(x=$e,(x.flags&2048)!==0)switch(x.tag){case 0:case 11:case 15:Ma(9,x,x.return)}var ee=x.sibling;if(ee!==null){ee.return=x.return,$e=ee;break e}$e=x.return}}var W=n.current;for($e=W;$e!==null;){b=$e;var se=b.child;if((b.subtreeFlags&2064)!==0&&se!==null)se.return=b,$e=se;else e:for(b=W;$e!==null;){if(F=$e,(F.flags&2048)!==0)try{switch(F.tag){case 0:case 11:case 15:zl(9,F)}}catch(et){sn(F,F.return,et)}if(F===b){$e=null;break e}var be=F.sibling;if(be!==null){be.return=F.return,$e=be;break e}$e=F.return}}if(Dt=p,Hr(),Ne&&typeof Ne.onPostCommitFiberRoot=="function")try{Ne.onPostCommitFiberRoot(te,n)}catch{}u=!0}return u}finally{yt=a,Mi.transition=r}}return!1}function zg(n,r,a){r=ao(a,r),r=rg(n,r,1),n=Gr(n,r,1),r=Gn(),n!==null&&(St(n,1,r),ti(n,r))}function sn(n,r,a){if(n.tag===3)zg(n,n,a);else for(;r!==null;){if(r.tag===3){zg(r,n,a);break}else if(r.tag===1){var u=r.stateNode;if(typeof r.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(Wr===null||!Wr.has(u))){n=ao(a,n),n=sg(r,n,1),r=Gr(r,n,1),n=Gn(),r!==null&&(St(r,1,n),ti(r,n));break}}r=r.return}}function SS(n,r,a){var u=n.pingCache;u!==null&&u.delete(r),r=Gn(),n.pingedLanes|=n.suspendedLanes&a,Mn===n&&(Rn&a)===a&&(gn===4||gn===3&&(Rn&130023424)===Rn&&500>Qt()-Bd?Es(n,0):kd|=a),ti(n,r)}function Hg(n,r){r===0&&((n.mode&1)===0?r=1:(r=Qe,Qe<<=1,(Qe&130023424)===0&&(Qe=4194304)));var a=Gn();n=gr(n,r),n!==null&&(St(n,r,a),ti(n,a))}function yS(n){var r=n.memoizedState,a=0;r!==null&&(a=r.retryLane),Hg(n,a)}function MS(n,r){var a=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(a=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(r),Hg(n,a)}var Vg;Vg=function(n,r,a){if(n!==null)if(n.memoizedProps!==r.pendingProps||Zn.current)Qn=!0;else{if((n.lanes&a)===0&&(r.flags&128)===0)return Qn=!1,cS(n,r,a);Qn=(n.flags&131072)!==0}else Qn=!1,Jt&&(r.flags&1048576)!==0&&ym(r,El,r.index);switch(r.lanes=0,r.tag){case 2:var u=r.type;kl(n,r),n=r.pendingProps;var p=Qs(r,Nn.current);so(r,a),p=gd(null,r,u,n,p,a);var x=vd();return r.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(r.tag=1,r.memoizedState=null,r.updateQueue=null,Jn(u)?(x=!0,Sl(r)):x=!1,r.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,cd(r),p.updater=Fl,r.stateNode=p,p._reactInternals=r,Ed(r,u,n,a),r=Ad(null,r,u,!0,x,a)):(r.tag=0,Jt&&x&&Qu(r),Vn(null,r,p,a),r=r.child),r;case 16:u=r.elementType;e:{switch(kl(n,r),n=r.pendingProps,p=u._init,u=p(u._payload),r.type=u,p=r.tag=wS(u),n=Pi(u,n),p){case 0:r=bd(null,r,u,n,a);break e;case 1:r=pg(null,r,u,n,a);break e;case 11:r=cg(null,r,u,n,a);break e;case 14:r=ug(null,r,u,Pi(u.type,n),a);break e}throw Error(t(306,u,""))}return r;case 0:return u=r.type,p=r.pendingProps,p=r.elementType===u?p:Pi(u,p),bd(n,r,u,p,a);case 1:return u=r.type,p=r.pendingProps,p=r.elementType===u?p:Pi(u,p),pg(n,r,u,p,a);case 3:e:{if(mg(r),n===null)throw Error(t(387));u=r.pendingProps,x=r.memoizedState,p=x.element,Pm(n,r),Rl(r,u,null,a);var b=r.memoizedState;if(u=b.element,x.isDehydrated)if(x={element:u,isDehydrated:!1,cache:b.cache,pendingSuspenseBoundaries:b.pendingSuspenseBoundaries,transitions:b.transitions},r.updateQueue.baseState=x,r.memoizedState=x,r.flags&256){p=ao(Error(t(423)),r),r=gg(n,r,u,a,p);break e}else if(u!==p){p=ao(Error(t(424)),r),r=gg(n,r,u,a,p);break e}else for(di=kr(r.stateNode.containerInfo.firstChild),ui=r,Jt=!0,Ri=null,a=Cm(r,null,u,a),r.child=a;a;)a.flags=a.flags&-3|4096,a=a.sibling;else{if(no(),u===p){r=_r(n,r,a);break e}Vn(n,r,u,a)}r=r.child}return r;case 5:return Nm(r),n===null&&nd(r),u=r.type,p=r.pendingProps,x=n!==null?n.memoizedProps:null,b=p.children,$u(u,p)?b=null:x!==null&&$u(u,x)&&(r.flags|=32),fg(n,r),Vn(n,r,b,a),r.child;case 6:return n===null&&nd(r),null;case 13:return vg(n,r,a);case 4:return ud(r,r.stateNode.containerInfo),u=r.pendingProps,n===null?r.child=io(r,null,u,a):Vn(n,r,u,a),r.child;case 11:return u=r.type,p=r.pendingProps,p=r.elementType===u?p:Pi(u,p),cg(n,r,u,p,a);case 7:return Vn(n,r,r.pendingProps,a),r.child;case 8:return Vn(n,r,r.pendingProps.children,a),r.child;case 12:return Vn(n,r,r.pendingProps.children,a),r.child;case 10:e:{if(u=r.type._context,p=r.pendingProps,x=r.memoizedProps,b=p.value,$t(bl,u._currentValue),u._currentValue=b,x!==null)if(Ci(x.value,b)){if(x.children===p.children&&!Zn.current){r=_r(n,r,a);break e}}else for(x=r.child,x!==null&&(x.return=r);x!==null;){var F=x.dependencies;if(F!==null){b=x.child;for(var H=F.firstContext;H!==null;){if(H.context===u){if(x.tag===1){H=vr(-1,a&-a),H.tag=2;var ce=x.updateQueue;if(ce!==null){ce=ce.shared;var Me=ce.pending;Me===null?H.next=H:(H.next=Me.next,Me.next=H),ce.pending=H}}x.lanes|=a,H=x.alternate,H!==null&&(H.lanes|=a),ad(x.return,a,r),F.lanes|=a;break}H=H.next}}else if(x.tag===10)b=x.type===r.type?null:x.child;else if(x.tag===18){if(b=x.return,b===null)throw Error(t(341));b.lanes|=a,F=b.alternate,F!==null&&(F.lanes|=a),ad(b,a,r),b=x.sibling}else b=x.child;if(b!==null)b.return=x;else for(b=x;b!==null;){if(b===r){b=null;break}if(x=b.sibling,x!==null){x.return=b.return,b=x;break}b=b.return}x=b}Vn(n,r,p.children,a),r=r.child}return r;case 9:return p=r.type,u=r.pendingProps.children,so(r,a),p=Si(p),u=u(p),r.flags|=1,Vn(n,r,u,a),r.child;case 14:return u=r.type,p=Pi(u,r.pendingProps),p=Pi(u.type,p),ug(n,r,u,p,a);case 15:return dg(n,r,r.type,r.pendingProps,a);case 17:return u=r.type,p=r.pendingProps,p=r.elementType===u?p:Pi(u,p),kl(n,r),r.tag=1,Jn(u)?(n=!0,Sl(r)):n=!1,so(r,a),ng(r,u,p),Ed(r,u,p,a),Ad(null,r,u,!0,n,a);case 19:return xg(n,r,a);case 22:return hg(n,r,a)}throw Error(t(156,r.tag))};function Gg(n,r){return nl(n,r)}function ES(n,r,a,u){this.tag=n,this.key=a,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=r,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ei(n,r,a,u){return new ES(n,r,a,u)}function $d(n){return n=n.prototype,!(!n||!n.isReactComponent)}function wS(n){if(typeof n=="function")return $d(n)?1:0;if(n!=null){if(n=n.$$typeof,n===X)return 11;if(n===G)return 14}return 2}function qr(n,r){var a=n.alternate;return a===null?(a=Ei(n.tag,r,n.key,n.mode),a.elementType=n.elementType,a.type=n.type,a.stateNode=n.stateNode,a.alternate=n,n.alternate=a):(a.pendingProps=r,a.type=n.type,a.flags=0,a.subtreeFlags=0,a.deletions=null),a.flags=n.flags&14680064,a.childLanes=n.childLanes,a.lanes=n.lanes,a.child=n.child,a.memoizedProps=n.memoizedProps,a.memoizedState=n.memoizedState,a.updateQueue=n.updateQueue,r=n.dependencies,a.dependencies=r===null?null:{lanes:r.lanes,firstContext:r.firstContext},a.sibling=n.sibling,a.index=n.index,a.ref=n.ref,a}function ql(n,r,a,u,p,x){var b=2;if(u=n,typeof n=="function")$d(n)&&(b=1);else if(typeof n=="string")b=5;else e:switch(n){case B:return Ts(a.children,p,x,r);case A:b=8,p|=8;break;case U:return n=Ei(12,a,r,p|2),n.elementType=U,n.lanes=x,n;case re:return n=Ei(13,a,r,p),n.elementType=re,n.lanes=x,n;case ue:return n=Ei(19,a,r,p),n.elementType=ue,n.lanes=x,n;case q:return Kl(a,p,x,r);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case z:b=10;break e;case k:b=9;break e;case X:b=11;break e;case G:b=14;break e;case Q:b=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return r=Ei(b,a,r,p),r.elementType=n,r.type=u,r.lanes=x,r}function Ts(n,r,a,u){return n=Ei(7,n,u,r),n.lanes=a,n}function Kl(n,r,a,u){return n=Ei(22,n,u,r),n.elementType=q,n.lanes=a,n.stateNode={isHidden:!1},n}function Yd(n,r,a){return n=Ei(6,n,null,r),n.lanes=a,n}function qd(n,r,a){return r=Ei(4,n.children!==null?n.children:[],n.key,r),r.lanes=a,r.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},r}function TS(n,r,a,u,p){this.tag=r,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=An(0),this.expirationTimes=An(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=An(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function Kd(n,r,a,u,p,x,b,F,H){return n=new TS(n,r,a,F,H),r===1?(r=1,x===!0&&(r|=8)):r=0,x=Ei(3,null,null,r),n.current=x,x.stateNode=n,x.memoizedState={element:u,isDehydrated:a,cache:null,transitions:null,pendingSuspenseBoundaries:null},cd(x),n}function bS(n,r,a){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:r,implementation:a}}function jg(n){if(!n)return zr;n=n._reactInternals;e:{if(Hi(n)!==n||n.tag!==1)throw Error(t(170));var r=n;do{switch(r.tag){case 3:r=r.stateNode.context;break e;case 1:if(Jn(r.type)){r=r.stateNode.__reactInternalMemoizedMergedChildContext;break e}}r=r.return}while(r!==null);throw Error(t(171))}if(n.tag===1){var a=n.type;if(Jn(a))return _m(n,a,r)}return r}function Wg(n,r,a,u,p,x,b,F,H){return n=Kd(a,u,!0,n,p,x,b,F,H),n.context=jg(null),a=n.current,u=Gn(),p=$r(a),x=vr(u,p),x.callback=r??null,Gr(a,x,p),n.current.lanes=p,St(n,p,u),ti(n,u),n}function Zl(n,r,a,u){var p=r.current,x=Gn(),b=$r(p);return a=jg(a),r.context===null?r.context=a:r.pendingContext=a,r=vr(x,b),r.payload={element:n},u=u===void 0?null:u,u!==null&&(r.callback=u),n=Gr(p,r,b),n!==null&&(Ni(n,p,b,x),Cl(n,p,b)),b}function Jl(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function Xg(n,r){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var a=n.retryLane;n.retryLane=a!==0&&a<r?a:r}}function Zd(n,r){Xg(n,r),(n=n.alternate)&&Xg(n,r)}function AS(){return null}var $g=typeof reportError=="function"?reportError:function(n){console.error(n)};function Jd(n){this._internalRoot=n}Ql.prototype.render=Jd.prototype.render=function(n){var r=this._internalRoot;if(r===null)throw Error(t(409));Zl(n,r,null,null)},Ql.prototype.unmount=Jd.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var r=n.containerInfo;Ms(function(){Zl(null,n,null,null)}),r[hr]=null}};function Ql(n){this._internalRoot=n}Ql.prototype.unstable_scheduleHydration=function(n){if(n){var r=Bt();n={blockedOn:null,target:n,priority:r};for(var a=0;a<Ur.length&&r!==0&&r<Ur[a].priority;a++);Ur.splice(a,0,n),a===0&&Np(n)}};function Qd(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function ec(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function Yg(){}function CS(n,r,a,u,p){if(p){if(typeof u=="function"){var x=u;u=function(){var ce=Jl(b);x.call(ce)}}var b=Wg(r,u,n,0,null,!1,!1,"",Yg);return n._reactRootContainer=b,n[hr]=b.current,ca(n.nodeType===8?n.parentNode:n),Ms(),b}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var F=u;u=function(){var ce=Jl(H);F.call(ce)}}var H=Kd(n,0,!1,null,null,!1,!1,"",Yg);return n._reactRootContainer=H,n[hr]=H.current,ca(n.nodeType===8?n.parentNode:n),Ms(function(){Zl(r,H,a,u)}),H}function tc(n,r,a,u,p){var x=a._reactRootContainer;if(x){var b=x;if(typeof p=="function"){var F=p;p=function(){var H=Jl(b);F.call(H)}}Zl(r,b,n,p)}else b=CS(a,r,n,p,u);return Jl(b)}Ft=function(n){switch(n.tag){case 3:var r=n.stateNode;if(r.current.memoizedState.isDehydrated){var a=Ct(r.pendingLanes);a!==0&&(Kn(r,a|1),ti(r,Qt()),(Dt&6)===0&&(uo=Qt()+500,Hr()))}break;case 13:Ms(function(){var u=gr(n,1);if(u!==null){var p=Gn();Ni(u,n,1,p)}}),Zd(n,1)}},Yt=function(n){if(n.tag===13){var r=gr(n,134217728);if(r!==null){var a=Gn();Ni(r,n,134217728,a)}Zd(n,134217728)}},bi=function(n){if(n.tag===13){var r=$r(n),a=gr(n,r);if(a!==null){var u=Gn();Ni(a,n,r,u)}Zd(n,r)}},Bt=function(){return yt},Ai=function(n,r){var a=yt;try{return yt=n,r()}finally{yt=a}},dt=function(n,r,a){switch(r){case"input":if(vt(n,a),r=a.name,a.type==="radio"&&r!=null){for(a=n;a.parentNode;)a=a.parentNode;for(a=a.querySelectorAll("input[name="+JSON.stringify(""+r)+'][type="radio"]'),r=0;r<a.length;r++){var u=a[r];if(u!==n&&u.form===n.form){var p=_l(u);if(!p)throw Error(t(90));Ot(u),vt(u,p)}}}break;case"textarea":Ie(n,a);break;case"select":r=a.value,r!=null&&It(n,!!a.multiple,r,!1)}},De=jd,Se=Ms;var RS={usingClientEntryPoint:!1,Events:[ha,Zs,_l,he,ze,jd]},ba={findFiberByHostInstance:ps,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},PS={bundleType:ba.bundleType,version:ba.version,rendererPackageName:ba.rendererPackageName,rendererConfig:ba.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:P.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=$o(n),n===null?null:n.stateNode},findFiberByHostInstance:ba.findFiberByHostInstance||AS,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var nc=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!nc.isDisabled&&nc.supportsFiber)try{te=nc.inject(PS),Ne=nc}catch{}}return ni.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=RS,ni.createPortal=function(n,r){var a=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Qd(r))throw Error(t(200));return bS(n,r,null,a)},ni.createRoot=function(n,r){if(!Qd(n))throw Error(t(299));var a=!1,u="",p=$g;return r!=null&&(r.unstable_strictMode===!0&&(a=!0),r.identifierPrefix!==void 0&&(u=r.identifierPrefix),r.onRecoverableError!==void 0&&(p=r.onRecoverableError)),r=Kd(n,1,!1,null,null,a,!1,u,p),n[hr]=r.current,ca(n.nodeType===8?n.parentNode:n),new Jd(r)},ni.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var r=n._reactInternals;if(r===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=$o(r),n=n===null?null:n.stateNode,n},ni.flushSync=function(n){return Ms(n)},ni.hydrate=function(n,r,a){if(!ec(r))throw Error(t(200));return tc(null,n,r,!0,a)},ni.hydrateRoot=function(n,r,a){if(!Qd(n))throw Error(t(405));var u=a!=null&&a.hydratedSources||null,p=!1,x="",b=$g;if(a!=null&&(a.unstable_strictMode===!0&&(p=!0),a.identifierPrefix!==void 0&&(x=a.identifierPrefix),a.onRecoverableError!==void 0&&(b=a.onRecoverableError)),r=Wg(r,null,n,1,a??null,p,!1,x,b),n[hr]=r.current,ca(n),u)for(n=0;n<u.length;n++)a=u[n],p=a._getVersion,p=p(a._source),r.mutableSourceEagerHydrationData==null?r.mutableSourceEagerHydrationData=[a,p]:r.mutableSourceEagerHydrationData.push(a,p);return new Ql(r)},ni.render=function(n,r,a){if(!ec(r))throw Error(t(200));return tc(null,n,r,!1,a)},ni.unmountComponentAtNode=function(n){if(!ec(n))throw Error(t(40));return n._reactRootContainer?(Ms(function(){tc(null,null,n,!1,function(){n._reactRootContainer=null,n[hr]=null})}),!0):!1},ni.unstable_batchedUpdates=jd,ni.unstable_renderSubtreeIntoContainer=function(n,r,a,u){if(!ec(a))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return tc(n,r,a,!1,u)},ni.version="18.3.1-next-f1338f8080-20240426",ni}var n0;function zS(){if(n0)return nh.exports;n0=1;function s(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(s)}catch(e){console.error(e)}}return s(),nh.exports=BS(),nh.exports}var i0;function HS(){if(i0)return ic;i0=1;var s=zS();return ic.createRoot=s.createRoot,ic.hydrateRoot=s.hydrateRoot,ic}var VS=HS();function zv(s,e,t="application/json"){const i=URL.createObjectURL(new Blob([s],{type:t})),o=document.createElement("a");o.href=i,o.download=e,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(i),1e3)}const Hv=(s=new Date)=>`fmp-camera-sim-${s.toISOString().slice(0,10)}.json`,cn=()=>performance.now()/1e3;function ri(s){const e=s==null?void 0:s.timeStamp,t=performance.now();return(typeof e=="number"&&e>0&&e<=t+1?e:t)/1e3}class GS{constructor(e){ge(this,"sources",new Map);this.store=e}set(e,t,i){this.sources.set(e,t),this.apply(i)}release(e,t){this.sources.delete(e)&&this.apply(t)}releaseAll(e){this.sources.size!==0&&(this.sources.clear(),this.apply(e))}isActive(e){return e?this.sources.has(e):this.sources.size>0}combined(){const e={pan:0,tilt:0,zoom:0};for(const t of this.sources.values())for(const i of["pan","tilt","zoom"]){const o=t[i]??0;Math.abs(o)>Math.abs(e[i])&&(e[i]=o)}return e}apply(e){this.store.setDrive(this.combined(),e)}}const Vv=.3048,$n=Math.PI/180,_n=s=>s*Vv,pu=s=>s/Vv,Pn=(s,e,t)=>Math.min(t,Math.max(e,s));function Gv(s,e){return e==="ft"?pu(s):s}function jS(s,e){return e==="ft"?_n(s):s}function r0(s,e,t=1){return`${Gv(s,e).toFixed(t)} ${e}`}function eu(s,e=1){const t=Number(s.toFixed(e));return`${t>0?"+":t<0?"−":""}${Math.abs(t).toFixed(e)}`}class Qa{constructor(){ge(this,"issues",[])}add(e,t){this.issues.push({path:e,message:t})}get ok(){return this.issues.length===0}}const jv=s=>typeof s=="object"&&s!==null&&!Array.isArray(s);function on(s,e,t){return jv(e)?e:(s.add(t,"Expected an object."),null)}function pn(s,e,t,i={}){const{maxLength:o=2e3,allowEmpty:l=!0}=i;return typeof e!="string"?(s.add(t,"Expected text."),null):!l&&e.trim()===""?(s.add(t,"Must not be empty."),null):e.length>o?(s.add(t,`Must be at most ${o} characters.`),null):e}function Tn(s,e,t,i){if(typeof e!="number"||!Number.isFinite(e))return s.add(t,"Expected a finite number."),null;if(i&&(e<i.min||e>i.max)){const o=i.describe??(l=>String(l));return s.add(t,`Must be between ${o(i.min)} and ${o(i.max)}.`),null}return e}function Wv(s,e,t,i){return typeof e!="number"||!Number.isInteger(e)?(s.add(t,"Expected a whole number."),null):e<i.min||e>i.max?(s.add(t,`Must be between ${i.min} and ${i.max}.`),null):e}function Wa(s,e,t){return typeof e!="boolean"?(s.add(t,"Expected true or false."),null):e}function oi(s,e,t,i){return typeof e!="string"||!i.includes(e)?(s.add(t,`Must be one of: ${i.join(", ")}.`),null):e}function WS(s,e=6){const t=s.slice(0,e).map(o=>`${o.path}: ${o.message}`),i=s.length>e?` (+${s.length-e} more)`:"";return t.join(" · ")+i}const Oc="fmp-camera-simulator.camera",kc=1,Xv=["smoothstep","smootherstep","linear"],Us=1,rr=8,Zi=Object.freeze({panMinDeg:-175,panMaxDeg:175,tiltMinDeg:-30,tiltMaxDeg:90,panMaxSpeedDegS:100,tiltMaxSpeedDegS:50,presetMaxSpeedDegS:150,minSpeedDegS:.05,hfovWideDeg:70.2,hfovTeleDeg:4.1,focalWideMm:4.4,focalTeleMm:88.4,presetCount:128,source:Object.freeze({label:"BirdDog P240 technical specifications",url:"https://birddog.tv/p240-techspecs/",retrieved:"2026-09-23"})});function tp(){return{schema:Oc,version:kc,id:"fmp-cam4-p240",label:"Camera 4 · Catwalk PTZ",model:"BirdDog P240",published:{...Zi,source:{...Zi.source}},limits:{panMinDeg:Zi.panMinDeg,panMaxDeg:Zi.panMaxDeg,tiltMinDeg:Zi.tiltMinDeg,tiltMaxDeg:Zi.tiltMaxDeg,status:"published",note:"Published P240 travel. No venue movement restriction is recorded for Camera 4."},behaviour:{curveExponent:1.8,deadband:.06,rampUpS:.25,stopS:.2,panLevel1DegS:2,zoomFastTravelS:2.4,zoomSlowTravelS:40,zoomRampS:.15,zoomAdaptiveStrength:1,presetLevel1DegS:5,presetMinDurationS:.5,presetEasing:"smoothstep",teleConvert:!1,status:"uncalibrated",note:"Response curve, stopping time, zoom speed and preset travel are training assumptions. They have not been compared with the installed P240 or the SuperJoy."},calibration:{status:"uncalibrated",note:"Not yet compared against the installed Camera 4."}}}const np=16/9;function ip(s,e){const t=Pn(e,0,1),i=Math.tan(s.published.hfovWideDeg*$n/2),o=Math.tan(s.published.hfovTeleDeg*$n/2),l=s.behaviour.teleConvert?.5:1;return i*Math.pow(o/i,t)*l}function tu(s,e){const t=Pn(e,0,1),i=ip(s,t),o=i/np,l=s.behaviour.teleConvert?2:1,c=s.published.focalWideMm*Math.pow(s.published.focalTeleMm/s.published.focalWideMm,t);return{lens:t,hfovDeg:2*Math.atan(i)/$n,vfovDeg:2*Math.atan(o)/$n,focalMm:c*l,zoomRatio:c/s.published.focalWideMm*l}}const rp=s=>(Pn(Math.round(s),Us,rr)-Us)/(rr-Us),sp=(s,e,t)=>s*Math.pow(e/s,t);function mu(s,e){const{panMaxSpeedDegS:t}=s.published;return sp(Math.min(s.behaviour.panLevel1DegS,t),t,rp(e))}function op(s,e){const{panMaxSpeedDegS:t,tiltMaxSpeedDegS:i}=s.published;return mu(s,e)*(i/t)}function nu(s,e){const{zoomFastTravelS:t,zoomSlowTravelS:i}=s.behaviour;return 1/sp(i,Math.min(t,i),rp(e))}function ap(s,e){const{presetMaxSpeedDegS:t}=s.published;return sp(Math.min(s.behaviour.presetLevel1DegS,t),t,rp(e))}function XS(s,e){const t=ip(s,e)/Math.tan(s.published.hfovWideDeg*$n/2);return Math.pow(Math.min(1,t),Pn(s.behaviour.zoomAdaptiveStrength,0,1))}function $S(s,e){const{tiltMinDeg:t,tiltMaxDeg:i}=s.limits;return e==="inverted"?{min:-i,max:-t}:{min:t,max:i}}const $v=[{key:"curveExponent",label:"Response curve",help:"1 is linear; higher gives finer control near centre.",min:1,max:3.5,step:.1,unit:"power"},{key:"deadband",label:"Deadband",help:"Joystick travel ignored around centre.",min:0,max:.25,step:.01,unit:"of travel"},{key:"rampUpS",label:"Acceleration time",help:"Time to reach the commanded speed.",min:.02,max:1.5,step:.01,unit:"s"},{key:"stopS",label:"Stopping time",help:"Time to stop after release.",min:.02,max:1.5,step:.01,unit:"s"},{key:"panLevel1DegS",label:"Pan speed at level 1",help:"Level 8 is the published 100°/s manual maximum.",min:.05,max:20,step:.05,unit:"°/s"},{key:"zoomFastTravelS",label:"Zoom travel at level 8",help:"Wide to tele at the fastest zoom speed. Preset recalls zoom at this speed.",min:.5,max:20,step:.1,unit:"s"},{key:"zoomSlowTravelS",label:"Zoom travel at level 1",help:"Wide to tele at the slowest zoom speed.",min:2,max:120,step:1,unit:"s"},{key:"zoomRampS",label:"Zoom ramp",help:"Time for zoom to reach speed or stop.",min:.02,max:1,step:.01,unit:"s"},{key:"zoomAdaptiveStrength",label:"Zoom-adaptive sensitivity",help:"0 ignores zoom; 1 keeps on-screen speed constant.",min:0,max:1,step:.05,unit:"strength"},{key:"presetLevel1DegS",label:"Preset speed at level 1",help:"Level 8 is the published 150°/s preset maximum.",min:.5,max:60,step:.5,unit:"°/s"},{key:"presetMinDurationS",label:"Minimum preset travel",help:"Shortest time a recall takes.",min:.1,max:5,step:.1,unit:"s"}];function Yv(s,e="camera"){const t=new Qa,i=on(t,s,e);if(!i)return{ok:!1,issues:t.issues};i.schema!==Oc&&t.add(`${e}.schema`,`Expected "${Oc}".`),i.version!==kc&&t.add(`${e}.version`,typeof i.version=="number"?`Unsupported camera profile version ${i.version}. This simulator reads version ${kc}.`:"Missing camera profile version.");const o=pn(t,i.id,`${e}.id`,{maxLength:80,allowEmpty:!1}),l=pn(t,i.label,`${e}.label`,{maxLength:120,allowEmpty:!1}),c=pn(t,i.model,`${e}.model`,{maxLength:80,allowEmpty:!1}),d=on(t,i.published,`${e}.published`);if(d)for(const w of Object.keys(Zi))w!=="source"&&d[w]!==Zi[w]&&t.add(`${e}.published.${w}`,`Published P240 value is ${String(Zi[w])}.`);const h=on(t,i.limits,`${e}.limits`);let f=null;if(h){const w=Zi,y=Tn(t,h.panMinDeg,`${e}.limits.panMinDeg`,{min:w.panMinDeg,max:w.panMaxDeg}),S=Tn(t,h.panMaxDeg,`${e}.limits.panMaxDeg`,{min:w.panMinDeg,max:w.panMaxDeg}),C=Tn(t,h.tiltMinDeg,`${e}.limits.tiltMinDeg`,{min:w.tiltMinDeg,max:w.tiltMaxDeg}),L=Tn(t,h.tiltMaxDeg,`${e}.limits.tiltMaxDeg`,{min:w.tiltMinDeg,max:w.tiltMaxDeg}),P=oi(t,h.status,`${e}.limits.status`,["published","measured","confirmed","estimated","demo"]),O=pn(t,h.note,`${e}.limits.note`);y!==null&&S!==null&&y>=S-1&&t.add(`${e}.limits.panMaxDeg`,"Pan maximum must exceed pan minimum by at least 1°."),C!==null&&L!==null&&C>=L-1&&t.add(`${e}.limits.tiltMaxDeg`,"Tilt maximum must exceed tilt minimum by at least 1°."),y!==null&&S!==null&&C!==null&&L!==null&&P&&O!==null&&(f={panMinDeg:y,panMaxDeg:S,tiltMinDeg:C,tiltMaxDeg:L,status:P,note:O})}const g=on(t,i.behaviour,`${e}.behaviour`);let m=null;if(g){const w={};for(const P of $v){const O=Tn(t,g[P.key],`${e}.behaviour.${P.key}`,{min:P.min,max:P.max});O!==null&&(w[P.key]=O)}const y=oi(t,g.presetEasing,`${e}.behaviour.presetEasing`,Xv),S=Wa(t,g.teleConvert,`${e}.behaviour.teleConvert`),C=oi(t,g.status,`${e}.behaviour.status`,["uncalibrated","measured"]),L=pn(t,g.note,`${e}.behaviour.note`);w.zoomFastTravelS!==void 0&&w.zoomSlowTravelS!==void 0&&w.zoomFastTravelS>w.zoomSlowTravelS&&t.add(`${e}.behaviour.zoomFastTravelS`,"Level 8 zoom travel must not be slower than level 1."),t.ok&&y&&S!==null&&C&&L!==null&&(m={...w,presetEasing:y,teleConvert:S,status:C,note:L})}const v=on(t,i.calibration,`${e}.calibration`),_=v?{status:oi(t,v.status,`${e}.calibration.status`,["uncalibrated","calibrated"]),note:pn(t,v.note,`${e}.calibration.note`)}:null;if(!t.ok||!o||!l||!c||!f||!m||!(_!=null&&_.status)||_.note===null)return{ok:!1,issues:t.issues};const M=tp();return{ok:!0,camera:{schema:Oc,version:kc,id:o,label:l,model:c,published:M.published,limits:f,behaviour:m,calibration:{status:_.status,note:_.note}}}}function YS(s){return s.calibration.status==="calibrated"&&s.behaviour.status==="measured"}const Bc="fmp-camera-simulator.session",zc=1,Ya=9,tf=60,qv=["DSR","DSC","DSL","CSR","CS","CSL","USR","USC","USL"],Kv=["tour","cross"],qS={tour:"Stage tour (all three rows)",cross:"Downstage cross and return"},Zv=["wide","follow","recall"];function Jv(){return{wide:{safeAreaPct:90,minStageFillPct:55,holdS:1},follow:{targetWidthPct:50,targetHeightPct:60,minHeightPct:25,maxHeightPct:90,passPct:70,countdownS:3},recall:{panTiltToleranceDeg:.1,lensTolerance:.005,distinctDeg:5,distinctFovRatio:1.25,moveAwayDeg:3}}}function Qv(s,e){return{schema:Bc,version:zc,venueId:s,cameraId:e,speeds:{pan:4,tilt:4,zoom:4,preset:4},pose:{pan:0,tilt:0,lens:0},presets:[],performer:{mode:"mark",markId:"CS",pathId:"tour",walkSpeed:1.2,height:1.75,pauseS:2},exerciseSettings:Jv(),exerciseResults:[],preferences:{unit:"ft",guides:{safeArea:!0,centre:!0,thirds:!1}}}}const e_={wide:{safeAreaPct:[50,100],minStageFillPct:[0,95],holdS:[0,10]},follow:{targetWidthPct:[10,100],targetHeightPct:[10,100],minHeightPct:[5,95],maxHeightPct:[10,100],passPct:[0,100],countdownS:[0,10]},recall:{panTiltToleranceDeg:[.001,5],lensTolerance:[1e-4,.2],distinctDeg:[0,90],distinctFovRatio:[1,10],moveAwayDeg:[0,90]}},KS=e_;function ZS(s,e,t){const i=on(s,e,t);if(!i)return null;const o=Wv(s,i.slot,`${t}.slot`,{min:1,max:Ya}),l=pn(s,i.name,`${t}.name`,{maxLength:40}),c=pn(s,i.cameraId,`${t}.cameraId`,{maxLength:80,allowEmpty:!1}),d=Tn(s,i.pan,`${t}.pan`,{min:-180,max:180}),h=Tn(s,i.tilt,`${t}.tilt`,{min:-90,max:90}),f=Tn(s,i.lens,`${t}.lens`,{min:0,max:1}),g=pn(s,i.savedAt,`${t}.savedAt`,{maxLength:40});return g!==null&&!Number.isFinite(Date.parse(g))&&s.add(`${t}.savedAt`,"Expected an ISO date."),o===null||l===null||c===null||d===null||h===null||f===null||g===null?null:{slot:o,name:l,cameraId:c,pan:d,tilt:h,lens:f,savedAt:g}}function JS(s,e,t){const i=on(s,e,t);if(!i)return null;const o=Jv();for(const[c,d]of Object.entries(e_)){const h=on(s,i[c],`${t}.${c}`);if(h)for(const[f,[g,m]]of Object.entries(d)){const v=Tn(s,h[f],`${t}.${c}.${f}`,{min:g,max:m});v!==null&&(o[c][f]=v)}}const l=o;return l.follow.minHeightPct>=l.follow.maxHeightPct&&s.add(`${t}.follow.maxHeightPct`,"Maximum performer height must exceed the minimum."),s.ok?l:null}function QS(s,e,t){const i=on(s,e,t);if(!i)return null;const o=pn(s,i.id,`${t}.id`,{maxLength:80,allowEmpty:!1}),l=oi(s,i.exercise,`${t}.exercise`,Zv),c=pn(s,i.completedAt,`${t}.completedAt`,{maxLength:40});c!==null&&!Number.isFinite(Date.parse(c))&&s.add(`${t}.completedAt`,"Expected an ISO date.");const d=Wa(s,i.passed,`${t}.passed`),h=pn(s,i.summary,`${t}.summary`,{maxLength:400}),f=on(s,i.metrics,`${t}.metrics`),g={};if(f)for(const[m,v]of Object.entries(f)){const _=Tn(s,v,`${t}.metrics.${m}`);_!==null&&(g[m]=_)}return!o||!l||c===null||d===null||h===null||!f?null:{id:o,exercise:l,completedAt:c,passed:d,summary:h,metrics:g}}function nf(s,e="session"){const t=new Qa,i=on(t,s,e);if(!i)return{ok:!1,issues:t.issues};i.schema!==Bc&&t.add(`${e}.schema`,`Expected "${Bc}".`),i.version!==zc&&t.add(`${e}.version`,typeof i.version=="number"?`Unsupported session version ${i.version}. This simulator reads version ${zc}.`:"Missing session version.");const o=pn(t,i.venueId,`${e}.venueId`,{maxLength:80,allowEmpty:!1}),l=pn(t,i.cameraId,`${e}.cameraId`,{maxLength:80,allowEmpty:!1}),c=on(t,i.speeds,`${e}.speeds`),d={};if(c)for(const S of["pan","tilt","zoom","preset"]){const C=Wv(t,c[S],`${e}.speeds.${S}`,{min:Us,max:rr});C!==null&&(d[S]=C)}const h=on(t,i.pose,`${e}.pose`),f=h?{pan:Tn(t,h.pan,`${e}.pose.pan`,{min:-180,max:180}),tilt:Tn(t,h.tilt,`${e}.pose.tilt`,{min:-90,max:90}),lens:Tn(t,h.lens,`${e}.pose.lens`,{min:0,max:1})}:null,g=[];if(!Array.isArray(i.presets))t.add(`${e}.presets`,"Expected a list of presets.");else if(i.presets.length>Ya)t.add(`${e}.presets`,`At most ${Ya} presets.`);else{const S=new Set;i.presets.forEach((C,L)=>{const P=ZS(t,C,`${e}.presets[${L}]`);P&&(S.has(P.slot)&&t.add(`${e}.presets[${L}].slot`,`Preset slot ${P.slot} appears twice.`),S.add(P.slot),g.push(P))})}const m=on(t,i.performer,`${e}.performer`),v=m?{mode:oi(t,m.mode,`${e}.performer.mode`,["mark","path"]),markId:oi(t,m.markId,`${e}.performer.markId`,qv),pathId:oi(t,m.pathId,`${e}.performer.pathId`,Kv),walkSpeed:Tn(t,m.walkSpeed,`${e}.performer.walkSpeed`,{min:.3,max:3}),height:Tn(t,m.height,`${e}.performer.height`,{min:1.2,max:2.3}),pauseS:Tn(t,m.pauseS,`${e}.performer.pauseS`,{min:0,max:20})}:null,_=JS(t,i.exerciseSettings,`${e}.exerciseSettings`),M=[];Array.isArray(i.exerciseResults)?i.exerciseResults.length>tf?t.add(`${e}.exerciseResults`,`At most ${tf} results.`):i.exerciseResults.forEach((S,C)=>{const L=QS(t,S,`${e}.exerciseResults[${C}]`);L&&M.push(L)}):t.add(`${e}.exerciseResults`,"Expected a list of exercise results.");const w=on(t,i.preferences,`${e}.preferences`);let y=null;if(w){const S=oi(t,w.unit,`${e}.preferences.unit`,["ft","m"]),C=on(t,w.guides,`${e}.preferences.guides`),L=C?{safeArea:Wa(t,C.safeArea,`${e}.preferences.guides.safeArea`),centre:Wa(t,C.centre,`${e}.preferences.guides.centre`),thirds:Wa(t,C.thirds,`${e}.preferences.guides.thirds`)}:null;S&&L&&L.safeArea!==null&&L.centre!==null&&L.thirds!==null&&(y={unit:S,guides:{safeArea:L.safeArea,centre:L.centre,thirds:L.thirds}})}return!t.ok||!o||!l||!f||f.pan===null||f.tilt===null||f.lens===null||!v||!_||!y?{ok:!1,issues:t.issues}:{ok:!0,session:{schema:Bc,version:zc,venueId:o,cameraId:l,speeds:d,pose:{pan:f.pan,tilt:f.tilt,lens:f.lens},presets:g.sort((S,C)=>S.slot-C.slot),performer:v,exerciseSettings:_,exerciseResults:M,preferences:y}}}const lp={measured:"Measured",confirmed:"Confirmed",published:"Published spec",estimated:"Estimated",inferred:"Inferred",demo:"Demo value",uncalibrated:"Uncalibrated"},ey={measured:"Measured at the venue.",confirmed:"Confirmed by the video office.",published:"Manufacturer's published specification.",estimated:"Estimate from a report or a drawing reading. Verify on site.",inferred:"Inferred from indirect evidence. Verify on site.",demo:"Placeholder for practice. Replace it with a measurement.",uncalibrated:"Training assumption. Not matched to the installed camera."},sh=new Set(["measured","confirmed"]),Hc=["measured","confirmed","estimated","inferred","demo"],Vc="fmp-camera-simulator.venue",Gc=1,ty=["horizontal","line-of-sight"],ny=["upright","inverted"],qa=[{key:"cameraToDse",label:"Camera to downstage edge",help:"From the P240 lens to the centre of the downstage edge (the stage origin), on the basis chosen below.",min:_n(20),max:_n(400),critical:!0},{key:"cameraHeight",label:"Camera height above stage",help:"P240 lens height above the stage deck.",min:0,max:_n(150),critical:!0},{key:"cameraLateral",label:"Camera lateral offset",help:"Positive toward stage right (house left). Negative toward stage left (house right).",min:_n(-150),max:_n(150),signed:!0,critical:!0},{key:"stageWidth",label:"Stage width",help:"Stage-left to stage-right width of the performance deck.",min:_n(10),max:_n(250),critical:!0},{key:"stageDepth",label:"Stage depth",help:"Downstage edge to the upstage limit of the performance deck.",min:_n(10),max:_n(200),critical:!0},{key:"deckHeight",label:"Deck height above pit floor",help:"Shapes the pit and bowl drawing only. It does not move the camera.",min:0,max:_n(12),critical:!1},{key:"pitDepth",label:"Pit depth",help:"Downstage edge to the front of the reserved seating. Varies per show; schematic only.",min:0,max:_n(60),critical:!1}];Object.fromEntries(qa.map(s=>[s.key,s]));function t_(){return{schema:Vc,version:Gc,id:"fmp",name:"Freedom Mortgage Pavilion",dimensions:{cameraToDse:{value:_n(110),status:"estimated",note:"Reported as 100–120 ft from the catwalk camera to the downstage edge. Not yet measured, and the report does not say whether it is horizontal or line of sight."},cameraHeight:{value:_n(35),status:"demo",note:"Unknown. Demo value until the catwalk lens height above the stage deck is measured."},cameraLateral:{value:0,status:"demo",note:"Centred on the stage centreline as a demo assumption."},stageWidth:{value:_n(61),status:"estimated",note:"Scale reading of Live Nation's published Stage & Pit plan, about ±2–5 ft. The plan does not annotate the deck edge, so this is not a certified stage dimension."},stageDepth:{value:_n(75),status:"inferred",note:"Inferred from a video-office comment. The Stage & Pit plan reads about 113 ft for the whole stage rectangle, which likely includes upstage and backstage area, so it is not used as the performance depth."},deckHeight:{value:_n(5),status:"demo",note:"Not published. Demo value for drawing the pit and bowl."},pitDepth:{value:_n(12),status:"demo",note:"The pit and barricade line change per show. Public seating guides place the pit in front of sections 101–103."}},distanceBasis:{value:"horizontal",status:"demo",note:"The reported 100–120 ft has not established whether it is horizontal or line of sight. Horizontal is a demo assumption."},mount:{orientation:"upright",panZeroBearingDeg:0,status:"demo",note:"Mount orientation and pan-zero heading are not established. Upright, with pan 0° on the stage centreline, is a demo assumption."},reference:{cableRoute:"SDI from the catwalk head across the ceiling to the video office, reaching ATEM Input 4. Traced on site in 2025. Reference only: cable length is never used as optical distance."}}}const iy=s=>`${Math.round(pu(s))} ft`;function n_(s,e="venue"){const t=new Qa,i=on(t,s,e);if(!i)return{ok:!1,issues:t.issues};i.schema!==Vc&&t.add(`${e}.schema`,`Expected "${Vc}".`),i.version!==Gc&&t.add(`${e}.version`,typeof i.version=="number"?`Unsupported venue profile version ${i.version}. This simulator reads version ${Gc}.`:"Missing venue profile version.");const o=pn(t,i.id,`${e}.id`,{maxLength:80,allowEmpty:!1}),l=pn(t,i.name,`${e}.name`,{maxLength:160,allowEmpty:!1}),c=on(t,i.dimensions,`${e}.dimensions`),d={};if(c)for(const y of qa){const S=`${e}.dimensions.${y.key}`,C=on(t,c[y.key],S);if(!C)continue;const L=Tn(t,C.value,`${S}.value`,{min:y.min,max:y.max,describe:iy}),P=oi(t,C.status,`${S}.status`,Hc),O=pn(t,C.note,`${S}.note`);L!==null&&P&&O!==null&&(d[y.key]={value:L,status:P,note:O})}const h=on(t,i.distanceBasis,`${e}.distanceBasis`),f=h?{value:oi(t,h.value,`${e}.distanceBasis.value`,ty),status:oi(t,h.status,`${e}.distanceBasis.status`,Hc),note:pn(t,h.note,`${e}.distanceBasis.note`)}:null,g=on(t,i.mount,`${e}.mount`),m=g?{orientation:oi(t,g.orientation,`${e}.mount.orientation`,ny),panZeroBearingDeg:Tn(t,g.panZeroBearingDeg,`${e}.mount.panZeroBearingDeg`,{min:-180,max:180,describe:y=>`${y}°`}),status:oi(t,g.status,`${e}.mount.status`,Hc),note:pn(t,g.note,`${e}.mount.note`)}:null,v=on(t,i.reference,`${e}.reference`),_=v?pn(t,v.cableRoute,`${e}.reference.cableRoute`):null;if(!t.ok||!o||!l||!f||!m||_===null)return{ok:!1,issues:t.issues};const M={schema:Vc,version:Gc,id:o,name:l,dimensions:d,distanceBasis:{value:f.value,status:f.status,note:f.note},mount:{orientation:m.orientation,panZeroBearingDeg:m.panZeroBearingDeg,status:m.status,note:m.note},reference:{cableRoute:_}},w=Ba(M,e);return w.ok?{ok:!0,venue:M}:{ok:!1,issues:w.issues}}const ry=[{prefix:"DS",name:"Downstage",fraction:.12},{prefix:"CS",name:"Centre stage",fraction:.35},{prefix:"US",name:"Upstage",fraction:.6}],sy=[{suffix:"R",name:"right",fraction:.3},{suffix:"C",name:"centre",fraction:0},{suffix:"L",name:"left",fraction:-.3}];function oy(s,e){const t=[];for(const i of ry)for(const o of sy){const l=i.prefix==="CS"&&o.suffix==="C"?"CS":o.suffix==="C"?`${i.prefix}C`:`${i.prefix}${o.suffix}`,c=i.prefix==="CS"&&o.suffix==="C"?"Centre stage":o.suffix==="C"?`${i.name} centre`:`${i.name} ${o.name}`;t.push({id:l,label:c,point:{right:o.fraction*s,upstage:i.fraction*e,height:0}})}return t}const rc=_n(5);function Ba(s,e="venue"){const t=new Qa,i=s.dimensions,o=i.cameraToDse.value,l=i.cameraHeight.value,c=i.cameraLateral.value;let d=o;if(s.distanceBasis.value==="line-of-sight"){const v=o*o-l*l;v<=rc*rc?t.add(`${e}.dimensions.cameraToDse.value`,`A line-of-sight distance must be longer than the camera height (${Math.round(pu(l))} ft).`):d=Math.sqrt(v)}const h=d*d-c*c;if(t.ok&&h<=rc*rc&&t.add(`${e}.dimensions.cameraLateral.value`,"The lateral offset must be smaller than the camera's horizontal distance to the downstage edge."),!t.ok)return{ok:!1,issues:t.issues};const f=Math.sqrt(h),g={right:c,upstage:-f,height:l},m=Math.sqrt(d*d+l*l);return{ok:!0,geometry:{camera:g,horizontalDistance:d,lineOfSight:m,depressionToOriginDeg:Math.atan2(l,d)*180/Math.PI,stageWidth:i.stageWidth.value,stageDepth:i.stageDepth.value,deckHeight:i.deckHeight.value,pitDepth:i.pitDepth.value,marks:oy(i.stageWidth.value,i.stageDepth.value),mountOrientation:s.mount.orientation,panZeroBearingDeg:s.mount.panZeroBearingDeg}}}function ay(s){const e=[];for(const t of qa)t.critical&&!sh.has(s.dimensions[t.key].status)&&e.push(t.label);return sh.has(s.distanceBasis.status)||e.push("Distance basis"),sh.has(s.mount.status)||e.push("Mount orientation"),e}const rf="fmp-camera-simulator.project",sf=1,i_=2*1024*1024;function za(){const s=t_(),e=tp();return{venue:s,camera:e,session:Qv(s.id,e.id)}}function ly(s,e=new Date().toISOString()){return{schema:rf,version:sf,exportedAt:e,app:"FMP Camera Simulator v1",venue:structuredClone(s.venue),camera:structuredClone(s.camera),session:structuredClone(s.session)}}function cy(s){if(!jv(s))return{ok:!1,issues:[{path:"project",message:"The file does not contain a simulator project."}]};if(s.schema!==rf)return{ok:!1,issues:[{path:"project.schema",message:`This is not an FMP Camera Simulator project (expected "${rf}").`}]};if(s.version!==sf)return{ok:!1,issues:[{path:"project.version",message:typeof s.version=="number"?`Unsupported project version ${s.version}. This simulator reads version ${sf}.`:"Missing project version."}]};const e=new Qa,t=n_(s.venue,"venue"),i=Yv(s.camera,"camera"),o=nf(s.session,"session");return t.ok||e.issues.push(...t.issues),i.ok||e.issues.push(...i.issues),o.ok||e.issues.push(...o.issues),!t.ok||!i.ok||!o.ok?{ok:!1,issues:e.issues}:(o.session.venueId!==t.venue.id&&e.add("session.venueId",`The session refers to venue "${o.session.venueId}", but the file holds "${t.venue.id}".`),o.session.cameraId!==i.camera.id&&e.add("session.cameraId",`The session refers to camera "${o.session.cameraId}", but the file holds "${i.camera.id}".`),o.session.presets.forEach((l,c)=>{l.cameraId!==i.camera.id&&e.add(`session.presets[${c}].cameraId`,`Preset ${l.slot} belongs to camera "${l.cameraId}", not "${i.camera.id}".`)}),e.ok?{ok:!0,project:{venue:t.venue,camera:i.camera,session:o.session}}:{ok:!1,issues:e.issues})}function r_(s){if(s.length>i_)return{ok:!1,issues:[{path:"project",message:"The file is larger than 2 MB, which is too large for a simulator project."}]};let e;try{e=JSON.parse(s)}catch{return{ok:!1,issues:[{path:"project",message:"The file is not valid JSON."}]}}return cy(e)}function s_(s,e){return`${JSON.stringify(ly(s,e),null,2)}
`}const gu="fmpCameraSim.v1",uy="fmpCameraSim.v1.unreadable";function dy(){try{const s=window.localStorage;return s.getItem(gu),s}catch{return null}}function s0(s){if(!s)return{project:za(),status:{state:"unavailable",reason:"This browser is blocking storage for this page."},notice:null};let e;try{e=s.getItem(gu)}catch{return{project:za(),status:{state:"unavailable",reason:"Browser storage could not be read."},notice:null}}if(e===null)return{project:za(),status:{state:"ok",savedAt:null},notice:null};const t=r_(e);if(t.ok)return{project:t.project,status:{state:"ok",savedAt:null},notice:null};const i=`${uy}.${Date.now()}`;let o=!1;try{s.setItem(i,e),o=!0}catch{}return{project:za(),status:{state:"ok",savedAt:null},notice:`The saved session could not be restored (${WS(t.issues,2)}). A fresh session was started. ${o?`The old copy was kept in browser storage under ${i}.`:"Browser storage was too full to keep a copy of the old session."}`}}function hy(s,e,t=new Date){if(!s)return{state:"unavailable",reason:"This browser is blocking storage for this page."};try{return s.setItem(gu,s_(e,t.toISOString())),{state:"ok",savedAt:t.toISOString()}}catch{return{state:"unavailable",reason:"Browser storage is full or blocked, so changes are not being saved."}}}class fy{constructor(e){ge(this,"raf",0);ge(this,"running",!1);ge(this,"frame",e=>{if(!this.running)return;const{store:t,renderer:i,overlay:o}=this.parts;t.advanceTo(Math.max(e/1e3,t.wall));const l=t.getState();if(!l.hidden){const c=t.getTelemetry();i&&l.renderStatus==="ok"&&i.render(c,e,this.parts.overviewVisible()),o==null||o.update(c,l)}this.raf=requestAnimationFrame(this.frame)});ge(this,"onVisibility",()=>{const e=cn();document.visibilityState==="hidden"?(this.parts.input.releaseAll(e),this.parts.store.hide(e)):this.parts.store.show(e)});ge(this,"onPageHide",()=>{this.parts.store.flushSave()});ge(this,"onBlur",()=>{this.parts.input.releaseAll(cn())});ge(this,"onStorage",e=>{(e.key===gu||e.key===null)&&this.parts.store.noteExternalSave()});this.parts=e}start(){this.running||(this.running=!0,document.addEventListener("visibilitychange",this.onVisibility),window.addEventListener("pagehide",this.onPageHide),window.addEventListener("blur",this.onBlur),window.addEventListener("storage",this.onStorage),document.visibilityState==="hidden"&&this.onVisibility(),this.raf=requestAnimationFrame(this.frame))}stop(){this.running=!1,cancelAnimationFrame(this.raf),document.removeEventListener("visibilitychange",this.onVisibility),window.removeEventListener("pagehide",this.onPageHide),window.removeEventListener("blur",this.onBlur),window.removeEventListener("storage",this.onStorage)}}function py(s){return He.useSyncExternalStore(s.subscribe,s.getState)}function o_(s,e=12){const[t,i]=He.useState(()=>s.getTelemetry());return He.useEffect(()=>{const o=window.setInterval(()=>i(s.getTelemetry()),1e3/e);return()=>window.clearInterval(o)},[s,e]),t}function o0(s){return s<720?"phone":s<1100?"tablet":s<1800?"desktop":"ultrawide"}function my(){const[s,e]=He.useState(()=>o0(window.innerWidth));return He.useEffect(()=>{const t=()=>e(o0(window.innerWidth));return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),s}const a0=(s,e,t)=>({x:s,y:e,z:t}),gy=(s,e)=>({x:s.x-e.x,y:s.y-e.y,z:s.z-e.z}),oh=(s,e)=>({x:s.x+e.x,y:s.y+e.y,z:s.z+e.z}),sc=(s,e)=>({x:s.x*e,y:s.y*e,z:s.z*e}),ah=(s,e)=>s.x*e.x+s.y*e.y+s.z*e.z,vy=(s,e)=>({x:s.y*e.z-s.z*e.y,y:s.z*e.x-s.x*e.z,z:s.x*e.y-s.y*e.x});function Ar(s){return{x:-s.right,y:s.height,z:-s.upstage}}function l0(s,e,t){const i=e.pan+s.panZeroBearingDeg,o=i*$n,l=e.tilt*$n,c=a0(Math.sin(o)*Math.cos(l),Math.sin(l),-Math.cos(o)*Math.cos(l)),d=a0(Math.cos(o),0,Math.sin(o)),h=vy(d,c),f=ip(t,e.lens),g=f/np;return{position:Ar(s.camera),forward:c,right:d,up:h,headingDeg:i,tiltDeg:e.tilt,tanH:f,tanV:g,hfovDeg:2*Math.atan(f)/$n,vfovDeg:2*Math.atan(g)/$n}}function jc(s,e){const t=gy(e,s.position),i=ah(t,s.forward),o=i>1e-6,l=o?i:1e-6;return{x:ah(t,s.right)/(l*s.tanH),y:ah(t,s.up)/(l*s.tanV),depth:i,inFront:o}}function a_(s,e,t=e){return s.inFront&&Math.abs(s.x)<=e&&Math.abs(s.y)<=t}const lh=.45,_y={tour:["USC","DSR","DSL","CS","USL","USR"],cross:["DSL","DSR"]},Ha=0;function xy(s,e){return Math.hypot(e.right-s.right,e.upstage-s.upstage)}function Sy(s,e){return Math.atan2(e.right-s.right,-(e.upstage-s.upstage))}function l_(s,e){return{...(s.find(i=>i.id===e)??s[0]).point}}function c_(s,e){const i=_y[s.pathId].map(h=>l_(e,h)),o=Math.max(.1,s.walkSpeed),l=[];let c=0,d=0;for(let h=0;h<i.length;h+=1){const f=i[h],g=i[(h+1)%i.length],m=xy(f,g),v=o/lh,_=m>=o*lh,M=_?o:Math.sqrt(m*v),w=M/v,y=m===0?0:_?m/o+lh:2*w;l.push({from:f,to:g,length:m,pauseS:s.pauseS,walkS:y,peakSpeed:M,accelS:w,startS:c,strideStart:d}),c+=s.pauseS+y,d+=m}return{segments:l,loopS:c,loopLength:d}}function yy(s,e){const{walkS:t,peakSpeed:i,accelS:o,length:l}=s;if(t===0)return{s:l,speed:0};const c=i/o;if(e<=o)return{s:.5*c*e*e,speed:c*e};if(e>=t-o){const d=t-e;return{s:l-.5*c*d*d,speed:c*d}}return{s:.5*i*o+i*(e-o),speed:i}}function My(s,e,t){let i=e-s;for(;i>Math.PI;)i-=2*Math.PI;for(;i<-Math.PI;)i+=2*Math.PI;return s+i*t}function Ey(s,e,t){var c;if(s.loopS<=0||s.segments.length===0)return{position:{...((c=s.segments[0])==null?void 0:c.from)??{right:0,upstage:0,height:0}},facing:Ha,moving:!1,stride:0,height:e};const i=(t%s.loopS+s.loopS)%s.loopS,o=Math.floor(t/s.loopS);for(const d of s.segments){const h=d.startS+d.pauseS+d.walkS;if(i>=h&&d!==s.segments[s.segments.length-1])continue;const f=i-d.startS,g=o*s.loopLength+d.strideStart;if(f<d.pauseS)return{position:{...d.from},facing:Ha,moving:!1,stride:g,height:e};const m=Math.min(f-d.pauseS,d.walkS),{s:v,speed:_}=yy(d,m),M=d.length>0?Math.min(1,v/d.length):1,w={right:d.from.right+(d.to.right-d.from.right)*M,upstage:d.from.upstage+(d.to.upstage-d.from.upstage)*M,height:0},y=Sy(d.from,d.to),S=d.peakSpeed>0?Math.min(1,_/d.peakSpeed):0;return{position:w,facing:My(Ha,y,S),moving:_>1e-6,stride:g+v,height:e}}return{position:{...s.segments[s.segments.length-1].to},facing:Ha,moving:!1,stride:0,height:e}}function wy(s,e,t){return s.mode==="mark"?{position:l_(e,s.markId),facing:Ha,moving:!1,stride:0,height:s.height}:Ey(c_(s,e),s.height,t)}const Ty=.72,c0=2;function u_(s,e,t){const i=e.position,o=jc(s,Ar({...i,height:e.height*Ty})),l=jc(s,Ar({...i,height:e.height})),c=jc(s,Ar({...i,height:0})),d=o.inFront&&Math.abs(o.x)<=1&&Math.abs(o.y)<=1,h=l.inFront&&c.inFront?(l.y-c.y)/2*100:0,f=t.follow,g=a_(o,f.targetWidthPct/100,f.targetHeightPct/100),m=h>=f.minHeightPct&&h<=f.maxHeightPct,v=o.inFront?Math.min(c0,Math.hypot(o.x,o.y)):c0;return{x:o.x,y:o.y,visible:d,inBox:g,sizePct:h,sizeOk:m,onTarget:g&&m,error:v}}class by{constructor(e){ge(this,"id","follow");ge(this,"startTime",null);ge(this,"countdownS",3);ge(this,"elapsedS",0);ge(this,"onTargetS",0);ge(this,"lostS",0);ge(this,"errorIntegral",0);ge(this,"errorSquaredIntegral",0);ge(this,"maxError",0);ge(this,"trackedS",0);ge(this,"passPct",70);ge(this,"last",null);ge(this,"done",null);this.durationS=e}performerTime(e){return this.startTime===null?0:Math.min(this.durationS,Math.max(0,e-this.startTime-this.countdownS))}sample(e){if(this.done)return;this.startTime===null&&(this.startTime=e.time,this.countdownS=e.settings.follow.countdownS),this.passPct=e.settings.follow.passPct,this.elapsedS=e.time-this.startTime;const t=this.elapsedS-this.countdownS;if(t<0)return;if(t>=this.durationS){this.finish();return}const i=u_(e.frame,e.performer,e.settings);this.last=i,this.trackedS+=e.dt,i.onTarget&&(this.onTargetS+=e.dt),i.visible||(this.lostS+=e.dt),this.errorIntegral+=i.error*e.dt,this.errorSquaredIntegral+=i.error*i.error*e.dt,this.maxError=Math.max(this.maxError,i.error)}handleEvent(){}evaluation(){return this.last}finish(){const e=Math.max(this.trackedS,1e-9),t=this.onTargetS/e*100,i=this.errorIntegral/e,o=Math.sqrt(this.errorSquaredIntegral/e),l=t+1e-9>=this.passPct;this.done={exercise:"follow",passed:l,summary:`${l?"Passed":"Not yet"}: on target ${t.toFixed(0)}% of the walk (training target ${this.passPct}%). Mean framing error ${(i*100).toFixed(0)}% of half-frame; performer out of frame for ${this.lostS.toFixed(1)} s.`,metrics:{onTargetPct:Number(t.toFixed(1)),meanErrorPct:Number((i*100).toFixed(1)),rmsErrorPct:Number((o*100).toFixed(1)),maxErrorPct:Number((this.maxError*100).toFixed(1)),lostS:Number(this.lostS.toFixed(2)),durationS:Number(this.durationS.toFixed(2))}}}progress(){const e=this.elapsedS-this.countdownS,t=Math.max(this.trackedS,1e-9),i=this.trackedS>0?this.onTargetS/t*100:0;let o;return this.done?o=this.done.passed?"Complete. Tracking passed.":"Complete. Replay to improve the time on target.":this.startTime===null||e<0?o=`Get ready. The performer starts in ${Math.max(0,Math.ceil(this.countdownS-this.elapsedS))} s.`:this.last&&!this.last.visible?o="Performer out of frame. Find them.":this.last&&!this.last.sizeOk?o=this.last.sizePct<1?"Performer not visible.":`Adjust size: performer is ${this.last.sizePct.toFixed(0)}% of frame height.`:this.last&&!this.last.inBox?o="Re-centre the performer's chest in the target box.":o="On target. Keep following.",{id:"follow",status:this.done?"complete":"running",headline:o,note:"",checks:[],figures:[{label:"Walk",value:`${Math.min(this.durationS,Math.max(0,e)).toFixed(0)} / ${this.durationS.toFixed(0)} s`},{label:"On target",value:`${i.toFixed(0)}%`},{label:"Framing error",value:this.last?`${(this.last.error*100).toFixed(0)}%`:"—"}],result:this.done}}}function d_(s,e,t){const i=tu(s,e.lens).hfovDeg,o=tu(s,t.lens).hfovDeg;return{angleDeg:Math.max(Math.abs(e.pan-t.pan),Math.abs(e.tilt-t.tilt)),fovRatio:Math.max(i,o)/Math.min(i,o)}}const ch=s=>({pan:s.pan,tilt:s.tilt,lens:s.lens});function Ay(s,e,t,i){const o=d_(s,e,t);return o.angleDeg>=i.distinctDeg||o.fovRatio>=i.distinctFovRatio}function Cy(s,e,t){const i=Math.max(Math.abs(e.pan-s.pan),Math.abs(e.tilt-s.tilt)),o=Math.abs(e.lens-s.lens);return{slot:s.slot,panTiltDeviationDeg:i,lensDeviation:o,ok:i<=t.panTiltToleranceDeg&&o<=t.lensTolerance}}class Ry{constructor(){ge(this,"id","recall");ge(this,"step","store-a");ge(this,"a",null);ge(this,"b",null);ge(this,"landings",new Map);ge(this,"note","");ge(this,"startTime",null);ge(this,"lastTime",0);ge(this,"done",null)}performerTime(){return null}sample(e){if(this.startTime===null&&(this.startTime=e.time),this.lastTime=e.time,this.done||this.step!=="move-away"||!this.a||!this.b)return;const t=e.settings.recall,i=o=>{const l=d_(e.profile,e.pose,ch(o));return l.angleDeg>=t.moveAwayDeg||l.fovRatio>=t.distinctFovRatio};i(this.a)&&i(this.b)&&(this.step="recall",this.note="")}handleEvent(e,t){if(this.done)return;const i=t.settings.recall;if(e.type==="preset-stored"){const f=e.preset;if(this.step==="store-a"){this.a=f,this.step="store-b",this.note=`Shot A stored in preset ${f.slot}.`;return}if(this.step==="store-b"&&this.a){if(f.slot===this.a.slot){this.a=f,this.note=`Preset ${f.slot} replaced shot A. Store shot B in a different slot.`;return}if(!Ay(t.profile,ch(this.a),ch(f),i)){this.note=`Too close to shot A. Change pan or tilt by ${i.distinctDeg}° or the field of view by ${i.distinctFovRatio}×, then store again.`;return}this.b=f,this.step="move-away",this.note=`Shot B stored in preset ${f.slot}. Now move away from both shots.`;return}if(this.a&&f.slot===this.a.slot)this.a=f;else if(this.b&&f.slot===this.b.slot)this.b=f;else return;this.landings.delete(f.slot),this.step="move-away",this.note=`Preset ${f.slot} was stored again. Move away, then recall both shots.`;return}if(e.type==="recall-interrupted"&&e.target.kind==="preset"&&this.step==="recall"){this.note=`Recall of preset ${e.target.slot} was interrupted. Recall it again without touching the controls.`;return}if(e.type!=="recall-complete"||e.target.kind!=="preset"||this.step!=="recall"||!this.a||!this.b)return;const o=e.target.slot,l=o===this.a.slot?this.a:o===this.b.slot?this.b:null;if(!l){this.note=`Preset ${o} is not part of this exercise. Recall preset ${this.a.slot} and preset ${this.b.slot}.`;return}const c=Cy(l,e.pose,i);this.landings.set(o,c),this.note=c.ok?`Preset ${o} landed within tolerance.`:`Preset ${o} landed ${c.panTiltDeviationDeg.toFixed(2)}° away, outside the ${i.panTiltToleranceDeg}° tolerance.`;const d=this.landings.get(this.a.slot),h=this.landings.get(this.b.slot);if(d!=null&&d.ok&&(h!=null&&h.ok)){const f=t.time-(this.startTime??t.time);this.done={exercise:"recall",passed:!0,summary:`Both shots recalled within tolerance (presets ${this.a.slot} and ${this.b.slot}) in ${f.toFixed(1)} s.`,metrics:{elapsedS:Number(f.toFixed(2)),maxPanTiltDeviationDeg:Number(Math.max(d.panTiltDeviationDeg,h.panTiltDeviationDeg).toFixed(4)),maxLensDeviation:Number(Math.max(d.lensDeviation,h.lensDeviation).toFixed(5)),presetA:this.a.slot,presetB:this.b.slot}}}}progress(){const e=this.a,t=this.b,i=c=>{var d;return!!(c&&((d=this.landings.get(c.slot))!=null&&d.ok))},o=[{label:e?`Shot A stored (preset ${e.slot})`:"Store shot A in a preset",done:!!e},{label:t?`Shot B stored (preset ${t.slot})`:"Store a different shot B in another preset",done:!!t},{label:"Move away from both shots",done:this.step==="recall"||!!this.done},{label:e?`Recall preset ${e.slot} within tolerance`:"Recall shot A",done:i(e)},{label:t?`Recall preset ${t.slot} within tolerance`:"Recall shot B",done:i(t)}],l={"store-a":"Frame shot A, then store it in a preset slot.","store-b":"Frame a clearly different shot B, then store it in another slot.","move-away":"Move the camera away from both stored shots.",recall:"Recall both presets. Keep your hands off the controls while each recall runs."};return{id:"recall",status:this.done?"complete":"running",headline:this.done?"Complete. Both shots recalled within tolerance.":l[this.step],note:this.done?"":this.note,checks:o,figures:[{label:"Elapsed",value:`${Math.max(0,this.lastTime-(this.startTime??this.lastTime)).toFixed(0)} s`}],result:this.done}}}const uh=2;function Py(s){const e=s.stageWidth/2,t=i=>{var o;return((o=s.marks.find(l=>l.id===i))==null?void 0:o.point)??{right:0,upstage:0,height:0}};return[{id:"dsr-corner",label:"DSR corner",short:"DSR",point:{right:e,upstage:0,height:0}},{id:"dsl-corner",label:"DSL corner",short:"DSL",point:{right:-e,upstage:0,height:0}},{id:"usr-head",label:"USR head height",short:"USR",point:{...t("USR"),height:uh}},{id:"usc-head",label:"USC head height",short:"USC",point:{...t("USC"),height:uh}},{id:"usl-head",label:"USL head height",short:"USL",point:{...t("USL"),height:uh}}]}function h_(s,e,t){const i=t.safeAreaPct/100,o=Py(e).map(f=>{const g=jc(s,Ar(f.point));return{...f,projection:g,inside:a_(g,i)}}),[l,c]=o,d=l.projection.inFront&&c.projection.inFront?Math.abs(l.projection.x-c.projection.x)/2*100:0,h=o.filter(f=>f.inside).length;return{markers:o,allInside:h===o.length,insideCount:h,stageFillPct:d}}class Dy{constructor(){ge(this,"id","wide");ge(this,"startTime",null);ge(this,"steadyS",0);ge(this,"done",null);ge(this,"last",null);ge(this,"lastMoving",!1);ge(this,"holdS",1);ge(this,"minFill",55)}performerTime(){return null}sample(e){if(this.done)return;this.startTime===null&&(this.startTime=e.time),this.holdS=e.settings.wide.holdS,this.minFill=e.settings.wide.minStageFillPct;const t=h_(e.frame,e.geometry,e.settings.wide);this.last=t,this.lastMoving=e.moving;const o=t.allInside&&t.stageFillPct>=this.minFill&&!e.moving;if(this.steadyS=o?this.steadyS+e.dt:0,o&&this.steadyS+1e-9>=this.holdS){const l=e.time-this.startTime;this.done={exercise:"wide",passed:!0,summary:`Wide shot held in ${l.toFixed(1)} s. The downstage edge fills ${t.stageFillPct.toFixed(0)}% of the frame and every marker is inside the ${e.settings.wide.safeAreaPct}% safe area.`,metrics:{elapsedS:Number(l.toFixed(2)),stageFillPct:Number(t.stageFillPct.toFixed(1)),hfovDeg:Number(e.frame.hfovDeg.toFixed(2)),panDeg:Number(e.pose.pan.toFixed(2)),tiltDeg:Number(e.pose.tilt.toFixed(2))}}}}handleEvent(){}evaluation(){return this.last}progress(){const e=this.last,t=e?[...e.markers.map(o=>({label:`${o.label} inside safe area`,done:o.inside})),{label:`Downstage edge fills at least ${this.minFill}% of frame`,done:e.stageFillPct>=this.minFill}]:[];let i="Frame the whole performance area.";return this.done?i="Complete. The wide shot is established.":e&&!e.allInside?i=`Bring every marker inside the safe area (${e.insideCount} of ${e.markers.length} inside).`:e&&e.stageFillPct<this.minFill?i=`Tighten: the stage fills ${e.stageFillPct.toFixed(0)}% of the frame; aim for ${this.minFill}% or more.`:e&&this.lastMoving?i="Framed. Stop moving to lock the shot.":e&&(i=`Holding… ${Math.min(this.steadyS,this.holdS).toFixed(1)} of ${this.holdS.toFixed(1)} s.`),{id:"wide",status:this.done?"complete":"running",headline:i,note:"",checks:t,figures:e?[{label:"Stage fill",value:`${e.stageFillPct.toFixed(0)}%`}]:[],result:this.done}}}const of=240,Tr=1/of,u0=.5,Ly={linear:1,smoothstep:1.5,smootherstep:1.875};function Ny(s,e){const t=Pn(e,0,1);return s==="linear"?t:s==="smoothstep"?t*t*(3-2*t):t*t*t*(t*(t*6-15)+10)}function Iy(s,e){const t=Pn(e,0,1);return s==="linear"?1:s==="smoothstep"?6*t*(1-t):30*t*t*(t-1)*(t-1)}function dh(s,e,t){const i=Math.abs(Pn(s,-1,1));if(i<=e)return 0;const o=(i-e)/(1-e);return Math.sign(s)*Math.pow(o,t)}function hh(s,e,t,i,o){const l=e-s;if(l===0)return s;const h=(s!==0&&Math.sign(l)!==Math.sign(s)?i:t)*o;return Math.abs(l)<=h?e:s+Math.sign(l)*h}const fo=1e-9;class Uy{constructor(e,t,i,o={pan:0,tilt:0,lens:0}){ge(this,"profile");ge(this,"mount");ge(this,"tickCount",0);ge(this,"origin",null);ge(this,"pausedAt",null);ge(this,"pose");ge(this,"velocity",{pan:0,tilt:0,lens:0});ge(this,"input",{pan:0,tilt:0,zoom:0});ge(this,"speeds");ge(this,"recall",null);ge(this,"atLimit",{pan:null,tilt:null,lens:null});ge(this,"events",[]);ge(this,"tickListener",null);this.profile=e,this.mount=t,this.speeds={...i},this.pose=this.clampPose(o)}advanceTo(e){if(!Number.isFinite(e))return 0;if(this.origin===null)return this.origin=e-this.tickCount*Tr,0;if(this.pausedAt!==null)return 0;let t=e-this.origin;const i=t-this.tickCount*Tr;i>u0&&(this.origin+=i-u0,t=e-this.origin);const o=Math.floor(t*of+1e-7);let l=0;for(;this.tickCount<o;)this.step(),l+=1;return l}pause(e){this.pausedAt===null&&(this.advanceTo(e),this.pausedAt=e)}resume(e){this.pausedAt!==null&&(this.origin!==null&&(this.origin+=e-this.pausedAt),this.pausedAt=null)}get paused(){return this.pausedAt!==null}get tick(){return this.tickCount}get time(){return this.tickCount*Tr}setInput(e){const t={pan:Pn(e.pan??this.input.pan,-1,1),tilt:Pn(e.tilt??this.input.tilt,-1,1),zoom:Pn(e.zoom??this.input.zoom,-1,1)};this.input=t;const i=this.profile.behaviour.deadband;this.recall&&(Math.abs(t.pan)>i||Math.abs(t.tilt)>i||Math.abs(t.zoom)>i)&&this.interruptRecall("manual")}release(){this.input={pan:0,tilt:0,zoom:0}}stop(){this.release(),this.recall&&this.interruptRecall("stop")}halt(e){this.input={pan:0,tilt:0,zoom:0},this.recall&&this.interruptRecall("halt"),this.velocity={pan:0,tilt:0,lens:0},this.events.push({type:"halt",reason:e,tick:this.tickCount})}setSpeeds(e){this.speeds={...e}}configure(e,t){this.profile=e,this.mount=t,this.recall&&this.interruptRecall("profile"),this.input={pan:0,tilt:0,zoom:0},this.velocity={pan:0,tilt:0,lens:0},this.pose=this.clampPose(this.pose)}place(e){this.recall&&this.interruptRecall("stop"),this.velocity={pan:0,tilt:0,lens:0},this.pose=this.clampPose(e)}recallTo(e,t){const i=this.clampPose(e),o=Math.abs(i.pan-e.pan)>fo||Math.abs(i.tilt-e.tilt)>fo||Math.abs(i.lens-e.lens)>fo;this.recall&&this.interruptRecall("stop"),this.input={pan:0,tilt:0,zoom:0};const l={...this.pose},c=ap(this.profile,this.speeds.preset),d=nu(this.profile,rr),h=Ly[this.profile.behaviour.presetEasing],f=Math.max(Math.abs(i.pan-l.pan)/c,Math.abs(i.tilt-l.tilt)/c,Math.abs(i.lens-l.lens)/d),g=Math.max(this.profile.behaviour.presetMinDurationS,h*f),m=Math.max(1,Math.round(g*of));return this.recall={target:t,from:l,to:i,startTick:this.tickCount,durationTicks:m},this.events.push({type:"recall-start",target:t,durationS:m*Tr,tick:this.tickCount}),{durationS:m*Tr,clamped:o}}home(){return this.recallTo({pan:0,tilt:0,lens:0},{kind:"home"})}drainEvents(){const e=this.events;return this.events=[],e}limits(){const e=$S(this.profile,this.mount);return{panMin:this.profile.limits.panMinDeg,panMax:this.profile.limits.panMaxDeg,tiltMin:e.min,tiltMax:e.max}}getPose(){return{...this.pose}}isMoving(){return this.recall!==null||Math.abs(this.velocity.pan)>fo||Math.abs(this.velocity.tilt)>fo||Math.abs(this.velocity.lens)>fo}snapshot(){const e=this.recall?{target:this.recall.target,progress:Pn((this.tickCount-this.recall.startTick)/this.recall.durationTicks,0,1),durationS:this.recall.durationTicks*Tr}:null;return{tick:this.tickCount,time:this.time,pose:{...this.pose},velocity:{...this.velocity},input:{...this.input},speeds:{...this.speeds},recall:e,limits:this.limits(),atLimit:{...this.atLimit},moving:this.isMoving(),paused:this.paused}}clampPose(e){const t=this.limits();return{pan:Pn(e.pan,t.panMin,t.panMax),tilt:Pn(e.tilt,t.tiltMin,t.tiltMax),lens:Pn(e.lens,0,1)}}interruptRecall(e){this.recall&&(this.events.push({type:"recall-interrupted",target:this.recall.target,reason:e,tick:this.tickCount}),this.recall=null)}step(){var t;const e=this.tickCount+1;this.recall?this.stepRecall(e):this.stepManual(),this.tickCount=e,(t=this.tickListener)==null||t.call(this,e)}setTickListener(e){this.tickListener=e}stepRecall(e){const t=this.recall,i=this.profile.behaviour.presetEasing,o=(e-t.startTick)/t.durationTicks;if(o>=1){this.pose={...t.to},this.velocity={pan:0,tilt:0,lens:0},this.recall=null,this.atLimit={pan:null,tilt:null,lens:null},this.events.push({type:"recall-complete",target:t.target,pose:{...t.to},tick:e});return}const l=Ny(i,o),c=Iy(i,o)/(t.durationTicks*Tr);this.pose={pan:t.from.pan+(t.to.pan-t.from.pan)*l,tilt:t.from.tilt+(t.to.tilt-t.from.tilt)*l,lens:t.from.lens+(t.to.lens-t.from.lens)*l},this.velocity={pan:(t.to.pan-t.from.pan)*c,tilt:(t.to.tilt-t.from.tilt)*c,lens:(t.to.lens-t.from.lens)*c}}stepManual(){const e=Tr,t=this.profile.behaviour,i=this.profile.published.minSpeedDegS,o=XS(this.profile,this.pose.lens),l=Math.max(mu(this.profile,this.speeds.pan)*o,i),c=Math.max(op(this.profile,this.speeds.tilt)*o,i),d=nu(this.profile,this.speeds.zoom),h=dh(this.input.pan,t.deadband,t.curveExponent)*l,f=dh(this.input.tilt,t.deadband,t.curveExponent)*c,g=dh(this.input.zoom,t.deadband,t.curveExponent)*d,m=this.velocity;m.pan=hh(m.pan,h,l/t.rampUpS,Math.max(Math.abs(m.pan),l)/t.stopS,e),m.tilt=hh(m.tilt,f,c/t.rampUpS,Math.max(Math.abs(m.tilt),c)/t.stopS,e),m.lens=hh(m.lens,g,d/t.zoomRampS,Math.max(Math.abs(m.lens),d)/t.zoomRampS,e);const v=this.limits();this.pose.pan=this.integrate("pan",this.pose.pan,m,e,v.panMin,v.panMax),this.pose.tilt=this.integrate("tilt",this.pose.tilt,m,e,v.tiltMin,v.tiltMax),this.pose.lens=this.integrate("lens",this.pose.lens,m,e,0,1)}integrate(e,t,i,o,l,c){const d=t+i[e]*o;return d<=l&&i[e]<0?(i[e]=0,this.atLimit[e]!=="min"&&this.events.push({type:"limit",axis:e,side:"min",tick:this.tickCount+1}),this.atLimit[e]="min",l):d>=c&&i[e]>0?(i[e]=0,this.atLimit[e]!=="max"&&this.events.push({type:"limit",axis:e,side:"max",tick:this.tickCount+1}),this.atLimit[e]="max",c):(d>l&&d<c&&(this.atLimit[e]=null),Pn(d,l,c))}}const d0=8,Fy=400,h0=3,Oy=.2;function ky(){const s=Math.random().toString(36).slice(2,10);return`r-${Date.now().toString(36)}-${s}`}function fh(s){return s.name?`preset ${s.slot} (${s.name})`:`preset ${s.slot}`}class By{constructor(e){ge(this,"project");ge(this,"geometry");ge(this,"sim");ge(this,"exercise",null);ge(this,"exerciseId",null);ge(this,"exerciseRecorded",!1);ge(this,"performerEpoch",0);ge(this,"storageStatus");ge(this,"storageNotice");ge(this,"announcement",null);ge(this,"announcementCount",0);ge(this,"storeArmed",!1);ge(this,"overwrite",null);ge(this,"promptArmed",!1);ge(this,"promptTimer",null);ge(this,"storageConflict",!1);ge(this,"renderStatus","starting");ge(this,"renderNote","");ge(this,"hidden",!1);ge(this,"lastWall",0);ge(this,"wasMoving",!1);ge(this,"lastProgressEmit",-1/0);ge(this,"lastProgressKey","");ge(this,"saveTimer",null);ge(this,"listeners",new Set);ge(this,"state");ge(this,"subscribe",e=>(this.listeners.add(e),()=>this.listeners.delete(e)));ge(this,"getState",()=>this.state);this.storage=e;const t=s0(e);this.project=t.project,this.storageStatus=t.status,this.storageNotice=t.notice;let i=Ba(this.project.venue);if(i.ok||(this.project=za(),i=Ba(this.project.venue)),!i.ok)throw new Error("The default venue geometry is invalid.");this.geometry=i.geometry;const{session:o,camera:l}=this.project;this.sim=new Uy(l,this.geometry.mountOrientation,o.speeds,o.pose),this.sim.setTickListener(c=>this.onTick(c)),this.state=this.buildState()}emit(){this.state=this.buildState();for(const e of this.listeners)e()}buildState(){return{project:this.project,geometry:this.geometry,unsettled:ay(this.project.venue),calibrated:YS(this.project.camera),exercise:this.exercise&&this.exerciseId?{id:this.exerciseId,progress:this.exercise.progress()}:null,storage:this.storageStatus,storageNotice:this.storageNotice,storageConflict:this.storageConflict,announcement:this.announcement,storeArmed:this.storeArmed,renderStatus:this.renderStatus,renderNote:this.renderNote,hidden:this.hidden}}announce(e,t="info"){this.announcementCount+=1,this.announcement={id:this.announcementCount,text:e,tone:t}}advanceTo(e){this.lastWall=e,this.sim.advanceTo(e)}hide(e){this.hidden||(this.advanceTo(e),this.sim.halt("hidden"),this.sim.pause(e),this.hidden=!0,this.flushSave(),this.emit())}show(e){this.hidden&&(this.sim.resume(e),this.hidden=!1,this.lastWall=e,this.announce("Simulation resumed. Motion was stopped while the page was hidden."),this.emit())}getTelemetry(){const e=this.sim.snapshot(),t=this.project.camera;return{snapshot:e,lens:tu(t,e.pose.lens),frame:l0(this.geometry,e.pose,t),performer:this.performerNow(),geometry:this.geometry,profile:t,exercise:this.exercise}}setRenderStatus(e,t=""){e===this.renderStatus&&t===this.renderNote||(e==="lost"&&(this.sim.halt("graphics context lost"),this.announce("The 3D view stopped because the browser reset its graphics. Motion was stopped.","warn")),this.renderStatus=e,this.renderNote=t,this.emit())}performerConfig(){const e=this.project.session.performer;return this.exerciseId==="follow"&&this.exercise?{...e,mode:"path"}:e}performerNow(){var o;const e=this.sim.time,i=((o=this.exercise)==null?void 0:o.performerTime(e))??e-this.performerEpoch;return wy(this.performerConfig(),this.geometry.marks,i)}exerciseSample(e){const t=this.sim.getPose();return{time:this.sim.time,dt:e,pose:t,moving:this.sim.isMoving(),frame:l0(this.geometry,t,this.project.camera),geometry:this.geometry,profile:this.project.camera,performer:this.performerNow(),settings:this.project.session.exerciseSettings}}onTick(e){var c;if(e%d0!==0)return;const t=this.sim.drainEvents(),i=this.sim.isMoving();if(t.length===0&&!this.exercise&&i===this.wasMoving)return;const o=this.exerciseSample(d0*Tr);let l=!1;for(const d of t)l=this.reactToSimEvent(d)||l,(c=this.exercise)==null||c.handleEvent(d,o);if(this.wasMoving&&!i&&this.scheduleSave(),this.wasMoving=i,this.exercise){this.exercise.sample(o),l=this.recordExerciseIfComplete()||l;const d=this.exercise.progress(),h=`${d.status}|${d.headline}|${d.note}|${d.checks.map(f=>f.done?1:0).join("")}|${d.figures.map(f=>f.value).join(",")}`;h!==this.lastProgressKey&&(o.time-this.lastProgressEmit>=Oy||d.status==="complete")&&(this.lastProgressKey=h,this.lastProgressEmit=o.time,l=!0)}l&&this.emit()}reactToSimEvent(e){switch(e.type){case"recall-complete":return this.announce(e.target.kind==="home"?"Home reached.":`Preset ${e.target.slot} reached.`,"success"),this.scheduleSave(),!0;case"recall-interrupted":return e.reason==="manual"?(this.announce(`${e.target.kind==="home"?"Home":`Preset ${e.target.slot}`} interrupted by manual control.`),!0):!1;case"limit":return this.announce(`${e.axis==="lens"?e.side==="max"?"Full tele":"Full wide":`${e.axis==="pan"?"Pan":"Tilt"} limit`} reached.`,"warn"),!0;default:return!1}}setDrive(e,t){this.hidden||(this.advanceTo(t),this.sim.setInput(e))}stop(e){this.advanceTo(e),this.sim.stop()}home(e){if(this.hidden)return;this.advanceTo(e);const{clamped:t}=this.sim.home();this.announce(t?"Home is outside the current limits; moving to the nearest allowed pose.":"Moving to home: pan 0°, tilt 0°, full wide."),this.emit()}recallPreset(e,t){if(this.hidden)return;this.advanceTo(t),this.storeArmed=!1;const i=this.project.session.presets.find(c=>c.slot===e);if(!i){this.announce(`Preset ${e} is empty. Store the current shot first.`,"warn"),this.emit();return}if(i.cameraId!==this.project.camera.id){this.announce(`Preset ${e} belongs to camera ${i.cameraId}, not this camera.`,"warn"),this.emit();return}const{durationS:o,clamped:l}=this.sim.recallTo(i,{kind:"preset",slot:e,name:i.name});this.announce(`Recalling ${fh(i)} over ${o.toFixed(1)} s${l?", clamped to the current limits":""}.`),this.emit()}armStore(e){this.clearReplacePrompt(),this.storeArmed=e,e&&this.announce("Store armed. Choose a preset number for the current shot."),this.emit()}clearReplacePrompt(){this.promptTimer!==null&&clearTimeout(this.promptTimer),this.promptTimer=null,this.promptArmed=!1,this.overwrite=null}storePreset(e,t){if(e<1||e>Ya)return;this.advanceTo(t);const i=this.project.session,o=i.presets.find(h=>h.slot===e);if(o&&!(this.overwrite&&this.overwrite.slot===e&&t<=this.overwrite.until)){const h=this.storeArmed&&!this.promptArmed;this.clearReplacePrompt(),this.overwrite={slot:e,until:t+h0},this.storeArmed=!0,h||(this.promptArmed=!0,this.promptTimer=setTimeout(()=>{this.promptTimer=null,this.promptArmed&&(this.promptArmed=!1,this.overwrite=null,this.storeArmed=!1,this.announce(`Preset ${e} was kept. Number keys recall presets again.`),this.emit())},h0*1e3)),this.announce(`${fh(o)} is already stored. Press ${e} again within 3 s to replace it.`,"warn"),this.emit();return}const l=this.sim.getPose(),c={slot:e,name:(o==null?void 0:o.name)??"",cameraId:this.project.camera.id,pan:l.pan,tilt:l.tilt,lens:l.lens,savedAt:new Date().toISOString()};this.project={...this.project,session:{...i,presets:[...i.presets.filter(h=>h.slot!==e),c].sort((h,f)=>h.slot-f.slot)}},this.clearReplacePrompt(),this.storeArmed=!1,this.announce(`${o?"Replaced":"Stored"} ${fh(c)}.`,"success");const d={type:"preset-stored",preset:c,tick:this.sim.tick};this.exercise&&(this.exercise.handleEvent(d,this.exerciseSample(0)),this.recordExerciseIfComplete()),this.scheduleSave(),this.emit()}renamePreset(e,t){const i=this.project.session,o=t.slice(0,40);this.project={...this.project,session:{...i,presets:i.presets.map(l=>l.slot===e?{...l,name:o}:l)}},this.scheduleSave(),this.emit()}deletePreset(e){const t=this.project.session;this.project={...this.project,session:{...t,presets:t.presets.filter(i=>i.slot!==e)}},this.announce(`Preset ${e} deleted.`),this.scheduleSave(),this.emit()}setSpeed(e,t){const i=Pn(Math.round(t),Us,rr),o=this.project.session;if(o.speeds[e]===i)return;const l={...o.speeds,[e]:i};this.project={...this.project,session:{...o,speeds:l}},this.sim.setSpeeds(l),this.scheduleSave(),this.emit()}nudgeSpeed(e,t){const i=e.map(o=>`${o} ${Pn(this.project.session.speeds[o]+t,Us,rr)}`);for(const o of e)this.setSpeed(o,this.project.session.speeds[o]+t);this.announce(`Speed: ${i.join(", ")} of ${rr}.`),this.emit()}followRunning(){var e;return this.exerciseId==="follow"&&((e=this.exercise)==null?void 0:e.progress().status)==="running"}updateVenue(e){if(this.followRunning())return{ok:!1,issues:[{path:"venue",message:"The follow exercise is running on this stage. Finish or reset it first."}]};const t=n_(e);if(!t.ok)return{ok:!1,issues:t.issues};const i=Ba(t.venue);if(!i.ok)return{ok:!1,issues:i.issues};const o=i.geometry.mountOrientation!==this.geometry.mountOrientation;return this.project={...this.project,venue:t.venue},this.geometry=i.geometry,o&&this.sim.configure(this.project.camera,this.geometry.mountOrientation),this.scheduleSave(),this.emit(),{ok:!0}}updateCamera(e){const t=Yv(e);return t.ok?(this.project={...this.project,camera:t.camera},this.sim.configure(t.camera,this.geometry.mountOrientation),this.scheduleSave(),this.emit(),{ok:!0}):{ok:!1,issues:t.issues}}updatePerformer(e){if(this.followRunning())return{ok:!1,issues:[{path:"session.performer",message:"The follow exercise is using the performer. Finish or reset it first."}]};const t=this.project.session,i={...t,performer:{...t.performer,...e}},o=nf(i);if(!o.ok)return{ok:!1,issues:o.issues};const l=e.mode==="path"||e.pathId!==void 0;return this.project={...this.project,session:{...t,performer:o.session.performer}},l&&(this.performerEpoch=this.sim.time),this.scheduleSave(),this.emit(),{ok:!0}}restartPerformer(){this.performerEpoch=this.sim.time,this.emit()}updateExerciseSettings(e){const t=this.project.session,i=nf({...t,exerciseSettings:e});return i.ok?(this.project={...this.project,session:{...t,exerciseSettings:i.session.exerciseSettings}},this.scheduleSave(),this.emit(),{ok:!0}):{ok:!1,issues:i.issues}}setUnit(e){const t=this.project.session;this.project={...this.project,session:{...t,preferences:{...t.preferences,unit:e}}},this.scheduleSave(),this.emit()}setGuides(e){const t=this.project.session,i={...t.preferences.guides,...e};this.project={...this.project,session:{...t,preferences:{...t.preferences,guides:i}}},this.scheduleSave(),this.emit()}resetVenue(){const e=this.updateVenue({...t_(),id:this.project.venue.id});return this.announce(e.ok?"Venue reset to the default FMP estimates.":e.issues[0].message,e.ok?"info":"warn"),this.emit(),e}resetCamera(){const e=this.updateCamera({...tp(),id:this.project.camera.id});return this.announce(e.ok?"Camera profile reset to the P240 defaults.":e.issues[0].message,e.ok?"info":"warn"),this.emit(),e}resetSession(e){this.advanceTo(e);const t=Qv(this.project.venue.id,this.project.camera.id);this.project={...this.project,session:t},this.exercise=null,this.exerciseId=null,this.sim.place(t.pose),this.sim.setSpeeds(t.speeds),this.performerEpoch=this.sim.time,this.announce("Session reset. Presets and exercise results were cleared."),this.scheduleSave(),this.emit()}startExercise(e,t){if(this.advanceTo(t),this.exerciseId=e,this.exerciseRecorded=!1,this.lastProgressKey="",e==="wide")this.sim.home(),this.exercise=new Dy;else if(e==="recall")this.exercise=new Ry;else{const i=c_({...this.project.session.performer},this.geometry.marks);this.exercise=new by(i.loopS)}this.exercise.sample(this.exerciseSample(0)),this.announce(e==="wide"?"Exercise started: the camera is returning home. Establish a wide shot of the whole performance area.":`Exercise started: ${e==="follow"?"follow a performer":"save and recall two shots"}.`),this.emit()}resetExercise(){this.exercise=null,this.exerciseId=null,this.announce("Exercise reset."),this.emit()}recordExerciseIfComplete(){if(!this.exercise||this.exerciseRecorded)return!1;const e=this.exercise.progress();if(e.status!=="complete"||!e.result)return!1;this.exerciseRecorded=!0;const t={...e.result,id:ky(),completedAt:new Date().toISOString()},i=this.project.session,o=[...i.exerciseResults,t].slice(-tf);return this.project={...this.project,session:{...i,exerciseResults:o}},this.announce(t.summary,t.passed?"success":"warn"),this.scheduleSave(),!0}clearResults(){const e=this.project.session;this.project={...this.project,session:{...e,exerciseResults:[]}},this.scheduleSave(),this.emit()}projectForSave(){const e=this.sim.getPose();return{...this.project,session:{...this.project.session,pose:{pan:e.pan,tilt:e.tilt,lens:e.lens}}}}exportText(){return s_(this.projectForSave())}importText(e,t){const i=r_(e);if(!i.ok)return this.announce("Import rejected. The open session was kept.","warn"),this.emit(),{ok:!1,issues:i.issues};const o=this.replaceProject(i.project,t);return o.ok?(this.storageConflict=!1,this.announce(`Imported ${this.project.session.presets.length} presets, the venue profile and the camera profile.`,"success"),this.scheduleSave(),this.emit(),{ok:!0}):o}replaceProject(e,t){const i=Ba(e.venue);return i.ok?(this.advanceTo(t),this.project=e,this.geometry=i.geometry,this.exercise=null,this.exerciseId=null,this.clearReplacePrompt(),this.storeArmed=!1,this.sim.configure(this.project.camera,this.geometry.mountOrientation),this.sim.setSpeeds(this.project.session.speeds),this.sim.place(this.project.session.pose),this.performerEpoch=this.sim.time,{ok:!0}):{ok:!1,issues:i.issues}}noteExternalSave(){this.storageConflict||(this.storageConflict=!0,this.saveTimer!==null&&clearTimeout(this.saveTimer),this.saveTimer=null,this.announce("Another tab saved a different copy of this session. Choose which one to keep.","warn"),this.emit())}useSavedCopy(e){const t=s0(this.storage);if(t.status.state!=="ok"||t.notice){const o=t.notice??"The saved copy could not be read.";return this.announce(o,"warn"),this.emit(),{ok:!1,issues:[{path:"storage",message:o}]}}const i=this.replaceProject(t.project,e);return i.ok?(this.storageConflict=!1,this.announce("Loaded the session saved by the other tab.","success"),this.emit(),{ok:!0}):i}keepThisCopy(){this.storageConflict=!1,this.flushSave(),this.announce("Kept this tab's session. It is saved again."),this.emit()}scheduleSave(){this.saveTimer!==null&&clearTimeout(this.saveTimer),!this.storageConflict&&(this.saveTimer=setTimeout(()=>{this.saveTimer=null,this.flushSave()},Fy))}flushSave(){if(this.saveTimer!==null&&(clearTimeout(this.saveTimer),this.saveTimer=null),this.storageConflict)return;const e=this.storageStatus.state;this.storageStatus=hy(this.storage,this.projectForSave()),this.storageStatus.state!==e&&(this.storageStatus.state==="unavailable"&&this.announce(`${this.storageStatus.reason} Export the session to keep it.`,"warn"),this.emit())}dismissStorageNotice(){this.storageNotice=null,this.emit()}get wall(){return this.lastWall}}const af="fmpTheme",zy={light:"#eee8df",dark:"#0c1016"};function f0(){try{const s=window.localStorage.getItem(af);return s==="light"||s==="dark"||s==="auto"?s:"light"}catch{return"light"}}const p0=()=>{var s;return(s=window.matchMedia)==null?void 0:s.call(window,"(prefers-color-scheme: dark)")};function Hy(){const[s,e]=He.useState(f0),[t,i]=He.useState(()=>{var c;return!!((c=p0())!=null&&c.matches)});He.useEffect(()=>{const c=p0();if(!c)return;const d=()=>i(c.matches);c.addEventListener("change",d);const h=f=>{f.key===af&&e(f0())};return window.addEventListener("storage",h),()=>{c.removeEventListener("change",d),window.removeEventListener("storage",h)}},[]);const o=s==="auto"?t?"dark":"light":s;He.useEffect(()=>{var c;document.documentElement.dataset.theme=o,(c=document.querySelector('meta[name="theme-color"]'))==null||c.setAttribute("content",zy[o])},[o]);const l=He.useCallback(()=>{const c=o==="dark"?"light":"dark";try{window.localStorage.setItem(af,c)}catch{}e(c)},[o]);return{theme:o,toggle:l}}const m0={ArrowLeft:{axis:"pan",direction:-1},ArrowRight:{axis:"pan",direction:1},ArrowUp:{axis:"tilt",direction:1},ArrowDown:{axis:"tilt",direction:-1},KeyA:{axis:"pan",direction:-1},KeyD:{axis:"pan",direction:1},KeyW:{axis:"tilt",direction:1},KeyS:{axis:"tilt",direction:-1},KeyE:{axis:"zoom",direction:1},Equal:{axis:"zoom",direction:1},NumpadAdd:{axis:"zoom",direction:1},KeyQ:{axis:"zoom",direction:-1},Minus:{axis:"zoom",direction:-1},NumpadSubtract:{axis:"zoom",direction:-1}},ph={normal:.7,fast:1,fine:.35},cp=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"],Vy=new Set([...cp,"Home","End"]),g0=new Set([...cp,"Home","End","PageUp","PageDown"]),v0=new Set([...cp,"Space"]);function Gy(s){if(!(s instanceof HTMLElement))return null;if(s.isContentEditable||s.closest("dialog"))return"all";const e=s.tagName;if(e==="TEXTAREA"||e==="SELECT")return"all";if(e==="INPUT"){const i=s.type;return i==="range"?g0:i==="radio"?v0:["button","submit","reset","checkbox","file"].includes(i)?null:"all"}const t=s.getAttribute("role");return t==="tab"?Vy:t==="slider"||t==="spinbutton"?g0:t==="radio"?v0:t!==null&&["listbox","option","menuitem","textbox","combobox"].includes(t)?"all":null}const jy=(s,e)=>s==="all"||s!==null&&s.has(e);function Wy(s){if(!(s instanceof HTMLElement))return!1;const e=s.tagName;return e==="BUTTON"||e==="A"||e==="SUMMARY"||e==="INPUT"&&s.type==="checkbox"}function Xy(s){const e=/^(?:Digit|Numpad)([1-9])$/.exec(s);return e?Number(e[1]):null}function $y(s,e,t){const i=new Set;let o=!1,l=!1;const c=m=>{if(i.size===0){e.release("keyboard",m);return}const v=o?ph.fast:l?ph.fine:ph.normal,_={pan:0,tilt:0,zoom:0};for(const M of i){const w=m0[M];_[w.axis]+=w.direction}for(const M of["pan","tilt","zoom"])_[M]=Math.sign(_[M])*v;e.set("keyboard",_,m)},d=m=>{i.clear(),o=!1,l=!1,e.release("keyboard",m)},h=m=>{const v=ri(m);if(m.key==="Meta"){d(v);return}if(m.code==="Escape"){d(v),s.stop(v),s.getState().storeArmed&&s.armStore(!1);return}if(m.key==="Shift"||m.key==="Alt"){o=m.shiftKey,l=m.altKey,i.size&&c(v);return}if(m.defaultPrevented||m.ctrlKey||m.metaKey||jy(Gy(m.target),m.code))return;if(o=m.shiftKey,l=m.altKey,m0[m.code]){m.preventDefault(),i.has(m.code)||(i.add(m.code),c(v));return}if(m.repeat)return;const M=Xy(m.code);if(M!==null){m.preventDefault(),m.shiftKey||s.getState().storeArmed?s.storePreset(M,v):s.recallPreset(M,v);return}switch(m.code){case"KeyH":m.preventDefault(),s.home(v);return;case"Space":if(Wy(m.target))return;m.preventDefault(),d(v),s.stop(v);return;case"BracketLeft":case"BracketRight":{m.preventDefault();const w=m.code==="BracketRight"?1:-1;s.nudgeSpeed(m.shiftKey?["zoom"]:["pan","tilt"],w);return}case"Comma":case"Period":m.preventDefault(),s.nudgeSpeed(["preset"],m.code==="Period"?1:-1);return;case"KeyF":m.preventDefault(),t.toggleExpanded();return;case"Slash":m.shiftKey&&(m.preventDefault(),t.openHelp());return;default:return}},f=m=>{const v=ri(m);if(m.key==="Meta"){d(v);return}if(m.key==="Shift"||m.key==="Alt"){o=m.shiftKey,l=m.altKey,i.size&&c(v);return}i.delete(m.code)&&c(v)},g=()=>d(ri());return window.addEventListener("keydown",h),window.addEventListener("keyup",f),window.addEventListener("blur",g),()=>{window.removeEventListener("keydown",h),window.removeEventListener("keyup",f),window.removeEventListener("blur",g),d(ri())}}const Yy="http://www.w3.org/2000/svg",Ki=1600,Oi=900,_0=s=>(s+1)/2*Ki,x0=s=>(1-s)/2*Oi;function On(s,e,t){const i=document.createElementNS(Yy,s);for(const[o,l]of Object.entries(e))i.setAttribute(o,String(l));return t.appendChild(i),i}function $i(s,e){s.style.display=e?"":"none"}function S0(s,e,t){const i=Ki*e,o=Oi*t;s.setAttribute("x",String((Ki-i)/2)),s.setAttribute("y",String((Oi-o)/2)),s.setAttribute("width",String(i)),s.setAttribute("height",String(o))}class qy{constructor(e){ge(this,"safe");ge(this,"centre");ge(this,"thirds");ge(this,"wide");ge(this,"wideMarkers",[]);ge(this,"follow");ge(this,"followBox");ge(this,"followDot");ge(this,"followSize");e.replaceChildren();const t=On("g",{class:"ov-guides"},e);this.safe=On("rect",{class:"ov-safe"},t),this.centre=On("g",{class:"ov-centre"},t),On("line",{x1:Ki/2-34,y1:Oi/2,x2:Ki/2+34,y2:Oi/2},this.centre),On("line",{x1:Ki/2,y1:Oi/2-34,x2:Ki/2,y2:Oi/2+34},this.centre),this.thirds=On("g",{class:"ov-thirds"},t);for(const i of[1/3,2/3])On("line",{x1:Ki*i,y1:0,x2:Ki*i,y2:Oi},this.thirds),On("line",{x1:0,y1:Oi*i,x2:Ki,y2:Oi*i},this.thirds);this.wide=On("g",{class:"ov-wide"},e);for(let i=0;i<5;i+=1){const o=On("g",{class:"ov-marker"},this.wide),l=On("circle",{r:13},o),c=On("text",{dy:-22,"text-anchor":"middle"},o);this.wideMarkers.push({group:o,dot:l,text:c})}this.follow=On("g",{class:"ov-follow"},e),this.followBox=On("rect",{class:"ov-target"},this.follow),this.followSize=On("line",{class:"ov-size"},this.follow),this.followDot=On("circle",{class:"ov-chest",r:14},this.follow)}update(e,t){var h;const{guides:i}=t.project.session.preferences,o=t.project.session.exerciseSettings,l=o.wide.safeAreaPct/100;S0(this.safe,l,l),$i(this.safe,i.safeArea||((h=t.exercise)==null?void 0:h.id)==="wide"),$i(this.centre,i.centre),$i(this.thirds,i.thirds);const c=t.exercise,d=(c==null?void 0:c.progress.status)==="running";if((c==null?void 0:c.id)==="wide"&&d?(h_(e.frame,e.geometry,o.wide).markers.forEach((g,m)=>{const v=this.wideMarkers[m];if(!v)return;const _=g.projection.inFront&&Math.abs(g.projection.x)<1.6&&Math.abs(g.projection.y)<1.6;$i(v.group,_),_&&(v.group.setAttribute("transform",`translate(${_0(g.projection.x).toFixed(1)} ${x0(g.projection.y).toFixed(1)})`),v.group.setAttribute("class",`ov-marker ${g.inside?"is-in":"is-out"}`),v.text.textContent=g.short)}),$i(this.wide,!0)):$i(this.wide,!1),(c==null?void 0:c.id)==="follow"&&d){const f=o.follow;S0(this.followBox,f.targetWidthPct/100,f.targetHeightPct/100);const g=u_(e.frame,e.performer,o),m=Math.abs(g.x)<1.2&&Math.abs(g.y)<1.2&&g.error<2;if($i(this.followDot,m),$i(this.followSize,m),m){const v=_0(g.x),_=x0(g.y);this.followDot.setAttribute("cx",v.toFixed(1)),this.followDot.setAttribute("cy",_.toFixed(1)),this.followDot.setAttribute("class",`ov-chest ${g.onTarget?"is-in":"is-out"}`);const M=g.sizePct/100*Oi*.5;this.followSize.setAttribute("x1",(v+40).toFixed(1)),this.followSize.setAttribute("x2",(v+40).toFixed(1)),this.followSize.setAttribute("y1",(_-M*.56).toFixed(1)),this.followSize.setAttribute("y2",(_+M*1.44).toFixed(1)),this.followSize.setAttribute("class",`ov-size ${g.sizeOk?"is-in":"is-out"}`)}this.followBox.setAttribute("class",`ov-target ${g.inBox?"is-in":""}`),$i(this.follow,!0)}else $i(this.follow,!1)}}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const up="184",Uo={ROTATE:0,DOLLY:1,PAN:2},No={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Ky=0,y0=1,Zy=2,Wc=1,Jy=2,Va=3,as=0,ai=1,Qi=2,Cr=0,Fo=1,M0=2,E0=3,w0=4,Qy=5,Ds=100,eM=101,tM=102,nM=103,iM=104,rM=200,sM=201,oM=202,aM=203,lf=204,cf=205,lM=206,cM=207,uM=208,dM=209,hM=210,fM=211,pM=212,mM=213,gM=214,uf=0,df=1,hf=2,Bo=3,ff=4,pf=5,mf=6,gf=7,dp=0,vM=1,_M=2,sr=0,f_=1,p_=2,m_=3,hp=4,g_=5,v_=6,__=7,x_=300,ks=301,zo=302,mh=303,gh=304,vu=306,vf=1e3,br=1001,_f=1002,Dn=1003,xM=1004,oc=1005,Ln=1006,vh=1007,Ns=1008,mi=1009,S_=1010,y_=1011,Ka=1012,fp=1013,ar=1014,nr=1015,Pr=1016,pp=1017,mp=1018,Za=1020,M_=35902,E_=35899,w_=1021,T_=1022,zi=1023,Dr=1026,Is=1027,b_=1028,gp=1029,Bs=1030,vp=1031,_p=1033,Xc=33776,$c=33777,Yc=33778,qc=33779,xf=35840,Sf=35841,yf=35842,Mf=35843,Ef=36196,wf=37492,Tf=37496,bf=37488,Af=37489,iu=37490,Cf=37491,Rf=37808,Pf=37809,Df=37810,Lf=37811,Nf=37812,If=37813,Uf=37814,Ff=37815,Of=37816,kf=37817,Bf=37818,zf=37819,Hf=37820,Vf=37821,Gf=36492,jf=36494,Wf=36495,Xf=36283,$f=36284,ru=36285,Yf=36286,SM=3200,qf=0,yM=1,rs="",Xn="srgb",su="srgb-linear",ou="linear",zt="srgb",po=7680,T0=519,MM=512,EM=513,wM=514,xp=515,TM=516,bM=517,Sp=518,AM=519,Kf=35044,b0="300 es",ir=2e3,Ja=2001;function CM(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function au(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function RM(){const s=au("canvas");return s.style.display="block",s}const A0={};function lu(...s){const e="THREE."+s.shift();console.log(e,...s)}function A_(s){const e=s[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=s[1];t&&t.isStackTrace?s[0]+=" "+t.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function at(...s){s=A_(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...s)}}function Rt(...s){s=A_(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...s)}}function Zf(...s){const e=s.join(" ");e in A0||(A0[e]=!0,at(...s))}function PM(s,e,t){return new Promise(function(i,o){function l(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:o();break;case s.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:i()}}setTimeout(l,t)})}const DM={[uf]:df,[hf]:mf,[ff]:gf,[Bo]:pf,[df]:uf,[mf]:hf,[gf]:ff,[pf]:Bo};class us{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const o=i[e];if(o!==void 0){const l=o.indexOf(t);l!==-1&&o.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const o=i.slice(0);for(let l=0,c=o.length;l<c;l++)o[l].call(this,e);e.target=null}}}const kn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Kc=Math.PI/180,cu=180/Math.PI;function os(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(kn[s&255]+kn[s>>8&255]+kn[s>>16&255]+kn[s>>24&255]+"-"+kn[e&255]+kn[e>>8&255]+"-"+kn[e>>16&15|64]+kn[e>>24&255]+"-"+kn[t&63|128]+kn[t>>8&255]+"-"+kn[t>>16&255]+kn[t>>24&255]+kn[i&255]+kn[i>>8&255]+kn[i>>16&255]+kn[i>>24&255]).toLowerCase()}function Et(s,e,t){return Math.max(e,Math.min(t,s))}function LM(s,e){return(s%e+e)%e}function _h(s,e,t){return(1-t)*s+t*e}function er(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Ht(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const NM={DEG2RAD:Kc},Ap=class Ap{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,o=e.elements;return this.x=o[0]*t+o[3]*i+o[6],this.y=o[1]*t+o[4]*i+o[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),o=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*i-c*o+e.x,this.y=l*o+c*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Ap.prototype.isVector2=!0;let ot=Ap;class ls{constructor(e=0,t=0,i=0,o=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=o}static slerpFlat(e,t,i,o,l,c,d){let h=i[o+0],f=i[o+1],g=i[o+2],m=i[o+3],v=l[c+0],_=l[c+1],M=l[c+2],w=l[c+3];if(m!==w||h!==v||f!==_||g!==M){let y=h*v+f*_+g*M+m*w;y<0&&(v=-v,_=-_,M=-M,w=-w,y=-y);let S=1-d;if(y<.9995){const C=Math.acos(y),L=Math.sin(C);S=Math.sin(S*C)/L,d=Math.sin(d*C)/L,h=h*S+v*d,f=f*S+_*d,g=g*S+M*d,m=m*S+w*d}else{h=h*S+v*d,f=f*S+_*d,g=g*S+M*d,m=m*S+w*d;const C=1/Math.sqrt(h*h+f*f+g*g+m*m);h*=C,f*=C,g*=C,m*=C}}e[t]=h,e[t+1]=f,e[t+2]=g,e[t+3]=m}static multiplyQuaternionsFlat(e,t,i,o,l,c){const d=i[o],h=i[o+1],f=i[o+2],g=i[o+3],m=l[c],v=l[c+1],_=l[c+2],M=l[c+3];return e[t]=d*M+g*m+h*_-f*v,e[t+1]=h*M+g*v+f*m-d*_,e[t+2]=f*M+g*_+d*v-h*m,e[t+3]=g*M-d*m-h*v-f*_,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,o){return this._x=e,this._y=t,this._z=i,this._w=o,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,o=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(i/2),g=d(o/2),m=d(l/2),v=h(i/2),_=h(o/2),M=h(l/2);switch(c){case"XYZ":this._x=v*g*m+f*_*M,this._y=f*_*m-v*g*M,this._z=f*g*M+v*_*m,this._w=f*g*m-v*_*M;break;case"YXZ":this._x=v*g*m+f*_*M,this._y=f*_*m-v*g*M,this._z=f*g*M-v*_*m,this._w=f*g*m+v*_*M;break;case"ZXY":this._x=v*g*m-f*_*M,this._y=f*_*m+v*g*M,this._z=f*g*M+v*_*m,this._w=f*g*m-v*_*M;break;case"ZYX":this._x=v*g*m-f*_*M,this._y=f*_*m+v*g*M,this._z=f*g*M-v*_*m,this._w=f*g*m+v*_*M;break;case"YZX":this._x=v*g*m+f*_*M,this._y=f*_*m+v*g*M,this._z=f*g*M-v*_*m,this._w=f*g*m-v*_*M;break;case"XZY":this._x=v*g*m-f*_*M,this._y=f*_*m-v*g*M,this._z=f*g*M+v*_*m,this._w=f*g*m+v*_*M;break;default:at("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,o=Math.sin(i);return this._x=e.x*o,this._y=e.y*o,this._z=e.z*o,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],o=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],g=t[6],m=t[10],v=i+d+m;if(v>0){const _=.5/Math.sqrt(v+1);this._w=.25/_,this._x=(g-h)*_,this._y=(l-f)*_,this._z=(c-o)*_}else if(i>d&&i>m){const _=2*Math.sqrt(1+i-d-m);this._w=(g-h)/_,this._x=.25*_,this._y=(o+c)/_,this._z=(l+f)/_}else if(d>m){const _=2*Math.sqrt(1+d-i-m);this._w=(l-f)/_,this._x=(o+c)/_,this._y=.25*_,this._z=(h+g)/_}else{const _=2*Math.sqrt(1+m-i-d);this._w=(c-o)/_,this._x=(l+f)/_,this._y=(h+g)/_,this._z=.25*_}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Et(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const o=Math.min(1,t/i);return this.slerp(e,o),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,o=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,g=t._w;return this._x=i*g+c*d+o*f-l*h,this._y=o*g+c*h+l*d-i*f,this._z=l*g+c*f+i*h-o*d,this._w=c*g-i*d-o*h-l*f,this._onChangeCallback(),this}slerp(e,t){let i=e._x,o=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(i=-i,o=-o,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),g=Math.sin(f);h=Math.sin(h*f)/g,t=Math.sin(t*f)/g,this._x=this._x*h+i*t,this._y=this._y*h+o*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+i*t,this._y=this._y*h+o*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),o=Math.sqrt(1-i),l=Math.sqrt(i);return this.set(o*Math.sin(e),o*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Cp=class Cp{constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(C0.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(C0.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,o=this.z,l=e.elements;return this.x=l[0]*t+l[3]*i+l[6]*o,this.y=l[1]*t+l[4]*i+l[7]*o,this.z=l[2]*t+l[5]*i+l[8]*o,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,o=this.z,l=e.elements,c=1/(l[3]*t+l[7]*i+l[11]*o+l[15]);return this.x=(l[0]*t+l[4]*i+l[8]*o+l[12])*c,this.y=(l[1]*t+l[5]*i+l[9]*o+l[13])*c,this.z=(l[2]*t+l[6]*i+l[10]*o+l[14])*c,this}applyQuaternion(e){const t=this.x,i=this.y,o=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*o-d*i),g=2*(d*t-l*o),m=2*(l*i-c*t);return this.x=t+h*f+c*m-d*g,this.y=i+h*g+d*f-l*m,this.z=o+h*m+l*g-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,o=this.z,l=e.elements;return this.x=l[0]*t+l[4]*i+l[8]*o,this.y=l[1]*t+l[5]*i+l[9]*o,this.z=l[2]*t+l[6]*i+l[10]*o,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,o=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=o*h-l*d,this.y=l*c-i*h,this.z=i*d-o*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return xh.copy(this).projectOnVector(e),this.sub(xh)}reflect(e){return this.sub(xh.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,o=this.z-e.z;return t*t+i*i+o*o}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const o=Math.sin(t)*e;return this.x=o*Math.sin(i),this.y=Math.cos(t)*e,this.z=o*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),o=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=o,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Cp.prototype.isVector3=!0;let Y=Cp;const xh=new Y,C0=new ls,Rp=class Rp{constructor(e,t,i,o,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,o,l,c,d,h,f)}set(e,t,i,o,l,c,d,h,f){const g=this.elements;return g[0]=e,g[1]=o,g[2]=d,g[3]=t,g[4]=l,g[5]=h,g[6]=i,g[7]=c,g[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,o=t.elements,l=this.elements,c=i[0],d=i[3],h=i[6],f=i[1],g=i[4],m=i[7],v=i[2],_=i[5],M=i[8],w=o[0],y=o[3],S=o[6],C=o[1],L=o[4],P=o[7],O=o[2],N=o[5],B=o[8];return l[0]=c*w+d*C+h*O,l[3]=c*y+d*L+h*N,l[6]=c*S+d*P+h*B,l[1]=f*w+g*C+m*O,l[4]=f*y+g*L+m*N,l[7]=f*S+g*P+m*B,l[2]=v*w+_*C+M*O,l[5]=v*y+_*L+M*N,l[8]=v*S+_*P+M*B,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],o=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8];return t*c*g-t*d*f-i*l*g+i*d*h+o*l*f-o*c*h}invert(){const e=this.elements,t=e[0],i=e[1],o=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8],m=g*c-d*f,v=d*h-g*l,_=f*l-c*h,M=t*m+i*v+o*_;if(M===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/M;return e[0]=m*w,e[1]=(o*f-g*i)*w,e[2]=(d*i-o*c)*w,e[3]=v*w,e[4]=(g*t-o*h)*w,e[5]=(o*l-d*t)*w,e[6]=_*w,e[7]=(i*h-f*t)*w,e[8]=(c*t-i*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,o,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(i*h,i*f,-i*(h*c+f*d)+c+e,-o*f,o*h,-o*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return this.premultiply(Sh.makeScale(e,t)),this}rotate(e){return this.premultiply(Sh.makeRotation(-e)),this}translate(e,t){return this.premultiply(Sh.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let o=0;o<9;o++)if(t[o]!==i[o])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Rp.prototype.isMatrix3=!0;let gt=Rp;const Sh=new gt,R0=new gt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),P0=new gt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function IM(){const s={enabled:!0,workingColorSpace:su,spaces:{},convert:function(o,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===zt&&(o.r=Rr(o.r),o.g=Rr(o.g),o.b=Rr(o.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(o.applyMatrix3(this.spaces[l].toXYZ),o.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===zt&&(o.r=Oo(o.r),o.g=Oo(o.g),o.b=Oo(o.b))),o},workingToColorSpace:function(o,l){return this.convert(o,this.workingColorSpace,l)},colorSpaceToWorking:function(o,l){return this.convert(o,l,this.workingColorSpace)},getPrimaries:function(o){return this.spaces[o].primaries},getTransfer:function(o){return o===rs?ou:this.spaces[o].transfer},getToneMappingMode:function(o){return this.spaces[o].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(o,l=this.workingColorSpace){return o.fromArray(this.spaces[l].luminanceCoefficients)},define:function(o){Object.assign(this.spaces,o)},_getMatrix:function(o,l,c){return o.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(o){return this.spaces[o].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(o=this.workingColorSpace){return this.spaces[o].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(o,l){return Zf("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(o,l)},toWorkingColorSpace:function(o,l){return Zf("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(o,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return s.define({[su]:{primaries:e,whitePoint:i,transfer:ou,toXYZ:R0,fromXYZ:P0,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Xn},outputColorSpaceConfig:{drawingBufferColorSpace:Xn}},[Xn]:{primaries:e,whitePoint:i,transfer:zt,toXYZ:R0,fromXYZ:P0,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Xn}}}),s}const Tt=IM();function Rr(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Oo(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let mo;class UM{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{mo===void 0&&(mo=au("canvas")),mo.width=e.width,mo.height=e.height;const o=mo.getContext("2d");e instanceof ImageData?o.putImageData(e,0,0):o.drawImage(e,0,0,e.width,e.height),i=mo}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=au("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const o=i.getImageData(0,0,e.width,e.height),l=o.data;for(let c=0;c<l.length;c++)l[c]=Rr(l[c]/255)*255;return i.putImageData(o,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Rr(t[i]/255)*255):t[i]=Rr(t[i]);return{data:t,width:e.width,height:e.height}}else return at("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let FM=0;class yp{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:FM++}),this.uuid=os(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},o=this.data;if(o!==null){let l;if(Array.isArray(o)){l=[];for(let c=0,d=o.length;c<d;c++)o[c].isDataTexture?l.push(yh(o[c].image)):l.push(yh(o[c]))}else l=yh(o);i.url=l}return t||(e.images[this.uuid]=i),i}}function yh(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?UM.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(at("Texture: Unable to serialize Texture."),{})}let OM=0;const Mh=new Y;class zn extends us{constructor(e=zn.DEFAULT_IMAGE,t=zn.DEFAULT_MAPPING,i=br,o=br,l=Ln,c=Ns,d=zi,h=mi,f=zn.DEFAULT_ANISOTROPY,g=rs){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:OM++}),this.uuid=os(),this.name="",this.source=new yp(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=o,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new ot(0,0),this.repeat=new ot(1,1),this.center=new ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new gt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=g,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Mh).x}get height(){return this.source.getSize(Mh).y}get depth(){return this.source.getSize(Mh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){at(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const o=this[t];if(o===void 0){at(`Texture.setValues(): property '${t}' does not exist.`);continue}o&&i&&o.isVector2&&i.isVector2||o&&i&&o.isVector3&&i.isVector3||o&&i&&o.isMatrix3&&i.isMatrix3?o.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==x_)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case vf:e.x=e.x-Math.floor(e.x);break;case br:e.x=e.x<0?0:1;break;case _f:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case vf:e.y=e.y-Math.floor(e.y);break;case br:e.y=e.y<0?0:1;break;case _f:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}zn.DEFAULT_IMAGE=null;zn.DEFAULT_MAPPING=x_;zn.DEFAULT_ANISOTROPY=1;const Pp=class Pp{constructor(e=0,t=0,i=0,o=1){this.x=e,this.y=t,this.z=i,this.w=o}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,o){return this.x=e,this.y=t,this.z=i,this.w=o,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,o=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*i+c[8]*o+c[12]*l,this.y=c[1]*t+c[5]*i+c[9]*o+c[13]*l,this.z=c[2]*t+c[6]*i+c[10]*o+c[14]*l,this.w=c[3]*t+c[7]*i+c[11]*o+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,o,l;const h=e.elements,f=h[0],g=h[4],m=h[8],v=h[1],_=h[5],M=h[9],w=h[2],y=h[6],S=h[10];if(Math.abs(g-v)<.01&&Math.abs(m-w)<.01&&Math.abs(M-y)<.01){if(Math.abs(g+v)<.1&&Math.abs(m+w)<.1&&Math.abs(M+y)<.1&&Math.abs(f+_+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const L=(f+1)/2,P=(_+1)/2,O=(S+1)/2,N=(g+v)/4,B=(m+w)/4,A=(M+y)/4;return L>P&&L>O?L<.01?(i=0,o=.707106781,l=.707106781):(i=Math.sqrt(L),o=N/i,l=B/i):P>O?P<.01?(i=.707106781,o=0,l=.707106781):(o=Math.sqrt(P),i=N/o,l=A/o):O<.01?(i=.707106781,o=.707106781,l=0):(l=Math.sqrt(O),i=B/l,o=A/l),this.set(i,o,l,t),this}let C=Math.sqrt((y-M)*(y-M)+(m-w)*(m-w)+(v-g)*(v-g));return Math.abs(C)<.001&&(C=1),this.x=(y-M)/C,this.y=(m-w)/C,this.z=(v-g)/C,this.w=Math.acos((f+_+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this.w=Et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this.w=Et(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Pp.prototype.isVector4=!0;let an=Pp;class kM extends us{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ln,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new an(0,0,e,t),this.scissorTest=!1,this.viewport=new an(0,0,e,t),this.textures=[];const o={width:e,height:t,depth:i.depth},l=new zn(o),c=i.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:Ln,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let o=0,l=this.textures.length;o<l;o++)this.textures[o].image.width=e,this.textures[o].image.height=t,this.textures[o].image.depth=i,this.textures[o].isData3DTexture!==!0&&(this.textures[o].isArrayTexture=this.textures[o].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const o=Object.assign({},e.textures[t].image);this.textures[t].source=new yp(o)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}}class or extends kM{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class C_ extends zn{constructor(e=null,t=1,i=1,o=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:o},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=br,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class BM extends zn{constructor(e=null,t=1,i=1,o=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:o},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=br,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const fu=class fu{constructor(e,t,i,o,l,c,d,h,f,g,m,v,_,M,w,y){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,o,l,c,d,h,f,g,m,v,_,M,w,y)}set(e,t,i,o,l,c,d,h,f,g,m,v,_,M,w,y){const S=this.elements;return S[0]=e,S[4]=t,S[8]=i,S[12]=o,S[1]=l,S[5]=c,S[9]=d,S[13]=h,S[2]=f,S[6]=g,S[10]=m,S[14]=v,S[3]=_,S[7]=M,S[11]=w,S[15]=y,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fu().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,i=e.elements,o=1/go.setFromMatrixColumn(e,0).length(),l=1/go.setFromMatrixColumn(e,1).length(),c=1/go.setFromMatrixColumn(e,2).length();return t[0]=i[0]*o,t[1]=i[1]*o,t[2]=i[2]*o,t[3]=0,t[4]=i[4]*l,t[5]=i[5]*l,t[6]=i[6]*l,t[7]=0,t[8]=i[8]*c,t[9]=i[9]*c,t[10]=i[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,o=e.y,l=e.z,c=Math.cos(i),d=Math.sin(i),h=Math.cos(o),f=Math.sin(o),g=Math.cos(l),m=Math.sin(l);if(e.order==="XYZ"){const v=c*g,_=c*m,M=d*g,w=d*m;t[0]=h*g,t[4]=-h*m,t[8]=f,t[1]=_+M*f,t[5]=v-w*f,t[9]=-d*h,t[2]=w-v*f,t[6]=M+_*f,t[10]=c*h}else if(e.order==="YXZ"){const v=h*g,_=h*m,M=f*g,w=f*m;t[0]=v+w*d,t[4]=M*d-_,t[8]=c*f,t[1]=c*m,t[5]=c*g,t[9]=-d,t[2]=_*d-M,t[6]=w+v*d,t[10]=c*h}else if(e.order==="ZXY"){const v=h*g,_=h*m,M=f*g,w=f*m;t[0]=v-w*d,t[4]=-c*m,t[8]=M+_*d,t[1]=_+M*d,t[5]=c*g,t[9]=w-v*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const v=c*g,_=c*m,M=d*g,w=d*m;t[0]=h*g,t[4]=M*f-_,t[8]=v*f+w,t[1]=h*m,t[5]=w*f+v,t[9]=_*f-M,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const v=c*h,_=c*f,M=d*h,w=d*f;t[0]=h*g,t[4]=w-v*m,t[8]=M*m+_,t[1]=m,t[5]=c*g,t[9]=-d*g,t[2]=-f*g,t[6]=_*m+M,t[10]=v-w*m}else if(e.order==="XZY"){const v=c*h,_=c*f,M=d*h,w=d*f;t[0]=h*g,t[4]=-m,t[8]=f*g,t[1]=v*m+w,t[5]=c*g,t[9]=_*m-M,t[2]=M*m-_,t[6]=d*g,t[10]=w*m+v}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(zM,e,HM)}lookAt(e,t,i){const o=this.elements;return fi.subVectors(e,t),fi.lengthSq()===0&&(fi.z=1),fi.normalize(),Zr.crossVectors(i,fi),Zr.lengthSq()===0&&(Math.abs(i.z)===1?fi.x+=1e-4:fi.z+=1e-4,fi.normalize(),Zr.crossVectors(i,fi)),Zr.normalize(),ac.crossVectors(fi,Zr),o[0]=Zr.x,o[4]=ac.x,o[8]=fi.x,o[1]=Zr.y,o[5]=ac.y,o[9]=fi.y,o[2]=Zr.z,o[6]=ac.z,o[10]=fi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,o=t.elements,l=this.elements,c=i[0],d=i[4],h=i[8],f=i[12],g=i[1],m=i[5],v=i[9],_=i[13],M=i[2],w=i[6],y=i[10],S=i[14],C=i[3],L=i[7],P=i[11],O=i[15],N=o[0],B=o[4],A=o[8],U=o[12],z=o[1],k=o[5],X=o[9],re=o[13],ue=o[2],G=o[6],Q=o[10],q=o[14],K=o[3],ae=o[7],le=o[11],I=o[15];return l[0]=c*N+d*z+h*ue+f*K,l[4]=c*B+d*k+h*G+f*ae,l[8]=c*A+d*X+h*Q+f*le,l[12]=c*U+d*re+h*q+f*I,l[1]=g*N+m*z+v*ue+_*K,l[5]=g*B+m*k+v*G+_*ae,l[9]=g*A+m*X+v*Q+_*le,l[13]=g*U+m*re+v*q+_*I,l[2]=M*N+w*z+y*ue+S*K,l[6]=M*B+w*k+y*G+S*ae,l[10]=M*A+w*X+y*Q+S*le,l[14]=M*U+w*re+y*q+S*I,l[3]=C*N+L*z+P*ue+O*K,l[7]=C*B+L*k+P*G+O*ae,l[11]=C*A+L*X+P*Q+O*le,l[15]=C*U+L*re+P*q+O*I,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],o=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],g=e[2],m=e[6],v=e[10],_=e[14],M=e[3],w=e[7],y=e[11],S=e[15],C=h*_-f*v,L=d*_-f*m,P=d*v-h*m,O=c*_-f*g,N=c*v-h*g,B=c*m-d*g;return t*(w*C-y*L+S*P)-i*(M*C-y*O+S*N)+o*(M*L-w*O+S*B)-l*(M*P-w*N+y*B)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const o=this.elements;return e.isVector3?(o[12]=e.x,o[13]=e.y,o[14]=e.z):(o[12]=e,o[13]=t,o[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],o=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8],m=e[9],v=e[10],_=e[11],M=e[12],w=e[13],y=e[14],S=e[15],C=t*d-i*c,L=t*h-o*c,P=t*f-l*c,O=i*h-o*d,N=i*f-l*d,B=o*f-l*h,A=g*w-m*M,U=g*y-v*M,z=g*S-_*M,k=m*y-v*w,X=m*S-_*w,re=v*S-_*y,ue=C*re-L*X+P*k+O*z-N*U+B*A;if(ue===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const G=1/ue;return e[0]=(d*re-h*X+f*k)*G,e[1]=(o*X-i*re-l*k)*G,e[2]=(w*B-y*N+S*O)*G,e[3]=(v*N-m*B-_*O)*G,e[4]=(h*z-c*re-f*U)*G,e[5]=(t*re-o*z+l*U)*G,e[6]=(y*P-M*B-S*L)*G,e[7]=(g*B-v*P+_*L)*G,e[8]=(c*X-d*z+f*A)*G,e[9]=(i*z-t*X-l*A)*G,e[10]=(M*N-w*P+S*C)*G,e[11]=(m*P-g*N-_*C)*G,e[12]=(d*U-c*k-h*A)*G,e[13]=(t*k-i*U+o*A)*G,e[14]=(w*L-M*O-y*C)*G,e[15]=(g*O-m*L+v*C)*G,this}scale(e){const t=this.elements,i=e.x,o=e.y,l=e.z;return t[0]*=i,t[4]*=o,t[8]*=l,t[1]*=i,t[5]*=o,t[9]*=l,t[2]*=i,t[6]*=o,t[10]*=l,t[3]*=i,t[7]*=o,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],o=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,o))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),o=Math.sin(t),l=1-i,c=e.x,d=e.y,h=e.z,f=l*c,g=l*d;return this.set(f*c+i,f*d-o*h,f*h+o*d,0,f*d+o*h,g*d+i,g*h-o*c,0,f*h-o*d,g*h+o*c,l*h*h+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,o,l,c){return this.set(1,i,l,0,e,1,c,0,t,o,1,0,0,0,0,1),this}compose(e,t,i){const o=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,g=c+c,m=d+d,v=l*f,_=l*g,M=l*m,w=c*g,y=c*m,S=d*m,C=h*f,L=h*g,P=h*m,O=i.x,N=i.y,B=i.z;return o[0]=(1-(w+S))*O,o[1]=(_+P)*O,o[2]=(M-L)*O,o[3]=0,o[4]=(_-P)*N,o[5]=(1-(v+S))*N,o[6]=(y+C)*N,o[7]=0,o[8]=(M+L)*B,o[9]=(y-C)*B,o[10]=(1-(v+w))*B,o[11]=0,o[12]=e.x,o[13]=e.y,o[14]=e.z,o[15]=1,this}decompose(e,t,i){const o=this.elements;e.x=o[12],e.y=o[13],e.z=o[14];const l=this.determinant();if(l===0)return i.set(1,1,1),t.identity(),this;let c=go.set(o[0],o[1],o[2]).length();const d=go.set(o[4],o[5],o[6]).length(),h=go.set(o[8],o[9],o[10]).length();l<0&&(c=-c),Ii.copy(this);const f=1/c,g=1/d,m=1/h;return Ii.elements[0]*=f,Ii.elements[1]*=f,Ii.elements[2]*=f,Ii.elements[4]*=g,Ii.elements[5]*=g,Ii.elements[6]*=g,Ii.elements[8]*=m,Ii.elements[9]*=m,Ii.elements[10]*=m,t.setFromRotationMatrix(Ii),i.x=c,i.y=d,i.z=h,this}makePerspective(e,t,i,o,l,c,d=ir,h=!1){const f=this.elements,g=2*l/(t-e),m=2*l/(i-o),v=(t+e)/(t-e),_=(i+o)/(i-o);let M,w;if(h)M=l/(c-l),w=c*l/(c-l);else if(d===ir)M=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===Ja)M=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=g,f[4]=0,f[8]=v,f[12]=0,f[1]=0,f[5]=m,f[9]=_,f[13]=0,f[2]=0,f[6]=0,f[10]=M,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,i,o,l,c,d=ir,h=!1){const f=this.elements,g=2/(t-e),m=2/(i-o),v=-(t+e)/(t-e),_=-(i+o)/(i-o);let M,w;if(h)M=1/(c-l),w=c/(c-l);else if(d===ir)M=-2/(c-l),w=-(c+l)/(c-l);else if(d===Ja)M=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=g,f[4]=0,f[8]=0,f[12]=v,f[1]=0,f[5]=m,f[9]=0,f[13]=_,f[2]=0,f[6]=0,f[10]=M,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let o=0;o<16;o++)if(t[o]!==i[o])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}};fu.prototype.isMatrix4=!0;let nn=fu;const go=new Y,Ii=new nn,zM=new Y(0,0,0),HM=new Y(1,1,1),Zr=new Y,ac=new Y,fi=new Y,D0=new nn,L0=new ls;class cs{constructor(e=0,t=0,i=0,o=cs.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=o}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,o=this._order){return this._x=e,this._y=t,this._z=i,this._order=o,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const o=e.elements,l=o[0],c=o[4],d=o[8],h=o[1],f=o[5],g=o[9],m=o[2],v=o[6],_=o[10];switch(t){case"XYZ":this._y=Math.asin(Et(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-g,_),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(v,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Et(g,-1,1)),Math.abs(g)<.9999999?(this._y=Math.atan2(d,_),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-m,l),this._z=0);break;case"ZXY":this._x=Math.asin(Et(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(-m,_),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-Et(m,-1,1)),Math.abs(m)<.9999999?(this._x=Math.atan2(v,_),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(Et(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-g,f),this._y=Math.atan2(-m,l)):(this._x=0,this._y=Math.atan2(d,_));break;case"XZY":this._z=Math.asin(-Et(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(v,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-g,_),this._y=0);break;default:at("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return D0.makeRotationFromQuaternion(e),this.setFromRotationMatrix(D0,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return L0.setFromEuler(this),this.setFromQuaternion(L0,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}cs.DEFAULT_ORDER="XYZ";class R_{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let VM=0;const N0=new Y,vo=new ls,Sr=new nn,lc=new Y,Ca=new Y,GM=new Y,jM=new ls,I0=new Y(1,0,0),U0=new Y(0,1,0),F0=new Y(0,0,1),O0={type:"added"},WM={type:"removed"},_o={type:"childadded",child:null},Eh={type:"childremoved",child:null};class un extends us{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:VM++}),this.uuid=os(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=un.DEFAULT_UP.clone();const e=new Y,t=new cs,i=new ls,o=new Y(1,1,1);function l(){i.setFromEuler(t,!1)}function c(){t.setFromQuaternion(i,void 0,!1)}t._onChange(l),i._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:o},modelViewMatrix:{value:new nn},normalMatrix:{value:new gt}}),this.matrix=new nn,this.matrixWorld=new nn,this.matrixAutoUpdate=un.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new R_,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return vo.setFromAxisAngle(e,t),this.quaternion.multiply(vo),this}rotateOnWorldAxis(e,t){return vo.setFromAxisAngle(e,t),this.quaternion.premultiply(vo),this}rotateX(e){return this.rotateOnAxis(I0,e)}rotateY(e){return this.rotateOnAxis(U0,e)}rotateZ(e){return this.rotateOnAxis(F0,e)}translateOnAxis(e,t){return N0.copy(e).applyQuaternion(this.quaternion),this.position.add(N0.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(I0,e)}translateY(e){return this.translateOnAxis(U0,e)}translateZ(e){return this.translateOnAxis(F0,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Sr.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?lc.copy(e):lc.set(e,t,i);const o=this.parent;this.updateWorldMatrix(!0,!1),Ca.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Sr.lookAt(Ca,lc,this.up):Sr.lookAt(lc,Ca,this.up),this.quaternion.setFromRotationMatrix(Sr),o&&(Sr.extractRotation(o.matrixWorld),vo.setFromRotationMatrix(Sr),this.quaternion.premultiply(vo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Rt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(O0),_o.child=e,this.dispatchEvent(_o),_o.child=null):Rt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(WM),Eh.child=e,this.dispatchEvent(Eh),Eh.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Sr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Sr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Sr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(O0),_o.child=e,this.dispatchEvent(_o),_o.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,o=this.children.length;i<o;i++){const c=this.children[i].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const o=this.children;for(let l=0,c=o.length;l<c;l++)o[l].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ca,e,GM),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ca,jM,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,o=t.length;i<o;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,o=t.length;i<o;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,o=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*i-l[8]*o,l[13]+=i-l[1]*t-l[5]*i-l[9]*o,l[14]+=o-l[2]*t-l[6]*i-l[10]*o}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,o=t.length;i<o;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const o=this.children;for(let l=0,c=o.length;l<c;l++)o[l].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const o={};o.uuid=this.uuid,o.type=this.type,this.name!==""&&(o.name=this.name),this.castShadow===!0&&(o.castShadow=!0),this.receiveShadow===!0&&(o.receiveShadow=!0),this.visible===!1&&(o.visible=!1),this.frustumCulled===!1&&(o.frustumCulled=!1),this.renderOrder!==0&&(o.renderOrder=this.renderOrder),this.static!==!1&&(o.static=this.static),Object.keys(this.userData).length>0&&(o.userData=this.userData),o.layers=this.layers.mask,o.matrix=this.matrix.toArray(),o.up=this.up.toArray(),this.pivot!==null&&(o.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(o.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(o.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(o.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(o.type="InstancedMesh",o.count=this.count,o.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(o.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(o.type="BatchedMesh",o.perObjectFrustumCulled=this.perObjectFrustumCulled,o.sortObjects=this.sortObjects,o.drawRanges=this._drawRanges,o.reservedRanges=this._reservedRanges,o.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),o.instanceInfo=this._instanceInfo.map(d=>({...d})),o.availableInstanceIds=this._availableInstanceIds.slice(),o.availableGeometryIds=this._availableGeometryIds.slice(),o.nextIndexStart=this._nextIndexStart,o.nextVertexStart=this._nextVertexStart,o.geometryCount=this._geometryCount,o.maxInstanceCount=this._maxInstanceCount,o.maxVertexCount=this._maxVertexCount,o.maxIndexCount=this._maxIndexCount,o.geometryInitialized=this._geometryInitialized,o.matricesTexture=this._matricesTexture.toJSON(e),o.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(o.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(o.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(o.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?o.background=this.background.toJSON():this.background.isTexture&&(o.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(o.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){o.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,g=h.length;f<g;f++){const m=h[f];l(e.shapes,m)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(o.bindMode=this.bindMode,o.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),o.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));o.material=d}else o.material=l(e.materials,this.material);if(this.children.length>0){o.children=[];for(let d=0;d<this.children.length;d++)o.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){o.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];o.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),g=c(e.images),m=c(e.shapes),v=c(e.skeletons),_=c(e.animations),M=c(e.nodes);d.length>0&&(i.geometries=d),h.length>0&&(i.materials=h),f.length>0&&(i.textures=f),g.length>0&&(i.images=g),m.length>0&&(i.shapes=m),v.length>0&&(i.skeletons=v),_.length>0&&(i.animations=_),M.length>0&&(i.nodes=M)}return i.object=o,i;function c(d){const h=[];for(const f in d){const g=d[f];delete g.metadata,h.push(g)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const o=e.children[i];this.add(o.clone())}return this}}un.DEFAULT_UP=new Y(0,1,0);un.DEFAULT_MATRIX_AUTO_UPDATE=!0;un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Yn extends un{constructor(){super(),this.isGroup=!0,this.type="Group"}}const XM={type:"move"};class wh{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Yn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Yn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new Y,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new Y),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Yn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new Y,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new Y,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let o=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const y=t.getJointPose(w,i),S=this._getHandJoint(f,w);y!==null&&(S.matrix.fromArray(y.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=y.radius),S.visible=y!==null}const g=f.joints["index-finger-tip"],m=f.joints["thumb-tip"],v=g.position.distanceTo(m.position),_=.02,M=.005;f.inputState.pinching&&v>_+M?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&v<=_-M&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,i),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(o=t.getPose(e.targetRaySpace,i),o===null&&l!==null&&(o=l),o!==null&&(d.matrix.fromArray(o.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,o.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(o.linearVelocity)):d.hasLinearVelocity=!1,o.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(o.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(XM)))}return d!==null&&(d.visible=o!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Yn;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const P_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Jr={h:0,s:0,l:0},cc={h:0,s:0,l:0};function Th(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class wt{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const o=e;o&&o.isColor?this.copy(o):typeof o=="number"?this.setHex(o):typeof o=="string"&&this.setStyle(o)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Xn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Tt.colorSpaceToWorking(this,t),this}setRGB(e,t,i,o=Tt.workingColorSpace){return this.r=e,this.g=t,this.b=i,Tt.colorSpaceToWorking(this,o),this}setHSL(e,t,i,o=Tt.workingColorSpace){if(e=LM(e,1),t=Et(t,0,1),i=Et(i,0,1),t===0)this.r=this.g=this.b=i;else{const l=i<=.5?i*(1+t):i+t-i*t,c=2*i-l;this.r=Th(c,l,e+1/3),this.g=Th(c,l,e),this.b=Th(c,l,e-1/3)}return Tt.colorSpaceToWorking(this,o),this}setStyle(e,t=Xn){function i(l){l!==void 0&&parseFloat(l)<1&&at("Color: Alpha component of "+e+" will be ignored.")}let o;if(o=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=o[1],d=o[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:at("Color: Unknown color model "+e)}}else if(o=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=o[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);at("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Xn){const i=P_[e.toLowerCase()];return i!==void 0?this.setHex(i,t):at("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Rr(e.r),this.g=Rr(e.g),this.b=Rr(e.b),this}copyLinearToSRGB(e){return this.r=Oo(e.r),this.g=Oo(e.g),this.b=Oo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Xn){return Tt.workingToColorSpace(Bn.copy(this),e),Math.round(Et(Bn.r*255,0,255))*65536+Math.round(Et(Bn.g*255,0,255))*256+Math.round(Et(Bn.b*255,0,255))}getHexString(e=Xn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Tt.workingColorSpace){Tt.workingToColorSpace(Bn.copy(this),t);const i=Bn.r,o=Bn.g,l=Bn.b,c=Math.max(i,o,l),d=Math.min(i,o,l);let h,f;const g=(d+c)/2;if(d===c)h=0,f=0;else{const m=c-d;switch(f=g<=.5?m/(c+d):m/(2-c-d),c){case i:h=(o-l)/m+(o<l?6:0);break;case o:h=(l-i)/m+2;break;case l:h=(i-o)/m+4;break}h/=6}return e.h=h,e.s=f,e.l=g,e}getRGB(e,t=Tt.workingColorSpace){return Tt.workingToColorSpace(Bn.copy(this),t),e.r=Bn.r,e.g=Bn.g,e.b=Bn.b,e}getStyle(e=Xn){Tt.workingToColorSpace(Bn.copy(this),e);const t=Bn.r,i=Bn.g,o=Bn.b;return e!==Xn?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${o.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(o*255)})`}offsetHSL(e,t,i){return this.getHSL(Jr),this.setHSL(Jr.h+e,Jr.s+t,Jr.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Jr),e.getHSL(cc);const i=_h(Jr.h,cc.h,t),o=_h(Jr.s,cc.s,t),l=_h(Jr.l,cc.l,t);return this.setHSL(i,o,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,o=this.b,l=e.elements;return this.r=l[0]*t+l[3]*i+l[6]*o,this.g=l[1]*t+l[4]*i+l[7]*o,this.b=l[2]*t+l[5]*i+l[8]*o,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Bn=new wt;wt.NAMES=P_;class $M extends un{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new cs,this.environmentIntensity=1,this.environmentRotation=new cs,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ui=new Y,yr=new Y,bh=new Y,Mr=new Y,xo=new Y,So=new Y,k0=new Y,Ah=new Y,Ch=new Y,Rh=new Y,Ph=new an,Dh=new an,Lh=new an;class Ti{constructor(e=new Y,t=new Y,i=new Y){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,o){o.subVectors(i,t),Ui.subVectors(e,t),o.cross(Ui);const l=o.lengthSq();return l>0?o.multiplyScalar(1/Math.sqrt(l)):o.set(0,0,0)}static getBarycoord(e,t,i,o,l){Ui.subVectors(o,t),yr.subVectors(i,t),bh.subVectors(e,t);const c=Ui.dot(Ui),d=Ui.dot(yr),h=Ui.dot(bh),f=yr.dot(yr),g=yr.dot(bh),m=c*f-d*d;if(m===0)return l.set(0,0,0),null;const v=1/m,_=(f*h-d*g)*v,M=(c*g-d*h)*v;return l.set(1-_-M,M,_)}static containsPoint(e,t,i,o){return this.getBarycoord(e,t,i,o,Mr)===null?!1:Mr.x>=0&&Mr.y>=0&&Mr.x+Mr.y<=1}static getInterpolation(e,t,i,o,l,c,d,h){return this.getBarycoord(e,t,i,o,Mr)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Mr.x),h.addScaledVector(c,Mr.y),h.addScaledVector(d,Mr.z),h)}static getInterpolatedAttribute(e,t,i,o,l,c){return Ph.setScalar(0),Dh.setScalar(0),Lh.setScalar(0),Ph.fromBufferAttribute(e,t),Dh.fromBufferAttribute(e,i),Lh.fromBufferAttribute(e,o),c.setScalar(0),c.addScaledVector(Ph,l.x),c.addScaledVector(Dh,l.y),c.addScaledVector(Lh,l.z),c}static isFrontFacing(e,t,i,o){return Ui.subVectors(i,t),yr.subVectors(e,t),Ui.cross(yr).dot(o)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,o){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[o]),this}setFromAttributeAndIndices(e,t,i,o){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,o),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ui.subVectors(this.c,this.b),yr.subVectors(this.a,this.b),Ui.cross(yr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Ti.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Ti.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,o,l){return Ti.getInterpolation(e,this.a,this.b,this.c,t,i,o,l)}containsPoint(e){return Ti.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Ti.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,o=this.b,l=this.c;let c,d;xo.subVectors(o,i),So.subVectors(l,i),Ah.subVectors(e,i);const h=xo.dot(Ah),f=So.dot(Ah);if(h<=0&&f<=0)return t.copy(i);Ch.subVectors(e,o);const g=xo.dot(Ch),m=So.dot(Ch);if(g>=0&&m<=g)return t.copy(o);const v=h*m-g*f;if(v<=0&&h>=0&&g<=0)return c=h/(h-g),t.copy(i).addScaledVector(xo,c);Rh.subVectors(e,l);const _=xo.dot(Rh),M=So.dot(Rh);if(M>=0&&_<=M)return t.copy(l);const w=_*f-h*M;if(w<=0&&f>=0&&M<=0)return d=f/(f-M),t.copy(i).addScaledVector(So,d);const y=g*M-_*m;if(y<=0&&m-g>=0&&_-M>=0)return k0.subVectors(l,o),d=(m-g)/(m-g+(_-M)),t.copy(o).addScaledVector(k0,d);const S=1/(y+w+v);return c=w*S,d=v*S,t.copy(i).addScaledVector(xo,c).addScaledVector(So,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class el{constructor(e=new Y(1/0,1/0,1/0),t=new Y(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Fi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Fi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Fi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const l=i.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Fi):Fi.fromBufferAttribute(l,c),Fi.applyMatrix4(e.matrixWorld),this.expandByPoint(Fi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),uc.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),uc.copy(i.boundingBox)),uc.applyMatrix4(e.matrixWorld),this.union(uc)}const o=e.children;for(let l=0,c=o.length;l<c;l++)this.expandByObject(o[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Fi),Fi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ra),dc.subVectors(this.max,Ra),yo.subVectors(e.a,Ra),Mo.subVectors(e.b,Ra),Eo.subVectors(e.c,Ra),Qr.subVectors(Mo,yo),es.subVectors(Eo,Mo),bs.subVectors(yo,Eo);let t=[0,-Qr.z,Qr.y,0,-es.z,es.y,0,-bs.z,bs.y,Qr.z,0,-Qr.x,es.z,0,-es.x,bs.z,0,-bs.x,-Qr.y,Qr.x,0,-es.y,es.x,0,-bs.y,bs.x,0];return!Nh(t,yo,Mo,Eo,dc)||(t=[1,0,0,0,1,0,0,0,1],!Nh(t,yo,Mo,Eo,dc))?!1:(hc.crossVectors(Qr,es),t=[hc.x,hc.y,hc.z],Nh(t,yo,Mo,Eo,dc))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Fi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Fi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Er[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Er[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Er[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Er[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Er[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Er[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Er[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Er[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Er),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Er=[new Y,new Y,new Y,new Y,new Y,new Y,new Y,new Y],Fi=new Y,uc=new el,yo=new Y,Mo=new Y,Eo=new Y,Qr=new Y,es=new Y,bs=new Y,Ra=new Y,dc=new Y,hc=new Y,As=new Y;function Nh(s,e,t,i,o){for(let l=0,c=s.length-3;l<=c;l+=3){As.fromArray(s,l);const d=o.x*Math.abs(As.x)+o.y*Math.abs(As.y)+o.z*Math.abs(As.z),h=e.dot(As),f=t.dot(As),g=i.dot(As);if(Math.max(-Math.max(h,f,g),Math.min(h,f,g))>d)return!1}return!0}const fn=new Y,fc=new ot;let YM=0;class li extends us{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:YM++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Kf,this.updateRanges=[],this.gpuType=nr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let o=0,l=this.itemSize;o<l;o++)this.array[e+o]=t.array[i+o];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)fc.fromBufferAttribute(this,t),fc.applyMatrix3(e),this.setXY(t,fc.x,fc.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)fn.fromBufferAttribute(this,t),fn.applyMatrix3(e),this.setXYZ(t,fn.x,fn.y,fn.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)fn.fromBufferAttribute(this,t),fn.applyMatrix4(e),this.setXYZ(t,fn.x,fn.y,fn.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)fn.fromBufferAttribute(this,t),fn.applyNormalMatrix(e),this.setXYZ(t,fn.x,fn.y,fn.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)fn.fromBufferAttribute(this,t),fn.transformDirection(e),this.setXYZ(t,fn.x,fn.y,fn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=er(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Ht(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=er(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=er(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=er(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=er(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,o){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array),o=Ht(o,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=o,this}setXYZW(e,t,i,o,l){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array),o=Ht(o,this.array),l=Ht(l,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=o,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Kf&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class D_ extends li{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class L_ extends li{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class rn extends li{constructor(e,t,i){super(new Float32Array(e),t,i)}}const qM=new el,Pa=new Y,Ih=new Y;class _u{constructor(e=new Y,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):qM.setFromPoints(e).getCenter(i);let o=0;for(let l=0,c=e.length;l<c;l++)o=Math.max(o,i.distanceToSquared(e[l]));return this.radius=Math.sqrt(o),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Pa.subVectors(e,this.center);const t=Pa.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),o=(i-this.radius)*.5;this.center.addScaledVector(Pa,o/i),this.radius+=o}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ih.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Pa.copy(e.center).add(Ih)),this.expandByPoint(Pa.copy(e.center).sub(Ih))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let KM=0;const wi=new nn,Uh=new un,wo=new Y,pi=new el,Da=new el,wn=new Y;class bn extends us{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:KM++}),this.uuid=os(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(CM(e)?L_:D_)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const l=new gt().getNormalMatrix(e);i.applyNormalMatrix(l),i.needsUpdate=!0}const o=this.attributes.tangent;return o!==void 0&&(o.transformDirection(e),o.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return wi.makeRotationFromQuaternion(e),this.applyMatrix4(wi),this}rotateX(e){return wi.makeRotationX(e),this.applyMatrix4(wi),this}rotateY(e){return wi.makeRotationY(e),this.applyMatrix4(wi),this}rotateZ(e){return wi.makeRotationZ(e),this.applyMatrix4(wi),this}translate(e,t,i){return wi.makeTranslation(e,t,i),this.applyMatrix4(wi),this}scale(e,t,i){return wi.makeScale(e,t,i),this.applyMatrix4(wi),this}lookAt(e){return Uh.lookAt(e),Uh.updateMatrix(),this.applyMatrix4(Uh.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(wo).negate(),this.translate(wo.x,wo.y,wo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let o=0,l=e.length;o<l;o++){const c=e[o];i.push(c.x,c.y,c.z||0)}this.setAttribute("position",new rn(i,3))}else{const i=Math.min(e.length,t.count);for(let o=0;o<i;o++){const l=e[o];t.setXYZ(o,l.x,l.y,l.z||0)}e.length>t.count&&at("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new el);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Rt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new Y(-1/0,-1/0,-1/0),new Y(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,o=t.length;i<o;i++){const l=t[i];pi.setFromBufferAttribute(l),this.morphTargetsRelative?(wn.addVectors(this.boundingBox.min,pi.min),this.boundingBox.expandByPoint(wn),wn.addVectors(this.boundingBox.max,pi.max),this.boundingBox.expandByPoint(wn)):(this.boundingBox.expandByPoint(pi.min),this.boundingBox.expandByPoint(pi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Rt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new _u);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Rt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new Y,1/0);return}if(e){const i=this.boundingSphere.center;if(pi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Da.setFromBufferAttribute(d),this.morphTargetsRelative?(wn.addVectors(pi.min,Da.min),pi.expandByPoint(wn),wn.addVectors(pi.max,Da.max),pi.expandByPoint(wn)):(pi.expandByPoint(Da.min),pi.expandByPoint(Da.max))}pi.getCenter(i);let o=0;for(let l=0,c=e.count;l<c;l++)wn.fromBufferAttribute(e,l),o=Math.max(o,i.distanceToSquared(wn));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,g=d.count;f<g;f++)wn.fromBufferAttribute(d,f),h&&(wo.fromBufferAttribute(e,f),wn.add(wo)),o=Math.max(o,i.distanceToSquared(wn))}this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&Rt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Rt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,o=t.normal,l=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new li(new Float32Array(4*i.count),4));const c=this.getAttribute("tangent"),d=[],h=[];for(let A=0;A<i.count;A++)d[A]=new Y,h[A]=new Y;const f=new Y,g=new Y,m=new Y,v=new ot,_=new ot,M=new ot,w=new Y,y=new Y;function S(A,U,z){f.fromBufferAttribute(i,A),g.fromBufferAttribute(i,U),m.fromBufferAttribute(i,z),v.fromBufferAttribute(l,A),_.fromBufferAttribute(l,U),M.fromBufferAttribute(l,z),g.sub(f),m.sub(f),_.sub(v),M.sub(v);const k=1/(_.x*M.y-M.x*_.y);isFinite(k)&&(w.copy(g).multiplyScalar(M.y).addScaledVector(m,-_.y).multiplyScalar(k),y.copy(m).multiplyScalar(_.x).addScaledVector(g,-M.x).multiplyScalar(k),d[A].add(w),d[U].add(w),d[z].add(w),h[A].add(y),h[U].add(y),h[z].add(y))}let C=this.groups;C.length===0&&(C=[{start:0,count:e.count}]);for(let A=0,U=C.length;A<U;++A){const z=C[A],k=z.start,X=z.count;for(let re=k,ue=k+X;re<ue;re+=3)S(e.getX(re+0),e.getX(re+1),e.getX(re+2))}const L=new Y,P=new Y,O=new Y,N=new Y;function B(A){O.fromBufferAttribute(o,A),N.copy(O);const U=d[A];L.copy(U),L.sub(O.multiplyScalar(O.dot(U))).normalize(),P.crossVectors(N,U);const k=P.dot(h[A])<0?-1:1;c.setXYZW(A,L.x,L.y,L.z,k)}for(let A=0,U=C.length;A<U;++A){const z=C[A],k=z.start,X=z.count;for(let re=k,ue=k+X;re<ue;re+=3)B(e.getX(re+0)),B(e.getX(re+1)),B(e.getX(re+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new li(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let v=0,_=i.count;v<_;v++)i.setXYZ(v,0,0,0);const o=new Y,l=new Y,c=new Y,d=new Y,h=new Y,f=new Y,g=new Y,m=new Y;if(e)for(let v=0,_=e.count;v<_;v+=3){const M=e.getX(v+0),w=e.getX(v+1),y=e.getX(v+2);o.fromBufferAttribute(t,M),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,y),g.subVectors(c,l),m.subVectors(o,l),g.cross(m),d.fromBufferAttribute(i,M),h.fromBufferAttribute(i,w),f.fromBufferAttribute(i,y),d.add(g),h.add(g),f.add(g),i.setXYZ(M,d.x,d.y,d.z),i.setXYZ(w,h.x,h.y,h.z),i.setXYZ(y,f.x,f.y,f.z)}else for(let v=0,_=t.count;v<_;v+=3)o.fromBufferAttribute(t,v+0),l.fromBufferAttribute(t,v+1),c.fromBufferAttribute(t,v+2),g.subVectors(c,l),m.subVectors(o,l),g.cross(m),i.setXYZ(v+0,g.x,g.y,g.z),i.setXYZ(v+1,g.x,g.y,g.z),i.setXYZ(v+2,g.x,g.y,g.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)wn.fromBufferAttribute(e,t),wn.normalize(),e.setXYZ(t,wn.x,wn.y,wn.z)}toNonIndexed(){function e(d,h){const f=d.array,g=d.itemSize,m=d.normalized,v=new f.constructor(h.length*g);let _=0,M=0;for(let w=0,y=h.length;w<y;w++){d.isInterleavedBufferAttribute?_=h[w]*d.data.stride+d.offset:_=h[w]*g;for(let S=0;S<g;S++)v[M++]=f[_++]}return new li(v,g,m)}if(this.index===null)return at("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new bn,i=this.index.array,o=this.attributes;for(const d in o){const h=o[d],f=e(h,i);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let g=0,m=f.length;g<m;g++){const v=f[g],_=e(v,i);h.push(_)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const h in i){const f=i[h];e.data.attributes[h]=f.toJSON(e.data)}const o={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],g=[];for(let m=0,v=f.length;m<v;m++){const _=f[m];g.push(_.toJSON(e.data))}g.length>0&&(o[h]=g,l=!0)}l&&(e.data.morphAttributes=o,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const o=e.attributes;for(const f in o){const g=o[f];this.setAttribute(f,g.clone(t))}const l=e.morphAttributes;for(const f in l){const g=[],m=l[f];for(let v=0,_=m.length;v<_;v++)g.push(m[v].clone(t));this.morphAttributes[f]=g}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,g=c.length;f<g;f++){const m=c[f];this.addGroup(m.start,m.count,m.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ZM{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Kf,this.updateRanges=[],this.version=0,this.uuid=os()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let o=0,l=this.stride;o<l;o++)this.array[e+o]=t.array[i+o];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=os()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=os()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const jn=new Y;class uu{constructor(e,t,i,o=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=o}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)jn.fromBufferAttribute(this,t),jn.applyMatrix4(e),this.setXYZ(t,jn.x,jn.y,jn.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)jn.fromBufferAttribute(this,t),jn.applyNormalMatrix(e),this.setXYZ(t,jn.x,jn.y,jn.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)jn.fromBufferAttribute(this,t),jn.transformDirection(e),this.setXYZ(t,jn.x,jn.y,jn.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=er(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Ht(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=Ht(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=er(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=er(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=er(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=er(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,o){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array),o=Ht(o,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=o,this}setXYZW(e,t,i,o,l){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ht(t,this.array),i=Ht(i,this.array),o=Ht(o,this.array),l=Ht(l,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=o,this.data.array[e+3]=l,this}clone(e){if(e===void 0){lu("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const o=i*this.data.stride+this.offset;for(let l=0;l<this.itemSize;l++)t.push(this.data.array[o+l])}return new li(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new uu(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){lu("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const o=i*this.data.stride+this.offset;for(let l=0;l<this.itemSize;l++)t.push(this.data.array[o+l])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}let JM=0;class zs extends us{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:JM++}),this.uuid=os(),this.name="",this.type="Material",this.blending=Fo,this.side=as,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=lf,this.blendDst=cf,this.blendEquation=Ds,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new wt(0,0,0),this.blendAlpha=0,this.depthFunc=Bo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=T0,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=po,this.stencilZFail=po,this.stencilZPass=po,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){at(`Material: parameter '${t}' has value of undefined.`);continue}const o=this[t];if(o===void 0){at(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}o&&o.isColor?o.set(i):o&&o.isVector3&&i&&i.isVector3?o.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Fo&&(i.blending=this.blending),this.side!==as&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==lf&&(i.blendSrc=this.blendSrc),this.blendDst!==cf&&(i.blendDst=this.blendDst),this.blendEquation!==Ds&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Bo&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==T0&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==po&&(i.stencilFail=this.stencilFail),this.stencilZFail!==po&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==po&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function o(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=o(e.textures),c=o(e.images);l.length>0&&(i.textures=l),c.length>0&&(i.images=c)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const o=t.length;i=new Array(o);for(let l=0;l!==o;++l)i[l]=t[l].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class N_ extends zs{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new wt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let To;const La=new Y,bo=new Y,Ao=new Y,Co=new ot,Na=new ot,I_=new nn,pc=new Y,Ia=new Y,mc=new Y,B0=new ot,Fh=new ot,z0=new ot;class QM extends un{constructor(e=new N_){if(super(),this.isSprite=!0,this.type="Sprite",To===void 0){To=new bn;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new ZM(t,5);To.setIndex([0,1,2,0,2,3]),To.setAttribute("position",new uu(i,3,0,!1)),To.setAttribute("uv",new uu(i,2,3,!1))}this.geometry=To,this.material=e,this.center=new ot(.5,.5),this.count=1}raycast(e,t){e.camera===null&&Rt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),bo.setFromMatrixScale(this.matrixWorld),I_.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Ao.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&bo.multiplyScalar(-Ao.z);const i=this.material.rotation;let o,l;i!==0&&(l=Math.cos(i),o=Math.sin(i));const c=this.center;gc(pc.set(-.5,-.5,0),Ao,c,bo,o,l),gc(Ia.set(.5,-.5,0),Ao,c,bo,o,l),gc(mc.set(.5,.5,0),Ao,c,bo,o,l),B0.set(0,0),Fh.set(1,0),z0.set(1,1);let d=e.ray.intersectTriangle(pc,Ia,mc,!1,La);if(d===null&&(gc(Ia.set(-.5,.5,0),Ao,c,bo,o,l),Fh.set(0,1),d=e.ray.intersectTriangle(pc,mc,Ia,!1,La),d===null))return;const h=e.ray.origin.distanceTo(La);h<e.near||h>e.far||t.push({distance:h,point:La.clone(),uv:Ti.getInterpolation(La,pc,Ia,mc,B0,Fh,z0,new ot),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function gc(s,e,t,i,o,l){Co.subVectors(s,t).addScalar(.5).multiply(i),o!==void 0?(Na.x=l*Co.x-o*Co.y,Na.y=o*Co.x+l*Co.y):Na.copy(Co),s.copy(e),s.x+=Na.x,s.y+=Na.y,s.applyMatrix4(I_)}const wr=new Y,Oh=new Y,vc=new Y,ts=new Y,kh=new Y,_c=new Y,Bh=new Y;class Mp{constructor(e=new Y,t=new Y(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,wr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=wr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(wr.copy(this.origin).addScaledVector(this.direction,t),wr.distanceToSquared(e))}distanceSqToSegment(e,t,i,o){Oh.copy(e).add(t).multiplyScalar(.5),vc.copy(t).sub(e).normalize(),ts.copy(this.origin).sub(Oh);const l=e.distanceTo(t)*.5,c=-this.direction.dot(vc),d=ts.dot(this.direction),h=-ts.dot(vc),f=ts.lengthSq(),g=Math.abs(1-c*c);let m,v,_,M;if(g>0)if(m=c*h-d,v=c*d-h,M=l*g,m>=0)if(v>=-M)if(v<=M){const w=1/g;m*=w,v*=w,_=m*(m+c*v+2*d)+v*(c*m+v+2*h)+f}else v=l,m=Math.max(0,-(c*v+d)),_=-m*m+v*(v+2*h)+f;else v=-l,m=Math.max(0,-(c*v+d)),_=-m*m+v*(v+2*h)+f;else v<=-M?(m=Math.max(0,-(-c*l+d)),v=m>0?-l:Math.min(Math.max(-l,-h),l),_=-m*m+v*(v+2*h)+f):v<=M?(m=0,v=Math.min(Math.max(-l,-h),l),_=v*(v+2*h)+f):(m=Math.max(0,-(c*l+d)),v=m>0?l:Math.min(Math.max(-l,-h),l),_=-m*m+v*(v+2*h)+f);else v=c>0?-l:l,m=Math.max(0,-(c*v+d)),_=-m*m+v*(v+2*h)+f;return i&&i.copy(this.origin).addScaledVector(this.direction,m),o&&o.copy(Oh).addScaledVector(vc,v),_}intersectSphere(e,t){wr.subVectors(e.center,this.origin);const i=wr.dot(this.direction),o=wr.dot(wr)-i*i,l=e.radius*e.radius;if(o>l)return null;const c=Math.sqrt(l-o),d=i-c,h=i+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,o,l,c,d,h;const f=1/this.direction.x,g=1/this.direction.y,m=1/this.direction.z,v=this.origin;return f>=0?(i=(e.min.x-v.x)*f,o=(e.max.x-v.x)*f):(i=(e.max.x-v.x)*f,o=(e.min.x-v.x)*f),g>=0?(l=(e.min.y-v.y)*g,c=(e.max.y-v.y)*g):(l=(e.max.y-v.y)*g,c=(e.min.y-v.y)*g),i>c||l>o||((l>i||isNaN(i))&&(i=l),(c<o||isNaN(o))&&(o=c),m>=0?(d=(e.min.z-v.z)*m,h=(e.max.z-v.z)*m):(d=(e.max.z-v.z)*m,h=(e.min.z-v.z)*m),i>h||d>o)||((d>i||i!==i)&&(i=d),(h<o||o!==o)&&(o=h),o<0)?null:this.at(i>=0?i:o,t)}intersectsBox(e){return this.intersectBox(e,wr)!==null}intersectTriangle(e,t,i,o,l){kh.subVectors(t,e),_c.subVectors(i,e),Bh.crossVectors(kh,_c);let c=this.direction.dot(Bh),d;if(c>0){if(o)return null;d=1}else if(c<0)d=-1,c=-c;else return null;ts.subVectors(this.origin,e);const h=d*this.direction.dot(_c.crossVectors(ts,_c));if(h<0)return null;const f=d*this.direction.dot(kh.cross(ts));if(f<0||h+f>c)return null;const g=-d*ts.dot(Bh);return g<0?null:this.at(g/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ho extends zs{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new wt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cs,this.combine=dp,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const H0=new nn,Cs=new Mp,xc=new _u,V0=new Y,Sc=new Y,yc=new Y,Mc=new Y,zh=new Y,Ec=new Y,G0=new Y,wc=new Y;class it extends un{constructor(e=new bn,t=new Ho){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const o=t[i[0]];if(o!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=o.length;l<c;l++){const d=o[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const i=this.geometry,o=i.attributes.position,l=i.morphAttributes.position,c=i.morphTargetsRelative;t.fromBufferAttribute(o,e);const d=this.morphTargetInfluences;if(l&&d){Ec.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const g=d[h],m=l[h];g!==0&&(zh.fromBufferAttribute(m,e),c?Ec.addScaledVector(zh,g):Ec.addScaledVector(zh.sub(t),g))}t.add(Ec)}return t}raycast(e,t){const i=this.geometry,o=this.material,l=this.matrixWorld;o!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),xc.copy(i.boundingSphere),xc.applyMatrix4(l),Cs.copy(e.ray).recast(e.near),!(xc.containsPoint(Cs.origin)===!1&&(Cs.intersectSphere(xc,V0)===null||Cs.origin.distanceToSquared(V0)>(e.far-e.near)**2))&&(H0.copy(l).invert(),Cs.copy(e.ray).applyMatrix4(H0),!(i.boundingBox!==null&&Cs.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Cs)))}_computeIntersections(e,t,i){let o;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,g=l.attributes.uv1,m=l.attributes.normal,v=l.groups,_=l.drawRange;if(d!==null)if(Array.isArray(c))for(let M=0,w=v.length;M<w;M++){const y=v[M],S=c[y.materialIndex],C=Math.max(y.start,_.start),L=Math.min(d.count,Math.min(y.start+y.count,_.start+_.count));for(let P=C,O=L;P<O;P+=3){const N=d.getX(P),B=d.getX(P+1),A=d.getX(P+2);o=Tc(this,S,e,i,f,g,m,N,B,A),o&&(o.faceIndex=Math.floor(P/3),o.face.materialIndex=y.materialIndex,t.push(o))}}else{const M=Math.max(0,_.start),w=Math.min(d.count,_.start+_.count);for(let y=M,S=w;y<S;y+=3){const C=d.getX(y),L=d.getX(y+1),P=d.getX(y+2);o=Tc(this,c,e,i,f,g,m,C,L,P),o&&(o.faceIndex=Math.floor(y/3),t.push(o))}}else if(h!==void 0)if(Array.isArray(c))for(let M=0,w=v.length;M<w;M++){const y=v[M],S=c[y.materialIndex],C=Math.max(y.start,_.start),L=Math.min(h.count,Math.min(y.start+y.count,_.start+_.count));for(let P=C,O=L;P<O;P+=3){const N=P,B=P+1,A=P+2;o=Tc(this,S,e,i,f,g,m,N,B,A),o&&(o.faceIndex=Math.floor(P/3),o.face.materialIndex=y.materialIndex,t.push(o))}}else{const M=Math.max(0,_.start),w=Math.min(h.count,_.start+_.count);for(let y=M,S=w;y<S;y+=3){const C=y,L=y+1,P=y+2;o=Tc(this,c,e,i,f,g,m,C,L,P),o&&(o.faceIndex=Math.floor(y/3),t.push(o))}}}}function eE(s,e,t,i,o,l,c,d){let h;if(e.side===ai?h=i.intersectTriangle(c,l,o,!0,d):h=i.intersectTriangle(o,l,c,e.side===as,d),h===null)return null;wc.copy(d),wc.applyMatrix4(s.matrixWorld);const f=t.ray.origin.distanceTo(wc);return f<t.near||f>t.far?null:{distance:f,point:wc.clone(),object:s}}function Tc(s,e,t,i,o,l,c,d,h,f){s.getVertexPosition(d,Sc),s.getVertexPosition(h,yc),s.getVertexPosition(f,Mc);const g=eE(s,e,t,i,Sc,yc,Mc,G0);if(g){const m=new Y;Ti.getBarycoord(G0,Sc,yc,Mc,m),o&&(g.uv=Ti.getInterpolatedAttribute(o,d,h,f,m,new ot)),l&&(g.uv1=Ti.getInterpolatedAttribute(l,d,h,f,m,new ot)),c&&(g.normal=Ti.getInterpolatedAttribute(c,d,h,f,m,new Y),g.normal.dot(i.direction)>0&&g.normal.multiplyScalar(-1));const v={a:d,b:h,c:f,normal:new Y,materialIndex:0};Ti.getNormal(Sc,yc,Mc,v.normal),g.face=v,g.barycoord=m}return g}class tE extends zn{constructor(e=null,t=1,i=1,o,l,c,d,h,f=Dn,g=Dn,m,v){super(null,c,d,h,f,g,o,l,m,v),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Hh=new Y,nE=new Y,iE=new gt;class is{constructor(e=new Y(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,o){return this.normal.set(e,t,i),this.constant=o,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const o=Hh.subVectors(i,t).cross(nE.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(o,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const o=e.delta(Hh),l=this.normal.dot(o);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return i===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(o,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||iE.getNormalMatrix(e),o=this.coplanarPoint(Hh).applyMatrix4(e),l=this.normal.applyMatrix3(i).normalize();return this.constant=-o.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Rs=new _u,rE=new ot(.5,.5),bc=new Y;class Ep{constructor(e=new is,t=new is,i=new is,o=new is,l=new is,c=new is){this.planes=[e,t,i,o,l,c]}set(e,t,i,o,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(i),d[3].copy(o),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=ir,i=!1){const o=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],g=l[4],m=l[5],v=l[6],_=l[7],M=l[8],w=l[9],y=l[10],S=l[11],C=l[12],L=l[13],P=l[14],O=l[15];if(o[0].setComponents(f-c,_-g,S-M,O-C).normalize(),o[1].setComponents(f+c,_+g,S+M,O+C).normalize(),o[2].setComponents(f+d,_+m,S+w,O+L).normalize(),o[3].setComponents(f-d,_-m,S-w,O-L).normalize(),i)o[4].setComponents(h,v,y,P).normalize(),o[5].setComponents(f-h,_-v,S-y,O-P).normalize();else if(o[4].setComponents(f-h,_-v,S-y,O-P).normalize(),t===ir)o[5].setComponents(f+h,_+v,S+y,O+P).normalize();else if(t===Ja)o[5].setComponents(h,v,y,P).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Rs.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Rs.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Rs)}intersectsSprite(e){Rs.center.set(0,0,0);const t=rE.distanceTo(e.center);return Rs.radius=.7071067811865476+t,Rs.applyMatrix4(e.matrixWorld),this.intersectsSphere(Rs)}intersectsSphere(e){const t=this.planes,i=e.center,o=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(i)<o)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const o=t[i];if(bc.x=o.normal.x>0?e.max.x:e.min.x,bc.y=o.normal.y>0?e.max.y:e.min.y,bc.z=o.normal.z>0?e.max.z:e.min.z,o.distanceToPoint(bc)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class U_ extends zs{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new wt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const du=new Y,hu=new Y,j0=new nn,Ua=new Mp,Ac=new _u,Vh=new Y,W0=new Y;class sE extends un{constructor(e=new bn,t=new U_){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let o=1,l=t.count;o<l;o++)du.fromBufferAttribute(t,o-1),hu.fromBufferAttribute(t,o),i[o]=i[o-1],i[o]+=du.distanceTo(hu);e.setAttribute("lineDistance",new rn(i,1))}else at("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,o=this.matrixWorld,l=e.params.Line.threshold,c=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ac.copy(i.boundingSphere),Ac.applyMatrix4(o),Ac.radius+=l,e.ray.intersectsSphere(Ac)===!1)return;j0.copy(o).invert(),Ua.copy(e.ray).applyMatrix4(j0);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,g=i.index,v=i.attributes.position;if(g!==null){const _=Math.max(0,c.start),M=Math.min(g.count,c.start+c.count);for(let w=_,y=M-1;w<y;w+=f){const S=g.getX(w),C=g.getX(w+1),L=Cc(this,e,Ua,h,S,C,w);L&&t.push(L)}if(this.isLineLoop){const w=g.getX(M-1),y=g.getX(_),S=Cc(this,e,Ua,h,w,y,M-1);S&&t.push(S)}}else{const _=Math.max(0,c.start),M=Math.min(v.count,c.start+c.count);for(let w=_,y=M-1;w<y;w+=f){const S=Cc(this,e,Ua,h,w,w+1,w);S&&t.push(S)}if(this.isLineLoop){const w=Cc(this,e,Ua,h,M-1,_,M-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const o=t[i[0]];if(o!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=o.length;l<c;l++){const d=o[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Cc(s,e,t,i,o,l,c){const d=s.geometry.attributes.position;if(du.fromBufferAttribute(d,o),hu.fromBufferAttribute(d,l),t.distanceSqToSegment(du,hu,Vh,W0)>i)return;Vh.applyMatrix4(s.matrixWorld);const f=e.ray.origin.distanceTo(Vh);if(!(f<e.near||f>e.far))return{distance:f,point:W0.clone().applyMatrix4(s.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:s}}const X0=new Y,$0=new Y;class oE extends sE{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let o=0,l=t.count;o<l;o+=2)X0.fromBufferAttribute(t,o),$0.fromBufferAttribute(t,o+1),i[o]=o===0?0:i[o-1],i[o+1]=i[o]+X0.distanceTo($0);e.setAttribute("lineDistance",new rn(i,1))}else at("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class F_ extends zn{constructor(e=[],t=ks,i,o,l,c,d,h,f,g){super(e,t,i,o,l,c,d,h,f,g),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class O_ extends zn{constructor(e,t,i,o,l,c,d,h,f){super(e,t,i,o,l,c,d,h,f),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Vo extends zn{constructor(e,t,i=ar,o,l,c,d=Dn,h=Dn,f,g=Dr,m=1){if(g!==Dr&&g!==Is)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const v={width:e,height:t,depth:m};super(v,o,l,c,d,h,g,i,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new yp(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class aE extends Vo{constructor(e,t=ar,i=ks,o,l,c=Dn,d=Dn,h,f=Dr){const g={width:e,height:e,depth:1},m=[g,g,g,g,g,g];super(e,e,t,i,o,l,c,d,h,f),this.image=m,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class k_ extends zn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Wt extends bn{constructor(e=1,t=1,i=1,o=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:o,heightSegments:l,depthSegments:c};const d=this;o=Math.floor(o),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],g=[],m=[];let v=0,_=0;M("z","y","x",-1,-1,i,t,e,c,l,0),M("z","y","x",1,-1,i,t,-e,c,l,1),M("x","z","y",1,1,e,i,t,o,c,2),M("x","z","y",1,-1,e,i,-t,o,c,3),M("x","y","z",1,-1,e,t,i,o,l,4),M("x","y","z",-1,-1,e,t,-i,o,l,5),this.setIndex(h),this.setAttribute("position",new rn(f,3)),this.setAttribute("normal",new rn(g,3)),this.setAttribute("uv",new rn(m,2));function M(w,y,S,C,L,P,O,N,B,A,U){const z=P/B,k=O/A,X=P/2,re=O/2,ue=N/2,G=B+1,Q=A+1;let q=0,K=0;const ae=new Y;for(let le=0;le<Q;le++){const I=le*k-re;for(let Z=0;Z<G;Z++){const ve=Z*z-X;ae[w]=ve*C,ae[y]=I*L,ae[S]=ue,f.push(ae.x,ae.y,ae.z),ae[w]=0,ae[y]=0,ae[S]=N>0?1:-1,g.push(ae.x,ae.y,ae.z),m.push(Z/B),m.push(1-le/A),q+=1}}for(let le=0;le<A;le++)for(let I=0;I<B;I++){const Z=v+I+G*le,ve=v+I+G*(le+1),Pe=v+(I+1)+G*(le+1),Fe=v+(I+1)+G*le;h.push(Z,ve,Fe),h.push(ve,Pe,Fe),K+=6}d.addGroup(_,K,U),_+=K,v+=q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Wt(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Io extends bn{constructor(e=1,t=1,i=4,o=8,l=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:i,radialSegments:o,heightSegments:l},t=Math.max(0,t),i=Math.max(1,Math.floor(i)),o=Math.max(3,Math.floor(o)),l=Math.max(1,Math.floor(l));const c=[],d=[],h=[],f=[],g=t/2,m=Math.PI/2*e,v=t,_=2*m+v,M=i*2+l,w=o+1,y=new Y,S=new Y;for(let C=0;C<=M;C++){let L=0,P=0,O=0,N=0;if(C<=i){const U=C/i,z=U*Math.PI/2;P=-g-e*Math.cos(z),O=e*Math.sin(z),N=-e*Math.cos(z),L=U*m}else if(C<=i+l){const U=(C-i)/l;P=-g+U*t,O=e,N=0,L=m+U*v}else{const U=(C-i-l)/i,z=U*Math.PI/2;P=g+e*Math.sin(z),O=e*Math.cos(z),N=e*Math.sin(z),L=m+v+U*m}const B=Math.max(0,Math.min(1,L/_));let A=0;C===0?A=.5/o:C===M&&(A=-.5/o);for(let U=0;U<=o;U++){const z=U/o,k=z*Math.PI*2,X=Math.sin(k),re=Math.cos(k);S.x=-O*re,S.y=P,S.z=O*X,d.push(S.x,S.y,S.z),y.set(-O*re,N,O*X),y.normalize(),h.push(y.x,y.y,y.z),f.push(z+A,B)}if(C>0){const U=(C-1)*w;for(let z=0;z<o;z++){const k=U+z,X=U+z+1,re=C*w+z,ue=C*w+z+1;c.push(k,X,re),c.push(X,ue,re)}}}this.setIndex(c),this.setAttribute("position",new rn(d,3)),this.setAttribute("normal",new rn(h,3)),this.setAttribute("uv",new rn(f,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Io(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class ki extends bn{constructor(e=1,t=1,i=1,o=32,l=1,c=!1,d=0,h=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:o,heightSegments:l,openEnded:c,thetaStart:d,thetaLength:h};const f=this;o=Math.floor(o),l=Math.floor(l);const g=[],m=[],v=[],_=[];let M=0;const w=[],y=i/2;let S=0;C(),c===!1&&(e>0&&L(!0),t>0&&L(!1)),this.setIndex(g),this.setAttribute("position",new rn(m,3)),this.setAttribute("normal",new rn(v,3)),this.setAttribute("uv",new rn(_,2));function C(){const P=new Y,O=new Y;let N=0;const B=(t-e)/i;for(let A=0;A<=l;A++){const U=[],z=A/l,k=z*(t-e)+e;for(let X=0;X<=o;X++){const re=X/o,ue=re*h+d,G=Math.sin(ue),Q=Math.cos(ue);O.x=k*G,O.y=-z*i+y,O.z=k*Q,m.push(O.x,O.y,O.z),P.set(G,B,Q).normalize(),v.push(P.x,P.y,P.z),_.push(re,1-z),U.push(M++)}w.push(U)}for(let A=0;A<o;A++)for(let U=0;U<l;U++){const z=w[U][A],k=w[U+1][A],X=w[U+1][A+1],re=w[U][A+1];(e>0||U!==0)&&(g.push(z,k,re),N+=3),(t>0||U!==l-1)&&(g.push(k,X,re),N+=3)}f.addGroup(S,N,0),S+=N}function L(P){const O=M,N=new ot,B=new Y;let A=0;const U=P===!0?e:t,z=P===!0?1:-1;for(let X=1;X<=o;X++)m.push(0,y*z,0),v.push(0,z,0),_.push(.5,.5),M++;const k=M;for(let X=0;X<=o;X++){const ue=X/o*h+d,G=Math.cos(ue),Q=Math.sin(ue);B.x=U*Q,B.y=y*z,B.z=U*G,m.push(B.x,B.y,B.z),v.push(0,z,0),N.x=G*.5+.5,N.y=Q*.5*z+.5,_.push(N.x,N.y),M++}for(let X=0;X<o;X++){const re=O+X,ue=k+X;P===!0?g.push(ue,ue+1,re):g.push(ue+1,ue,re),A+=3}f.addGroup(S,A,P===!0?1:2),S+=A}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ki(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Fs extends bn{constructor(e=1,t=1,i=1,o=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:o};const l=e/2,c=t/2,d=Math.floor(i),h=Math.floor(o),f=d+1,g=h+1,m=e/d,v=t/h,_=[],M=[],w=[],y=[];for(let S=0;S<g;S++){const C=S*v-c;for(let L=0;L<f;L++){const P=L*m-l;M.push(P,-C,0),w.push(0,0,1),y.push(L/d),y.push(1-S/h)}}for(let S=0;S<h;S++)for(let C=0;C<d;C++){const L=C+f*S,P=C+f*(S+1),O=C+1+f*(S+1),N=C+1+f*S;_.push(L,P,N),_.push(P,O,N)}this.setIndex(_),this.setAttribute("position",new rn(M,3)),this.setAttribute("normal",new rn(w,3)),this.setAttribute("uv",new rn(y,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fs(e.width,e.height,e.widthSegments,e.heightSegments)}}class wp extends bn{constructor(e=.5,t=1,i=32,o=1,l=0,c=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:i,phiSegments:o,thetaStart:l,thetaLength:c},i=Math.max(3,i),o=Math.max(1,o);const d=[],h=[],f=[],g=[];let m=e;const v=(t-e)/o,_=new Y,M=new ot;for(let w=0;w<=o;w++){for(let y=0;y<=i;y++){const S=l+y/i*c;_.x=m*Math.cos(S),_.y=m*Math.sin(S),h.push(_.x,_.y,_.z),f.push(0,0,1),M.x=(_.x/t+1)/2,M.y=(_.y/t+1)/2,g.push(M.x,M.y)}m+=v}for(let w=0;w<o;w++){const y=w*(i+1);for(let S=0;S<i;S++){const C=S+y,L=C,P=C+i+1,O=C+i+2,N=C+1;d.push(L,P,N),d.push(P,O,N)}}this.setIndex(d),this.setAttribute("position",new rn(h,3)),this.setAttribute("normal",new rn(f,3)),this.setAttribute("uv",new rn(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new wp(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class Xa extends bn{constructor(e=1,t=32,i=16,o=0,l=Math.PI*2,c=0,d=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:o,phiLength:l,thetaStart:c,thetaLength:d},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const h=Math.min(c+d,Math.PI);let f=0;const g=[],m=new Y,v=new Y,_=[],M=[],w=[],y=[];for(let S=0;S<=i;S++){const C=[],L=S/i;let P=0;S===0&&c===0?P=.5/t:S===i&&h===Math.PI&&(P=-.5/t);for(let O=0;O<=t;O++){const N=O/t;m.x=-e*Math.cos(o+N*l)*Math.sin(c+L*d),m.y=e*Math.cos(c+L*d),m.z=e*Math.sin(o+N*l)*Math.sin(c+L*d),M.push(m.x,m.y,m.z),v.copy(m).normalize(),w.push(v.x,v.y,v.z),y.push(N+P,1-L),C.push(f++)}g.push(C)}for(let S=0;S<i;S++)for(let C=0;C<t;C++){const L=g[S][C+1],P=g[S][C],O=g[S+1][C],N=g[S+1][C+1];(S!==0||c>0)&&_.push(L,P,N),(S!==i-1||h<Math.PI)&&_.push(P,O,N)}this.setIndex(_),this.setAttribute("position",new rn(M,3)),this.setAttribute("normal",new rn(w,3)),this.setAttribute("uv",new rn(y,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Xa(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function Go(s){const e={};for(const t in s){e[t]={};for(const i in s[t]){const o=s[t][i];if(Y0(o))o.isRenderTargetTexture?(at("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=o.clone();else if(Array.isArray(o))if(Y0(o[0])){const l=[];for(let c=0,d=o.length;c<d;c++)l[c]=o[c].clone();e[t][i]=l}else e[t][i]=o.slice();else e[t][i]=o}}return e}function Wn(s){const e={};for(let t=0;t<s.length;t++){const i=Go(s[t]);for(const o in i)e[o]=i[o]}return e}function Y0(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function lE(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function B_(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Tt.workingColorSpace}const cE={clone:Go,merge:Wn};var uE=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,dE=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class lr extends zs{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=uE,this.fragmentShader=dE,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Go(e.uniforms),this.uniformsGroups=lE(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const o in this.uniforms){const c=this.uniforms[o].value;c&&c.isTexture?t.uniforms[o]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[o]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[o]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[o]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[o]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[o]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[o]={type:"m4",value:c.toArray()}:t.uniforms[o]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const o in this.extensions)this.extensions[o]===!0&&(i[o]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class hE extends lr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class tr extends zs{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new wt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new wt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qf,this.normalScale=new ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cs,this.combine=dp,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class fE extends zs{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=SM,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class pE extends zs{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class xu extends un{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new wt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class mE extends xu{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(un.DEFAULT_UP),this.updateMatrix(),this.groundColor=new wt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Gh=new nn,q0=new Y,K0=new Y;class z_{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ot(512,512),this.mapType=mi,this.map=null,this.mapPass=null,this.matrix=new nn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ep,this._frameExtents=new ot(1,1),this._viewportCount=1,this._viewports=[new an(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;q0.setFromMatrixPosition(e.matrixWorld),t.position.copy(q0),K0.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(K0),t.updateMatrixWorld(),Gh.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Gh,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Ja||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Gh)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Rc=new Y,Pc=new ls,Yi=new Y;class H_ extends un{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new nn,this.projectionMatrix=new nn,this.projectionMatrixInverse=new nn,this.coordinateSystem=ir,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Rc,Pc,Yi),Yi.x===1&&Yi.y===1&&Yi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Rc,Pc,Yi.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Rc,Pc,Yi),Yi.x===1&&Yi.y===1&&Yi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Rc,Pc,Yi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ns=new Y,Z0=new ot,J0=new ot;class si extends H_{constructor(e=50,t=1,i=.1,o=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=o,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=cu*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Kc*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return cu*2*Math.atan(Math.tan(Kc*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){ns.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ns.x,ns.y).multiplyScalar(-e/ns.z),ns.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(ns.x,ns.y).multiplyScalar(-e/ns.z)}getViewSize(e,t){return this.getViewBounds(e,Z0,J0),t.subVectors(J0,Z0)}setViewOffset(e,t,i,o,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=o,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Kc*.5*this.fov)/this.zoom,i=2*t,o=this.aspect*i,l=-.5*o;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*o/h,t-=c.offsetY*i/f,o*=c.width/h,i*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+o,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class gE extends z_{constructor(){super(new si(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,i=cu*2*e.angle*this.focus,o=this.mapSize.width/this.mapSize.height*this.aspect,l=e.distance||t.far;(i!==t.fov||o!==t.aspect||l!==t.far)&&(t.fov=i,t.aspect=o,t.far=l,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class vE extends xu{constructor(e,t,i=0,o=Math.PI/3,l=0,c=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(un.DEFAULT_UP),this.updateMatrix(),this.target=new un,this.distance=i,this.angle=o,this.penumbra=l,this.decay=c,this.map=null,this.shadow=new gE}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class Tp extends H_{constructor(e=-1,t=1,i=1,o=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=o,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,o,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=o,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,o=(this.top+this.bottom)/2;let l=i-e,c=i+e,d=o+t,h=o-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,g=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=g*this.view.offsetY,h=d-g*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class _E extends z_{constructor(){super(new Tp(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Q0 extends xu{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(un.DEFAULT_UP),this.updateMatrix(),this.target=new un,this.shadow=new _E}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class xE extends xu{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const Ro=-90,Po=1;class SE extends un{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const o=new si(Ro,Po,e,t);o.layers=this.layers,this.add(o);const l=new si(Ro,Po,e,t);l.layers=this.layers,this.add(l);const c=new si(Ro,Po,e,t);c.layers=this.layers,this.add(c);const d=new si(Ro,Po,e,t);d.layers=this.layers,this.add(d);const h=new si(Ro,Po,e,t);h.layers=this.layers,this.add(h);const f=new si(Ro,Po,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,o,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===ir)i.up.set(0,1,0),i.lookAt(1,0,0),o.up.set(0,1,0),o.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===Ja)i.up.set(0,-1,0),i.lookAt(-1,0,0),o.up.set(0,-1,0),o.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:o}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,g]=this.children,m=e.getRenderTarget(),v=e.getActiveCubeFace(),_=e.getActiveMipmapLevel(),M=e.xr.enabled;e.xr.enabled=!1;const w=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let y=!1;e.isWebGLRenderer===!0?y=e.state.buffers.depth.getReversed():y=e.reversedDepthBuffer,e.setRenderTarget(i,0,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,1,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(i,2,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(i,3,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(i,4,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),i.texture.generateMipmaps=w,e.setRenderTarget(i,5,o),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,g),e.setRenderTarget(m,v,_),e.xr.enabled=M,i.texture.needsPMREMUpdate=!0}}class yE extends si{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class ev{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Et(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Et(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Dp=class Dp{constructor(e,t,i,o){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,o)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,o){const l=this.elements;return l[0]=e,l[2]=t,l[1]=i,l[3]=o,this}};Dp.prototype.isMatrix2=!0;let tv=Dp;class ME extends us{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){at("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function nv(s,e,t,i){const o=EE(i);switch(t){case w_:return s*e;case b_:return s*e/o.components*o.byteLength;case gp:return s*e/o.components*o.byteLength;case Bs:return s*e*2/o.components*o.byteLength;case vp:return s*e*2/o.components*o.byteLength;case T_:return s*e*3/o.components*o.byteLength;case zi:return s*e*4/o.components*o.byteLength;case _p:return s*e*4/o.components*o.byteLength;case Xc:case $c:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Yc:case qc:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Sf:case Mf:return Math.max(s,16)*Math.max(e,8)/4;case xf:case yf:return Math.max(s,8)*Math.max(e,8)/2;case Ef:case wf:case bf:case Af:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Tf:case iu:case Cf:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Rf:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Pf:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Df:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Lf:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Nf:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case If:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Uf:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Ff:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Of:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case kf:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Bf:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case zf:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Hf:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Vf:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case Gf:case jf:case Wf:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Xf:case $f:return Math.ceil(s/4)*Math.ceil(e/4)*8;case ru:case Yf:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function EE(s){switch(s){case mi:case S_:return{byteLength:1,components:1};case Ka:case y_:case Pr:return{byteLength:2,components:1};case pp:case mp:return{byteLength:2,components:4};case ar:case fp:case nr:return{byteLength:4,components:1};case M_:case E_:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:up}}));typeof window<"u"&&(window.__THREE__?at("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=up);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function V_(){let s=null,e=!1,t=null,i=null;function o(l,c){t(l,c),i=s.requestAnimationFrame(o)}return{start:function(){e!==!0&&t!==null&&s!==null&&(i=s.requestAnimationFrame(o),e=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){s=l}}}function wE(s){const e=new WeakMap;function t(d,h){const f=d.array,g=d.usage,m=f.byteLength,v=s.createBuffer();s.bindBuffer(h,v),s.bufferData(h,f,g),d.onUploadCallback();let _;if(f instanceof Float32Array)_=s.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)_=s.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?_=s.HALF_FLOAT:_=s.UNSIGNED_SHORT;else if(f instanceof Int16Array)_=s.SHORT;else if(f instanceof Uint32Array)_=s.UNSIGNED_INT;else if(f instanceof Int32Array)_=s.INT;else if(f instanceof Int8Array)_=s.BYTE;else if(f instanceof Uint8Array)_=s.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)_=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:v,type:_,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:m}}function i(d,h,f){const g=h.array,m=h.updateRanges;if(s.bindBuffer(f,d),m.length===0)s.bufferSubData(f,0,g);else{m.sort((_,M)=>_.start-M.start);let v=0;for(let _=1;_<m.length;_++){const M=m[v],w=m[_];w.start<=M.start+M.count+1?M.count=Math.max(M.count,w.start+w.count-M.start):(++v,m[v]=w)}m.length=v+1;for(let _=0,M=m.length;_<M;_++){const w=m[_];s.bufferSubData(f,w.start*g.BYTES_PER_ELEMENT,g,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function o(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(s.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const g=e.get(d);(!g||g.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(f.buffer,d,h),f.version=d.version}}return{get:o,remove:l,update:c}}var TE=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,bE=`#ifdef USE_ALPHAHASH
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
#endif`,AE=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,CE=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,RE=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,PE=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,DE=`#ifdef USE_AOMAP
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
#endif`,LE=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,NE=`#ifdef USE_BATCHING
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
#endif`,IE=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,UE=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,FE=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,OE=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,kE=`#ifdef USE_IRIDESCENCE
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
#endif`,BE=`#ifdef USE_BUMPMAP
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
#endif`,zE=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,HE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,VE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,GE=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,jE=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,WE=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,XE=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,$E=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,YE=`#define PI 3.141592653589793
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
} // validated`,qE=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,KE=`vec3 transformedNormal = objectNormal;
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
#endif`,ZE=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,JE=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,QE=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ew=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,tw="gl_FragColor = linearToOutputTexel( gl_FragColor );",nw=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,iw=`#ifdef USE_ENVMAP
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
#endif`,rw=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,sw=`#ifdef USE_ENVMAP
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
#endif`,ow=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,aw=`#ifdef USE_ENVMAP
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
#endif`,lw=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cw=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,uw=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,dw=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,hw=`#ifdef USE_GRADIENTMAP
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
}`,fw=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,pw=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,mw=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,gw=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,vw=`#ifdef USE_ENVMAP
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
#endif`,_w=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,xw=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Sw=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,yw=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Mw=`PhysicalMaterial material;
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
#endif`,Ew=`uniform sampler2D dfgLUT;
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
}`,ww=`
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
#endif`,Tw=`#if defined( RE_IndirectDiffuse )
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
#endif`,bw=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Aw=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Cw=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Rw=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Pw=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Dw=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Lw=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Nw=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Iw=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Uw=`#if defined( USE_POINTS_UV )
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
#endif`,Fw=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Ow=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,kw=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Bw=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,zw=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Hw=`#ifdef USE_MORPHTARGETS
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
#endif`,Vw=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gw=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,jw=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Ww=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Xw=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$w=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Yw=`#ifdef USE_NORMALMAP
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
#endif`,qw=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Kw=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Zw=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Jw=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Qw=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,e1=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,t1=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,n1=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,i1=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,r1=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,s1=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,o1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,a1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,l1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,c1=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,u1=`float getShadowMask() {
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
}`,d1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,h1=`#ifdef USE_SKINNING
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
#endif`,f1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,p1=`#ifdef USE_SKINNING
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
#endif`,m1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,g1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,v1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,_1=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,x1=`#ifdef USE_TRANSMISSION
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
#endif`,S1=`#ifdef USE_TRANSMISSION
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
#endif`,y1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,M1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,E1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,w1=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const T1=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,b1=`uniform sampler2D t2D;
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
}`,A1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,C1=`#ifdef ENVMAP_TYPE_CUBE
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
}`,R1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,P1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,D1=`#include <common>
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
}`,L1=`#if DEPTH_PACKING == 3200
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
}`,N1=`#define DISTANCE
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
}`,I1=`#define DISTANCE
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
}`,U1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,F1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,O1=`uniform float scale;
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
}`,k1=`uniform vec3 diffuse;
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
}`,B1=`#include <common>
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
}`,z1=`uniform vec3 diffuse;
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
}`,H1=`#define LAMBERT
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
}`,V1=`#define LAMBERT
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
}`,G1=`#define MATCAP
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
}`,j1=`#define MATCAP
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
}`,W1=`#define NORMAL
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
}`,X1=`#define NORMAL
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
}`,$1=`#define PHONG
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
}`,Y1=`#define PHONG
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
}`,q1=`#define STANDARD
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
}`,K1=`#define STANDARD
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
}`,Z1=`#define TOON
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
}`,J1=`#define TOON
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
}`,Q1=`uniform float size;
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
}`,eT=`uniform vec3 diffuse;
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
}`,tT=`#include <common>
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
}`,nT=`uniform vec3 color;
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
}`,iT=`uniform float rotation;
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
}`,rT=`uniform vec3 diffuse;
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
}`,_t={alphahash_fragment:TE,alphahash_pars_fragment:bE,alphamap_fragment:AE,alphamap_pars_fragment:CE,alphatest_fragment:RE,alphatest_pars_fragment:PE,aomap_fragment:DE,aomap_pars_fragment:LE,batching_pars_vertex:NE,batching_vertex:IE,begin_vertex:UE,beginnormal_vertex:FE,bsdfs:OE,iridescence_fragment:kE,bumpmap_pars_fragment:BE,clipping_planes_fragment:zE,clipping_planes_pars_fragment:HE,clipping_planes_pars_vertex:VE,clipping_planes_vertex:GE,color_fragment:jE,color_pars_fragment:WE,color_pars_vertex:XE,color_vertex:$E,common:YE,cube_uv_reflection_fragment:qE,defaultnormal_vertex:KE,displacementmap_pars_vertex:ZE,displacementmap_vertex:JE,emissivemap_fragment:QE,emissivemap_pars_fragment:ew,colorspace_fragment:tw,colorspace_pars_fragment:nw,envmap_fragment:iw,envmap_common_pars_fragment:rw,envmap_pars_fragment:sw,envmap_pars_vertex:ow,envmap_physical_pars_fragment:vw,envmap_vertex:aw,fog_vertex:lw,fog_pars_vertex:cw,fog_fragment:uw,fog_pars_fragment:dw,gradientmap_pars_fragment:hw,lightmap_pars_fragment:fw,lights_lambert_fragment:pw,lights_lambert_pars_fragment:mw,lights_pars_begin:gw,lights_toon_fragment:_w,lights_toon_pars_fragment:xw,lights_phong_fragment:Sw,lights_phong_pars_fragment:yw,lights_physical_fragment:Mw,lights_physical_pars_fragment:Ew,lights_fragment_begin:ww,lights_fragment_maps:Tw,lights_fragment_end:bw,lightprobes_pars_fragment:Aw,logdepthbuf_fragment:Cw,logdepthbuf_pars_fragment:Rw,logdepthbuf_pars_vertex:Pw,logdepthbuf_vertex:Dw,map_fragment:Lw,map_pars_fragment:Nw,map_particle_fragment:Iw,map_particle_pars_fragment:Uw,metalnessmap_fragment:Fw,metalnessmap_pars_fragment:Ow,morphinstance_vertex:kw,morphcolor_vertex:Bw,morphnormal_vertex:zw,morphtarget_pars_vertex:Hw,morphtarget_vertex:Vw,normal_fragment_begin:Gw,normal_fragment_maps:jw,normal_pars_fragment:Ww,normal_pars_vertex:Xw,normal_vertex:$w,normalmap_pars_fragment:Yw,clearcoat_normal_fragment_begin:qw,clearcoat_normal_fragment_maps:Kw,clearcoat_pars_fragment:Zw,iridescence_pars_fragment:Jw,opaque_fragment:Qw,packing:e1,premultiplied_alpha_fragment:t1,project_vertex:n1,dithering_fragment:i1,dithering_pars_fragment:r1,roughnessmap_fragment:s1,roughnessmap_pars_fragment:o1,shadowmap_pars_fragment:a1,shadowmap_pars_vertex:l1,shadowmap_vertex:c1,shadowmask_pars_fragment:u1,skinbase_vertex:d1,skinning_pars_vertex:h1,skinning_vertex:f1,skinnormal_vertex:p1,specularmap_fragment:m1,specularmap_pars_fragment:g1,tonemapping_fragment:v1,tonemapping_pars_fragment:_1,transmission_fragment:x1,transmission_pars_fragment:S1,uv_pars_fragment:y1,uv_pars_vertex:M1,uv_vertex:E1,worldpos_vertex:w1,background_vert:T1,background_frag:b1,backgroundCube_vert:A1,backgroundCube_frag:C1,cube_vert:R1,cube_frag:P1,depth_vert:D1,depth_frag:L1,distance_vert:N1,distance_frag:I1,equirect_vert:U1,equirect_frag:F1,linedashed_vert:O1,linedashed_frag:k1,meshbasic_vert:B1,meshbasic_frag:z1,meshlambert_vert:H1,meshlambert_frag:V1,meshmatcap_vert:G1,meshmatcap_frag:j1,meshnormal_vert:W1,meshnormal_frag:X1,meshphong_vert:$1,meshphong_frag:Y1,meshphysical_vert:q1,meshphysical_frag:K1,meshtoon_vert:Z1,meshtoon_frag:J1,points_vert:Q1,points_frag:eT,shadow_vert:tT,shadow_frag:nT,sprite_vert:iT,sprite_frag:rT},ke={common:{diffuse:{value:new wt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new gt},alphaMap:{value:null},alphaMapTransform:{value:new gt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new gt}},envmap:{envMap:{value:null},envMapRotation:{value:new gt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new gt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new gt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new gt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new gt},normalScale:{value:new ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new gt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new gt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new gt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new gt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new wt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new Y},probesMax:{value:new Y},probesResolution:{value:new Y}},points:{diffuse:{value:new wt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new gt},alphaTest:{value:0},uvTransform:{value:new gt}},sprite:{diffuse:{value:new wt(16777215)},opacity:{value:1},center:{value:new ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new gt},alphaMap:{value:null},alphaMapTransform:{value:new gt},alphaTest:{value:0}}},Ji={basic:{uniforms:Wn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Wn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new wt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Wn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new wt(0)},specular:{value:new wt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Wn([ke.common,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.roughnessmap,ke.metalnessmap,ke.fog,ke.lights,{emissive:{value:new wt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Wn([ke.common,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.gradientmap,ke.fog,ke.lights,{emissive:{value:new wt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Wn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Wn([ke.points,ke.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Wn([ke.common,ke.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Wn([ke.common,ke.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Wn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Wn([ke.sprite,ke.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new gt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new gt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Wn([ke.common,ke.displacementmap,{referencePosition:{value:new Y},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Wn([ke.lights,ke.fog,{color:{value:new wt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};Ji.physical={uniforms:Wn([Ji.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new gt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new gt},clearcoatNormalScale:{value:new ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new gt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new gt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new gt},sheen:{value:0},sheenColor:{value:new wt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new gt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new gt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new gt},transmissionSamplerSize:{value:new ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new gt},attenuationDistance:{value:0},attenuationColor:{value:new wt(0)},specularColor:{value:new wt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new gt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new gt},anisotropyVector:{value:new ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new gt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const Dc={r:0,b:0,g:0},sT=new nn,G_=new gt;G_.set(-1,0,0,0,1,0,0,0,1);function oT(s,e,t,i,o,l){const c=new wt(0);let d=o===!0?0:1,h,f,g=null,m=0,v=null;function _(C){let L=C.isScene===!0?C.background:null;if(L&&L.isTexture){const P=C.backgroundBlurriness>0;L=e.get(L,P)}return L}function M(C){let L=!1;const P=_(C);P===null?y(c,d):P&&P.isColor&&(y(P,1),L=!0);const O=s.xr.getEnvironmentBlendMode();O==="additive"?t.buffers.color.setClear(0,0,0,1,l):O==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(s.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function w(C,L){const P=_(L);P&&(P.isCubeTexture||P.mapping===vu)?(f===void 0&&(f=new it(new Wt(1,1,1),new lr({name:"BackgroundCubeMaterial",uniforms:Go(Ji.backgroundCube.uniforms),vertexShader:Ji.backgroundCube.vertexShader,fragmentShader:Ji.backgroundCube.fragmentShader,side:ai,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(O,N,B){this.matrixWorld.copyPosition(B.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(f)),f.material.uniforms.envMap.value=P,f.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(sT.makeRotationFromEuler(L.backgroundRotation)).transpose(),P.isCubeTexture&&P.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(G_),f.material.toneMapped=Tt.getTransfer(P.colorSpace)!==zt,(g!==P||m!==P.version||v!==s.toneMapping)&&(f.material.needsUpdate=!0,g=P,m=P.version,v=s.toneMapping),f.layers.enableAll(),C.unshift(f,f.geometry,f.material,0,0,null)):P&&P.isTexture&&(h===void 0&&(h=new it(new Fs(2,2),new lr({name:"BackgroundMaterial",uniforms:Go(Ji.background.uniforms),vertexShader:Ji.background.vertexShader,fragmentShader:Ji.background.fragmentShader,side:as,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(h)),h.material.uniforms.t2D.value=P,h.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,h.material.toneMapped=Tt.getTransfer(P.colorSpace)!==zt,P.matrixAutoUpdate===!0&&P.updateMatrix(),h.material.uniforms.uvTransform.value.copy(P.matrix),(g!==P||m!==P.version||v!==s.toneMapping)&&(h.material.needsUpdate=!0,g=P,m=P.version,v=s.toneMapping),h.layers.enableAll(),C.unshift(h,h.geometry,h.material,0,0,null))}function y(C,L){C.getRGB(Dc,B_(s)),t.buffers.color.setClear(Dc.r,Dc.g,Dc.b,L,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(C,L=1){c.set(C),d=L,y(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(C){d=C,y(c,d)},render:M,addToRenderList:w,dispose:S}}function aT(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),i={},o=v(null);let l=o,c=!1;function d(k,X,re,ue,G){let Q=!1;const q=m(k,ue,re,X);l!==q&&(l=q,f(l.object)),Q=_(k,ue,re,G),Q&&M(k,ue,re,G),G!==null&&e.update(G,s.ELEMENT_ARRAY_BUFFER),(Q||c)&&(c=!1,P(k,X,re,ue),G!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(G).buffer))}function h(){return s.createVertexArray()}function f(k){return s.bindVertexArray(k)}function g(k){return s.deleteVertexArray(k)}function m(k,X,re,ue){const G=ue.wireframe===!0;let Q=i[X.id];Q===void 0&&(Q={},i[X.id]=Q);const q=k.isInstancedMesh===!0?k.id:0;let K=Q[q];K===void 0&&(K={},Q[q]=K);let ae=K[re.id];ae===void 0&&(ae={},K[re.id]=ae);let le=ae[G];return le===void 0&&(le=v(h()),ae[G]=le),le}function v(k){const X=[],re=[],ue=[];for(let G=0;G<t;G++)X[G]=0,re[G]=0,ue[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:X,enabledAttributes:re,attributeDivisors:ue,object:k,attributes:{},index:null}}function _(k,X,re,ue){const G=l.attributes,Q=X.attributes;let q=0;const K=re.getAttributes();for(const ae in K)if(K[ae].location>=0){const I=G[ae];let Z=Q[ae];if(Z===void 0&&(ae==="instanceMatrix"&&k.instanceMatrix&&(Z=k.instanceMatrix),ae==="instanceColor"&&k.instanceColor&&(Z=k.instanceColor)),I===void 0||I.attribute!==Z||Z&&I.data!==Z.data)return!0;q++}return l.attributesNum!==q||l.index!==ue}function M(k,X,re,ue){const G={},Q=X.attributes;let q=0;const K=re.getAttributes();for(const ae in K)if(K[ae].location>=0){let I=Q[ae];I===void 0&&(ae==="instanceMatrix"&&k.instanceMatrix&&(I=k.instanceMatrix),ae==="instanceColor"&&k.instanceColor&&(I=k.instanceColor));const Z={};Z.attribute=I,I&&I.data&&(Z.data=I.data),G[ae]=Z,q++}l.attributes=G,l.attributesNum=q,l.index=ue}function w(){const k=l.newAttributes;for(let X=0,re=k.length;X<re;X++)k[X]=0}function y(k){S(k,0)}function S(k,X){const re=l.newAttributes,ue=l.enabledAttributes,G=l.attributeDivisors;re[k]=1,ue[k]===0&&(s.enableVertexAttribArray(k),ue[k]=1),G[k]!==X&&(s.vertexAttribDivisor(k,X),G[k]=X)}function C(){const k=l.newAttributes,X=l.enabledAttributes;for(let re=0,ue=X.length;re<ue;re++)X[re]!==k[re]&&(s.disableVertexAttribArray(re),X[re]=0)}function L(k,X,re,ue,G,Q,q){q===!0?s.vertexAttribIPointer(k,X,re,G,Q):s.vertexAttribPointer(k,X,re,ue,G,Q)}function P(k,X,re,ue){w();const G=ue.attributes,Q=re.getAttributes(),q=X.defaultAttributeValues;for(const K in Q){const ae=Q[K];if(ae.location>=0){let le=G[K];if(le===void 0&&(K==="instanceMatrix"&&k.instanceMatrix&&(le=k.instanceMatrix),K==="instanceColor"&&k.instanceColor&&(le=k.instanceColor)),le!==void 0){const I=le.normalized,Z=le.itemSize,ve=e.get(le);if(ve===void 0)continue;const Pe=ve.buffer,Fe=ve.type,ie=ve.bytesPerElement,_e=Fe===s.INT||Fe===s.UNSIGNED_INT||le.gpuType===fp;if(le.isInterleavedBufferAttribute){const fe=le.data,Oe=fe.stride,qe=le.offset;if(fe.isInstancedInterleavedBuffer){for(let nt=0;nt<ae.locationSize;nt++)S(ae.location+nt,fe.meshPerAttribute);k.isInstancedMesh!==!0&&ue._maxInstanceCount===void 0&&(ue._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let nt=0;nt<ae.locationSize;nt++)y(ae.location+nt);s.bindBuffer(s.ARRAY_BUFFER,Pe);for(let nt=0;nt<ae.locationSize;nt++)L(ae.location+nt,Z/ae.locationSize,Fe,I,Oe*ie,(qe+Z/ae.locationSize*nt)*ie,_e)}else{if(le.isInstancedBufferAttribute){for(let fe=0;fe<ae.locationSize;fe++)S(ae.location+fe,le.meshPerAttribute);k.isInstancedMesh!==!0&&ue._maxInstanceCount===void 0&&(ue._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let fe=0;fe<ae.locationSize;fe++)y(ae.location+fe);s.bindBuffer(s.ARRAY_BUFFER,Pe);for(let fe=0;fe<ae.locationSize;fe++)L(ae.location+fe,Z/ae.locationSize,Fe,I,Z*ie,Z/ae.locationSize*fe*ie,_e)}}else if(q!==void 0){const I=q[K];if(I!==void 0)switch(I.length){case 2:s.vertexAttrib2fv(ae.location,I);break;case 3:s.vertexAttrib3fv(ae.location,I);break;case 4:s.vertexAttrib4fv(ae.location,I);break;default:s.vertexAttrib1fv(ae.location,I)}}}}C()}function O(){U();for(const k in i){const X=i[k];for(const re in X){const ue=X[re];for(const G in ue){const Q=ue[G];for(const q in Q)g(Q[q].object),delete Q[q];delete ue[G]}}delete i[k]}}function N(k){if(i[k.id]===void 0)return;const X=i[k.id];for(const re in X){const ue=X[re];for(const G in ue){const Q=ue[G];for(const q in Q)g(Q[q].object),delete Q[q];delete ue[G]}}delete i[k.id]}function B(k){for(const X in i){const re=i[X];for(const ue in re){const G=re[ue];if(G[k.id]===void 0)continue;const Q=G[k.id];for(const q in Q)g(Q[q].object),delete Q[q];delete G[k.id]}}}function A(k){for(const X in i){const re=i[X],ue=k.isInstancedMesh===!0?k.id:0,G=re[ue];if(G!==void 0){for(const Q in G){const q=G[Q];for(const K in q)g(q[K].object),delete q[K];delete G[Q]}delete re[ue],Object.keys(re).length===0&&delete i[X]}}}function U(){z(),c=!0,l!==o&&(l=o,f(l.object))}function z(){o.geometry=null,o.program=null,o.wireframe=!1}return{setup:d,reset:U,resetDefaultState:z,dispose:O,releaseStatesOfGeometry:N,releaseStatesOfObject:A,releaseStatesOfProgram:B,initAttributes:w,enableAttribute:y,disableUnusedAttributes:C}}function lT(s,e,t){let i;function o(h){i=h}function l(h,f){s.drawArrays(i,h,f),t.update(f,i,1)}function c(h,f,g){g!==0&&(s.drawArraysInstanced(i,h,f,g),t.update(f,i,g))}function d(h,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,h,0,f,0,g);let v=0;for(let _=0;_<g;_++)v+=f[_];t.update(v,i,1)}this.setMode=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function cT(s,e,t,i){let o;function l(){if(o!==void 0)return o;if(e.has("EXT_texture_filter_anisotropic")===!0){const B=e.get("EXT_texture_filter_anisotropic");o=s.getParameter(B.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else o=0;return o}function c(B){return!(B!==zi&&i.convert(B)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(B){const A=B===Pr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(B!==mi&&i.convert(B)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&B!==nr&&!A)}function h(B){if(B==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";B="mediump"}return B==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const g=h(f);g!==f&&(at("WebGLRenderer:",f,"not supported, using",g,"instead."),f=g);const m=t.logarithmicDepthBuffer===!0,v=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&v===!1&&at("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const _=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),M=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=s.getParameter(s.MAX_TEXTURE_SIZE),y=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),S=s.getParameter(s.MAX_VERTEX_ATTRIBS),C=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),L=s.getParameter(s.MAX_VARYING_VECTORS),P=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),O=s.getParameter(s.MAX_SAMPLES),N=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:m,reversedDepthBuffer:v,maxTextures:_,maxVertexTextures:M,maxTextureSize:w,maxCubemapSize:y,maxAttributes:S,maxVertexUniforms:C,maxVaryings:L,maxFragmentUniforms:P,maxSamples:O,samples:N}}function uT(s){const e=this;let t=null,i=0,o=!1,l=!1;const c=new is,d=new gt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(m,v){const _=m.length!==0||v||i!==0||o;return o=v,i=m.length,_},this.beginShadows=function(){l=!0,g(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(m,v){t=g(m,v,0)},this.setState=function(m,v,_){const M=m.clippingPlanes,w=m.clipIntersection,y=m.clipShadows,S=s.get(m);if(!o||M===null||M.length===0||l&&!y)l?g(null):f();else{const C=l?0:i,L=C*4;let P=S.clippingState||null;h.value=P,P=g(M,v,L,_);for(let O=0;O!==L;++O)P[O]=t[O];S.clippingState=P,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=C}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function g(m,v,_,M){const w=m!==null?m.length:0;let y=null;if(w!==0){if(y=h.value,M!==!0||y===null){const S=_+w*4,C=v.matrixWorldInverse;d.getNormalMatrix(C),(y===null||y.length<S)&&(y=new Float32Array(S));for(let L=0,P=_;L!==w;++L,P+=4)c.copy(m[L]).applyMatrix4(C,d),c.normal.toArray(y,P),y[P+3]=c.constant}h.value=y,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,y}}const ss=4,iv=[.125,.215,.35,.446,.526,.582],Ls=20,dT=256,Fa=new Tp,rv=new wt;let jh=null,Wh=0,Xh=0,$h=!1;const hT=new Y;class sv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,o=100,l={}){const{size:c=256,position:d=hT}=l;jh=this._renderer.getRenderTarget(),Wh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),$h=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,i,o,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=lv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=av(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(jh,Wh,Xh),this._renderer.xr.enabled=$h,e.scissorTest=!1,Do(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ks||e.mapping===zo?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),jh=this._renderer.getRenderTarget(),Wh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),$h=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ln,minFilter:Ln,generateMipmaps:!1,type:Pr,format:zi,colorSpace:su,depthBuffer:!1},o=ov(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ov(e,t,i);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=fT(l)),this._blurMaterial=mT(l,e,t),this._ggxMaterial=pT(l,e,t)}return o}_compileMaterial(e){const t=new it(new bn,e);this._renderer.compile(t,Fa)}_sceneToCubeUV(e,t,i,o,l){const h=new si(90,1,t,i),f=[1,-1,1,1,1,1],g=[1,1,1,-1,-1,-1],m=this._renderer,v=m.autoClear,_=m.toneMapping;m.getClearColor(rv),m.toneMapping=sr,m.autoClear=!1,m.state.buffers.depth.getReversed()&&(m.setRenderTarget(o),m.clearDepth(),m.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new it(new Wt,new Ho({name:"PMREM.Background",side:ai,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,y=w.material;let S=!1;const C=e.background;C?C.isColor&&(y.color.copy(C),e.background=null,S=!0):(y.color.copy(rv),S=!0);for(let L=0;L<6;L++){const P=L%3;P===0?(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+g[L],l.y,l.z)):P===1?(h.up.set(0,0,f[L]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+g[L],l.z)):(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+g[L]));const O=this._cubeSize;Do(o,P*O,L>2?O:0,O,O),m.setRenderTarget(o),S&&m.render(w,h),m.render(e,h)}m.toneMapping=_,m.autoClear=v,e.background=C}_textureToCubeUV(e,t){const i=this._renderer,o=e.mapping===ks||e.mapping===zo;o?(this._cubemapMaterial===null&&(this._cubemapMaterial=lv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=av());const l=o?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;Do(t,0,0,3*h,2*h),i.setRenderTarget(t),i.render(c,Fa)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const o=this._lodMeshes.length;for(let l=1;l<o;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=i}_applyGGXFilter(e,t,i){const o=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[i];d.material=c;const h=c.uniforms,f=i/(this._lodMeshes.length-1),g=t/(this._lodMeshes.length-1),m=Math.sqrt(f*f-g*g),v=0+f*1.25,_=m*v,{_lodMax:M}=this,w=this._sizeLods[i],y=3*w*(i>M-ss?i-M+ss:0),S=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=_,h.mipInt.value=M-t,Do(l,y,S,3*w,2*w),o.setRenderTarget(l),o.render(d,Fa),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=M-i,Do(e,y,S,3*w,2*w),o.setRenderTarget(e),o.render(d,Fa)}_blur(e,t,i,o,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,i,o,"latitudinal",l),this._halfBlur(c,e,i,i,o,"longitudinal",l)}_halfBlur(e,t,i,o,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Rt("blur direction must be either latitudinal or longitudinal!");const g=3,m=this._lodMeshes[o];m.material=f;const v=f.uniforms,_=this._sizeLods[i]-1,M=isFinite(l)?Math.PI/(2*_):2*Math.PI/(2*Ls-1),w=l/M,y=isFinite(l)?1+Math.floor(g*w):Ls;y>Ls&&at(`sigmaRadians, ${l}, is too large and will clip, as it requested ${y} samples when the maximum is set to ${Ls}`);const S=[];let C=0;for(let B=0;B<Ls;++B){const A=B/w,U=Math.exp(-A*A/2);S.push(U),B===0?C+=U:B<y&&(C+=2*U)}for(let B=0;B<S.length;B++)S[B]=S[B]/C;v.envMap.value=e.texture,v.samples.value=y,v.weights.value=S,v.latitudinal.value=c==="latitudinal",d&&(v.poleAxis.value=d);const{_lodMax:L}=this;v.dTheta.value=M,v.mipInt.value=L-i;const P=this._sizeLods[o],O=3*P*(o>L-ss?o-L+ss:0),N=4*(this._cubeSize-P);Do(t,O,N,3*P,2*P),h.setRenderTarget(t),h.render(m,Fa)}}function fT(s){const e=[],t=[],i=[];let o=s;const l=s-ss+1+iv.length;for(let c=0;c<l;c++){const d=Math.pow(2,o);e.push(d);let h=1/d;c>s-ss?h=iv[c-s+ss-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),g=-f,m=1+f,v=[g,g,m,g,m,m,g,g,m,m,g,m],_=6,M=6,w=3,y=2,S=1,C=new Float32Array(w*M*_),L=new Float32Array(y*M*_),P=new Float32Array(S*M*_);for(let N=0;N<_;N++){const B=N%3*2/3-1,A=N>2?0:-1,U=[B,A,0,B+2/3,A,0,B+2/3,A+1,0,B,A,0,B+2/3,A+1,0,B,A+1,0];C.set(U,w*M*N),L.set(v,y*M*N);const z=[N,N,N,N,N,N];P.set(z,S*M*N)}const O=new bn;O.setAttribute("position",new li(C,w)),O.setAttribute("uv",new li(L,y)),O.setAttribute("faceIndex",new li(P,S)),i.push(new it(O,null)),o>ss&&o--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function ov(s,e,t){const i=new or(s,e,t);return i.texture.mapping=vu,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Do(s,e,t,i,o){s.viewport.set(e,t,i,o),s.scissor.set(e,t,i,o)}function pT(s,e,t){return new lr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:dT,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Su(),fragmentShader:`

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
		`,blending:Cr,depthTest:!1,depthWrite:!1})}function mT(s,e,t){const i=new Float32Array(Ls),o=new Y(0,1,0);return new lr({name:"SphericalGaussianBlur",defines:{n:Ls,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:o}},vertexShader:Su(),fragmentShader:`

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
		`,blending:Cr,depthTest:!1,depthWrite:!1})}function av(){return new lr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Su(),fragmentShader:`

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
		`,blending:Cr,depthTest:!1,depthWrite:!1})}function lv(){return new lr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Su(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Cr,depthTest:!1,depthWrite:!1})}function Su(){return`

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
	`}class j_ extends or{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},o=[i,i,i,i,i,i];this.texture=new F_(o),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},o=new Wt(5,5,5),l=new lr({name:"CubemapFromEquirect",uniforms:Go(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:ai,blending:Cr});l.uniforms.tEquirect.value=t;const c=new it(o,l),d=t.minFilter;return t.minFilter===Ns&&(t.minFilter=Ln),new SE(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,i=!0,o=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,i,o);e.setRenderTarget(l)}}function gT(s){let e=new WeakMap,t=new WeakMap,i=null;function o(v,_=!1){return v==null?null:_?c(v):l(v)}function l(v){if(v&&v.isTexture){const _=v.mapping;if(_===mh||_===gh)if(e.has(v)){const M=e.get(v).texture;return d(M,v.mapping)}else{const M=v.image;if(M&&M.height>0){const w=new j_(M.height);return w.fromEquirectangularTexture(s,v),e.set(v,w),v.addEventListener("dispose",f),d(w.texture,v.mapping)}else return null}}return v}function c(v){if(v&&v.isTexture){const _=v.mapping,M=_===mh||_===gh,w=_===ks||_===zo;if(M||w){let y=t.get(v);const S=y!==void 0?y.texture.pmremVersion:0;if(v.isRenderTargetTexture&&v.pmremVersion!==S)return i===null&&(i=new sv(s)),y=M?i.fromEquirectangular(v,y):i.fromCubemap(v,y),y.texture.pmremVersion=v.pmremVersion,t.set(v,y),y.texture;if(y!==void 0)return y.texture;{const C=v.image;return M&&C&&C.height>0||w&&C&&h(C)?(i===null&&(i=new sv(s)),y=M?i.fromEquirectangular(v):i.fromCubemap(v),y.texture.pmremVersion=v.pmremVersion,t.set(v,y),v.addEventListener("dispose",g),y.texture):null}}}return v}function d(v,_){return _===mh?v.mapping=ks:_===gh&&(v.mapping=zo),v}function h(v){let _=0;const M=6;for(let w=0;w<M;w++)v[w]!==void 0&&_++;return _===M}function f(v){const _=v.target;_.removeEventListener("dispose",f);const M=e.get(_);M!==void 0&&(e.delete(_),M.dispose())}function g(v){const _=v.target;_.removeEventListener("dispose",g);const M=t.get(_);M!==void 0&&(t.delete(_),M.dispose())}function m(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:o,dispose:m}}function vT(s){const e={};function t(i){if(e[i]!==void 0)return e[i];const o=s.getExtension(i);return e[i]=o,o}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const o=t(i);return o===null&&Zf("WebGLRenderer: "+i+" extension not supported."),o}}}function _T(s,e,t,i){const o={},l=new WeakMap;function c(m){const v=m.target;v.index!==null&&e.remove(v.index);for(const M in v.attributes)e.remove(v.attributes[M]);v.removeEventListener("dispose",c),delete o[v.id];const _=l.get(v);_&&(e.remove(_),l.delete(v)),i.releaseStatesOfGeometry(v),v.isInstancedBufferGeometry===!0&&delete v._maxInstanceCount,t.memory.geometries--}function d(m,v){return o[v.id]===!0||(v.addEventListener("dispose",c),o[v.id]=!0,t.memory.geometries++),v}function h(m){const v=m.attributes;for(const _ in v)e.update(v[_],s.ARRAY_BUFFER)}function f(m){const v=[],_=m.index,M=m.attributes.position;let w=0;if(M===void 0)return;if(_!==null){const C=_.array;w=_.version;for(let L=0,P=C.length;L<P;L+=3){const O=C[L+0],N=C[L+1],B=C[L+2];v.push(O,N,N,B,B,O)}}else{const C=M.array;w=M.version;for(let L=0,P=C.length/3-1;L<P;L+=3){const O=L+0,N=L+1,B=L+2;v.push(O,N,N,B,B,O)}}const y=new(M.count>=65535?L_:D_)(v,1);y.version=w;const S=l.get(m);S&&e.remove(S),l.set(m,y)}function g(m){const v=l.get(m);if(v){const _=m.index;_!==null&&v.version<_.version&&f(m)}else f(m);return l.get(m)}return{get:d,update:h,getWireframeAttribute:g}}function xT(s,e,t){let i;function o(m){i=m}let l,c;function d(m){l=m.type,c=m.bytesPerElement}function h(m,v){s.drawElements(i,v,l,m*c),t.update(v,i,1)}function f(m,v,_){_!==0&&(s.drawElementsInstanced(i,v,l,m*c,_),t.update(v,i,_))}function g(m,v,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,v,0,l,m,0,_);let w=0;for(let y=0;y<_;y++)w+=v[y];t.update(w,i,1)}this.setMode=o,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=g}function ST(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(l,c,d){switch(t.calls++,c){case s.TRIANGLES:t.triangles+=d*(l/3);break;case s.LINES:t.lines+=d*(l/2);break;case s.LINE_STRIP:t.lines+=d*(l-1);break;case s.LINE_LOOP:t.lines+=d*l;break;case s.POINTS:t.points+=d*l;break;default:Rt("WebGLInfo: Unknown draw mode:",c);break}}function o(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:o,update:i}}function yT(s,e,t){const i=new WeakMap,o=new an;function l(c,d,h){const f=c.morphTargetInfluences,g=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,m=g!==void 0?g.length:0;let v=i.get(d);if(v===void 0||v.count!==m){let z=function(){A.dispose(),i.delete(d),d.removeEventListener("dispose",z)};var _=z;v!==void 0&&v.texture.dispose();const M=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,y=d.morphAttributes.color!==void 0,S=d.morphAttributes.position||[],C=d.morphAttributes.normal||[],L=d.morphAttributes.color||[];let P=0;M===!0&&(P=1),w===!0&&(P=2),y===!0&&(P=3);let O=d.attributes.position.count*P,N=1;O>e.maxTextureSize&&(N=Math.ceil(O/e.maxTextureSize),O=e.maxTextureSize);const B=new Float32Array(O*N*4*m),A=new C_(B,O,N,m);A.type=nr,A.needsUpdate=!0;const U=P*4;for(let k=0;k<m;k++){const X=S[k],re=C[k],ue=L[k],G=O*N*4*k;for(let Q=0;Q<X.count;Q++){const q=Q*U;M===!0&&(o.fromBufferAttribute(X,Q),B[G+q+0]=o.x,B[G+q+1]=o.y,B[G+q+2]=o.z,B[G+q+3]=0),w===!0&&(o.fromBufferAttribute(re,Q),B[G+q+4]=o.x,B[G+q+5]=o.y,B[G+q+6]=o.z,B[G+q+7]=0),y===!0&&(o.fromBufferAttribute(ue,Q),B[G+q+8]=o.x,B[G+q+9]=o.y,B[G+q+10]=o.z,B[G+q+11]=ue.itemSize===4?o.w:1)}}v={count:m,texture:A,size:new ot(O,N)},i.set(d,v),d.addEventListener("dispose",z)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(s,"morphTexture",c.morphTexture,t);else{let M=0;for(let y=0;y<f.length;y++)M+=f[y];const w=d.morphTargetsRelative?1:1-M;h.getUniforms().setValue(s,"morphTargetBaseInfluence",w),h.getUniforms().setValue(s,"morphTargetInfluences",f)}h.getUniforms().setValue(s,"morphTargetsTexture",v.texture,t),h.getUniforms().setValue(s,"morphTargetsTextureSize",v.size)}return{update:l}}function MT(s,e,t,i,o){let l=new WeakMap;function c(f){const g=o.render.frame,m=f.geometry,v=e.get(f,m);if(l.get(v)!==g&&(e.update(v),l.set(v,g)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==g&&(t.update(f.instanceMatrix,s.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,s.ARRAY_BUFFER),l.set(f,g))),f.isSkinnedMesh){const _=f.skeleton;l.get(_)!==g&&(_.update(),l.set(_,g))}return v}function d(){l=new WeakMap}function h(f){const g=f.target;g.removeEventListener("dispose",h),i.releaseStatesOfObject(g),t.remove(g.instanceMatrix),g.instanceColor!==null&&t.remove(g.instanceColor)}return{update:c,dispose:d}}const ET={[f_]:"LINEAR_TONE_MAPPING",[p_]:"REINHARD_TONE_MAPPING",[m_]:"CINEON_TONE_MAPPING",[hp]:"ACES_FILMIC_TONE_MAPPING",[v_]:"AGX_TONE_MAPPING",[__]:"NEUTRAL_TONE_MAPPING",[g_]:"CUSTOM_TONE_MAPPING"};function wT(s,e,t,i,o){const l=new or(e,t,{type:s,depthBuffer:i,stencilBuffer:o,depthTexture:i?new Vo(e,t):void 0}),c=new or(e,t,{type:Pr,depthBuffer:!1,stencilBuffer:!1}),d=new bn;d.setAttribute("position",new rn([-1,3,0,-1,-1,0,3,-1,0],3)),d.setAttribute("uv",new rn([0,2,0,0,2,0],2));const h=new hE({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),f=new it(d,h),g=new Tp(-1,1,1,-1,0,1);let m=null,v=null,_=!1,M,w=null,y=[],S=!1;this.setSize=function(C,L){l.setSize(C,L),c.setSize(C,L);for(let P=0;P<y.length;P++){const O=y[P];O.setSize&&O.setSize(C,L)}},this.setEffects=function(C){y=C,S=y.length>0&&y[0].isRenderPass===!0;const L=l.width,P=l.height;for(let O=0;O<y.length;O++){const N=y[O];N.setSize&&N.setSize(L,P)}},this.begin=function(C,L){if(_||C.toneMapping===sr&&y.length===0)return!1;if(w=L,L!==null){const P=L.width,O=L.height;(l.width!==P||l.height!==O)&&this.setSize(P,O)}return S===!1&&C.setRenderTarget(l),M=C.toneMapping,C.toneMapping=sr,!0},this.hasRenderPass=function(){return S},this.end=function(C,L){C.toneMapping=M,_=!0;let P=l,O=c;for(let N=0;N<y.length;N++){const B=y[N];if(B.enabled!==!1&&(B.render(C,O,P,L),B.needsSwap!==!1)){const A=P;P=O,O=A}}if(m!==C.outputColorSpace||v!==C.toneMapping){m=C.outputColorSpace,v=C.toneMapping,h.defines={},Tt.getTransfer(m)===zt&&(h.defines.SRGB_TRANSFER="");const N=ET[v];N&&(h.defines[N]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=P.texture,C.setRenderTarget(w),C.render(f,g),w=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){l.depthTexture&&l.depthTexture.dispose(),l.dispose(),c.dispose(),d.dispose(),h.dispose()}}const W_=new zn,Jf=new Vo(1,1),X_=new C_,$_=new BM,Y_=new F_,cv=[],uv=[],dv=new Float32Array(16),hv=new Float32Array(9),fv=new Float32Array(4);function jo(s,e,t){const i=s[0];if(i<=0||i>0)return s;const o=e*t;let l=cv[o];if(l===void 0&&(l=new Float32Array(o),cv[o]=l),e!==0){i.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,s[c].toArray(l,d)}return l}function xn(s,e){if(s.length!==e.length)return!1;for(let t=0,i=s.length;t<i;t++)if(s[t]!==e[t])return!1;return!0}function Sn(s,e){for(let t=0,i=e.length;t<i;t++)s[t]=e[t]}function yu(s,e){let t=uv[e];t===void 0&&(t=new Int32Array(e),uv[e]=t);for(let i=0;i!==e;++i)t[i]=s.allocateTextureUnit();return t}function TT(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function bT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;s.uniform2fv(this.addr,e),Sn(t,e)}}function AT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(xn(t,e))return;s.uniform3fv(this.addr,e),Sn(t,e)}}function CT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;s.uniform4fv(this.addr,e),Sn(t,e)}}function RT(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Sn(t,e)}else{if(xn(t,i))return;fv.set(i),s.uniformMatrix2fv(this.addr,!1,fv),Sn(t,i)}}function PT(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Sn(t,e)}else{if(xn(t,i))return;hv.set(i),s.uniformMatrix3fv(this.addr,!1,hv),Sn(t,i)}}function DT(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Sn(t,e)}else{if(xn(t,i))return;dv.set(i),s.uniformMatrix4fv(this.addr,!1,dv),Sn(t,i)}}function LT(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function NT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;s.uniform2iv(this.addr,e),Sn(t,e)}}function IT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xn(t,e))return;s.uniform3iv(this.addr,e),Sn(t,e)}}function UT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;s.uniform4iv(this.addr,e),Sn(t,e)}}function FT(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function OT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;s.uniform2uiv(this.addr,e),Sn(t,e)}}function kT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xn(t,e))return;s.uniform3uiv(this.addr,e),Sn(t,e)}}function BT(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;s.uniform4uiv(this.addr,e),Sn(t,e)}}function zT(s,e,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(s.uniform1i(this.addr,o),i[0]=o);let l;this.type===s.SAMPLER_2D_SHADOW?(Jf.compareFunction=t.isReversedDepthBuffer()?Sp:xp,l=Jf):l=W_,t.setTexture2D(e||l,o)}function HT(s,e,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(s.uniform1i(this.addr,o),i[0]=o),t.setTexture3D(e||$_,o)}function VT(s,e,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(s.uniform1i(this.addr,o),i[0]=o),t.setTextureCube(e||Y_,o)}function GT(s,e,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(s.uniform1i(this.addr,o),i[0]=o),t.setTexture2DArray(e||X_,o)}function jT(s){switch(s){case 5126:return TT;case 35664:return bT;case 35665:return AT;case 35666:return CT;case 35674:return RT;case 35675:return PT;case 35676:return DT;case 5124:case 35670:return LT;case 35667:case 35671:return NT;case 35668:case 35672:return IT;case 35669:case 35673:return UT;case 5125:return FT;case 36294:return OT;case 36295:return kT;case 36296:return BT;case 35678:case 36198:case 36298:case 36306:case 35682:return zT;case 35679:case 36299:case 36307:return HT;case 35680:case 36300:case 36308:case 36293:return VT;case 36289:case 36303:case 36311:case 36292:return GT}}function WT(s,e){s.uniform1fv(this.addr,e)}function XT(s,e){const t=jo(e,this.size,2);s.uniform2fv(this.addr,t)}function $T(s,e){const t=jo(e,this.size,3);s.uniform3fv(this.addr,t)}function YT(s,e){const t=jo(e,this.size,4);s.uniform4fv(this.addr,t)}function qT(s,e){const t=jo(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function KT(s,e){const t=jo(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function ZT(s,e){const t=jo(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function JT(s,e){s.uniform1iv(this.addr,e)}function QT(s,e){s.uniform2iv(this.addr,e)}function eb(s,e){s.uniform3iv(this.addr,e)}function tb(s,e){s.uniform4iv(this.addr,e)}function nb(s,e){s.uniform1uiv(this.addr,e)}function ib(s,e){s.uniform2uiv(this.addr,e)}function rb(s,e){s.uniform3uiv(this.addr,e)}function sb(s,e){s.uniform4uiv(this.addr,e)}function ob(s,e,t){const i=this.cache,o=e.length,l=yu(t,o);xn(i,l)||(s.uniform1iv(this.addr,l),Sn(i,l));let c;this.type===s.SAMPLER_2D_SHADOW?c=Jf:c=W_;for(let d=0;d!==o;++d)t.setTexture2D(e[d]||c,l[d])}function ab(s,e,t){const i=this.cache,o=e.length,l=yu(t,o);xn(i,l)||(s.uniform1iv(this.addr,l),Sn(i,l));for(let c=0;c!==o;++c)t.setTexture3D(e[c]||$_,l[c])}function lb(s,e,t){const i=this.cache,o=e.length,l=yu(t,o);xn(i,l)||(s.uniform1iv(this.addr,l),Sn(i,l));for(let c=0;c!==o;++c)t.setTextureCube(e[c]||Y_,l[c])}function cb(s,e,t){const i=this.cache,o=e.length,l=yu(t,o);xn(i,l)||(s.uniform1iv(this.addr,l),Sn(i,l));for(let c=0;c!==o;++c)t.setTexture2DArray(e[c]||X_,l[c])}function ub(s){switch(s){case 5126:return WT;case 35664:return XT;case 35665:return $T;case 35666:return YT;case 35674:return qT;case 35675:return KT;case 35676:return ZT;case 5124:case 35670:return JT;case 35667:case 35671:return QT;case 35668:case 35672:return eb;case 35669:case 35673:return tb;case 5125:return nb;case 36294:return ib;case 36295:return rb;case 36296:return sb;case 35678:case 36198:case 36298:case 36306:case 35682:return ob;case 35679:case 36299:case 36307:return ab;case 35680:case 36300:case 36308:case 36293:return lb;case 36289:case 36303:case 36311:case 36292:return cb}}class db{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=jT(t.type)}}class hb{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ub(t.type)}}class fb{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const o=this.seq;for(let l=0,c=o.length;l!==c;++l){const d=o[l];d.setValue(e,t[d.id],i)}}}const Yh=/(\w+)(\])?(\[|\.)?/g;function pv(s,e){s.seq.push(e),s.map[e.id]=e}function pb(s,e,t){const i=s.name,o=i.length;for(Yh.lastIndex=0;;){const l=Yh.exec(i),c=Yh.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===o){pv(t,f===void 0?new db(d,s,e):new hb(d,s,e));break}else{let m=t.map[d];m===void 0&&(m=new fb(d),pv(t,m)),t=m}}}class Zc{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<i;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);pb(d,h,this)}const o=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?o.push(c):l.push(c);o.length>0&&(this.seq=o.concat(l))}setValue(e,t,i,o){const l=this.map[t];l!==void 0&&l.setValue(e,i,o)}setOptional(e,t,i){const o=t[i];o!==void 0&&this.setValue(e,i,o)}static upload(e,t,i,o){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=i[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,o)}}static seqWithValue(e,t){const i=[];for(let o=0,l=e.length;o!==l;++o){const c=e[o];c.id in t&&i.push(c)}return i}}function mv(s,e,t){const i=s.createShader(e);return s.shaderSource(i,t),s.compileShader(i),i}const mb=37297;let gb=0;function vb(s,e){const t=s.split(`
`),i=[],o=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=o;c<l;c++){const d=c+1;i.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return i.join(`
`)}const gv=new gt;function _b(s){Tt._getMatrix(gv,Tt.workingColorSpace,s);const e=`mat3( ${gv.elements.map(t=>t.toFixed(4))} )`;switch(Tt.getTransfer(s)){case ou:return[e,"LinearTransferOETF"];case zt:return[e,"sRGBTransferOETF"];default:return at("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function vv(s,e,t){const i=s.getShaderParameter(e,s.COMPILE_STATUS),l=(s.getShaderInfoLog(e)||"").trim();if(i&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+vb(s.getShaderSource(e),d)}else return l}function xb(s,e){const t=_b(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Sb={[f_]:"Linear",[p_]:"Reinhard",[m_]:"Cineon",[hp]:"ACESFilmic",[v_]:"AgX",[__]:"Neutral",[g_]:"Custom"};function yb(s,e){const t=Sb[e];return t===void 0?(at("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Lc=new Y;function Mb(){Tt.getLuminanceCoefficients(Lc);const s=Lc.x.toFixed(4),e=Lc.y.toFixed(4),t=Lc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Eb(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ga).join(`
`)}function wb(s){const e=[];for(const t in s){const i=s[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Tb(s,e){const t={},i=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let o=0;o<i;o++){const l=s.getActiveAttrib(e,o),c=l.name;let d=1;l.type===s.FLOAT_MAT2&&(d=2),l.type===s.FLOAT_MAT3&&(d=3),l.type===s.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:s.getAttribLocation(e,c),locationSize:d}}return t}function Ga(s){return s!==""}function _v(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function xv(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const bb=/^[ \t]*#include +<([\w\d./]+)>/gm;function Qf(s){return s.replace(bb,Cb)}const Ab=new Map;function Cb(s,e){let t=_t[e];if(t===void 0){const i=Ab.get(e);if(i!==void 0)t=_t[i],at('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Qf(t)}const Rb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Sv(s){return s.replace(Rb,Pb)}function Pb(s,e,t,i){let o="";for(let l=parseInt(e);l<parseInt(t);l++)o+=i.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return o}function yv(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const Db={[Wc]:"SHADOWMAP_TYPE_PCF",[Va]:"SHADOWMAP_TYPE_VSM"};function Lb(s){return Db[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Nb={[ks]:"ENVMAP_TYPE_CUBE",[zo]:"ENVMAP_TYPE_CUBE",[vu]:"ENVMAP_TYPE_CUBE_UV"};function Ib(s){return s.envMap===!1?"ENVMAP_TYPE_CUBE":Nb[s.envMapMode]||"ENVMAP_TYPE_CUBE"}const Ub={[zo]:"ENVMAP_MODE_REFRACTION"};function Fb(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":Ub[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Ob={[dp]:"ENVMAP_BLENDING_MULTIPLY",[vM]:"ENVMAP_BLENDING_MIX",[_M]:"ENVMAP_BLENDING_ADD"};function kb(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":Ob[s.combine]||"ENVMAP_BLENDING_NONE"}function Bb(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function zb(s,e,t,i){const o=s.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=Lb(t),f=Ib(t),g=Fb(t),m=kb(t),v=Bb(t),_=Eb(t),M=wb(l),w=o.createProgram();let y,S,C=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(Ga).join(`
`),y.length>0&&(y+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(Ga).join(`
`),S.length>0&&(S+=`
`)):(y=[yv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+g:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ga).join(`
`),S=[yv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+g:"",t.envMap?"#define "+m:"",v?"#define CUBEUV_TEXEL_WIDTH "+v.texelWidth:"",v?"#define CUBEUV_TEXEL_HEIGHT "+v.texelHeight:"",v?"#define CUBEUV_MAX_MIP "+v.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==sr?"#define TONE_MAPPING":"",t.toneMapping!==sr?_t.tonemapping_pars_fragment:"",t.toneMapping!==sr?yb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,xb("linearToOutputTexel",t.outputColorSpace),Mb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ga).join(`
`)),c=Qf(c),c=_v(c,t),c=xv(c,t),d=Qf(d),d=_v(d,t),d=xv(d,t),c=Sv(c),d=Sv(d),t.isRawShaderMaterial!==!0&&(C=`#version 300 es
`,y=[_,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+y,S=["#define varying in",t.glslVersion===b0?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===b0?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const L=C+y+c,P=C+S+d,O=mv(o,o.VERTEX_SHADER,L),N=mv(o,o.FRAGMENT_SHADER,P);o.attachShader(w,O),o.attachShader(w,N),t.index0AttributeName!==void 0?o.bindAttribLocation(w,0,t.index0AttributeName):t.morphTargets===!0&&o.bindAttribLocation(w,0,"position"),o.linkProgram(w);function B(k){if(s.debug.checkShaderErrors){const X=o.getProgramInfoLog(w)||"",re=o.getShaderInfoLog(O)||"",ue=o.getShaderInfoLog(N)||"",G=X.trim(),Q=re.trim(),q=ue.trim();let K=!0,ae=!0;if(o.getProgramParameter(w,o.LINK_STATUS)===!1)if(K=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(o,w,O,N);else{const le=vv(o,O,"vertex"),I=vv(o,N,"fragment");Rt("THREE.WebGLProgram: Shader Error "+o.getError()+" - VALIDATE_STATUS "+o.getProgramParameter(w,o.VALIDATE_STATUS)+`

Material Name: `+k.name+`
Material Type: `+k.type+`

Program Info Log: `+G+`
`+le+`
`+I)}else G!==""?at("WebGLProgram: Program Info Log:",G):(Q===""||q==="")&&(ae=!1);ae&&(k.diagnostics={runnable:K,programLog:G,vertexShader:{log:Q,prefix:y},fragmentShader:{log:q,prefix:S}})}o.deleteShader(O),o.deleteShader(N),A=new Zc(o,w),U=Tb(o,w)}let A;this.getUniforms=function(){return A===void 0&&B(this),A};let U;this.getAttributes=function(){return U===void 0&&B(this),U};let z=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return z===!1&&(z=o.getProgramParameter(w,mb)),z},this.destroy=function(){i.releaseStatesOfProgram(this),o.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=gb++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=O,this.fragmentShader=N,this}let Hb=0;class Vb{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,o=this._getShaderStage(t),l=this._getShaderStage(i),c=this._getShaderCacheForMaterial(e);return c.has(o)===!1&&(c.add(o),o.usedTimes++),c.has(l)===!1&&(c.add(l),l.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Gb(e),t.set(e,i)),i}}class Gb{constructor(e){this.id=Hb++,this.code=e,this.usedTimes=0}}function jb(s){return s===Bs||s===iu||s===ru}function Wb(s,e,t,i,o,l){const c=new R_,d=new Vb,h=new Set,f=[],g=new Map,m=i.logarithmicDepthBuffer;let v=i.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(A){return h.add(A),A===0?"uv":`uv${A}`}function w(A,U,z,k,X,re){const ue=k.fog,G=X.geometry,Q=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?k.environment:null,q=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap,K=e.get(A.envMap||Q,q),ae=K&&K.mapping===vu?K.image.height:null,le=_[A.type];A.precision!==null&&(v=i.getMaxPrecision(A.precision),v!==A.precision&&at("WebGLProgram.getParameters:",A.precision,"not supported, using",v,"instead."));const I=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,Z=I!==void 0?I.length:0;let ve=0;G.morphAttributes.position!==void 0&&(ve=1),G.morphAttributes.normal!==void 0&&(ve=2),G.morphAttributes.color!==void 0&&(ve=3);let Pe,Fe,ie,_e;if(le){const ht=Ji[le];Pe=ht.vertexShader,Fe=ht.fragmentShader}else Pe=A.vertexShader,Fe=A.fragmentShader,d.update(A),ie=d.getVertexShaderID(A),_e=d.getFragmentShaderID(A);const fe=s.getRenderTarget(),Oe=s.state.buffers.depth.getReversed(),qe=X.isInstancedMesh===!0,nt=X.isBatchedMesh===!0,Ot=!!A.map,ft=!!A.matcap,bt=!!K,Le=!!A.aoMap,We=!!A.lightMap,vt=!!A.bumpMap,At=!!A.normalMap,Gt=!!A.displacementMap,j=!!A.emissiveMap,It=!!A.metalnessMap,ct=!!A.roughnessMap,Pt=A.anisotropy>0,Ie=A.clearcoat>0,Ut=A.dispersion>0,D=A.iridescence>0,T=A.sheen>0,J=A.transmission>0,pe=Pt&&!!A.anisotropyMap,xe=Ie&&!!A.clearcoatMap,we=Ie&&!!A.clearcoatNormalMap,Ue=Ie&&!!A.clearcoatRoughnessMap,de=D&&!!A.iridescenceMap,me=D&&!!A.iridescenceThicknessMap,Be=T&&!!A.sheenColorMap,Ve=T&&!!A.sheenRoughnessMap,Ce=!!A.specularMap,Te=!!A.specularColorMap,lt=!!A.specularIntensityMap,dt=J&&!!A.transmissionMap,xt=J&&!!A.thicknessMap,V=!!A.gradientMap,Ae=!!A.alphaMap,he=A.alphaTest>0,ze=!!A.alphaHash,De=!!A.extensions;let Se=sr;A.toneMapped&&(fe===null||fe.isXRRenderTarget===!0)&&(Se=s.toneMapping);const Ke={shaderID:le,shaderType:A.type,shaderName:A.name,vertexShader:Pe,fragmentShader:Fe,defines:A.defines,customVertexShaderID:ie,customFragmentShaderID:_e,isRawShaderMaterial:A.isRawShaderMaterial===!0,glslVersion:A.glslVersion,precision:v,batching:nt,batchingColor:nt&&X._colorsTexture!==null,instancing:qe,instancingColor:qe&&X.instanceColor!==null,instancingMorph:qe&&X.morphTexture!==null,outputColorSpace:fe===null?s.outputColorSpace:fe.isXRRenderTarget===!0?fe.texture.colorSpace:Tt.workingColorSpace,alphaToCoverage:!!A.alphaToCoverage,map:Ot,matcap:ft,envMap:bt,envMapMode:bt&&K.mapping,envMapCubeUVHeight:ae,aoMap:Le,lightMap:We,bumpMap:vt,normalMap:At,displacementMap:Gt,emissiveMap:j,normalMapObjectSpace:At&&A.normalMapType===yM,normalMapTangentSpace:At&&A.normalMapType===qf,packedNormalMap:At&&A.normalMapType===qf&&jb(A.normalMap.format),metalnessMap:It,roughnessMap:ct,anisotropy:Pt,anisotropyMap:pe,clearcoat:Ie,clearcoatMap:xe,clearcoatNormalMap:we,clearcoatRoughnessMap:Ue,dispersion:Ut,iridescence:D,iridescenceMap:de,iridescenceThicknessMap:me,sheen:T,sheenColorMap:Be,sheenRoughnessMap:Ve,specularMap:Ce,specularColorMap:Te,specularIntensityMap:lt,transmission:J,transmissionMap:dt,thicknessMap:xt,gradientMap:V,opaque:A.transparent===!1&&A.blending===Fo&&A.alphaToCoverage===!1,alphaMap:Ae,alphaTest:he,alphaHash:ze,combine:A.combine,mapUv:Ot&&M(A.map.channel),aoMapUv:Le&&M(A.aoMap.channel),lightMapUv:We&&M(A.lightMap.channel),bumpMapUv:vt&&M(A.bumpMap.channel),normalMapUv:At&&M(A.normalMap.channel),displacementMapUv:Gt&&M(A.displacementMap.channel),emissiveMapUv:j&&M(A.emissiveMap.channel),metalnessMapUv:It&&M(A.metalnessMap.channel),roughnessMapUv:ct&&M(A.roughnessMap.channel),anisotropyMapUv:pe&&M(A.anisotropyMap.channel),clearcoatMapUv:xe&&M(A.clearcoatMap.channel),clearcoatNormalMapUv:we&&M(A.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ue&&M(A.clearcoatRoughnessMap.channel),iridescenceMapUv:de&&M(A.iridescenceMap.channel),iridescenceThicknessMapUv:me&&M(A.iridescenceThicknessMap.channel),sheenColorMapUv:Be&&M(A.sheenColorMap.channel),sheenRoughnessMapUv:Ve&&M(A.sheenRoughnessMap.channel),specularMapUv:Ce&&M(A.specularMap.channel),specularColorMapUv:Te&&M(A.specularColorMap.channel),specularIntensityMapUv:lt&&M(A.specularIntensityMap.channel),transmissionMapUv:dt&&M(A.transmissionMap.channel),thicknessMapUv:xt&&M(A.thicknessMap.channel),alphaMapUv:Ae&&M(A.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(At||Pt),vertexNormals:!!G.attributes.normal,vertexColors:A.vertexColors,vertexAlphas:A.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!G.attributes.uv&&(Ot||Ae),fog:!!ue,useFog:A.fog===!0,fogExp2:!!ue&&ue.isFogExp2,flatShading:A.wireframe===!1&&(A.flatShading===!0||G.attributes.normal===void 0&&At===!1&&(A.isMeshLambertMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isMeshPhysicalMaterial)),sizeAttenuation:A.sizeAttenuation===!0,logarithmicDepthBuffer:m,reversedDepthBuffer:Oe,skinning:X.isSkinnedMesh===!0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:Z,morphTextureStride:ve,numDirLights:U.directional.length,numPointLights:U.point.length,numSpotLights:U.spot.length,numSpotLightMaps:U.spotLightMap.length,numRectAreaLights:U.rectArea.length,numHemiLights:U.hemi.length,numDirLightShadows:U.directionalShadowMap.length,numPointLightShadows:U.pointShadowMap.length,numSpotLightShadows:U.spotShadowMap.length,numSpotLightShadowsWithMaps:U.numSpotLightShadowsWithMaps,numLightProbes:U.numLightProbes,numLightProbeGrids:re.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:A.dithering,shadowMapEnabled:s.shadowMap.enabled&&z.length>0,shadowMapType:s.shadowMap.type,toneMapping:Se,decodeVideoTexture:Ot&&A.map.isVideoTexture===!0&&Tt.getTransfer(A.map.colorSpace)===zt,decodeVideoTextureEmissive:j&&A.emissiveMap.isVideoTexture===!0&&Tt.getTransfer(A.emissiveMap.colorSpace)===zt,premultipliedAlpha:A.premultipliedAlpha,doubleSided:A.side===Qi,flipSided:A.side===ai,useDepthPacking:A.depthPacking>=0,depthPacking:A.depthPacking||0,index0AttributeName:A.index0AttributeName,extensionClipCullDistance:De&&A.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(De&&A.extensions.multiDraw===!0||nt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:A.customProgramCacheKey()};return Ke.vertexUv1s=h.has(1),Ke.vertexUv2s=h.has(2),Ke.vertexUv3s=h.has(3),h.clear(),Ke}function y(A){const U=[];if(A.shaderID?U.push(A.shaderID):(U.push(A.customVertexShaderID),U.push(A.customFragmentShaderID)),A.defines!==void 0)for(const z in A.defines)U.push(z),U.push(A.defines[z]);return A.isRawShaderMaterial===!1&&(S(U,A),C(U,A),U.push(s.outputColorSpace)),U.push(A.customProgramCacheKey),U.join()}function S(A,U){A.push(U.precision),A.push(U.outputColorSpace),A.push(U.envMapMode),A.push(U.envMapCubeUVHeight),A.push(U.mapUv),A.push(U.alphaMapUv),A.push(U.lightMapUv),A.push(U.aoMapUv),A.push(U.bumpMapUv),A.push(U.normalMapUv),A.push(U.displacementMapUv),A.push(U.emissiveMapUv),A.push(U.metalnessMapUv),A.push(U.roughnessMapUv),A.push(U.anisotropyMapUv),A.push(U.clearcoatMapUv),A.push(U.clearcoatNormalMapUv),A.push(U.clearcoatRoughnessMapUv),A.push(U.iridescenceMapUv),A.push(U.iridescenceThicknessMapUv),A.push(U.sheenColorMapUv),A.push(U.sheenRoughnessMapUv),A.push(U.specularMapUv),A.push(U.specularColorMapUv),A.push(U.specularIntensityMapUv),A.push(U.transmissionMapUv),A.push(U.thicknessMapUv),A.push(U.combine),A.push(U.fogExp2),A.push(U.sizeAttenuation),A.push(U.morphTargetsCount),A.push(U.morphAttributeCount),A.push(U.numDirLights),A.push(U.numPointLights),A.push(U.numSpotLights),A.push(U.numSpotLightMaps),A.push(U.numHemiLights),A.push(U.numRectAreaLights),A.push(U.numDirLightShadows),A.push(U.numPointLightShadows),A.push(U.numSpotLightShadows),A.push(U.numSpotLightShadowsWithMaps),A.push(U.numLightProbes),A.push(U.shadowMapType),A.push(U.toneMapping),A.push(U.numClippingPlanes),A.push(U.numClipIntersection),A.push(U.depthPacking)}function C(A,U){c.disableAll(),U.instancing&&c.enable(0),U.instancingColor&&c.enable(1),U.instancingMorph&&c.enable(2),U.matcap&&c.enable(3),U.envMap&&c.enable(4),U.normalMapObjectSpace&&c.enable(5),U.normalMapTangentSpace&&c.enable(6),U.clearcoat&&c.enable(7),U.iridescence&&c.enable(8),U.alphaTest&&c.enable(9),U.vertexColors&&c.enable(10),U.vertexAlphas&&c.enable(11),U.vertexUv1s&&c.enable(12),U.vertexUv2s&&c.enable(13),U.vertexUv3s&&c.enable(14),U.vertexTangents&&c.enable(15),U.anisotropy&&c.enable(16),U.alphaHash&&c.enable(17),U.batching&&c.enable(18),U.dispersion&&c.enable(19),U.batchingColor&&c.enable(20),U.gradientMap&&c.enable(21),U.packedNormalMap&&c.enable(22),U.vertexNormals&&c.enable(23),A.push(c.mask),c.disableAll(),U.fog&&c.enable(0),U.useFog&&c.enable(1),U.flatShading&&c.enable(2),U.logarithmicDepthBuffer&&c.enable(3),U.reversedDepthBuffer&&c.enable(4),U.skinning&&c.enable(5),U.morphTargets&&c.enable(6),U.morphNormals&&c.enable(7),U.morphColors&&c.enable(8),U.premultipliedAlpha&&c.enable(9),U.shadowMapEnabled&&c.enable(10),U.doubleSided&&c.enable(11),U.flipSided&&c.enable(12),U.useDepthPacking&&c.enable(13),U.dithering&&c.enable(14),U.transmission&&c.enable(15),U.sheen&&c.enable(16),U.opaque&&c.enable(17),U.pointsUvs&&c.enable(18),U.decodeVideoTexture&&c.enable(19),U.decodeVideoTextureEmissive&&c.enable(20),U.alphaToCoverage&&c.enable(21),U.numLightProbeGrids>0&&c.enable(22),A.push(c.mask)}function L(A){const U=_[A.type];let z;if(U){const k=Ji[U];z=cE.clone(k.uniforms)}else z=A.uniforms;return z}function P(A,U){let z=g.get(U);return z!==void 0?++z.usedTimes:(z=new zb(s,U,A,o),f.push(z),g.set(U,z)),z}function O(A){if(--A.usedTimes===0){const U=f.indexOf(A);f[U]=f[f.length-1],f.pop(),g.delete(A.cacheKey),A.destroy()}}function N(A){d.remove(A)}function B(){d.dispose()}return{getParameters:w,getProgramCacheKey:y,getUniforms:L,acquireProgram:P,releaseProgram:O,releaseShaderCache:N,programs:f,dispose:B}}function Xb(){let s=new WeakMap;function e(c){return s.has(c)}function t(c){let d=s.get(c);return d===void 0&&(d={},s.set(c,d)),d}function i(c){s.delete(c)}function o(c,d,h){s.get(c)[d]=h}function l(){s=new WeakMap}return{has:e,get:t,remove:i,update:o,dispose:l}}function $b(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.materialVariant!==e.materialVariant?s.materialVariant-e.materialVariant:s.z!==e.z?s.z-e.z:s.id-e.id}function Mv(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Ev(){const s=[];let e=0;const t=[],i=[],o=[];function l(){e=0,t.length=0,i.length=0,o.length=0}function c(v){let _=0;return v.isInstancedMesh&&(_+=2),v.isSkinnedMesh&&(_+=1),_}function d(v,_,M,w,y,S){let C=s[e];return C===void 0?(C={id:v.id,object:v,geometry:_,material:M,materialVariant:c(v),groupOrder:w,renderOrder:v.renderOrder,z:y,group:S},s[e]=C):(C.id=v.id,C.object=v,C.geometry=_,C.material=M,C.materialVariant=c(v),C.groupOrder=w,C.renderOrder=v.renderOrder,C.z=y,C.group=S),e++,C}function h(v,_,M,w,y,S){const C=d(v,_,M,w,y,S);M.transmission>0?i.push(C):M.transparent===!0?o.push(C):t.push(C)}function f(v,_,M,w,y,S){const C=d(v,_,M,w,y,S);M.transmission>0?i.unshift(C):M.transparent===!0?o.unshift(C):t.unshift(C)}function g(v,_){t.length>1&&t.sort(v||$b),i.length>1&&i.sort(_||Mv),o.length>1&&o.sort(_||Mv)}function m(){for(let v=e,_=s.length;v<_;v++){const M=s[v];if(M.id===null)break;M.id=null,M.object=null,M.geometry=null,M.material=null,M.group=null}}return{opaque:t,transmissive:i,transparent:o,init:l,push:h,unshift:f,finish:m,sort:g}}function Yb(){let s=new WeakMap;function e(i,o){const l=s.get(i);let c;return l===void 0?(c=new Ev,s.set(i,[c])):o>=l.length?(c=new Ev,l.push(c)):c=l[o],c}function t(){s=new WeakMap}return{get:e,dispose:t}}function qb(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new Y,color:new wt};break;case"SpotLight":t={position:new Y,direction:new Y,color:new wt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new Y,color:new wt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new Y,skyColor:new wt,groundColor:new wt};break;case"RectAreaLight":t={color:new wt,position:new Y,halfWidth:new Y,halfHeight:new Y};break}return s[e.id]=t,t}}}function Kb(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let Zb=0;function Jb(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function Qb(s){const e=new qb,t=Kb(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)i.probe.push(new Y);const o=new Y,l=new nn,c=new nn;function d(f){let g=0,m=0,v=0;for(let U=0;U<9;U++)i.probe[U].set(0,0,0);let _=0,M=0,w=0,y=0,S=0,C=0,L=0,P=0,O=0,N=0,B=0;f.sort(Jb);for(let U=0,z=f.length;U<z;U++){const k=f[U],X=k.color,re=k.intensity,ue=k.distance;let G=null;if(k.shadow&&k.shadow.map&&(k.shadow.map.texture.format===Bs?G=k.shadow.map.texture:G=k.shadow.map.depthTexture||k.shadow.map.texture),k.isAmbientLight)g+=X.r*re,m+=X.g*re,v+=X.b*re;else if(k.isLightProbe){for(let Q=0;Q<9;Q++)i.probe[Q].addScaledVector(k.sh.coefficients[Q],re);B++}else if(k.isDirectionalLight){const Q=e.get(k);if(Q.color.copy(k.color).multiplyScalar(k.intensity),k.castShadow){const q=k.shadow,K=t.get(k);K.shadowIntensity=q.intensity,K.shadowBias=q.bias,K.shadowNormalBias=q.normalBias,K.shadowRadius=q.radius,K.shadowMapSize=q.mapSize,i.directionalShadow[_]=K,i.directionalShadowMap[_]=G,i.directionalShadowMatrix[_]=k.shadow.matrix,C++}i.directional[_]=Q,_++}else if(k.isSpotLight){const Q=e.get(k);Q.position.setFromMatrixPosition(k.matrixWorld),Q.color.copy(X).multiplyScalar(re),Q.distance=ue,Q.coneCos=Math.cos(k.angle),Q.penumbraCos=Math.cos(k.angle*(1-k.penumbra)),Q.decay=k.decay,i.spot[w]=Q;const q=k.shadow;if(k.map&&(i.spotLightMap[O]=k.map,O++,q.updateMatrices(k),k.castShadow&&N++),i.spotLightMatrix[w]=q.matrix,k.castShadow){const K=t.get(k);K.shadowIntensity=q.intensity,K.shadowBias=q.bias,K.shadowNormalBias=q.normalBias,K.shadowRadius=q.radius,K.shadowMapSize=q.mapSize,i.spotShadow[w]=K,i.spotShadowMap[w]=G,P++}w++}else if(k.isRectAreaLight){const Q=e.get(k);Q.color.copy(X).multiplyScalar(re),Q.halfWidth.set(k.width*.5,0,0),Q.halfHeight.set(0,k.height*.5,0),i.rectArea[y]=Q,y++}else if(k.isPointLight){const Q=e.get(k);if(Q.color.copy(k.color).multiplyScalar(k.intensity),Q.distance=k.distance,Q.decay=k.decay,k.castShadow){const q=k.shadow,K=t.get(k);K.shadowIntensity=q.intensity,K.shadowBias=q.bias,K.shadowNormalBias=q.normalBias,K.shadowRadius=q.radius,K.shadowMapSize=q.mapSize,K.shadowCameraNear=q.camera.near,K.shadowCameraFar=q.camera.far,i.pointShadow[M]=K,i.pointShadowMap[M]=G,i.pointShadowMatrix[M]=k.shadow.matrix,L++}i.point[M]=Q,M++}else if(k.isHemisphereLight){const Q=e.get(k);Q.skyColor.copy(k.color).multiplyScalar(re),Q.groundColor.copy(k.groundColor).multiplyScalar(re),i.hemi[S]=Q,S++}}y>0&&(s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ke.LTC_FLOAT_1,i.rectAreaLTC2=ke.LTC_FLOAT_2):(i.rectAreaLTC1=ke.LTC_HALF_1,i.rectAreaLTC2=ke.LTC_HALF_2)),i.ambient[0]=g,i.ambient[1]=m,i.ambient[2]=v;const A=i.hash;(A.directionalLength!==_||A.pointLength!==M||A.spotLength!==w||A.rectAreaLength!==y||A.hemiLength!==S||A.numDirectionalShadows!==C||A.numPointShadows!==L||A.numSpotShadows!==P||A.numSpotMaps!==O||A.numLightProbes!==B)&&(i.directional.length=_,i.spot.length=w,i.rectArea.length=y,i.point.length=M,i.hemi.length=S,i.directionalShadow.length=C,i.directionalShadowMap.length=C,i.pointShadow.length=L,i.pointShadowMap.length=L,i.spotShadow.length=P,i.spotShadowMap.length=P,i.directionalShadowMatrix.length=C,i.pointShadowMatrix.length=L,i.spotLightMatrix.length=P+O-N,i.spotLightMap.length=O,i.numSpotLightShadowsWithMaps=N,i.numLightProbes=B,A.directionalLength=_,A.pointLength=M,A.spotLength=w,A.rectAreaLength=y,A.hemiLength=S,A.numDirectionalShadows=C,A.numPointShadows=L,A.numSpotShadows=P,A.numSpotMaps=O,A.numLightProbes=B,i.version=Zb++)}function h(f,g){let m=0,v=0,_=0,M=0,w=0;const y=g.matrixWorldInverse;for(let S=0,C=f.length;S<C;S++){const L=f[S];if(L.isDirectionalLight){const P=i.directional[m];P.direction.setFromMatrixPosition(L.matrixWorld),o.setFromMatrixPosition(L.target.matrixWorld),P.direction.sub(o),P.direction.transformDirection(y),m++}else if(L.isSpotLight){const P=i.spot[_];P.position.setFromMatrixPosition(L.matrixWorld),P.position.applyMatrix4(y),P.direction.setFromMatrixPosition(L.matrixWorld),o.setFromMatrixPosition(L.target.matrixWorld),P.direction.sub(o),P.direction.transformDirection(y),_++}else if(L.isRectAreaLight){const P=i.rectArea[M];P.position.setFromMatrixPosition(L.matrixWorld),P.position.applyMatrix4(y),c.identity(),l.copy(L.matrixWorld),l.premultiply(y),c.extractRotation(l),P.halfWidth.set(L.width*.5,0,0),P.halfHeight.set(0,L.height*.5,0),P.halfWidth.applyMatrix4(c),P.halfHeight.applyMatrix4(c),M++}else if(L.isPointLight){const P=i.point[v];P.position.setFromMatrixPosition(L.matrixWorld),P.position.applyMatrix4(y),v++}else if(L.isHemisphereLight){const P=i.hemi[w];P.direction.setFromMatrixPosition(L.matrixWorld),P.direction.transformDirection(y),w++}}}return{setup:d,setupView:h,state:i}}function wv(s){const e=new Qb(s),t=[],i=[],o=[];function l(v){m.camera=v,t.length=0,i.length=0,o.length=0}function c(v){t.push(v)}function d(v){i.push(v)}function h(v){o.push(v)}function f(){e.setup(t)}function g(v){e.setupView(t,v)}const m={lightsArray:t,shadowsArray:i,lightProbeGridArray:o,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:m,setupLights:f,setupLightsView:g,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function eA(s){let e=new WeakMap;function t(o,l=0){const c=e.get(o);let d;return c===void 0?(d=new wv(s),e.set(o,[d])):l>=c.length?(d=new wv(s),c.push(d)):d=c[l],d}function i(){e=new WeakMap}return{get:t,dispose:i}}const tA=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,nA=`uniform sampler2D shadow_pass;
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
}`,iA=[new Y(1,0,0),new Y(-1,0,0),new Y(0,1,0),new Y(0,-1,0),new Y(0,0,1),new Y(0,0,-1)],rA=[new Y(0,-1,0),new Y(0,-1,0),new Y(0,0,1),new Y(0,0,-1),new Y(0,-1,0),new Y(0,-1,0)],Tv=new nn,Oa=new Y,qh=new Y;function sA(s,e,t){let i=new Ep;const o=new ot,l=new ot,c=new an,d=new fE,h=new pE,f={},g=t.maxTextureSize,m={[as]:ai,[ai]:as,[Qi]:Qi},v=new lr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ot},radius:{value:4}},vertexShader:tA,fragmentShader:nA}),_=v.clone();_.defines.HORIZONTAL_PASS=1;const M=new bn;M.setAttribute("position",new li(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new it(M,v),y=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wc;let S=this.type;this.render=function(N,B,A){if(y.enabled===!1||y.autoUpdate===!1&&y.needsUpdate===!1||N.length===0)return;this.type===Jy&&(at("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wc);const U=s.getRenderTarget(),z=s.getActiveCubeFace(),k=s.getActiveMipmapLevel(),X=s.state;X.setBlending(Cr),X.buffers.depth.getReversed()===!0?X.buffers.color.setClear(0,0,0,0):X.buffers.color.setClear(1,1,1,1),X.buffers.depth.setTest(!0),X.setScissorTest(!1);const re=S!==this.type;re&&B.traverse(function(ue){ue.material&&(Array.isArray(ue.material)?ue.material.forEach(G=>G.needsUpdate=!0):ue.material.needsUpdate=!0)});for(let ue=0,G=N.length;ue<G;ue++){const Q=N[ue],q=Q.shadow;if(q===void 0){at("WebGLShadowMap:",Q,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;o.copy(q.mapSize);const K=q.getFrameExtents();o.multiply(K),l.copy(q.mapSize),(o.x>g||o.y>g)&&(o.x>g&&(l.x=Math.floor(g/K.x),o.x=l.x*K.x,q.mapSize.x=l.x),o.y>g&&(l.y=Math.floor(g/K.y),o.y=l.y*K.y,q.mapSize.y=l.y));const ae=s.state.buffers.depth.getReversed();if(q.camera._reversedDepth=ae,q.map===null||re===!0){if(q.map!==null&&(q.map.depthTexture!==null&&(q.map.depthTexture.dispose(),q.map.depthTexture=null),q.map.dispose()),this.type===Va){if(Q.isPointLight){at("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}q.map=new or(o.x,o.y,{format:Bs,type:Pr,minFilter:Ln,magFilter:Ln,generateMipmaps:!1}),q.map.texture.name=Q.name+".shadowMap",q.map.depthTexture=new Vo(o.x,o.y,nr),q.map.depthTexture.name=Q.name+".shadowMapDepth",q.map.depthTexture.format=Dr,q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Dn,q.map.depthTexture.magFilter=Dn}else Q.isPointLight?(q.map=new j_(o.x),q.map.depthTexture=new aE(o.x,ar)):(q.map=new or(o.x,o.y),q.map.depthTexture=new Vo(o.x,o.y,ar)),q.map.depthTexture.name=Q.name+".shadowMap",q.map.depthTexture.format=Dr,this.type===Wc?(q.map.depthTexture.compareFunction=ae?Sp:xp,q.map.depthTexture.minFilter=Ln,q.map.depthTexture.magFilter=Ln):(q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Dn,q.map.depthTexture.magFilter=Dn);q.camera.updateProjectionMatrix()}const le=q.map.isWebGLCubeRenderTarget?6:1;for(let I=0;I<le;I++){if(q.map.isWebGLCubeRenderTarget)s.setRenderTarget(q.map,I),s.clear();else{I===0&&(s.setRenderTarget(q.map),s.clear());const Z=q.getViewport(I);c.set(l.x*Z.x,l.y*Z.y,l.x*Z.z,l.y*Z.w),X.viewport(c)}if(Q.isPointLight){const Z=q.camera,ve=q.matrix,Pe=Q.distance||Z.far;Pe!==Z.far&&(Z.far=Pe,Z.updateProjectionMatrix()),Oa.setFromMatrixPosition(Q.matrixWorld),Z.position.copy(Oa),qh.copy(Z.position),qh.add(iA[I]),Z.up.copy(rA[I]),Z.lookAt(qh),Z.updateMatrixWorld(),ve.makeTranslation(-Oa.x,-Oa.y,-Oa.z),Tv.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),q._frustum.setFromProjectionMatrix(Tv,Z.coordinateSystem,Z.reversedDepth)}else q.updateMatrices(Q);i=q.getFrustum(),P(B,A,q.camera,Q,this.type)}q.isPointLightShadow!==!0&&this.type===Va&&C(q,A),q.needsUpdate=!1}S=this.type,y.needsUpdate=!1,s.setRenderTarget(U,z,k)};function C(N,B){const A=e.update(w);v.defines.VSM_SAMPLES!==N.blurSamples&&(v.defines.VSM_SAMPLES=N.blurSamples,_.defines.VSM_SAMPLES=N.blurSamples,v.needsUpdate=!0,_.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new or(o.x,o.y,{format:Bs,type:Pr})),v.uniforms.shadow_pass.value=N.map.depthTexture,v.uniforms.resolution.value=N.mapSize,v.uniforms.radius.value=N.radius,s.setRenderTarget(N.mapPass),s.clear(),s.renderBufferDirect(B,null,A,v,w,null),_.uniforms.shadow_pass.value=N.mapPass.texture,_.uniforms.resolution.value=N.mapSize,_.uniforms.radius.value=N.radius,s.setRenderTarget(N.map),s.clear(),s.renderBufferDirect(B,null,A,_,w,null)}function L(N,B,A,U){let z=null;const k=A.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(k!==void 0)z=k;else if(z=A.isPointLight===!0?h:d,s.localClippingEnabled&&B.clipShadows===!0&&Array.isArray(B.clippingPlanes)&&B.clippingPlanes.length!==0||B.displacementMap&&B.displacementScale!==0||B.alphaMap&&B.alphaTest>0||B.map&&B.alphaTest>0||B.alphaToCoverage===!0){const X=z.uuid,re=B.uuid;let ue=f[X];ue===void 0&&(ue={},f[X]=ue);let G=ue[re];G===void 0&&(G=z.clone(),ue[re]=G,B.addEventListener("dispose",O)),z=G}if(z.visible=B.visible,z.wireframe=B.wireframe,U===Va?z.side=B.shadowSide!==null?B.shadowSide:B.side:z.side=B.shadowSide!==null?B.shadowSide:m[B.side],z.alphaMap=B.alphaMap,z.alphaTest=B.alphaToCoverage===!0?.5:B.alphaTest,z.map=B.map,z.clipShadows=B.clipShadows,z.clippingPlanes=B.clippingPlanes,z.clipIntersection=B.clipIntersection,z.displacementMap=B.displacementMap,z.displacementScale=B.displacementScale,z.displacementBias=B.displacementBias,z.wireframeLinewidth=B.wireframeLinewidth,z.linewidth=B.linewidth,A.isPointLight===!0&&z.isMeshDistanceMaterial===!0){const X=s.properties.get(z);X.light=A}return z}function P(N,B,A,U,z){if(N.visible===!1)return;if(N.layers.test(B.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&z===Va)&&(!N.frustumCulled||i.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,N.matrixWorld);const re=e.update(N),ue=N.material;if(Array.isArray(ue)){const G=re.groups;for(let Q=0,q=G.length;Q<q;Q++){const K=G[Q],ae=ue[K.materialIndex];if(ae&&ae.visible){const le=L(N,ae,U,z);N.onBeforeShadow(s,N,B,A,re,le,K),s.renderBufferDirect(A,null,re,le,N,K),N.onAfterShadow(s,N,B,A,re,le,K)}}}else if(ue.visible){const G=L(N,ue,U,z);N.onBeforeShadow(s,N,B,A,re,G,null),s.renderBufferDirect(A,null,re,G,N,null),N.onAfterShadow(s,N,B,A,re,G,null)}}const X=N.children;for(let re=0,ue=X.length;re<ue;re++)P(X[re],B,A,U,z)}function O(N){N.target.removeEventListener("dispose",O);for(const A in f){const U=f[A],z=N.target.uuid;z in U&&(U[z].dispose(),delete U[z])}}}function oA(s,e){function t(){let V=!1;const Ae=new an;let he=null;const ze=new an(0,0,0,0);return{setMask:function(De){he!==De&&!V&&(s.colorMask(De,De,De,De),he=De)},setLocked:function(De){V=De},setClear:function(De,Se,Ke,ht,jt){jt===!0&&(De*=ht,Se*=ht,Ke*=ht),Ae.set(De,Se,Ke,ht),ze.equals(Ae)===!1&&(s.clearColor(De,Se,Ke,ht),ze.copy(Ae))},reset:function(){V=!1,he=null,ze.set(-1,0,0,0)}}}function i(){let V=!1,Ae=!1,he=null,ze=null,De=null;return{setReversed:function(Se){if(Ae!==Se){const Ke=e.get("EXT_clip_control");Se?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Ae=Se;const ht=De;De=null,this.setClear(ht)}},getReversed:function(){return Ae},setTest:function(Se){Se?fe(s.DEPTH_TEST):Oe(s.DEPTH_TEST)},setMask:function(Se){he!==Se&&!V&&(s.depthMask(Se),he=Se)},setFunc:function(Se){if(Ae&&(Se=DM[Se]),ze!==Se){switch(Se){case uf:s.depthFunc(s.NEVER);break;case df:s.depthFunc(s.ALWAYS);break;case hf:s.depthFunc(s.LESS);break;case Bo:s.depthFunc(s.LEQUAL);break;case ff:s.depthFunc(s.EQUAL);break;case pf:s.depthFunc(s.GEQUAL);break;case mf:s.depthFunc(s.GREATER);break;case gf:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}ze=Se}},setLocked:function(Se){V=Se},setClear:function(Se){De!==Se&&(De=Se,Ae&&(Se=1-Se),s.clearDepth(Se))},reset:function(){V=!1,he=null,ze=null,De=null,Ae=!1}}}function o(){let V=!1,Ae=null,he=null,ze=null,De=null,Se=null,Ke=null,ht=null,jt=null;return{setTest:function(Lt){V||(Lt?fe(s.STENCIL_TEST):Oe(s.STENCIL_TEST))},setMask:function(Lt){Ae!==Lt&&!V&&(s.stencilMask(Lt),Ae=Lt)},setFunc:function(Lt,Hn,vi){(he!==Lt||ze!==Hn||De!==vi)&&(s.stencilFunc(Lt,Hn,vi),he=Lt,ze=Hn,De=vi)},setOp:function(Lt,Hn,vi){(Se!==Lt||Ke!==Hn||ht!==vi)&&(s.stencilOp(Lt,Hn,vi),Se=Lt,Ke=Hn,ht=vi)},setLocked:function(Lt){V=Lt},setClear:function(Lt){jt!==Lt&&(s.clearStencil(Lt),jt=Lt)},reset:function(){V=!1,Ae=null,he=null,ze=null,De=null,Se=null,Ke=null,ht=null,jt=null}}}const l=new t,c=new i,d=new o,h=new WeakMap,f=new WeakMap;let g={},m={},v={},_=new WeakMap,M=[],w=null,y=!1,S=null,C=null,L=null,P=null,O=null,N=null,B=null,A=new wt(0,0,0),U=0,z=!1,k=null,X=null,re=null,ue=null,G=null;const Q=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let q=!1,K=0;const ae=s.getParameter(s.VERSION);ae.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(ae)[1]),q=K>=1):ae.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(ae)[1]),q=K>=2);let le=null,I={};const Z=s.getParameter(s.SCISSOR_BOX),ve=s.getParameter(s.VIEWPORT),Pe=new an().fromArray(Z),Fe=new an().fromArray(ve);function ie(V,Ae,he,ze){const De=new Uint8Array(4),Se=s.createTexture();s.bindTexture(V,Se),s.texParameteri(V,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(V,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Ke=0;Ke<he;Ke++)V===s.TEXTURE_3D||V===s.TEXTURE_2D_ARRAY?s.texImage3D(Ae,0,s.RGBA,1,1,ze,0,s.RGBA,s.UNSIGNED_BYTE,De):s.texImage2D(Ae+Ke,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,De);return Se}const _e={};_e[s.TEXTURE_2D]=ie(s.TEXTURE_2D,s.TEXTURE_2D,1),_e[s.TEXTURE_CUBE_MAP]=ie(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),_e[s.TEXTURE_2D_ARRAY]=ie(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),_e[s.TEXTURE_3D]=ie(s.TEXTURE_3D,s.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),fe(s.DEPTH_TEST),c.setFunc(Bo),vt(!1),At(y0),fe(s.CULL_FACE),Le(Cr);function fe(V){g[V]!==!0&&(s.enable(V),g[V]=!0)}function Oe(V){g[V]!==!1&&(s.disable(V),g[V]=!1)}function qe(V,Ae){return v[V]!==Ae?(s.bindFramebuffer(V,Ae),v[V]=Ae,V===s.DRAW_FRAMEBUFFER&&(v[s.FRAMEBUFFER]=Ae),V===s.FRAMEBUFFER&&(v[s.DRAW_FRAMEBUFFER]=Ae),!0):!1}function nt(V,Ae){let he=M,ze=!1;if(V){he=_.get(Ae),he===void 0&&(he=[],_.set(Ae,he));const De=V.textures;if(he.length!==De.length||he[0]!==s.COLOR_ATTACHMENT0){for(let Se=0,Ke=De.length;Se<Ke;Se++)he[Se]=s.COLOR_ATTACHMENT0+Se;he.length=De.length,ze=!0}}else he[0]!==s.BACK&&(he[0]=s.BACK,ze=!0);ze&&s.drawBuffers(he)}function Ot(V){return w!==V?(s.useProgram(V),w=V,!0):!1}const ft={[Ds]:s.FUNC_ADD,[eM]:s.FUNC_SUBTRACT,[tM]:s.FUNC_REVERSE_SUBTRACT};ft[nM]=s.MIN,ft[iM]=s.MAX;const bt={[rM]:s.ZERO,[sM]:s.ONE,[oM]:s.SRC_COLOR,[lf]:s.SRC_ALPHA,[hM]:s.SRC_ALPHA_SATURATE,[uM]:s.DST_COLOR,[lM]:s.DST_ALPHA,[aM]:s.ONE_MINUS_SRC_COLOR,[cf]:s.ONE_MINUS_SRC_ALPHA,[dM]:s.ONE_MINUS_DST_COLOR,[cM]:s.ONE_MINUS_DST_ALPHA,[fM]:s.CONSTANT_COLOR,[pM]:s.ONE_MINUS_CONSTANT_COLOR,[mM]:s.CONSTANT_ALPHA,[gM]:s.ONE_MINUS_CONSTANT_ALPHA};function Le(V,Ae,he,ze,De,Se,Ke,ht,jt,Lt){if(V===Cr){y===!0&&(Oe(s.BLEND),y=!1);return}if(y===!1&&(fe(s.BLEND),y=!0),V!==Qy){if(V!==S||Lt!==z){if((C!==Ds||O!==Ds)&&(s.blendEquation(s.FUNC_ADD),C=Ds,O=Ds),Lt)switch(V){case Fo:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case M0:s.blendFunc(s.ONE,s.ONE);break;case E0:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case w0:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Rt("WebGLState: Invalid blending: ",V);break}else switch(V){case Fo:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case M0:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case E0:Rt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case w0:Rt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Rt("WebGLState: Invalid blending: ",V);break}L=null,P=null,N=null,B=null,A.set(0,0,0),U=0,S=V,z=Lt}return}De=De||Ae,Se=Se||he,Ke=Ke||ze,(Ae!==C||De!==O)&&(s.blendEquationSeparate(ft[Ae],ft[De]),C=Ae,O=De),(he!==L||ze!==P||Se!==N||Ke!==B)&&(s.blendFuncSeparate(bt[he],bt[ze],bt[Se],bt[Ke]),L=he,P=ze,N=Se,B=Ke),(ht.equals(A)===!1||jt!==U)&&(s.blendColor(ht.r,ht.g,ht.b,jt),A.copy(ht),U=jt),S=V,z=!1}function We(V,Ae){V.side===Qi?Oe(s.CULL_FACE):fe(s.CULL_FACE);let he=V.side===ai;Ae&&(he=!he),vt(he),V.blending===Fo&&V.transparent===!1?Le(Cr):Le(V.blending,V.blendEquation,V.blendSrc,V.blendDst,V.blendEquationAlpha,V.blendSrcAlpha,V.blendDstAlpha,V.blendColor,V.blendAlpha,V.premultipliedAlpha),c.setFunc(V.depthFunc),c.setTest(V.depthTest),c.setMask(V.depthWrite),l.setMask(V.colorWrite);const ze=V.stencilWrite;d.setTest(ze),ze&&(d.setMask(V.stencilWriteMask),d.setFunc(V.stencilFunc,V.stencilRef,V.stencilFuncMask),d.setOp(V.stencilFail,V.stencilZFail,V.stencilZPass)),j(V.polygonOffset,V.polygonOffsetFactor,V.polygonOffsetUnits),V.alphaToCoverage===!0?fe(s.SAMPLE_ALPHA_TO_COVERAGE):Oe(s.SAMPLE_ALPHA_TO_COVERAGE)}function vt(V){k!==V&&(V?s.frontFace(s.CW):s.frontFace(s.CCW),k=V)}function At(V){V!==Ky?(fe(s.CULL_FACE),V!==X&&(V===y0?s.cullFace(s.BACK):V===Zy?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):Oe(s.CULL_FACE),X=V}function Gt(V){V!==re&&(q&&s.lineWidth(V),re=V)}function j(V,Ae,he){V?(fe(s.POLYGON_OFFSET_FILL),(ue!==Ae||G!==he)&&(ue=Ae,G=he,c.getReversed()&&(Ae=-Ae),s.polygonOffset(Ae,he))):Oe(s.POLYGON_OFFSET_FILL)}function It(V){V?fe(s.SCISSOR_TEST):Oe(s.SCISSOR_TEST)}function ct(V){V===void 0&&(V=s.TEXTURE0+Q-1),le!==V&&(s.activeTexture(V),le=V)}function Pt(V,Ae,he){he===void 0&&(le===null?he=s.TEXTURE0+Q-1:he=le);let ze=I[he];ze===void 0&&(ze={type:void 0,texture:void 0},I[he]=ze),(ze.type!==V||ze.texture!==Ae)&&(le!==he&&(s.activeTexture(he),le=he),s.bindTexture(V,Ae||_e[V]),ze.type=V,ze.texture=Ae)}function Ie(){const V=I[le];V!==void 0&&V.type!==void 0&&(s.bindTexture(V.type,null),V.type=void 0,V.texture=void 0)}function Ut(){try{s.compressedTexImage2D(...arguments)}catch(V){Rt("WebGLState:",V)}}function D(){try{s.compressedTexImage3D(...arguments)}catch(V){Rt("WebGLState:",V)}}function T(){try{s.texSubImage2D(...arguments)}catch(V){Rt("WebGLState:",V)}}function J(){try{s.texSubImage3D(...arguments)}catch(V){Rt("WebGLState:",V)}}function pe(){try{s.compressedTexSubImage2D(...arguments)}catch(V){Rt("WebGLState:",V)}}function xe(){try{s.compressedTexSubImage3D(...arguments)}catch(V){Rt("WebGLState:",V)}}function we(){try{s.texStorage2D(...arguments)}catch(V){Rt("WebGLState:",V)}}function Ue(){try{s.texStorage3D(...arguments)}catch(V){Rt("WebGLState:",V)}}function de(){try{s.texImage2D(...arguments)}catch(V){Rt("WebGLState:",V)}}function me(){try{s.texImage3D(...arguments)}catch(V){Rt("WebGLState:",V)}}function Be(V){return m[V]!==void 0?m[V]:s.getParameter(V)}function Ve(V,Ae){m[V]!==Ae&&(s.pixelStorei(V,Ae),m[V]=Ae)}function Ce(V){Pe.equals(V)===!1&&(s.scissor(V.x,V.y,V.z,V.w),Pe.copy(V))}function Te(V){Fe.equals(V)===!1&&(s.viewport(V.x,V.y,V.z,V.w),Fe.copy(V))}function lt(V,Ae){let he=f.get(Ae);he===void 0&&(he=new WeakMap,f.set(Ae,he));let ze=he.get(V);ze===void 0&&(ze=s.getUniformBlockIndex(Ae,V.name),he.set(V,ze))}function dt(V,Ae){const ze=f.get(Ae).get(V);h.get(Ae)!==ze&&(s.uniformBlockBinding(Ae,ze,V.__bindingPointIndex),h.set(Ae,ze))}function xt(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),c.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),g={},m={},le=null,I={},v={},_=new WeakMap,M=[],w=null,y=!1,S=null,C=null,L=null,P=null,O=null,N=null,B=null,A=new wt(0,0,0),U=0,z=!1,k=null,X=null,re=null,ue=null,G=null,Pe.set(0,0,s.canvas.width,s.canvas.height),Fe.set(0,0,s.canvas.width,s.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:fe,disable:Oe,bindFramebuffer:qe,drawBuffers:nt,useProgram:Ot,setBlending:Le,setMaterial:We,setFlipSided:vt,setCullFace:At,setLineWidth:Gt,setPolygonOffset:j,setScissorTest:It,activeTexture:ct,bindTexture:Pt,unbindTexture:Ie,compressedTexImage2D:Ut,compressedTexImage3D:D,texImage2D:de,texImage3D:me,pixelStorei:Ve,getParameter:Be,updateUBOMapping:lt,uniformBlockBinding:dt,texStorage2D:we,texStorage3D:Ue,texSubImage2D:T,texSubImage3D:J,compressedTexSubImage2D:pe,compressedTexSubImage3D:xe,scissor:Ce,viewport:Te,reset:xt}}function aA(s,e,t,i,o,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ot,g=new WeakMap,m=new Set;let v;const _=new WeakMap;let M=!1;try{M=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(D,T){return M?new OffscreenCanvas(D,T):au("canvas")}function y(D,T,J){let pe=1;const xe=Ut(D);if((xe.width>J||xe.height>J)&&(pe=J/Math.max(xe.width,xe.height)),pe<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const we=Math.floor(pe*xe.width),Ue=Math.floor(pe*xe.height);v===void 0&&(v=w(we,Ue));const de=T?w(we,Ue):v;return de.width=we,de.height=Ue,de.getContext("2d").drawImage(D,0,0,we,Ue),at("WebGLRenderer: Texture has been resized from ("+xe.width+"x"+xe.height+") to ("+we+"x"+Ue+")."),de}else return"data"in D&&at("WebGLRenderer: Image in DataTexture is too big ("+xe.width+"x"+xe.height+")."),D;return D}function S(D){return D.generateMipmaps}function C(D){s.generateMipmap(D)}function L(D){return D.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?s.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function P(D,T,J,pe,xe,we=!1){if(D!==null){if(s[D]!==void 0)return s[D];at("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let Ue;pe&&(Ue=e.get("EXT_texture_norm16"),Ue||at("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let de=T;if(T===s.RED&&(J===s.FLOAT&&(de=s.R32F),J===s.HALF_FLOAT&&(de=s.R16F),J===s.UNSIGNED_BYTE&&(de=s.R8),J===s.UNSIGNED_SHORT&&Ue&&(de=Ue.R16_EXT),J===s.SHORT&&Ue&&(de=Ue.R16_SNORM_EXT)),T===s.RED_INTEGER&&(J===s.UNSIGNED_BYTE&&(de=s.R8UI),J===s.UNSIGNED_SHORT&&(de=s.R16UI),J===s.UNSIGNED_INT&&(de=s.R32UI),J===s.BYTE&&(de=s.R8I),J===s.SHORT&&(de=s.R16I),J===s.INT&&(de=s.R32I)),T===s.RG&&(J===s.FLOAT&&(de=s.RG32F),J===s.HALF_FLOAT&&(de=s.RG16F),J===s.UNSIGNED_BYTE&&(de=s.RG8),J===s.UNSIGNED_SHORT&&Ue&&(de=Ue.RG16_EXT),J===s.SHORT&&Ue&&(de=Ue.RG16_SNORM_EXT)),T===s.RG_INTEGER&&(J===s.UNSIGNED_BYTE&&(de=s.RG8UI),J===s.UNSIGNED_SHORT&&(de=s.RG16UI),J===s.UNSIGNED_INT&&(de=s.RG32UI),J===s.BYTE&&(de=s.RG8I),J===s.SHORT&&(de=s.RG16I),J===s.INT&&(de=s.RG32I)),T===s.RGB_INTEGER&&(J===s.UNSIGNED_BYTE&&(de=s.RGB8UI),J===s.UNSIGNED_SHORT&&(de=s.RGB16UI),J===s.UNSIGNED_INT&&(de=s.RGB32UI),J===s.BYTE&&(de=s.RGB8I),J===s.SHORT&&(de=s.RGB16I),J===s.INT&&(de=s.RGB32I)),T===s.RGBA_INTEGER&&(J===s.UNSIGNED_BYTE&&(de=s.RGBA8UI),J===s.UNSIGNED_SHORT&&(de=s.RGBA16UI),J===s.UNSIGNED_INT&&(de=s.RGBA32UI),J===s.BYTE&&(de=s.RGBA8I),J===s.SHORT&&(de=s.RGBA16I),J===s.INT&&(de=s.RGBA32I)),T===s.RGB&&(J===s.UNSIGNED_SHORT&&Ue&&(de=Ue.RGB16_EXT),J===s.SHORT&&Ue&&(de=Ue.RGB16_SNORM_EXT),J===s.UNSIGNED_INT_5_9_9_9_REV&&(de=s.RGB9_E5),J===s.UNSIGNED_INT_10F_11F_11F_REV&&(de=s.R11F_G11F_B10F)),T===s.RGBA){const me=we?ou:Tt.getTransfer(xe);J===s.FLOAT&&(de=s.RGBA32F),J===s.HALF_FLOAT&&(de=s.RGBA16F),J===s.UNSIGNED_BYTE&&(de=me===zt?s.SRGB8_ALPHA8:s.RGBA8),J===s.UNSIGNED_SHORT&&Ue&&(de=Ue.RGBA16_EXT),J===s.SHORT&&Ue&&(de=Ue.RGBA16_SNORM_EXT),J===s.UNSIGNED_SHORT_4_4_4_4&&(de=s.RGBA4),J===s.UNSIGNED_SHORT_5_5_5_1&&(de=s.RGB5_A1)}return(de===s.R16F||de===s.R32F||de===s.RG16F||de===s.RG32F||de===s.RGBA16F||de===s.RGBA32F)&&e.get("EXT_color_buffer_float"),de}function O(D,T){let J;return D?T===null||T===ar||T===Za?J=s.DEPTH24_STENCIL8:T===nr?J=s.DEPTH32F_STENCIL8:T===Ka&&(J=s.DEPTH24_STENCIL8,at("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===ar||T===Za?J=s.DEPTH_COMPONENT24:T===nr?J=s.DEPTH_COMPONENT32F:T===Ka&&(J=s.DEPTH_COMPONENT16),J}function N(D,T){return S(D)===!0||D.isFramebufferTexture&&D.minFilter!==Dn&&D.minFilter!==Ln?Math.log2(Math.max(T.width,T.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?T.mipmaps.length:1}function B(D){const T=D.target;T.removeEventListener("dispose",B),U(T),T.isVideoTexture&&g.delete(T),T.isHTMLTexture&&m.delete(T)}function A(D){const T=D.target;T.removeEventListener("dispose",A),k(T)}function U(D){const T=i.get(D);if(T.__webglInit===void 0)return;const J=D.source,pe=_.get(J);if(pe){const xe=pe[T.__cacheKey];xe.usedTimes--,xe.usedTimes===0&&z(D),Object.keys(pe).length===0&&_.delete(J)}i.remove(D)}function z(D){const T=i.get(D);s.deleteTexture(T.__webglTexture);const J=D.source,pe=_.get(J);delete pe[T.__cacheKey],c.memory.textures--}function k(D){const T=i.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),i.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let pe=0;pe<6;pe++){if(Array.isArray(T.__webglFramebuffer[pe]))for(let xe=0;xe<T.__webglFramebuffer[pe].length;xe++)s.deleteFramebuffer(T.__webglFramebuffer[pe][xe]);else s.deleteFramebuffer(T.__webglFramebuffer[pe]);T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer[pe])}else{if(Array.isArray(T.__webglFramebuffer))for(let pe=0;pe<T.__webglFramebuffer.length;pe++)s.deleteFramebuffer(T.__webglFramebuffer[pe]);else s.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&s.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let pe=0;pe<T.__webglColorRenderbuffer.length;pe++)T.__webglColorRenderbuffer[pe]&&s.deleteRenderbuffer(T.__webglColorRenderbuffer[pe]);T.__webglDepthRenderbuffer&&s.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const J=D.textures;for(let pe=0,xe=J.length;pe<xe;pe++){const we=i.get(J[pe]);we.__webglTexture&&(s.deleteTexture(we.__webglTexture),c.memory.textures--),i.remove(J[pe])}i.remove(D)}let X=0;function re(){X=0}function ue(){return X}function G(D){X=D}function Q(){const D=X;return D>=o.maxTextures&&at("WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+o.maxTextures),X+=1,D}function q(D){const T=[];return T.push(D.wrapS),T.push(D.wrapT),T.push(D.wrapR||0),T.push(D.magFilter),T.push(D.minFilter),T.push(D.anisotropy),T.push(D.internalFormat),T.push(D.format),T.push(D.type),T.push(D.generateMipmaps),T.push(D.premultiplyAlpha),T.push(D.flipY),T.push(D.unpackAlignment),T.push(D.colorSpace),T.join()}function K(D,T){const J=i.get(D);if(D.isVideoTexture&&Pt(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&J.__version!==D.version){const pe=D.image;if(pe===null)at("WebGLRenderer: Texture marked for update but no image data found.");else if(pe.complete===!1)at("WebGLRenderer: Texture marked for update but image is incomplete");else{Oe(J,D,T);return}}else D.isExternalTexture&&(J.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,J.__webglTexture,s.TEXTURE0+T)}function ae(D,T){const J=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&J.__version!==D.version){Oe(J,D,T);return}else D.isExternalTexture&&(J.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,J.__webglTexture,s.TEXTURE0+T)}function le(D,T){const J=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&J.__version!==D.version){Oe(J,D,T);return}t.bindTexture(s.TEXTURE_3D,J.__webglTexture,s.TEXTURE0+T)}function I(D,T){const J=i.get(D);if(D.isCubeDepthTexture!==!0&&D.version>0&&J.__version!==D.version){qe(J,D,T);return}t.bindTexture(s.TEXTURE_CUBE_MAP,J.__webglTexture,s.TEXTURE0+T)}const Z={[vf]:s.REPEAT,[br]:s.CLAMP_TO_EDGE,[_f]:s.MIRRORED_REPEAT},ve={[Dn]:s.NEAREST,[xM]:s.NEAREST_MIPMAP_NEAREST,[oc]:s.NEAREST_MIPMAP_LINEAR,[Ln]:s.LINEAR,[vh]:s.LINEAR_MIPMAP_NEAREST,[Ns]:s.LINEAR_MIPMAP_LINEAR},Pe={[MM]:s.NEVER,[AM]:s.ALWAYS,[EM]:s.LESS,[xp]:s.LEQUAL,[wM]:s.EQUAL,[Sp]:s.GEQUAL,[TM]:s.GREATER,[bM]:s.NOTEQUAL};function Fe(D,T){if(T.type===nr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Ln||T.magFilter===vh||T.magFilter===oc||T.magFilter===Ns||T.minFilter===Ln||T.minFilter===vh||T.minFilter===oc||T.minFilter===Ns)&&at("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(D,s.TEXTURE_WRAP_S,Z[T.wrapS]),s.texParameteri(D,s.TEXTURE_WRAP_T,Z[T.wrapT]),(D===s.TEXTURE_3D||D===s.TEXTURE_2D_ARRAY)&&s.texParameteri(D,s.TEXTURE_WRAP_R,Z[T.wrapR]),s.texParameteri(D,s.TEXTURE_MAG_FILTER,ve[T.magFilter]),s.texParameteri(D,s.TEXTURE_MIN_FILTER,ve[T.minFilter]),T.compareFunction&&(s.texParameteri(D,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(D,s.TEXTURE_COMPARE_FUNC,Pe[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Dn||T.minFilter!==oc&&T.minFilter!==Ns||T.type===nr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||i.get(T).__currentAnisotropy){const J=e.get("EXT_texture_filter_anisotropic");s.texParameterf(D,J.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,o.getMaxAnisotropy())),i.get(T).__currentAnisotropy=T.anisotropy}}}function ie(D,T){let J=!1;D.__webglInit===void 0&&(D.__webglInit=!0,T.addEventListener("dispose",B));const pe=T.source;let xe=_.get(pe);xe===void 0&&(xe={},_.set(pe,xe));const we=q(T);if(we!==D.__cacheKey){xe[we]===void 0&&(xe[we]={texture:s.createTexture(),usedTimes:0},c.memory.textures++,J=!0),xe[we].usedTimes++;const Ue=xe[D.__cacheKey];Ue!==void 0&&(xe[D.__cacheKey].usedTimes--,Ue.usedTimes===0&&z(T)),D.__cacheKey=we,D.__webglTexture=xe[we].texture}return J}function _e(D,T,J){return Math.floor(Math.floor(D/J)/T)}function fe(D,T,J,pe){const we=D.updateRanges;if(we.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,T.width,T.height,J,pe,T.data);else{we.sort((Ve,Ce)=>Ve.start-Ce.start);let Ue=0;for(let Ve=1;Ve<we.length;Ve++){const Ce=we[Ue],Te=we[Ve],lt=Ce.start+Ce.count,dt=_e(Te.start,T.width,4),xt=_e(Ce.start,T.width,4);Te.start<=lt+1&&dt===xt&&_e(Te.start+Te.count-1,T.width,4)===dt?Ce.count=Math.max(Ce.count,Te.start+Te.count-Ce.start):(++Ue,we[Ue]=Te)}we.length=Ue+1;const de=t.getParameter(s.UNPACK_ROW_LENGTH),me=t.getParameter(s.UNPACK_SKIP_PIXELS),Be=t.getParameter(s.UNPACK_SKIP_ROWS);t.pixelStorei(s.UNPACK_ROW_LENGTH,T.width);for(let Ve=0,Ce=we.length;Ve<Ce;Ve++){const Te=we[Ve],lt=Math.floor(Te.start/4),dt=Math.ceil(Te.count/4),xt=lt%T.width,V=Math.floor(lt/T.width),Ae=dt,he=1;t.pixelStorei(s.UNPACK_SKIP_PIXELS,xt),t.pixelStorei(s.UNPACK_SKIP_ROWS,V),t.texSubImage2D(s.TEXTURE_2D,0,xt,V,Ae,he,J,pe,T.data)}D.clearUpdateRanges(),t.pixelStorei(s.UNPACK_ROW_LENGTH,de),t.pixelStorei(s.UNPACK_SKIP_PIXELS,me),t.pixelStorei(s.UNPACK_SKIP_ROWS,Be)}}function Oe(D,T,J){let pe=s.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(pe=s.TEXTURE_2D_ARRAY),T.isData3DTexture&&(pe=s.TEXTURE_3D);const xe=ie(D,T),we=T.source;t.bindTexture(pe,D.__webglTexture,s.TEXTURE0+J);const Ue=i.get(we);if(we.version!==Ue.__version||xe===!0){if(t.activeTexture(s.TEXTURE0+J),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const he=Tt.getPrimaries(Tt.workingColorSpace),ze=T.colorSpace===rs?null:Tt.getPrimaries(T.colorSpace),De=T.colorSpace===rs||he===ze?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,De)}t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment);let me=y(T.image,!1,o.maxTextureSize);me=Ie(T,me);const Be=l.convert(T.format,T.colorSpace),Ve=l.convert(T.type);let Ce=P(T.internalFormat,Be,Ve,T.normalized,T.colorSpace,T.isVideoTexture);Fe(pe,T);let Te;const lt=T.mipmaps,dt=T.isVideoTexture!==!0,xt=Ue.__version===void 0||xe===!0,V=we.dataReady,Ae=N(T,me);if(T.isDepthTexture)Ce=O(T.format===Is,T.type),xt&&(dt?t.texStorage2D(s.TEXTURE_2D,1,Ce,me.width,me.height):t.texImage2D(s.TEXTURE_2D,0,Ce,me.width,me.height,0,Be,Ve,null));else if(T.isDataTexture)if(lt.length>0){dt&&xt&&t.texStorage2D(s.TEXTURE_2D,Ae,Ce,lt[0].width,lt[0].height);for(let he=0,ze=lt.length;he<ze;he++)Te=lt[he],dt?V&&t.texSubImage2D(s.TEXTURE_2D,he,0,0,Te.width,Te.height,Be,Ve,Te.data):t.texImage2D(s.TEXTURE_2D,he,Ce,Te.width,Te.height,0,Be,Ve,Te.data);T.generateMipmaps=!1}else dt?(xt&&t.texStorage2D(s.TEXTURE_2D,Ae,Ce,me.width,me.height),V&&fe(T,me,Be,Ve)):t.texImage2D(s.TEXTURE_2D,0,Ce,me.width,me.height,0,Be,Ve,me.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){dt&&xt&&t.texStorage3D(s.TEXTURE_2D_ARRAY,Ae,Ce,lt[0].width,lt[0].height,me.depth);for(let he=0,ze=lt.length;he<ze;he++)if(Te=lt[he],T.format!==zi)if(Be!==null)if(dt){if(V)if(T.layerUpdates.size>0){const De=nv(Te.width,Te.height,T.format,T.type);for(const Se of T.layerUpdates){const Ke=Te.data.subarray(Se*De/Te.data.BYTES_PER_ELEMENT,(Se+1)*De/Te.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,he,0,0,Se,Te.width,Te.height,1,Be,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,he,0,0,0,Te.width,Te.height,me.depth,Be,Te.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,he,Ce,Te.width,Te.height,me.depth,0,Te.data,0,0);else at("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else dt?V&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,he,0,0,0,Te.width,Te.height,me.depth,Be,Ve,Te.data):t.texImage3D(s.TEXTURE_2D_ARRAY,he,Ce,Te.width,Te.height,me.depth,0,Be,Ve,Te.data)}else{dt&&xt&&t.texStorage2D(s.TEXTURE_2D,Ae,Ce,lt[0].width,lt[0].height);for(let he=0,ze=lt.length;he<ze;he++)Te=lt[he],T.format!==zi?Be!==null?dt?V&&t.compressedTexSubImage2D(s.TEXTURE_2D,he,0,0,Te.width,Te.height,Be,Te.data):t.compressedTexImage2D(s.TEXTURE_2D,he,Ce,Te.width,Te.height,0,Te.data):at("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):dt?V&&t.texSubImage2D(s.TEXTURE_2D,he,0,0,Te.width,Te.height,Be,Ve,Te.data):t.texImage2D(s.TEXTURE_2D,he,Ce,Te.width,Te.height,0,Be,Ve,Te.data)}else if(T.isDataArrayTexture)if(dt){if(xt&&t.texStorage3D(s.TEXTURE_2D_ARRAY,Ae,Ce,me.width,me.height,me.depth),V)if(T.layerUpdates.size>0){const he=nv(me.width,me.height,T.format,T.type);for(const ze of T.layerUpdates){const De=me.data.subarray(ze*he/me.data.BYTES_PER_ELEMENT,(ze+1)*he/me.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,ze,me.width,me.height,1,Be,Ve,De)}T.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,me.width,me.height,me.depth,Be,Ve,me.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Ce,me.width,me.height,me.depth,0,Be,Ve,me.data);else if(T.isData3DTexture)dt?(xt&&t.texStorage3D(s.TEXTURE_3D,Ae,Ce,me.width,me.height,me.depth),V&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,me.width,me.height,me.depth,Be,Ve,me.data)):t.texImage3D(s.TEXTURE_3D,0,Ce,me.width,me.height,me.depth,0,Be,Ve,me.data);else if(T.isFramebufferTexture){if(xt)if(dt)t.texStorage2D(s.TEXTURE_2D,Ae,Ce,me.width,me.height);else{let he=me.width,ze=me.height;for(let De=0;De<Ae;De++)t.texImage2D(s.TEXTURE_2D,De,Ce,he,ze,0,Be,Ve,null),he>>=1,ze>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in s){const he=s.canvas;if(he.hasAttribute("layoutsubtree")||he.setAttribute("layoutsubtree","true"),me.parentNode!==he){he.appendChild(me),m.add(T),he.onpaint=ht=>{const jt=ht.changedElements;for(const Lt of m)jt.includes(Lt.image)&&(Lt.needsUpdate=!0)},he.requestPaint();return}const ze=0,De=s.RGBA,Se=s.RGBA,Ke=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,ze,De,Se,Ke,me),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(lt.length>0){if(dt&&xt){const he=Ut(lt[0]);t.texStorage2D(s.TEXTURE_2D,Ae,Ce,he.width,he.height)}for(let he=0,ze=lt.length;he<ze;he++)Te=lt[he],dt?V&&t.texSubImage2D(s.TEXTURE_2D,he,0,0,Be,Ve,Te):t.texImage2D(s.TEXTURE_2D,he,Ce,Be,Ve,Te);T.generateMipmaps=!1}else if(dt){if(xt){const he=Ut(me);t.texStorage2D(s.TEXTURE_2D,Ae,Ce,he.width,he.height)}V&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,Be,Ve,me)}else t.texImage2D(s.TEXTURE_2D,0,Ce,Be,Ve,me);S(T)&&C(pe),Ue.__version=we.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function qe(D,T,J){if(T.image.length!==6)return;const pe=ie(D,T),xe=T.source;t.bindTexture(s.TEXTURE_CUBE_MAP,D.__webglTexture,s.TEXTURE0+J);const we=i.get(xe);if(xe.version!==we.__version||pe===!0){t.activeTexture(s.TEXTURE0+J);const Ue=Tt.getPrimaries(Tt.workingColorSpace),de=T.colorSpace===rs?null:Tt.getPrimaries(T.colorSpace),me=T.colorSpace===rs||Ue===de?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,me);const Be=T.isCompressedTexture||T.image[0].isCompressedTexture,Ve=T.image[0]&&T.image[0].isDataTexture,Ce=[];for(let Se=0;Se<6;Se++)!Be&&!Ve?Ce[Se]=y(T.image[Se],!0,o.maxCubemapSize):Ce[Se]=Ve?T.image[Se].image:T.image[Se],Ce[Se]=Ie(T,Ce[Se]);const Te=Ce[0],lt=l.convert(T.format,T.colorSpace),dt=l.convert(T.type),xt=P(T.internalFormat,lt,dt,T.normalized,T.colorSpace),V=T.isVideoTexture!==!0,Ae=we.__version===void 0||pe===!0,he=xe.dataReady;let ze=N(T,Te);Fe(s.TEXTURE_CUBE_MAP,T);let De;if(Be){V&&Ae&&t.texStorage2D(s.TEXTURE_CUBE_MAP,ze,xt,Te.width,Te.height);for(let Se=0;Se<6;Se++){De=Ce[Se].mipmaps;for(let Ke=0;Ke<De.length;Ke++){const ht=De[Ke];T.format!==zi?lt!==null?V?he&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,0,0,ht.width,ht.height,lt,ht.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,xt,ht.width,ht.height,0,ht.data):at("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):V?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,0,0,ht.width,ht.height,lt,dt,ht.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,xt,ht.width,ht.height,0,lt,dt,ht.data)}}}else{if(De=T.mipmaps,V&&Ae){De.length>0&&ze++;const Se=Ut(Ce[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,ze,xt,Se.width,Se.height)}for(let Se=0;Se<6;Se++)if(Ve){V?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,Ce[Se].width,Ce[Se].height,lt,dt,Ce[Se].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,xt,Ce[Se].width,Ce[Se].height,0,lt,dt,Ce[Se].data);for(let Ke=0;Ke<De.length;Ke++){const jt=De[Ke].image[Se].image;V?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,0,0,jt.width,jt.height,lt,dt,jt.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,xt,jt.width,jt.height,0,lt,dt,jt.data)}}else{V?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,lt,dt,Ce[Se]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,xt,lt,dt,Ce[Se]);for(let Ke=0;Ke<De.length;Ke++){const ht=De[Ke];V?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,0,0,lt,dt,ht.image[Se]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,xt,lt,dt,ht.image[Se])}}}S(T)&&C(s.TEXTURE_CUBE_MAP),we.__version=xe.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function nt(D,T,J,pe,xe,we){const Ue=l.convert(J.format,J.colorSpace),de=l.convert(J.type),me=P(J.internalFormat,Ue,de,J.normalized,J.colorSpace),Be=i.get(T),Ve=i.get(J);if(Ve.__renderTarget=T,!Be.__hasExternalTextures){const Ce=Math.max(1,T.width>>we),Te=Math.max(1,T.height>>we);xe===s.TEXTURE_3D||xe===s.TEXTURE_2D_ARRAY?t.texImage3D(xe,we,me,Ce,Te,T.depth,0,Ue,de,null):t.texImage2D(xe,we,me,Ce,Te,0,Ue,de,null)}t.bindFramebuffer(s.FRAMEBUFFER,D),ct(T)?d.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,pe,xe,Ve.__webglTexture,0,It(T)):(xe===s.TEXTURE_2D||xe>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&xe<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,pe,xe,Ve.__webglTexture,we),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Ot(D,T,J){if(s.bindRenderbuffer(s.RENDERBUFFER,D),T.depthBuffer){const pe=T.depthTexture,xe=pe&&pe.isDepthTexture?pe.type:null,we=O(T.stencilBuffer,xe),Ue=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;ct(T)?d.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,It(T),we,T.width,T.height):J?s.renderbufferStorageMultisample(s.RENDERBUFFER,It(T),we,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,we,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Ue,s.RENDERBUFFER,D)}else{const pe=T.textures;for(let xe=0;xe<pe.length;xe++){const we=pe[xe],Ue=l.convert(we.format,we.colorSpace),de=l.convert(we.type),me=P(we.internalFormat,Ue,de,we.normalized,we.colorSpace);ct(T)?d.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,It(T),me,T.width,T.height):J?s.renderbufferStorageMultisample(s.RENDERBUFFER,It(T),me,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,me,T.width,T.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function ft(D,T,J){const pe=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(s.FRAMEBUFFER,D),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const xe=i.get(T.depthTexture);if(xe.__renderTarget=T,(!xe.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),pe){if(xe.__webglInit===void 0&&(xe.__webglInit=!0,T.depthTexture.addEventListener("dispose",B)),xe.__webglTexture===void 0){xe.__webglTexture=s.createTexture(),t.bindTexture(s.TEXTURE_CUBE_MAP,xe.__webglTexture),Fe(s.TEXTURE_CUBE_MAP,T.depthTexture);const Be=l.convert(T.depthTexture.format),Ve=l.convert(T.depthTexture.type);let Ce;T.depthTexture.format===Dr?Ce=s.DEPTH_COMPONENT24:T.depthTexture.format===Is&&(Ce=s.DEPTH24_STENCIL8);for(let Te=0;Te<6;Te++)s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Te,0,Ce,T.width,T.height,0,Be,Ve,null)}}else K(T.depthTexture,0);const we=xe.__webglTexture,Ue=It(T),de=pe?s.TEXTURE_CUBE_MAP_POSITIVE_X+J:s.TEXTURE_2D,me=T.depthTexture.format===Is?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(T.depthTexture.format===Dr)ct(T)?d.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,me,de,we,0,Ue):s.framebufferTexture2D(s.FRAMEBUFFER,me,de,we,0);else if(T.depthTexture.format===Is)ct(T)?d.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,me,de,we,0,Ue):s.framebufferTexture2D(s.FRAMEBUFFER,me,de,we,0);else throw new Error("Unknown depthTexture format")}function bt(D){const T=i.get(D),J=D.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==D.depthTexture){const pe=D.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),pe){const xe=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,pe.removeEventListener("dispose",xe)};pe.addEventListener("dispose",xe),T.__depthDisposeCallback=xe}T.__boundDepthTexture=pe}if(D.depthTexture&&!T.__autoAllocateDepthBuffer)if(J)for(let pe=0;pe<6;pe++)ft(T.__webglFramebuffer[pe],D,pe);else{const pe=D.texture.mipmaps;pe&&pe.length>0?ft(T.__webglFramebuffer[0],D,0):ft(T.__webglFramebuffer,D,0)}else if(J){T.__webglDepthbuffer=[];for(let pe=0;pe<6;pe++)if(t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[pe]),T.__webglDepthbuffer[pe]===void 0)T.__webglDepthbuffer[pe]=s.createRenderbuffer(),Ot(T.__webglDepthbuffer[pe],D,!1);else{const xe=D.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,we=T.__webglDepthbuffer[pe];s.bindRenderbuffer(s.RENDERBUFFER,we),s.framebufferRenderbuffer(s.FRAMEBUFFER,xe,s.RENDERBUFFER,we)}}else{const pe=D.texture.mipmaps;if(pe&&pe.length>0?t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=s.createRenderbuffer(),Ot(T.__webglDepthbuffer,D,!1);else{const xe=D.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,we=T.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,we),s.framebufferRenderbuffer(s.FRAMEBUFFER,xe,s.RENDERBUFFER,we)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function Le(D,T,J){const pe=i.get(D);T!==void 0&&nt(pe.__webglFramebuffer,D,D.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),J!==void 0&&bt(D)}function We(D){const T=D.texture,J=i.get(D),pe=i.get(T);D.addEventListener("dispose",A);const xe=D.textures,we=D.isWebGLCubeRenderTarget===!0,Ue=xe.length>1;if(Ue||(pe.__webglTexture===void 0&&(pe.__webglTexture=s.createTexture()),pe.__version=T.version,c.memory.textures++),we){J.__webglFramebuffer=[];for(let de=0;de<6;de++)if(T.mipmaps&&T.mipmaps.length>0){J.__webglFramebuffer[de]=[];for(let me=0;me<T.mipmaps.length;me++)J.__webglFramebuffer[de][me]=s.createFramebuffer()}else J.__webglFramebuffer[de]=s.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){J.__webglFramebuffer=[];for(let de=0;de<T.mipmaps.length;de++)J.__webglFramebuffer[de]=s.createFramebuffer()}else J.__webglFramebuffer=s.createFramebuffer();if(Ue)for(let de=0,me=xe.length;de<me;de++){const Be=i.get(xe[de]);Be.__webglTexture===void 0&&(Be.__webglTexture=s.createTexture(),c.memory.textures++)}if(D.samples>0&&ct(D)===!1){J.__webglMultisampledFramebuffer=s.createFramebuffer(),J.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,J.__webglMultisampledFramebuffer);for(let de=0;de<xe.length;de++){const me=xe[de];J.__webglColorRenderbuffer[de]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,J.__webglColorRenderbuffer[de]);const Be=l.convert(me.format,me.colorSpace),Ve=l.convert(me.type),Ce=P(me.internalFormat,Be,Ve,me.normalized,me.colorSpace,D.isXRRenderTarget===!0),Te=It(D);s.renderbufferStorageMultisample(s.RENDERBUFFER,Te,Ce,D.width,D.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+de,s.RENDERBUFFER,J.__webglColorRenderbuffer[de])}s.bindRenderbuffer(s.RENDERBUFFER,null),D.depthBuffer&&(J.__webglDepthRenderbuffer=s.createRenderbuffer(),Ot(J.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(we){t.bindTexture(s.TEXTURE_CUBE_MAP,pe.__webglTexture),Fe(s.TEXTURE_CUBE_MAP,T);for(let de=0;de<6;de++)if(T.mipmaps&&T.mipmaps.length>0)for(let me=0;me<T.mipmaps.length;me++)nt(J.__webglFramebuffer[de][me],D,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+de,me);else nt(J.__webglFramebuffer[de],D,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+de,0);S(T)&&C(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ue){for(let de=0,me=xe.length;de<me;de++){const Be=xe[de],Ve=i.get(Be);let Ce=s.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(Ce=D.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(Ce,Ve.__webglTexture),Fe(Ce,Be),nt(J.__webglFramebuffer,D,Be,s.COLOR_ATTACHMENT0+de,Ce,0),S(Be)&&C(Ce)}t.unbindTexture()}else{let de=s.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(de=D.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(de,pe.__webglTexture),Fe(de,T),T.mipmaps&&T.mipmaps.length>0)for(let me=0;me<T.mipmaps.length;me++)nt(J.__webglFramebuffer[me],D,T,s.COLOR_ATTACHMENT0,de,me);else nt(J.__webglFramebuffer,D,T,s.COLOR_ATTACHMENT0,de,0);S(T)&&C(de),t.unbindTexture()}D.depthBuffer&&bt(D)}function vt(D){const T=D.textures;for(let J=0,pe=T.length;J<pe;J++){const xe=T[J];if(S(xe)){const we=L(D),Ue=i.get(xe).__webglTexture;t.bindTexture(we,Ue),C(we),t.unbindTexture()}}}const At=[],Gt=[];function j(D){if(D.samples>0){if(ct(D)===!1){const T=D.textures,J=D.width,pe=D.height;let xe=s.COLOR_BUFFER_BIT;const we=D.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Ue=i.get(D),de=T.length>1;if(de)for(let Be=0;Be<T.length;Be++)t.bindFramebuffer(s.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Be,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Ue.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Be,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer);const me=D.texture.mipmaps;me&&me.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer);for(let Be=0;Be<T.length;Be++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(xe|=s.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(xe|=s.STENCIL_BUFFER_BIT)),de){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Ue.__webglColorRenderbuffer[Be]);const Ve=i.get(T[Be]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Ve,0)}s.blitFramebuffer(0,0,J,pe,0,0,J,pe,xe,s.NEAREST),h===!0&&(At.length=0,Gt.length=0,At.push(s.COLOR_ATTACHMENT0+Be),D.depthBuffer&&D.resolveDepthBuffer===!1&&(At.push(we),Gt.push(we),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Gt)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,At))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),de)for(let Be=0;Be<T.length;Be++){t.bindFramebuffer(s.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Be,s.RENDERBUFFER,Ue.__webglColorRenderbuffer[Be]);const Ve=i.get(T[Be]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Ue.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Be,s.TEXTURE_2D,Ve,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&h){const T=D.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[T])}}}function It(D){return Math.min(o.maxSamples,D.samples)}function ct(D){const T=i.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Pt(D){const T=c.render.frame;g.get(D)!==T&&(g.set(D,T),D.update())}function Ie(D,T){const J=D.colorSpace,pe=D.format,xe=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||J!==su&&J!==rs&&(Tt.getTransfer(J)===zt?(pe!==zi||xe!==mi)&&at("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Rt("WebGLTextures: Unsupported texture color space:",J)),T}function Ut(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(f.width=D.naturalWidth||D.width,f.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(f.width=D.displayWidth,f.height=D.displayHeight):(f.width=D.width,f.height=D.height),f}this.allocateTextureUnit=Q,this.resetTextureUnits=re,this.getTextureUnits=ue,this.setTextureUnits=G,this.setTexture2D=K,this.setTexture2DArray=ae,this.setTexture3D=le,this.setTextureCube=I,this.rebindTextures=Le,this.setupRenderTarget=We,this.updateRenderTargetMipmap=vt,this.updateMultisampleRenderTarget=j,this.setupDepthRenderbuffer=bt,this.setupFrameBufferTexture=nt,this.useMultisampledRTT=ct,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function lA(s,e){function t(i,o=rs){let l;const c=Tt.getTransfer(o);if(i===mi)return s.UNSIGNED_BYTE;if(i===pp)return s.UNSIGNED_SHORT_4_4_4_4;if(i===mp)return s.UNSIGNED_SHORT_5_5_5_1;if(i===M_)return s.UNSIGNED_INT_5_9_9_9_REV;if(i===E_)return s.UNSIGNED_INT_10F_11F_11F_REV;if(i===S_)return s.BYTE;if(i===y_)return s.SHORT;if(i===Ka)return s.UNSIGNED_SHORT;if(i===fp)return s.INT;if(i===ar)return s.UNSIGNED_INT;if(i===nr)return s.FLOAT;if(i===Pr)return s.HALF_FLOAT;if(i===w_)return s.ALPHA;if(i===T_)return s.RGB;if(i===zi)return s.RGBA;if(i===Dr)return s.DEPTH_COMPONENT;if(i===Is)return s.DEPTH_STENCIL;if(i===b_)return s.RED;if(i===gp)return s.RED_INTEGER;if(i===Bs)return s.RG;if(i===vp)return s.RG_INTEGER;if(i===_p)return s.RGBA_INTEGER;if(i===Xc||i===$c||i===Yc||i===qc)if(c===zt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(i===Xc)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===$c)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Yc)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===qc)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(i===Xc)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===$c)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Yc)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===qc)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===xf||i===Sf||i===yf||i===Mf)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(i===xf)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Sf)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===yf)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Mf)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ef||i===wf||i===Tf||i===bf||i===Af||i===iu||i===Cf)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(i===Ef||i===wf)return c===zt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(i===Tf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(i===bf)return l.COMPRESSED_R11_EAC;if(i===Af)return l.COMPRESSED_SIGNED_R11_EAC;if(i===iu)return l.COMPRESSED_RG11_EAC;if(i===Cf)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Rf||i===Pf||i===Df||i===Lf||i===Nf||i===If||i===Uf||i===Ff||i===Of||i===kf||i===Bf||i===zf||i===Hf||i===Vf)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(i===Rf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Pf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Df)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Lf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Nf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===If)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Uf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Ff)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Of)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===kf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Bf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===zf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Hf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Vf)return c===zt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Gf||i===jf||i===Wf)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(i===Gf)return c===zt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===jf)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Wf)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Xf||i===$f||i===ru||i===Yf)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(i===Xf)return l.COMPRESSED_RED_RGTC1_EXT;if(i===$f)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ru)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Yf)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Za?s.UNSIGNED_INT_24_8:s[i]!==void 0?s[i]:null}return{convert:t}}const cA=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,uA=`
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

}`;class dA{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new k_(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new lr({vertexShader:cA,fragmentShader:uA,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new it(new Fs(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class hA extends us{constructor(e,t){super();const i=this;let o=null,l=1,c=null,d="local-floor",h=1,f=null,g=null,m=null,v=null,_=null,M=null;const w=typeof XRWebGLBinding<"u",y=new dA,S={},C=t.getContextAttributes();let L=null,P=null;const O=[],N=[],B=new ot;let A=null;const U=new si;U.viewport=new an;const z=new si;z.viewport=new an;const k=[U,z],X=new yE;let re=null,ue=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ie){let _e=O[ie];return _e===void 0&&(_e=new wh,O[ie]=_e),_e.getTargetRaySpace()},this.getControllerGrip=function(ie){let _e=O[ie];return _e===void 0&&(_e=new wh,O[ie]=_e),_e.getGripSpace()},this.getHand=function(ie){let _e=O[ie];return _e===void 0&&(_e=new wh,O[ie]=_e),_e.getHandSpace()};function G(ie){const _e=N.indexOf(ie.inputSource);if(_e===-1)return;const fe=O[_e];fe!==void 0&&(fe.update(ie.inputSource,ie.frame,f||c),fe.dispatchEvent({type:ie.type,data:ie.inputSource}))}function Q(){o.removeEventListener("select",G),o.removeEventListener("selectstart",G),o.removeEventListener("selectend",G),o.removeEventListener("squeeze",G),o.removeEventListener("squeezestart",G),o.removeEventListener("squeezeend",G),o.removeEventListener("end",Q),o.removeEventListener("inputsourceschange",q);for(let ie=0;ie<O.length;ie++){const _e=N[ie];_e!==null&&(N[ie]=null,O[ie].disconnect(_e))}re=null,ue=null,y.reset();for(const ie in S)delete S[ie];e.setRenderTarget(L),_=null,v=null,m=null,o=null,P=null,Fe.stop(),i.isPresenting=!1,e.setPixelRatio(A),e.setSize(B.width,B.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ie){l=ie,i.isPresenting===!0&&at("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ie){d=ie,i.isPresenting===!0&&at("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(ie){f=ie},this.getBaseLayer=function(){return v!==null?v:_},this.getBinding=function(){return m===null&&w&&(m=new XRWebGLBinding(o,t)),m},this.getFrame=function(){return M},this.getSession=function(){return o},this.setSession=async function(ie){if(o=ie,o!==null){if(L=e.getRenderTarget(),o.addEventListener("select",G),o.addEventListener("selectstart",G),o.addEventListener("selectend",G),o.addEventListener("squeeze",G),o.addEventListener("squeezestart",G),o.addEventListener("squeezeend",G),o.addEventListener("end",Q),o.addEventListener("inputsourceschange",q),C.xrCompatible!==!0&&await t.makeXRCompatible(),A=e.getPixelRatio(),e.getSize(B),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let fe=null,Oe=null,qe=null;C.depth&&(qe=C.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,fe=C.stencil?Is:Dr,Oe=C.stencil?Za:ar);const nt={colorFormat:t.RGBA8,depthFormat:qe,scaleFactor:l};m=this.getBinding(),v=m.createProjectionLayer(nt),o.updateRenderState({layers:[v]}),e.setPixelRatio(1),e.setSize(v.textureWidth,v.textureHeight,!1),P=new or(v.textureWidth,v.textureHeight,{format:zi,type:mi,depthTexture:new Vo(v.textureWidth,v.textureHeight,Oe,void 0,void 0,void 0,void 0,void 0,void 0,fe),stencilBuffer:C.stencil,colorSpace:e.outputColorSpace,samples:C.antialias?4:0,resolveDepthBuffer:v.ignoreDepthValues===!1,resolveStencilBuffer:v.ignoreDepthValues===!1})}else{const fe={antialias:C.antialias,alpha:!0,depth:C.depth,stencil:C.stencil,framebufferScaleFactor:l};_=new XRWebGLLayer(o,t,fe),o.updateRenderState({baseLayer:_}),e.setPixelRatio(1),e.setSize(_.framebufferWidth,_.framebufferHeight,!1),P=new or(_.framebufferWidth,_.framebufferHeight,{format:zi,type:mi,colorSpace:e.outputColorSpace,stencilBuffer:C.stencil,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}P.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await o.requestReferenceSpace(d),Fe.setContext(o),Fe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.getDepthTexture=function(){return y.getDepthTexture()};function q(ie){for(let _e=0;_e<ie.removed.length;_e++){const fe=ie.removed[_e],Oe=N.indexOf(fe);Oe>=0&&(N[Oe]=null,O[Oe].disconnect(fe))}for(let _e=0;_e<ie.added.length;_e++){const fe=ie.added[_e];let Oe=N.indexOf(fe);if(Oe===-1){for(let nt=0;nt<O.length;nt++)if(nt>=N.length){N.push(fe),Oe=nt;break}else if(N[nt]===null){N[nt]=fe,Oe=nt;break}if(Oe===-1)break}const qe=O[Oe];qe&&qe.connect(fe)}}const K=new Y,ae=new Y;function le(ie,_e,fe){K.setFromMatrixPosition(_e.matrixWorld),ae.setFromMatrixPosition(fe.matrixWorld);const Oe=K.distanceTo(ae),qe=_e.projectionMatrix.elements,nt=fe.projectionMatrix.elements,Ot=qe[14]/(qe[10]-1),ft=qe[14]/(qe[10]+1),bt=(qe[9]+1)/qe[5],Le=(qe[9]-1)/qe[5],We=(qe[8]-1)/qe[0],vt=(nt[8]+1)/nt[0],At=Ot*We,Gt=Ot*vt,j=Oe/(-We+vt),It=j*-We;if(_e.matrixWorld.decompose(ie.position,ie.quaternion,ie.scale),ie.translateX(It),ie.translateZ(j),ie.matrixWorld.compose(ie.position,ie.quaternion,ie.scale),ie.matrixWorldInverse.copy(ie.matrixWorld).invert(),qe[10]===-1)ie.projectionMatrix.copy(_e.projectionMatrix),ie.projectionMatrixInverse.copy(_e.projectionMatrixInverse);else{const ct=Ot+j,Pt=ft+j,Ie=At-It,Ut=Gt+(Oe-It),D=bt*ft/Pt*ct,T=Le*ft/Pt*ct;ie.projectionMatrix.makePerspective(Ie,Ut,D,T,ct,Pt),ie.projectionMatrixInverse.copy(ie.projectionMatrix).invert()}}function I(ie,_e){_e===null?ie.matrixWorld.copy(ie.matrix):ie.matrixWorld.multiplyMatrices(_e.matrixWorld,ie.matrix),ie.matrixWorldInverse.copy(ie.matrixWorld).invert()}this.updateCamera=function(ie){if(o===null)return;let _e=ie.near,fe=ie.far;y.texture!==null&&(y.depthNear>0&&(_e=y.depthNear),y.depthFar>0&&(fe=y.depthFar)),X.near=z.near=U.near=_e,X.far=z.far=U.far=fe,(re!==X.near||ue!==X.far)&&(o.updateRenderState({depthNear:X.near,depthFar:X.far}),re=X.near,ue=X.far),X.layers.mask=ie.layers.mask|6,U.layers.mask=X.layers.mask&-5,z.layers.mask=X.layers.mask&-3;const Oe=ie.parent,qe=X.cameras;I(X,Oe);for(let nt=0;nt<qe.length;nt++)I(qe[nt],Oe);qe.length===2?le(X,U,z):X.projectionMatrix.copy(U.projectionMatrix),Z(ie,X,Oe)};function Z(ie,_e,fe){fe===null?ie.matrix.copy(_e.matrixWorld):(ie.matrix.copy(fe.matrixWorld),ie.matrix.invert(),ie.matrix.multiply(_e.matrixWorld)),ie.matrix.decompose(ie.position,ie.quaternion,ie.scale),ie.updateMatrixWorld(!0),ie.projectionMatrix.copy(_e.projectionMatrix),ie.projectionMatrixInverse.copy(_e.projectionMatrixInverse),ie.isPerspectiveCamera&&(ie.fov=cu*2*Math.atan(1/ie.projectionMatrix.elements[5]),ie.zoom=1)}this.getCamera=function(){return X},this.getFoveation=function(){if(!(v===null&&_===null))return h},this.setFoveation=function(ie){h=ie,v!==null&&(v.fixedFoveation=ie),_!==null&&_.fixedFoveation!==void 0&&(_.fixedFoveation=ie)},this.hasDepthSensing=function(){return y.texture!==null},this.getDepthSensingMesh=function(){return y.getMesh(X)},this.getCameraTexture=function(ie){return S[ie]};let ve=null;function Pe(ie,_e){if(g=_e.getViewerPose(f||c),M=_e,g!==null){const fe=g.views;_!==null&&(e.setRenderTargetFramebuffer(P,_.framebuffer),e.setRenderTarget(P));let Oe=!1;fe.length!==X.cameras.length&&(X.cameras.length=0,Oe=!0);for(let ft=0;ft<fe.length;ft++){const bt=fe[ft];let Le=null;if(_!==null)Le=_.getViewport(bt);else{const vt=m.getViewSubImage(v,bt);Le=vt.viewport,ft===0&&(e.setRenderTargetTextures(P,vt.colorTexture,vt.depthStencilTexture),e.setRenderTarget(P))}let We=k[ft];We===void 0&&(We=new si,We.layers.enable(ft),We.viewport=new an,k[ft]=We),We.matrix.fromArray(bt.transform.matrix),We.matrix.decompose(We.position,We.quaternion,We.scale),We.projectionMatrix.fromArray(bt.projectionMatrix),We.projectionMatrixInverse.copy(We.projectionMatrix).invert(),We.viewport.set(Le.x,Le.y,Le.width,Le.height),ft===0&&(X.matrix.copy(We.matrix),X.matrix.decompose(X.position,X.quaternion,X.scale)),Oe===!0&&X.cameras.push(We)}const qe=o.enabledFeatures;if(qe&&qe.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&w){m=i.getBinding();const ft=m.getDepthInformation(fe[0]);ft&&ft.isValid&&ft.texture&&y.init(ft,o.renderState)}if(qe&&qe.includes("camera-access")&&w){e.state.unbindTexture(),m=i.getBinding();for(let ft=0;ft<fe.length;ft++){const bt=fe[ft].camera;if(bt){let Le=S[bt];Le||(Le=new k_,S[bt]=Le);const We=m.getCameraImage(bt);Le.sourceTexture=We}}}}for(let fe=0;fe<O.length;fe++){const Oe=N[fe],qe=O[fe];Oe!==null&&qe!==void 0&&qe.update(Oe,_e,f||c)}ve&&ve(ie,_e),_e.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:_e}),M=null}const Fe=new V_;Fe.setAnimationLoop(Pe),this.setAnimationLoop=function(ie){ve=ie},this.dispose=function(){}}}const fA=new nn,q_=new gt;q_.set(-1,0,0,0,1,0,0,0,1);function pA(s,e){function t(y,S){y.matrixAutoUpdate===!0&&y.updateMatrix(),S.value.copy(y.matrix)}function i(y,S){S.color.getRGB(y.fogColor.value,B_(s)),S.isFog?(y.fogNear.value=S.near,y.fogFar.value=S.far):S.isFogExp2&&(y.fogDensity.value=S.density)}function o(y,S,C,L,P){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(y,S):S.isMeshLambertMaterial?(l(y,S),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(y,S),m(y,S)):S.isMeshPhongMaterial?(l(y,S),g(y,S),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(y,S),v(y,S),S.isMeshPhysicalMaterial&&_(y,S,P)):S.isMeshMatcapMaterial?(l(y,S),M(y,S)):S.isMeshDepthMaterial?l(y,S):S.isMeshDistanceMaterial?(l(y,S),w(y,S)):S.isMeshNormalMaterial?l(y,S):S.isLineBasicMaterial?(c(y,S),S.isLineDashedMaterial&&d(y,S)):S.isPointsMaterial?h(y,S,C,L):S.isSpriteMaterial?f(y,S):S.isShadowMaterial?(y.color.value.copy(S.color),y.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(y,S){y.opacity.value=S.opacity,S.color&&y.diffuse.value.copy(S.color),S.emissive&&y.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(y.map.value=S.map,t(S.map,y.mapTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.bumpMap&&(y.bumpMap.value=S.bumpMap,t(S.bumpMap,y.bumpMapTransform),y.bumpScale.value=S.bumpScale,S.side===ai&&(y.bumpScale.value*=-1)),S.normalMap&&(y.normalMap.value=S.normalMap,t(S.normalMap,y.normalMapTransform),y.normalScale.value.copy(S.normalScale),S.side===ai&&y.normalScale.value.negate()),S.displacementMap&&(y.displacementMap.value=S.displacementMap,t(S.displacementMap,y.displacementMapTransform),y.displacementScale.value=S.displacementScale,y.displacementBias.value=S.displacementBias),S.emissiveMap&&(y.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,y.emissiveMapTransform)),S.specularMap&&(y.specularMap.value=S.specularMap,t(S.specularMap,y.specularMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest);const C=e.get(S),L=C.envMap,P=C.envMapRotation;L&&(y.envMap.value=L,y.envMapRotation.value.setFromMatrix4(fA.makeRotationFromEuler(P)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&y.envMapRotation.value.premultiply(q_),y.reflectivity.value=S.reflectivity,y.ior.value=S.ior,y.refractionRatio.value=S.refractionRatio),S.lightMap&&(y.lightMap.value=S.lightMap,y.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,y.lightMapTransform)),S.aoMap&&(y.aoMap.value=S.aoMap,y.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,y.aoMapTransform))}function c(y,S){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,S.map&&(y.map.value=S.map,t(S.map,y.mapTransform))}function d(y,S){y.dashSize.value=S.dashSize,y.totalSize.value=S.dashSize+S.gapSize,y.scale.value=S.scale}function h(y,S,C,L){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,y.size.value=S.size*C,y.scale.value=L*.5,S.map&&(y.map.value=S.map,t(S.map,y.uvTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest)}function f(y,S){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,y.rotation.value=S.rotation,S.map&&(y.map.value=S.map,t(S.map,y.mapTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest)}function g(y,S){y.specular.value.copy(S.specular),y.shininess.value=Math.max(S.shininess,1e-4)}function m(y,S){S.gradientMap&&(y.gradientMap.value=S.gradientMap)}function v(y,S){y.metalness.value=S.metalness,S.metalnessMap&&(y.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,y.metalnessMapTransform)),y.roughness.value=S.roughness,S.roughnessMap&&(y.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,y.roughnessMapTransform)),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)}function _(y,S,C){y.ior.value=S.ior,S.sheen>0&&(y.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),y.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(y.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,y.sheenColorMapTransform)),S.sheenRoughnessMap&&(y.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,y.sheenRoughnessMapTransform))),S.clearcoat>0&&(y.clearcoat.value=S.clearcoat,y.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(y.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,y.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(y.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,y.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(y.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,y.clearcoatNormalMapTransform),y.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===ai&&y.clearcoatNormalScale.value.negate())),S.dispersion>0&&(y.dispersion.value=S.dispersion),S.iridescence>0&&(y.iridescence.value=S.iridescence,y.iridescenceIOR.value=S.iridescenceIOR,y.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],y.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(y.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,y.iridescenceMapTransform)),S.iridescenceThicknessMap&&(y.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,y.iridescenceThicknessMapTransform))),S.transmission>0&&(y.transmission.value=S.transmission,y.transmissionSamplerMap.value=C.texture,y.transmissionSamplerSize.value.set(C.width,C.height),S.transmissionMap&&(y.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,y.transmissionMapTransform)),y.thickness.value=S.thickness,S.thicknessMap&&(y.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,y.thicknessMapTransform)),y.attenuationDistance.value=S.attenuationDistance,y.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(y.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(y.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,y.anisotropyMapTransform))),y.specularIntensity.value=S.specularIntensity,y.specularColor.value.copy(S.specularColor),S.specularColorMap&&(y.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,y.specularColorMapTransform)),S.specularIntensityMap&&(y.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,y.specularIntensityMapTransform))}function M(y,S){S.matcap&&(y.matcap.value=S.matcap)}function w(y,S){const C=e.get(S).light;y.referencePosition.value.setFromMatrixPosition(C.matrixWorld),y.nearDistance.value=C.shadow.camera.near,y.farDistance.value=C.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:o}}function mA(s,e,t,i){let o={},l={},c=[];const d=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,L){const P=L.program;i.uniformBlockBinding(C,P)}function f(C,L){let P=o[C.id];P===void 0&&(M(C),P=g(C),o[C.id]=P,C.addEventListener("dispose",y));const O=L.program;i.updateUBOMapping(C,O);const N=e.render.frame;l[C.id]!==N&&(v(C),l[C.id]=N)}function g(C){const L=m();C.__bindingPointIndex=L;const P=s.createBuffer(),O=C.__size,N=C.usage;return s.bindBuffer(s.UNIFORM_BUFFER,P),s.bufferData(s.UNIFORM_BUFFER,O,N),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,L,P),P}function m(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Rt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function v(C){const L=o[C.id],P=C.uniforms,O=C.__cache;s.bindBuffer(s.UNIFORM_BUFFER,L);for(let N=0,B=P.length;N<B;N++){const A=Array.isArray(P[N])?P[N]:[P[N]];for(let U=0,z=A.length;U<z;U++){const k=A[U];if(_(k,N,U,O)===!0){const X=k.__offset,re=Array.isArray(k.value)?k.value:[k.value];let ue=0;for(let G=0;G<re.length;G++){const Q=re[G],q=w(Q);typeof Q=="number"||typeof Q=="boolean"?(k.__data[0]=Q,s.bufferSubData(s.UNIFORM_BUFFER,X+ue,k.__data)):Q.isMatrix3?(k.__data[0]=Q.elements[0],k.__data[1]=Q.elements[1],k.__data[2]=Q.elements[2],k.__data[3]=0,k.__data[4]=Q.elements[3],k.__data[5]=Q.elements[4],k.__data[6]=Q.elements[5],k.__data[7]=0,k.__data[8]=Q.elements[6],k.__data[9]=Q.elements[7],k.__data[10]=Q.elements[8],k.__data[11]=0):ArrayBuffer.isView(Q)?k.__data.set(new Q.constructor(Q.buffer,Q.byteOffset,k.__data.length)):(Q.toArray(k.__data,ue),ue+=q.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,X,k.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function _(C,L,P,O){const N=C.value,B=L+"_"+P;if(O[B]===void 0)return typeof N=="number"||typeof N=="boolean"?O[B]=N:ArrayBuffer.isView(N)?O[B]=N.slice():O[B]=N.clone(),!0;{const A=O[B];if(typeof N=="number"||typeof N=="boolean"){if(A!==N)return O[B]=N,!0}else{if(ArrayBuffer.isView(N))return!0;if(A.equals(N)===!1)return A.copy(N),!0}}return!1}function M(C){const L=C.uniforms;let P=0;const O=16;for(let B=0,A=L.length;B<A;B++){const U=Array.isArray(L[B])?L[B]:[L[B]];for(let z=0,k=U.length;z<k;z++){const X=U[z],re=Array.isArray(X.value)?X.value:[X.value];for(let ue=0,G=re.length;ue<G;ue++){const Q=re[ue],q=w(Q),K=P%O,ae=K%q.boundary,le=K+ae;P+=ae,le!==0&&O-le<q.storage&&(P+=O-le),X.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),X.__offset=P,P+=q.storage}}}const N=P%O;return N>0&&(P+=O-N),C.__size=P,C.__cache={},this}function w(C){const L={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(L.boundary=4,L.storage=4):C.isVector2?(L.boundary=8,L.storage=8):C.isVector3||C.isColor?(L.boundary=16,L.storage=12):C.isVector4?(L.boundary=16,L.storage=16):C.isMatrix3?(L.boundary=48,L.storage=48):C.isMatrix4?(L.boundary=64,L.storage=64):C.isTexture?at("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(L.boundary=16,L.storage=C.byteLength):at("WebGLRenderer: Unsupported uniform value type.",C),L}function y(C){const L=C.target;L.removeEventListener("dispose",y);const P=c.indexOf(L.__bindingPointIndex);c.splice(P,1),s.deleteBuffer(o[L.id]),delete o[L.id],delete l[L.id]}function S(){for(const C in o)s.deleteBuffer(o[C]);c=[],o={},l={}}return{bind:h,update:f,dispose:S}}const gA=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let qi=null;function vA(){return qi===null&&(qi=new tE(gA,16,16,Bs,Pr),qi.name="DFG_LUT",qi.minFilter=Ln,qi.magFilter=Ln,qi.wrapS=br,qi.wrapT=br,qi.generateMipmaps=!1,qi.needsUpdate=!0),qi}class _A{constructor(e={}){const{canvas:t=RM(),context:i=null,depth:o=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:g="default",failIfMajorPerformanceCaveat:m=!1,reversedDepthBuffer:v=!1,outputBufferType:_=mi}=e;this.isWebGLRenderer=!0;let M;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");M=i.getContextAttributes().alpha}else M=c;const w=_,y=new Set([_p,vp,gp]),S=new Set([mi,ar,Ka,Za,pp,mp]),C=new Uint32Array(4),L=new Int32Array(4),P=new Y;let O=null,N=null;const B=[],A=[];let U=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=sr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const z=this;let k=!1,X=null;this._outputColorSpace=Xn;let re=0,ue=0,G=null,Q=-1,q=null;const K=new an,ae=new an;let le=null;const I=new wt(0);let Z=0,ve=t.width,Pe=t.height,Fe=1,ie=null,_e=null;const fe=new an(0,0,ve,Pe),Oe=new an(0,0,ve,Pe);let qe=!1;const nt=new Ep;let Ot=!1,ft=!1;const bt=new nn,Le=new Y,We=new an,vt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let At=!1;function Gt(){return G===null?Fe:1}let j=i;function It(R,$){return t.getContext(R,$)}try{const R={alpha:!0,depth:o,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:g,failIfMajorPerformanceCaveat:m};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${up}`),t.addEventListener("webglcontextlost",Se,!1),t.addEventListener("webglcontextrestored",Ke,!1),t.addEventListener("webglcontextcreationerror",ht,!1),j===null){const $="webgl2";if(j=It($,R),j===null)throw It($)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw Rt("WebGLRenderer: "+R.message),R}let ct,Pt,Ie,Ut,D,T,J,pe,xe,we,Ue,de,me,Be,Ve,Ce,Te,lt,dt,xt,V,Ae,he;function ze(){ct=new vT(j),ct.init(),V=new lA(j,ct),Pt=new cT(j,ct,e,V),Ie=new oA(j,ct),Pt.reversedDepthBuffer&&v&&Ie.buffers.depth.setReversed(!0),Ut=new ST(j),D=new Xb,T=new aA(j,ct,Ie,D,Pt,V,Ut),J=new gT(z),pe=new wE(j),Ae=new aT(j,pe),xe=new _T(j,pe,Ut,Ae),we=new MT(j,xe,pe,Ae,Ut),lt=new yT(j,Pt,T),Ve=new uT(D),Ue=new Wb(z,J,ct,Pt,Ae,Ve),de=new pA(z,D),me=new Yb,Be=new eA(ct),Te=new oT(z,J,Ie,we,M,h),Ce=new sA(z,we,Pt),he=new mA(j,Ut,Pt,Ie),dt=new lT(j,ct,Ut),xt=new xT(j,ct,Ut),Ut.programs=Ue.programs,z.capabilities=Pt,z.extensions=ct,z.properties=D,z.renderLists=me,z.shadowMap=Ce,z.state=Ie,z.info=Ut}ze(),w!==mi&&(U=new wT(w,t.width,t.height,o,l));const De=new hA(z,j);this.xr=De,this.getContext=function(){return j},this.getContextAttributes=function(){return j.getContextAttributes()},this.forceContextLoss=function(){const R=ct.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=ct.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return Fe},this.setPixelRatio=function(R){R!==void 0&&(Fe=R,this.setSize(ve,Pe,!1))},this.getSize=function(R){return R.set(ve,Pe)},this.setSize=function(R,$,oe=!0){if(De.isPresenting){at("WebGLRenderer: Can't change size while VR device is presenting.");return}ve=R,Pe=$,t.width=Math.floor(R*Fe),t.height=Math.floor($*Fe),oe===!0&&(t.style.width=R+"px",t.style.height=$+"px"),U!==null&&U.setSize(t.width,t.height),this.setViewport(0,0,R,$)},this.getDrawingBufferSize=function(R){return R.set(ve*Fe,Pe*Fe).floor()},this.setDrawingBufferSize=function(R,$,oe){ve=R,Pe=$,Fe=oe,t.width=Math.floor(R*oe),t.height=Math.floor($*oe),this.setViewport(0,0,R,$)},this.setEffects=function(R){if(w===mi){Rt("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let $=0;$<R.length;$++)if(R[$].isOutputPass===!0){at("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}U.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(K)},this.getViewport=function(R){return R.copy(fe)},this.setViewport=function(R,$,oe,ne){R.isVector4?fe.set(R.x,R.y,R.z,R.w):fe.set(R,$,oe,ne),Ie.viewport(K.copy(fe).multiplyScalar(Fe).round())},this.getScissor=function(R){return R.copy(Oe)},this.setScissor=function(R,$,oe,ne){R.isVector4?Oe.set(R.x,R.y,R.z,R.w):Oe.set(R,$,oe,ne),Ie.scissor(ae.copy(Oe).multiplyScalar(Fe).round())},this.getScissorTest=function(){return qe},this.setScissorTest=function(R){Ie.setScissorTest(qe=R)},this.setOpaqueSort=function(R){ie=R},this.setTransparentSort=function(R){_e=R},this.getClearColor=function(R){return R.copy(Te.getClearColor())},this.setClearColor=function(){Te.setClearColor(...arguments)},this.getClearAlpha=function(){return Te.getClearAlpha()},this.setClearAlpha=function(){Te.setClearAlpha(...arguments)},this.clear=function(R=!0,$=!0,oe=!0){let ne=0;if(R){let te=!1;if(G!==null){const Ne=G.texture.format;te=y.has(Ne)}if(te){const Ne=G.texture.type,Xe=S.has(Ne),Re=Te.getClearColor(),Ze=Te.getClearAlpha(),tt=Re.r,pt=Re.g,mt=Re.b;Xe?(C[0]=tt,C[1]=pt,C[2]=mt,C[3]=Ze,j.clearBufferuiv(j.COLOR,0,C)):(L[0]=tt,L[1]=pt,L[2]=mt,L[3]=Ze,j.clearBufferiv(j.COLOR,0,L))}else ne|=j.COLOR_BUFFER_BIT}$&&(ne|=j.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),oe&&(ne|=j.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),ne!==0&&j.clear(ne)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),X=R},this.dispose=function(){t.removeEventListener("webglcontextlost",Se,!1),t.removeEventListener("webglcontextrestored",Ke,!1),t.removeEventListener("webglcontextcreationerror",ht,!1),Te.dispose(),me.dispose(),Be.dispose(),D.dispose(),J.dispose(),we.dispose(),Ae.dispose(),he.dispose(),Ue.dispose(),De.dispose(),De.removeEventListener("sessionstart",ds),De.removeEventListener("sessionend",Vs),ur.stop()};function Se(R){R.preventDefault(),lu("WebGLRenderer: Context Lost."),k=!0}function Ke(){lu("WebGLRenderer: Context Restored."),k=!1;const R=Ut.autoReset,$=Ce.enabled,oe=Ce.autoUpdate,ne=Ce.needsUpdate,te=Ce.type;ze(),Ut.autoReset=R,Ce.enabled=$,Ce.autoUpdate=oe,Ce.needsUpdate=ne,Ce.type=te}function ht(R){Rt("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function jt(R){const $=R.target;$.removeEventListener("dispose",jt),Lt($)}function Lt(R){Hn(R),D.remove(R)}function Hn(R){const $=D.get(R).programs;$!==void 0&&($.forEach(function(oe){Ue.releaseProgram(oe)}),R.isShaderMaterial&&Ue.releaseShaderCache(R))}this.renderBufferDirect=function(R,$,oe,ne,te,Ne){$===null&&($=vt);const Xe=te.isMesh&&te.matrixWorld.determinant()<0,Re=il(R,$,oe,ne,te);Ie.setMaterial(ne,Xe);let Ze=oe.index,tt=1;if(ne.wireframe===!0){if(Ze=xe.getWireframeAttribute(oe),Ze===void 0)return;tt=2}const pt=oe.drawRange,mt=oe.attributes.position;let Qe=pt.start*tt,Ct=(pt.start+pt.count)*tt;Ne!==null&&(Qe=Math.max(Qe,Ne.start*tt),Ct=Math.min(Ct,(Ne.start+Ne.count)*tt)),Ze!==null?(Qe=Math.max(Qe,0),Ct=Math.min(Ct,Ze.count)):mt!=null&&(Qe=Math.max(Qe,0),Ct=Math.min(Ct,mt.count));const Xt=Ct-Qe;if(Xt<0||Xt===1/0)return;Ae.setup(te,ne,Re,oe,Ze);let Zt,kt=dt;if(Ze!==null&&(Zt=pe.get(Ze),kt=xt,kt.setIndex(Zt)),te.isMesh)ne.wireframe===!0?(Ie.setLineWidth(ne.wireframeLinewidth*Gt()),kt.setMode(j.LINES)):kt.setMode(j.TRIANGLES);else if(te.isLine){let dn=ne.linewidth;dn===void 0&&(dn=1),Ie.setLineWidth(dn*Gt()),te.isLineSegments?kt.setMode(j.LINES):te.isLineLoop?kt.setMode(j.LINE_LOOP):kt.setMode(j.LINE_STRIP)}else te.isPoints?kt.setMode(j.POINTS):te.isSprite&&kt.setMode(j.TRIANGLES);if(te.isBatchedMesh)if(ct.get("WEBGL_multi_draw"))kt.renderMultiDraw(te._multiDrawStarts,te._multiDrawCounts,te._multiDrawCount);else{const dn=te._multiDrawStarts,Ge=te._multiDrawCounts,An=te._multiDrawCount,St=Ze?pe.get(Ze).bytesPerElement:1,qn=D.get(ne).currentProgram.getUniforms();for(let Kn=0;Kn<An;Kn++)qn.setValue(j,"_gl_DrawID",Kn),kt.render(dn[Kn]/St,Ge[Kn])}else if(te.isInstancedMesh)kt.renderInstances(Qe,Xt,te.count);else if(oe.isInstancedBufferGeometry){const dn=oe._maxInstanceCount!==void 0?oe._maxInstanceCount:1/0,Ge=Math.min(oe.instanceCount,dn);kt.renderInstances(Qe,Xt,Ge)}else kt.render(Qe,Xt)};function vi(R,$,oe){R.transparent===!0&&R.side===Qi&&R.forceSinglePass===!1?(R.side=ai,R.needsUpdate=!0,Gs(R,$,oe),R.side=as,R.needsUpdate=!0,Gs(R,$,oe),R.side=Qi):Gs(R,$,oe)}this.compile=function(R,$,oe=null){oe===null&&(oe=R),N=Be.get(oe),N.init($),A.push(N),oe.traverseVisible(function(te){te.isLight&&te.layers.test($.layers)&&(N.pushLight(te),te.castShadow&&N.pushShadow(te))}),R!==oe&&R.traverseVisible(function(te){te.isLight&&te.layers.test($.layers)&&(N.pushLight(te),te.castShadow&&N.pushShadow(te))}),N.setupLights();const ne=new Set;return R.traverse(function(te){if(!(te.isMesh||te.isPoints||te.isLine||te.isSprite))return;const Ne=te.material;if(Ne)if(Array.isArray(Ne))for(let Xe=0;Xe<Ne.length;Xe++){const Re=Ne[Xe];vi(Re,oe,te),ne.add(Re)}else vi(Ne,oe,te),ne.add(Ne)}),N=A.pop(),ne},this.compileAsync=function(R,$,oe=null){const ne=this.compile(R,$,oe);return new Promise(te=>{function Ne(){if(ne.forEach(function(Xe){D.get(Xe).currentProgram.isReady()&&ne.delete(Xe)}),ne.size===0){te(R);return}setTimeout(Ne,10)}ct.get("KHR_parallel_shader_compile")!==null?Ne():setTimeout(Ne,10)})};let cr=null;function Hs(R){cr&&cr(R)}function ds(){ur.stop()}function Vs(){ur.start()}const ur=new V_;ur.setAnimationLoop(Hs),typeof self<"u"&&ur.setContext(self),this.setAnimationLoop=function(R){cr=R,De.setAnimationLoop(R),R===null?ur.stop():ur.start()},De.addEventListener("sessionstart",ds),De.addEventListener("sessionend",Vs),this.render=function(R,$){if($!==void 0&&$.isCamera!==!0){Rt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(k===!0)return;X!==null&&X.renderStart(R,$);const oe=De.enabled===!0&&De.isPresenting===!0,ne=U!==null&&(G===null||oe)&&U.begin(z,G);if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),$.parent===null&&$.matrixWorldAutoUpdate===!0&&$.updateMatrixWorld(),De.enabled===!0&&De.isPresenting===!0&&(U===null||U.isCompositing()===!1)&&(De.cameraAutoUpdate===!0&&De.updateCamera($),$=De.getCamera()),R.isScene===!0&&R.onBeforeRender(z,R,$,G),N=Be.get(R,A.length),N.init($),N.state.textureUnits=T.getTextureUnits(),A.push(N),bt.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),nt.setFromProjectionMatrix(bt,ir,$.reversedDepth),ft=this.localClippingEnabled,Ot=Ve.init(this.clippingPlanes,ft),O=me.get(R,B.length),O.init(),B.push(O),De.enabled===!0&&De.isPresenting===!0){const Xe=z.xr.getDepthSensingMesh();Xe!==null&&Wo(Xe,$,-1/0,z.sortObjects)}Wo(R,$,0,z.sortObjects),O.finish(),z.sortObjects===!0&&O.sort(ie,_e),At=De.enabled===!1||De.isPresenting===!1||De.hasDepthSensing()===!1,At&&Te.addToRenderList(O,R),this.info.render.frame++,Ot===!0&&Ve.beginShadows();const te=N.state.shadowsArray;if(Ce.render(te,R,$),Ot===!0&&Ve.endShadows(),this.info.autoReset===!0&&this.info.reset(),(ne&&U.hasRenderPass())===!1){const Xe=O.opaque,Re=O.transmissive;if(N.setupLights(),$.isArrayCamera){const Ze=$.cameras;if(Re.length>0)for(let tt=0,pt=Ze.length;tt<pt;tt++){const mt=Ze[tt];Hi(Xe,Re,R,mt)}At&&Te.render(R);for(let tt=0,pt=Ze.length;tt<pt;tt++){const mt=Ze[tt];tl(O,R,mt,mt.viewport)}}else Re.length>0&&Hi(Xe,Re,R,$),At&&Te.render(R),tl(O,R,$)}G!==null&&ue===0&&(T.updateMultisampleRenderTarget(G),T.updateRenderTargetMipmap(G)),ne&&U.end(z),R.isScene===!0&&R.onAfterRender(z,R,$),Ae.resetDefaultState(),Q=-1,q=null,A.pop(),A.length>0?(N=A[A.length-1],T.setTextureUnits(N.state.textureUnits),Ot===!0&&Ve.setGlobalState(z.clippingPlanes,N.state.camera)):N=null,B.pop(),B.length>0?O=B[B.length-1]:O=null,X!==null&&X.renderEnd()};function Wo(R,$,oe,ne){if(R.visible===!1)return;if(R.layers.test($.layers)){if(R.isGroup)oe=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update($);else if(R.isLightProbeGrid)N.pushLightProbeGrid(R);else if(R.isLight)N.pushLight(R),R.castShadow&&N.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||nt.intersectsSprite(R)){ne&&We.setFromMatrixPosition(R.matrixWorld).applyMatrix4(bt);const Xe=we.update(R),Re=R.material;Re.visible&&O.push(R,Xe,Re,oe,We.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||nt.intersectsObject(R))){const Xe=we.update(R),Re=R.material;if(ne&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),We.copy(R.boundingSphere.center)):(Xe.boundingSphere===null&&Xe.computeBoundingSphere(),We.copy(Xe.boundingSphere.center)),We.applyMatrix4(R.matrixWorld).applyMatrix4(bt)),Array.isArray(Re)){const Ze=Xe.groups;for(let tt=0,pt=Ze.length;tt<pt;tt++){const mt=Ze[tt],Qe=Re[mt.materialIndex];Qe&&Qe.visible&&O.push(R,Xe,Qe,oe,We.z,mt)}}else Re.visible&&O.push(R,Xe,Re,oe,We.z,null)}}const Ne=R.children;for(let Xe=0,Re=Ne.length;Xe<Re;Xe++)Wo(Ne[Xe],$,oe,ne)}function tl(R,$,oe,ne){const{opaque:te,transmissive:Ne,transparent:Xe}=R;N.setupLightsView(oe),Ot===!0&&Ve.setGlobalState(z.clippingPlanes,oe),ne&&Ie.viewport(K.copy(ne)),te.length>0&&hs(te,$,oe),Ne.length>0&&hs(Ne,$,oe),Xe.length>0&&hs(Xe,$,oe),Ie.buffers.depth.setTest(!0),Ie.buffers.depth.setMask(!0),Ie.buffers.color.setMask(!0),Ie.setPolygonOffset(!1)}function Hi(R,$,oe,ne){if((oe.isScene===!0?oe.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[ne.id]===void 0){const Qe=ct.has("EXT_color_buffer_half_float")||ct.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[ne.id]=new or(1,1,{generateMipmaps:!0,type:Qe?Pr:mi,minFilter:Ns,samples:Math.max(4,Pt.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Tt.workingColorSpace})}const Ne=N.state.transmissionRenderTarget[ne.id],Xe=ne.viewport||K;Ne.setSize(Xe.z*z.transmissionResolutionScale,Xe.w*z.transmissionResolutionScale);const Re=z.getRenderTarget(),Ze=z.getActiveCubeFace(),tt=z.getActiveMipmapLevel();z.setRenderTarget(Ne),z.getClearColor(I),Z=z.getClearAlpha(),Z<1&&z.setClearColor(16777215,.5),z.clear(),At&&Te.render(oe);const pt=z.toneMapping;z.toneMapping=sr;const mt=ne.viewport;if(ne.viewport!==void 0&&(ne.viewport=void 0),N.setupLightsView(ne),Ot===!0&&Ve.setGlobalState(z.clippingPlanes,ne),hs(R,oe,ne),T.updateMultisampleRenderTarget(Ne),T.updateRenderTargetMipmap(Ne),ct.has("WEBGL_multisampled_render_to_texture")===!1){let Qe=!1;for(let Ct=0,Xt=$.length;Ct<Xt;Ct++){const Zt=$[Ct],{object:kt,geometry:dn,material:Ge,group:An}=Zt;if(Ge.side===Qi&&kt.layers.test(ne.layers)){const St=Ge.side;Ge.side=ai,Ge.needsUpdate=!0,Xo(kt,oe,ne,dn,Ge,An),Ge.side=St,Ge.needsUpdate=!0,Qe=!0}}Qe===!0&&(T.updateMultisampleRenderTarget(Ne),T.updateRenderTargetMipmap(Ne))}z.setRenderTarget(Re,Ze,tt),z.setClearColor(I,Z),mt!==void 0&&(ne.viewport=mt),z.toneMapping=pt}function hs(R,$,oe){const ne=$.isScene===!0?$.overrideMaterial:null;for(let te=0,Ne=R.length;te<Ne;te++){const Xe=R[te],{object:Re,geometry:Ze,group:tt}=Xe;let pt=Xe.material;pt.allowOverride===!0&&ne!==null&&(pt=ne),Re.layers.test(oe.layers)&&Xo(Re,$,oe,Ze,pt,tt)}}function Xo(R,$,oe,ne,te,Ne){R.onBeforeRender(z,$,oe,ne,te,Ne),R.modelViewMatrix.multiplyMatrices(oe.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),te.onBeforeRender(z,$,oe,ne,R,Ne),te.transparent===!0&&te.side===Qi&&te.forceSinglePass===!1?(te.side=ai,te.needsUpdate=!0,z.renderBufferDirect(oe,$,ne,te,R,Ne),te.side=as,te.needsUpdate=!0,z.renderBufferDirect(oe,$,ne,te,R,Ne),te.side=Qi):z.renderBufferDirect(oe,$,ne,te,R,Ne),R.onAfterRender(z,$,oe,ne,te,Ne)}function Gs(R,$,oe){$.isScene!==!0&&($=vt);const ne=D.get(R),te=N.state.lights,Ne=N.state.shadowsArray,Xe=te.state.version,Re=Ue.getParameters(R,te.state,Ne,$,oe,N.state.lightProbeGridArray),Ze=Ue.getProgramCacheKey(Re);let tt=ne.programs;ne.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?$.environment:null,ne.fog=$.fog;const pt=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;ne.envMap=J.get(R.envMap||ne.environment,pt),ne.envMapRotation=ne.environment!==null&&R.envMap===null?$.environmentRotation:R.envMapRotation,tt===void 0&&(R.addEventListener("dispose",jt),tt=new Map,ne.programs=tt);let mt=tt.get(Ze);if(mt!==void 0){if(ne.currentProgram===mt&&ne.lightsStateVersion===Xe)return Yo(R,Re),mt}else Re.uniforms=Ue.getUniforms(R),X!==null&&R.isNodeMaterial&&X.build(R,oe,Re),R.onBeforeCompile(Re,z),mt=Ue.acquireProgram(Re,Ze),tt.set(Ze,mt),ne.uniforms=Re.uniforms;const Qe=ne.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Qe.clippingPlanes=Ve.uniform),Yo(R,Re),ne.needsLights=wu(R),ne.lightsStateVersion=Xe,ne.needsLights&&(Qe.ambientLightColor.value=te.state.ambient,Qe.lightProbe.value=te.state.probe,Qe.directionalLights.value=te.state.directional,Qe.directionalLightShadows.value=te.state.directionalShadow,Qe.spotLights.value=te.state.spot,Qe.spotLightShadows.value=te.state.spotShadow,Qe.rectAreaLights.value=te.state.rectArea,Qe.ltc_1.value=te.state.rectAreaLTC1,Qe.ltc_2.value=te.state.rectAreaLTC2,Qe.pointLights.value=te.state.point,Qe.pointLightShadows.value=te.state.pointShadow,Qe.hemisphereLights.value=te.state.hemi,Qe.directionalShadowMatrix.value=te.state.directionalShadowMatrix,Qe.spotLightMatrix.value=te.state.spotLightMatrix,Qe.spotLightMap.value=te.state.spotLightMap,Qe.pointShadowMatrix.value=te.state.pointShadowMatrix),ne.lightProbeGrid=N.state.lightProbeGridArray.length>0,ne.currentProgram=mt,ne.uniformsList=null,mt}function $o(R){if(R.uniformsList===null){const $=R.currentProgram.getUniforms();R.uniformsList=Zc.seqWithValue($.seq,R.uniforms)}return R.uniformsList}function Yo(R,$){const oe=D.get(R);oe.outputColorSpace=$.outputColorSpace,oe.batching=$.batching,oe.batchingColor=$.batchingColor,oe.instancing=$.instancing,oe.instancingColor=$.instancingColor,oe.instancingMorph=$.instancingMorph,oe.skinning=$.skinning,oe.morphTargets=$.morphTargets,oe.morphNormals=$.morphNormals,oe.morphColors=$.morphColors,oe.morphTargetsCount=$.morphTargetsCount,oe.numClippingPlanes=$.numClippingPlanes,oe.numIntersection=$.numClipIntersection,oe.vertexAlphas=$.vertexAlphas,oe.vertexTangents=$.vertexTangents,oe.toneMapping=$.toneMapping}function nl(R,$){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;P.setFromMatrixPosition($.matrixWorld);for(let oe=0,ne=R.length;oe<ne;oe++){const te=R[oe];if(te.texture!==null&&te.boundingBox.containsPoint(P))return te}return null}function il(R,$,oe,ne,te){$.isScene!==!0&&($=vt),T.resetTextureUnits();const Ne=$.fog,Xe=ne.isMeshStandardMaterial||ne.isMeshLambertMaterial||ne.isMeshPhongMaterial?$.environment:null,Re=G===null?z.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:Tt.workingColorSpace,Ze=ne.isMeshStandardMaterial||ne.isMeshLambertMaterial&&!ne.envMap||ne.isMeshPhongMaterial&&!ne.envMap,tt=J.get(ne.envMap||Xe,Ze),pt=ne.vertexColors===!0&&!!oe.attributes.color&&oe.attributes.color.itemSize===4,mt=!!oe.attributes.tangent&&(!!ne.normalMap||ne.anisotropy>0),Qe=!!oe.morphAttributes.position,Ct=!!oe.morphAttributes.normal,Xt=!!oe.morphAttributes.color;let Zt=sr;ne.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(Zt=z.toneMapping);const kt=oe.morphAttributes.position||oe.morphAttributes.normal||oe.morphAttributes.color,dn=kt!==void 0?kt.length:0,Ge=D.get(ne),An=N.state.lights;if(Ot===!0&&(ft===!0||R!==q)){const Bt=R===q&&ne.id===Q;Ve.setState(ne,R,Bt)}let St=!1;ne.version===Ge.__version?(Ge.needsLights&&Ge.lightsStateVersion!==An.state.version||Ge.outputColorSpace!==Re||te.isBatchedMesh&&Ge.batching===!1||!te.isBatchedMesh&&Ge.batching===!0||te.isBatchedMesh&&Ge.batchingColor===!0&&te.colorTexture===null||te.isBatchedMesh&&Ge.batchingColor===!1&&te.colorTexture!==null||te.isInstancedMesh&&Ge.instancing===!1||!te.isInstancedMesh&&Ge.instancing===!0||te.isSkinnedMesh&&Ge.skinning===!1||!te.isSkinnedMesh&&Ge.skinning===!0||te.isInstancedMesh&&Ge.instancingColor===!0&&te.instanceColor===null||te.isInstancedMesh&&Ge.instancingColor===!1&&te.instanceColor!==null||te.isInstancedMesh&&Ge.instancingMorph===!0&&te.morphTexture===null||te.isInstancedMesh&&Ge.instancingMorph===!1&&te.morphTexture!==null||Ge.envMap!==tt||ne.fog===!0&&Ge.fog!==Ne||Ge.numClippingPlanes!==void 0&&(Ge.numClippingPlanes!==Ve.numPlanes||Ge.numIntersection!==Ve.numIntersection)||Ge.vertexAlphas!==pt||Ge.vertexTangents!==mt||Ge.morphTargets!==Qe||Ge.morphNormals!==Ct||Ge.morphColors!==Xt||Ge.toneMapping!==Zt||Ge.morphTargetsCount!==dn||!!Ge.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(St=!0):(St=!0,Ge.__version=ne.version);let qn=Ge.currentProgram;St===!0&&(qn=Gs(ne,$,te),X&&ne.isNodeMaterial&&X.onUpdateProgram(ne,qn,Ge));let Kn=!1,yt=!1,dr=!1;const Ft=qn.getUniforms(),Yt=Ge.uniforms;if(Ie.useProgram(qn.program)&&(Kn=!0,yt=!0,dr=!0),ne.id!==Q&&(Q=ne.id,yt=!0),Ge.needsLights){const Bt=nl(N.state.lightProbeGridArray,te);Ge.lightProbeGrid!==Bt&&(Ge.lightProbeGrid=Bt,yt=!0)}if(Kn||q!==R){Ie.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Ft.setValue(j,"projectionMatrix",R.projectionMatrix),Ft.setValue(j,"viewMatrix",R.matrixWorldInverse);const Ai=Ft.map.cameraPosition;Ai!==void 0&&Ai.setValue(j,Le.setFromMatrixPosition(R.matrixWorld)),Pt.logarithmicDepthBuffer&&Ft.setValue(j,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(ne.isMeshPhongMaterial||ne.isMeshToonMaterial||ne.isMeshLambertMaterial||ne.isMeshBasicMaterial||ne.isMeshStandardMaterial||ne.isShaderMaterial)&&Ft.setValue(j,"isOrthographic",R.isOrthographicCamera===!0),q!==R&&(q=R,yt=!0,dr=!0)}if(Ge.needsLights&&(An.state.directionalShadowMap.length>0&&Ft.setValue(j,"directionalShadowMap",An.state.directionalShadowMap,T),An.state.spotShadowMap.length>0&&Ft.setValue(j,"spotShadowMap",An.state.spotShadowMap,T),An.state.pointShadowMap.length>0&&Ft.setValue(j,"pointShadowMap",An.state.pointShadowMap,T)),te.isSkinnedMesh){Ft.setOptional(j,te,"bindMatrix"),Ft.setOptional(j,te,"bindMatrixInverse");const Bt=te.skeleton;Bt&&(Bt.boneTexture===null&&Bt.computeBoneTexture(),Ft.setValue(j,"boneTexture",Bt.boneTexture,T))}te.isBatchedMesh&&(Ft.setOptional(j,te,"batchingTexture"),Ft.setValue(j,"batchingTexture",te._matricesTexture,T),Ft.setOptional(j,te,"batchingIdTexture"),Ft.setValue(j,"batchingIdTexture",te._indirectTexture,T),Ft.setOptional(j,te,"batchingColorTexture"),te._colorsTexture!==null&&Ft.setValue(j,"batchingColorTexture",te._colorsTexture,T));const bi=oe.morphAttributes;if((bi.position!==void 0||bi.normal!==void 0||bi.color!==void 0)&&lt.update(te,oe,qn),(yt||Ge.receiveShadow!==te.receiveShadow)&&(Ge.receiveShadow=te.receiveShadow,Ft.setValue(j,"receiveShadow",te.receiveShadow)),(ne.isMeshStandardMaterial||ne.isMeshLambertMaterial||ne.isMeshPhongMaterial)&&ne.envMap===null&&$.environment!==null&&(Yt.envMapIntensity.value=$.environmentIntensity),Yt.dfgLUT!==void 0&&(Yt.dfgLUT.value=vA()),yt){if(Ft.setValue(j,"toneMappingExposure",z.toneMappingExposure),Ge.needsLights&&Eu(Yt,dr),Ne&&ne.fog===!0&&de.refreshFogUniforms(Yt,Ne),de.refreshMaterialUniforms(Yt,ne,Fe,Pe,N.state.transmissionRenderTarget[R.id]),Ge.needsLights&&Ge.lightProbeGrid){const Bt=Ge.lightProbeGrid;Yt.probesSH.value=Bt.texture,Yt.probesMin.value.copy(Bt.boundingBox.min),Yt.probesMax.value.copy(Bt.boundingBox.max),Yt.probesResolution.value.copy(Bt.resolution)}Zc.upload(j,$o(Ge),Yt,T)}if(ne.isShaderMaterial&&ne.uniformsNeedUpdate===!0&&(Zc.upload(j,$o(Ge),Yt,T),ne.uniformsNeedUpdate=!1),ne.isSpriteMaterial&&Ft.setValue(j,"center",te.center),Ft.setValue(j,"modelViewMatrix",te.modelViewMatrix),Ft.setValue(j,"normalMatrix",te.normalMatrix),Ft.setValue(j,"modelMatrix",te.matrixWorld),ne.uniformsGroups!==void 0){const Bt=ne.uniformsGroups;for(let Ai=0,Vi=Bt.length;Ai<Vi;Ai++){const fs=Bt[Ai];he.update(fs,qn),he.bind(fs,qn)}}return qn}function Eu(R,$){R.ambientLightColor.needsUpdate=$,R.lightProbe.needsUpdate=$,R.directionalLights.needsUpdate=$,R.directionalLightShadows.needsUpdate=$,R.pointLights.needsUpdate=$,R.pointLightShadows.needsUpdate=$,R.spotLights.needsUpdate=$,R.spotLightShadows.needsUpdate=$,R.rectAreaLights.needsUpdate=$,R.hemisphereLights.needsUpdate=$}function wu(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return re},this.getActiveMipmapLevel=function(){return ue},this.getRenderTarget=function(){return G},this.setRenderTargetTextures=function(R,$,oe){const ne=D.get(R);ne.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,ne.__autoAllocateDepthBuffer===!1&&(ne.__useRenderToTexture=!1),D.get(R.texture).__webglTexture=$,D.get(R.depthTexture).__webglTexture=ne.__autoAllocateDepthBuffer?void 0:oe,ne.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,$){const oe=D.get(R);oe.__webglFramebuffer=$,oe.__useDefaultFramebuffer=$===void 0};const Qt=j.createFramebuffer();this.setRenderTarget=function(R,$=0,oe=0){G=R,re=$,ue=oe;let ne=null,te=!1,Ne=!1;if(R){const Re=D.get(R);if(Re.__useDefaultFramebuffer!==void 0){Ie.bindFramebuffer(j.FRAMEBUFFER,Re.__webglFramebuffer),K.copy(R.viewport),ae.copy(R.scissor),le=R.scissorTest,Ie.viewport(K),Ie.scissor(ae),Ie.setScissorTest(le),Q=-1;return}else if(Re.__webglFramebuffer===void 0)T.setupRenderTarget(R);else if(Re.__hasExternalTextures)T.rebindTextures(R,D.get(R.texture).__webglTexture,D.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const pt=R.depthTexture;if(Re.__boundDepthTexture!==pt){if(pt!==null&&D.has(pt)&&(R.width!==pt.image.width||R.height!==pt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");T.setupDepthRenderbuffer(R)}}const Ze=R.texture;(Ze.isData3DTexture||Ze.isDataArrayTexture||Ze.isCompressedArrayTexture)&&(Ne=!0);const tt=D.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(tt[$])?ne=tt[$][oe]:ne=tt[$],te=!0):R.samples>0&&T.useMultisampledRTT(R)===!1?ne=D.get(R).__webglMultisampledFramebuffer:Array.isArray(tt)?ne=tt[oe]:ne=tt,K.copy(R.viewport),ae.copy(R.scissor),le=R.scissorTest}else K.copy(fe).multiplyScalar(Fe).floor(),ae.copy(Oe).multiplyScalar(Fe).floor(),le=qe;if(oe!==0&&(ne=Qt),Ie.bindFramebuffer(j.FRAMEBUFFER,ne)&&Ie.drawBuffers(R,ne),Ie.viewport(K),Ie.scissor(ae),Ie.setScissorTest(le),te){const Re=D.get(R.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_CUBE_MAP_POSITIVE_X+$,Re.__webglTexture,oe)}else if(Ne){const Re=$;for(let Ze=0;Ze<R.textures.length;Ze++){const tt=D.get(R.textures[Ze]);j.framebufferTextureLayer(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0+Ze,tt.__webglTexture,oe,Re)}}else if(R!==null&&oe!==0){const Re=D.get(R.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,Re.__webglTexture,oe)}Q=-1},this.readRenderTargetPixels=function(R,$,oe,ne,te,Ne,Xe,Re=0){if(!(R&&R.isWebGLRenderTarget)){Rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ze=D.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Xe!==void 0&&(Ze=Ze[Xe]),Ze){Ie.bindFramebuffer(j.FRAMEBUFFER,Ze);try{const tt=R.textures[Re],pt=tt.format,mt=tt.type;if(R.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+Re),!Pt.textureFormatReadable(pt)){Rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Pt.textureTypeReadable(mt)){Rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}$>=0&&$<=R.width-ne&&oe>=0&&oe<=R.height-te&&j.readPixels($,oe,ne,te,V.convert(pt),V.convert(mt),Ne)}finally{const tt=G!==null?D.get(G).__webglFramebuffer:null;Ie.bindFramebuffer(j.FRAMEBUFFER,tt)}}},this.readRenderTargetPixelsAsync=async function(R,$,oe,ne,te,Ne,Xe,Re=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ze=D.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Xe!==void 0&&(Ze=Ze[Xe]),Ze)if($>=0&&$<=R.width-ne&&oe>=0&&oe<=R.height-te){Ie.bindFramebuffer(j.FRAMEBUFFER,Ze);const tt=R.textures[Re],pt=tt.format,mt=tt.type;if(R.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+Re),!Pt.textureFormatReadable(pt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Pt.textureTypeReadable(mt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Qe=j.createBuffer();j.bindBuffer(j.PIXEL_PACK_BUFFER,Qe),j.bufferData(j.PIXEL_PACK_BUFFER,Ne.byteLength,j.STREAM_READ),j.readPixels($,oe,ne,te,V.convert(pt),V.convert(mt),0);const Ct=G!==null?D.get(G).__webglFramebuffer:null;Ie.bindFramebuffer(j.FRAMEBUFFER,Ct);const Xt=j.fenceSync(j.SYNC_GPU_COMMANDS_COMPLETE,0);return j.flush(),await PM(j,Xt,4),j.bindBuffer(j.PIXEL_PACK_BUFFER,Qe),j.getBufferSubData(j.PIXEL_PACK_BUFFER,0,Ne),j.deleteBuffer(Qe),j.deleteSync(Xt),Ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,$=null,oe=0){const ne=Math.pow(2,-oe),te=Math.floor(R.image.width*ne),Ne=Math.floor(R.image.height*ne),Xe=$!==null?$.x:0,Re=$!==null?$.y:0;T.setTexture2D(R,0),j.copyTexSubImage2D(j.TEXTURE_2D,oe,0,0,Xe,Re,te,Ne),Ie.unbindTexture()};const Tu=j.createFramebuffer(),qo=j.createFramebuffer();this.copyTextureToTexture=function(R,$,oe=null,ne=null,te=0,Ne=0){let Xe,Re,Ze,tt,pt,mt,Qe,Ct,Xt;const Zt=R.isCompressedTexture?R.mipmaps[Ne]:R.image;if(oe!==null)Xe=oe.max.x-oe.min.x,Re=oe.max.y-oe.min.y,Ze=oe.isBox3?oe.max.z-oe.min.z:1,tt=oe.min.x,pt=oe.min.y,mt=oe.isBox3?oe.min.z:0;else{const Yt=Math.pow(2,-te);Xe=Math.floor(Zt.width*Yt),Re=Math.floor(Zt.height*Yt),R.isDataArrayTexture?Ze=Zt.depth:R.isData3DTexture?Ze=Math.floor(Zt.depth*Yt):Ze=1,tt=0,pt=0,mt=0}ne!==null?(Qe=ne.x,Ct=ne.y,Xt=ne.z):(Qe=0,Ct=0,Xt=0);const kt=V.convert($.format),dn=V.convert($.type);let Ge;$.isData3DTexture?(T.setTexture3D($,0),Ge=j.TEXTURE_3D):$.isDataArrayTexture||$.isCompressedArrayTexture?(T.setTexture2DArray($,0),Ge=j.TEXTURE_2D_ARRAY):(T.setTexture2D($,0),Ge=j.TEXTURE_2D),Ie.activeTexture(j.TEXTURE0),Ie.pixelStorei(j.UNPACK_FLIP_Y_WEBGL,$.flipY),Ie.pixelStorei(j.UNPACK_PREMULTIPLY_ALPHA_WEBGL,$.premultiplyAlpha),Ie.pixelStorei(j.UNPACK_ALIGNMENT,$.unpackAlignment);const An=Ie.getParameter(j.UNPACK_ROW_LENGTH),St=Ie.getParameter(j.UNPACK_IMAGE_HEIGHT),qn=Ie.getParameter(j.UNPACK_SKIP_PIXELS),Kn=Ie.getParameter(j.UNPACK_SKIP_ROWS),yt=Ie.getParameter(j.UNPACK_SKIP_IMAGES);Ie.pixelStorei(j.UNPACK_ROW_LENGTH,Zt.width),Ie.pixelStorei(j.UNPACK_IMAGE_HEIGHT,Zt.height),Ie.pixelStorei(j.UNPACK_SKIP_PIXELS,tt),Ie.pixelStorei(j.UNPACK_SKIP_ROWS,pt),Ie.pixelStorei(j.UNPACK_SKIP_IMAGES,mt);const dr=R.isDataArrayTexture||R.isData3DTexture,Ft=$.isDataArrayTexture||$.isData3DTexture;if(R.isDepthTexture){const Yt=D.get(R),bi=D.get($),Bt=D.get(Yt.__renderTarget),Ai=D.get(bi.__renderTarget);Ie.bindFramebuffer(j.READ_FRAMEBUFFER,Bt.__webglFramebuffer),Ie.bindFramebuffer(j.DRAW_FRAMEBUFFER,Ai.__webglFramebuffer);for(let Vi=0;Vi<Ze;Vi++)dr&&(j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,D.get(R).__webglTexture,te,mt+Vi),j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,D.get($).__webglTexture,Ne,Xt+Vi)),j.blitFramebuffer(tt,pt,Xe,Re,Qe,Ct,Xe,Re,j.DEPTH_BUFFER_BIT,j.NEAREST);Ie.bindFramebuffer(j.READ_FRAMEBUFFER,null),Ie.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else if(te!==0||R.isRenderTargetTexture||D.has(R)){const Yt=D.get(R),bi=D.get($);Ie.bindFramebuffer(j.READ_FRAMEBUFFER,Tu),Ie.bindFramebuffer(j.DRAW_FRAMEBUFFER,qo);for(let Bt=0;Bt<Ze;Bt++)dr?j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,Yt.__webglTexture,te,mt+Bt):j.framebufferTexture2D(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,Yt.__webglTexture,te),Ft?j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,bi.__webglTexture,Ne,Xt+Bt):j.framebufferTexture2D(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,bi.__webglTexture,Ne),te!==0?j.blitFramebuffer(tt,pt,Xe,Re,Qe,Ct,Xe,Re,j.COLOR_BUFFER_BIT,j.NEAREST):Ft?j.copyTexSubImage3D(Ge,Ne,Qe,Ct,Xt+Bt,tt,pt,Xe,Re):j.copyTexSubImage2D(Ge,Ne,Qe,Ct,tt,pt,Xe,Re);Ie.bindFramebuffer(j.READ_FRAMEBUFFER,null),Ie.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else Ft?R.isDataTexture||R.isData3DTexture?j.texSubImage3D(Ge,Ne,Qe,Ct,Xt,Xe,Re,Ze,kt,dn,Zt.data):$.isCompressedArrayTexture?j.compressedTexSubImage3D(Ge,Ne,Qe,Ct,Xt,Xe,Re,Ze,kt,Zt.data):j.texSubImage3D(Ge,Ne,Qe,Ct,Xt,Xe,Re,Ze,kt,dn,Zt):R.isDataTexture?j.texSubImage2D(j.TEXTURE_2D,Ne,Qe,Ct,Xe,Re,kt,dn,Zt.data):R.isCompressedTexture?j.compressedTexSubImage2D(j.TEXTURE_2D,Ne,Qe,Ct,Zt.width,Zt.height,kt,Zt.data):j.texSubImage2D(j.TEXTURE_2D,Ne,Qe,Ct,Xe,Re,kt,dn,Zt);Ie.pixelStorei(j.UNPACK_ROW_LENGTH,An),Ie.pixelStorei(j.UNPACK_IMAGE_HEIGHT,St),Ie.pixelStorei(j.UNPACK_SKIP_PIXELS,qn),Ie.pixelStorei(j.UNPACK_SKIP_ROWS,Kn),Ie.pixelStorei(j.UNPACK_SKIP_IMAGES,yt),Ne===0&&$.generateMipmaps&&j.generateMipmap(Ge),Ie.unbindTexture()},this.initRenderTarget=function(R){D.get(R).__webglFramebuffer===void 0&&T.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?T.setTextureCube(R,0):R.isData3DTexture?T.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?T.setTexture2DArray(R,0):T.setTexture2D(R,0),Ie.unbindTexture()},this.resetState=function(){re=0,ue=0,G=null,Ie.reset(),Ae.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ir}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Tt._getUnpackColorSpace()}}const bv={type:"change"},bp={type:"start"},K_={type:"end"},Nc=new Mp,Av=new is,xA=Math.cos(70*NM.DEG2RAD),vn=new Y,ii=2*Math.PI,Vt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Kh=1e-6;class SA extends ME{constructor(e,t=null){super(e,t),this.state=Vt.NONE,this.target=new Y,this.cursor=new Y,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Uo.ROTATE,MIDDLE:Uo.DOLLY,RIGHT:Uo.PAN},this.touches={ONE:No.ROTATE,TWO:No.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new Y,this._lastQuaternion=new ls,this._lastTargetPosition=new Y,this._quat=new ls().setFromUnitVectors(e.up,new Y(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ev,this._sphericalDelta=new ev,this._scale=1,this._panOffset=new Y,this._rotateStart=new ot,this._rotateEnd=new ot,this._rotateDelta=new ot,this._panStart=new ot,this._panEnd=new ot,this._panDelta=new ot,this._dollyStart=new ot,this._dollyEnd=new ot,this._dollyDelta=new ot,this._dollyDirection=new Y,this._mouse=new ot,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=MA.bind(this),this._onPointerDown=yA.bind(this),this._onPointerUp=EA.bind(this),this._onContextMenu=PA.bind(this),this._onMouseWheel=bA.bind(this),this._onKeyDown=AA.bind(this),this._onTouchStart=CA.bind(this),this._onTouchMove=RA.bind(this),this._onMouseDown=wA.bind(this),this._onMouseMove=TA.bind(this),this._interceptControlDown=DA.bind(this),this._interceptControlUp=LA.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(bv),this.update(),this.state=Vt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;vn.copy(t).sub(this.target),vn.applyQuaternion(this._quat),this._spherical.setFromVector3(vn),this.autoRotate&&this.state===Vt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,o=this.maxAzimuthAngle;isFinite(i)&&isFinite(o)&&(i<-Math.PI?i+=ii:i>Math.PI&&(i-=ii),o<-Math.PI?o+=ii:o>Math.PI&&(o-=ii),i<=o?this._spherical.theta=Math.max(i,Math.min(o,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+o)/2?Math.max(i,this._spherical.theta):Math.min(o,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(vn.setFromSpherical(this._spherical),vn.applyQuaternion(this._quatInverse),t.copy(this.target).add(vn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=vn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new Y(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new Y(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=vn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Nc.origin.copy(this.object.position),Nc.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Nc.direction))<xA?this.object.lookAt(this.target):(Av.setFromNormalAndCoplanarPoint(this.object.up,this.target),Nc.intersectPlane(Av,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Kh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Kh||this._lastTargetPosition.distanceToSquared(this.target)>Kh?(this.dispatchEvent(bv),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ii/60*this.autoRotateSpeed*e:ii/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){vn.setFromMatrixColumn(t,0),vn.multiplyScalar(-e),this._panOffset.add(vn)}_panUp(e,t){this.screenSpacePanning===!0?vn.setFromMatrixColumn(t,1):(vn.setFromMatrixColumn(t,0),vn.crossVectors(this.object.up,vn)),vn.multiplyScalar(e),this._panOffset.add(vn)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const o=this.object.position;vn.copy(o).sub(this.target);let l=vn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/i.clientHeight,this.object.matrix),this._panUp(2*t*l/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),o=e-i.left,l=t-i.top,c=i.width,d=i.height;this._mouse.x=o/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ii*this._rotateDelta.x/t.clientHeight),this._rotateUp(ii*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),o=.5*(e.pageY+t.y);this._rotateStart.set(i,o)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),o=.5*(e.pageY+t.y);this._panStart.set(i,o)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,o=e.pageY-t.y,l=Math.sqrt(i*i+o*o);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),o=.5*(e.pageX+i.x),l=.5*(e.pageY+i.y);this._rotateEnd.set(o,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ii*this._rotateDelta.x/t.clientHeight),this._rotateUp(ii*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),o=.5*(e.pageY+t.y);this._panEnd.set(i,o)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,o=e.pageY-t.y,l=Math.sqrt(i*i+o*o);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ot,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function yA(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function MA(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function EA(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(K_),this.state=Vt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function wA(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Uo.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=Vt.DOLLY;break;case Uo.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=Vt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=Vt.ROTATE}break;case Uo.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=Vt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=Vt.PAN}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(bp)}function TA(s){switch(this.state){case Vt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case Vt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case Vt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function bA(s){this.enabled===!1||this.enableZoom===!1||this.state!==Vt.NONE||(s.preventDefault(),this.dispatchEvent(bp),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(K_))}function AA(s){this.enabled!==!1&&this._handleKeyDown(s)}function CA(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case No.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(s),this.state=Vt.TOUCH_ROTATE;break;case No.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(s),this.state=Vt.TOUCH_PAN;break;default:this.state=Vt.NONE}break;case 2:switch(this.touches.TWO){case No.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=Vt.TOUCH_DOLLY_PAN;break;case No.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=Vt.TOUCH_DOLLY_ROTATE;break;default:this.state=Vt.NONE}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(bp)}function RA(s){switch(this._trackPointer(s),this.state){case Vt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case Vt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case Vt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case Vt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=Vt.NONE}}function PA(s){this.enabled!==!1&&s.preventDefault()}function DA(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function LA(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function NA(s,e){s.position.set(e.position.x,e.position.y,e.position.z),s.rotation.order="YXZ",s.rotation.set(e.tiltDeg*$n,-e.headingDeg*$n,0),s.fov=e.vfovDeg,s.aspect=np,s.updateProjectionMatrix(),s.updateMatrixWorld(!0)}const IA=3;function UA(){const s=new tr({color:2764083}),e=new tr({color:4869976}),t=new tr({color:723982}),i=new Ho({color:16729402,toneMapped:!1}),o=new Yn;o.name="p240";const l=new Yn;o.add(l);const c=new it(new Wt(.163,.07,.2),s);c.position.y=-.145,l.add(c);const d=new Yn;l.add(d);const h=new it(new ki(.075,.08,.03,20),e);h.position.y=-.1;const f=new it(new Wt(.02,.13,.07),e);f.position.set(-.075,-.04,0);const g=f.clone();g.position.x=.075,d.add(h,f,g);const m=new Yn;d.add(m);const v=new it(new Wt(.12,.11,.17),s);v.position.z=.01;const _=new it(new ki(.038,.042,.03,24),e);_.rotation.x=Math.PI/2,_.position.z=-.085;const M=new it(new ki(.03,.03,.005,24),t);M.rotation.x=Math.PI/2,M.position.z=-.101;const w=new it(new Wt(.018,.012,.12),i);return w.position.y=.061,m.add(v,_,M,w),o.scale.setScalar(IA),{root:o,pan:d,tilt:m,setPose(y,S,C){C==="inverted"?(l.rotation.set(0,0,Math.PI),d.rotation.set(0,y*$n,0),m.rotation.set(-S*$n,0,0)):(l.rotation.set(0,0,0),d.rotation.set(0,-y*$n,0),m.rotation.set(S*$n,0,0))}}}function FA(s){s.updateWorldMatrix(!0,!1);const e=s.matrixWorld.elements,t=-e[8],i=-e[9],o=-e[10],l=Math.hypot(t,i,o)||1;return[t/l,i/l,o/l]}const OA=1.75,Cv=2.2;function kA(){const s=new tr({color:14250810}),e=new tr({color:2830138}),t=new tr({color:13213824}),i=new tr({color:1513499}),o=new tr({color:2759958}),l=new Yn;l.name="performer";const c=new Yn;l.add(c);const d=S=>{const C=new Yn;C.position.set(S,.92,0);const L=new it(new Io(.075,.72,4,10),e);L.position.y=-.44;const P=new it(new Wt(.11,.07,.24),i);return P.position.set(0,-.89,.05),C.add(L,P),C},h=S=>{const C=new Yn;C.position.set(S,1.42,0);const L=new it(new Io(.055,.56,4,10),s);L.position.y=-.33;const P=new it(new Xa(.055,10,8),t);return P.position.y=-.66,C.add(L,P),C},f=d(-.1),g=d(.1),m=h(-.25),v=h(.25),_=new it(new Io(.19,.38,6,14),s);_.position.y=1.2,_.scale.set(1,1,.62);const M=new it(new Io(.05,.06,4,8),t);M.position.y=1.52;const w=new it(new Xa(.11,18,14),t);w.position.y=1.64,w.scale.set(.9,1.1,.95);const y=new it(new Xa(.112,18,10,0,Math.PI*2,0,Math.PI/2.1),o);return y.position.y=1.665,c.add(f,g,m,v,_,M,w,y),{root:l,update(S){const C=Ar(S.position);l.position.set(C.x,C.y,C.z),l.scale.setScalar(S.height/OA),l.rotation.y=-S.facing;const L=S.moving?Math.sin(S.stride*Cv)*.45:0;f.rotation.x=L,g.rotation.x=-L,m.rotation.x=-L*.7,v.rotation.x=L*.7,c.position.y=S.moving?Math.abs(Math.cos(S.stride*Cv))*.025:0}}}function Zh(s,e=!1){const t=s[0].index!==null,i=new Set(Object.keys(s[0].attributes)),o=new Set(Object.keys(s[0].morphAttributes)),l={},c={},d=s[0].morphTargetsRelative,h=new bn;let f=0;for(let g=0;g<s.length;++g){const m=s[g];let v=0;if(t!==(m.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const _ in m.attributes){if(!i.has(_))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+'. All geometries must have compatible attributes; make sure "'+_+'" attribute exists among all geometries, or in none of them.'),null;l[_]===void 0&&(l[_]=[]),l[_].push(m.attributes[_]),v++}if(v!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+". Make sure all geometries have the same number of attributes."),null;if(d!==m.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const _ in m.morphAttributes){if(!o.has(_))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+".  .morphAttributes must be consistent throughout all geometries."),null;c[_]===void 0&&(c[_]=[]),c[_].push(m.morphAttributes[_])}if(e){let _;if(t)_=m.index.count;else if(m.attributes.position!==void 0)_=m.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+g+". The geometry must have either an index or a position attribute"),null;h.addGroup(f,_,g),f+=_}}if(t){let g=0;const m=[];for(let v=0;v<s.length;++v){const _=s[v].index;for(let M=0;M<_.count;++M)m.push(_.getX(M)+g);g+=s[v].attributes.position.count}h.setIndex(m)}for(const g in l){const m=Rv(l[g]);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+g+" attribute."),null;h.setAttribute(g,m)}for(const g in c){const m=c[g][0].length;if(m!==0){h.morphAttributes=h.morphAttributes||{},h.morphAttributes[g]=[];for(let v=0;v<m;++v){const _=[];for(let w=0;w<c[g].length;++w)_.push(c[g][w][v]);const M=Rv(_);if(!M)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+g+" morphAttribute."),null;h.morphAttributes[g].push(M)}}}return h}function Rv(s){let e,t,i,o=-1,l=0;for(let f=0;f<s.length;++f){const g=s[f];if(e===void 0&&(e=g.array.constructor),e!==g.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=g.itemSize),t!==g.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(i===void 0&&(i=g.normalized),i!==g.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(o===-1&&(o=g.gpuType),o!==g.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;l+=g.count*t}const c=new e(l),d=new li(c,t,i);let h=0;for(let f=0;f<s.length;++f){const g=s[f];if(g.isInterleavedBufferAttribute){const m=h/t;for(let v=0,_=g.count;v<_;v++)for(let M=0;M<t;M++){const w=g.getComponent(v,M);d.setComponent(v+m,M,w)}}else c.set(g.array,h);h+=g.count*t}return o!==void 0&&(d.gpuType=o),d}function Lo(s,e){const c=document.createElement("canvas"),d=c.getContext("2d"),h='600 112px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';let f=200;d&&(d.font=h,f=Math.ceil(d.measureText(s).width)),c.width=f+112,c.height=176;const g=c.getContext("2d");if(g){g.font=h,g.fillStyle=e.background??"rgba(12, 16, 22, 0.78)";const w=c.height/2.6;g.beginPath(),typeof g.roundRect=="function"?g.roundRect(0,0,c.width,c.height,w):g.rect(0,0,c.width,c.height),g.fill(),g.fillStyle=e.color??"#f4f0e8",g.textBaseline="middle",g.fillText(s,56,c.height/2+4)}const m=new O_(c);m.colorSpace=Xn,m.minFilter=Ln,m.generateMipmaps=!1;const v=new N_({toneMapped:!1,map:m,transparent:!0,depthTest:!e.alwaysVisible,depthWrite:!1}),_=new QM(v),M=c.width/c.height;return _.scale.set(e.height*M,e.height,1),_.renderOrder=e.alwaysVisible?20:5,_.name=`label:${s}`,_}const ja=1,Ic=.9,Jh=5,Ps=13,$a=8,BA=[{name:"100 level",sections:["100","101","102","103","104"],rows:28,rise:.15,spanDeg:108},{name:"200 level",sections:["200","201","202","203","204"],rows:22,rise:.42,spanDeg:116}];function ka(s){return s.traverse(e=>e.layers.set(ja)),s}function zA(){const s=document.createElement("canvas");s.width=512,s.height=288;const e=s.getContext("2d");if(e){const i=e.createLinearGradient(0,0,512,288);i.addColorStop(0,"#1b2a57"),i.addColorStop(.55,"#5a2a6e"),i.addColorStop(1,"#c2542d"),e.fillStyle=i,e.fillRect(0,0,512,288),e.globalAlpha=.18,e.fillStyle="#ffffff";for(let o=0;o<9;o+=1)e.fillRect(0,o*32,512,2);e.globalAlpha=.9,e.strokeStyle="#ffd9a8",e.lineWidth=6,e.beginPath(),e.arc(256,144,70,0,Math.PI*2),e.stroke()}const t=new O_(s);return t.colorSpace=Xn,t}function HA(s,e,t,i,o){const l=t*Math.PI/180,c=i*Math.PI/180,d=Math.max(4,Math.round((i-t)/2)),h=new wp(s,e,d,1,l-Math.PI/2,c-l);return h.rotateX(-Math.PI/2),h.translate(0,o,-$a),h}function Pv(s,e,t,i,o){const l=e*Math.PI/180,c=t*Math.PI/180,d=Math.max(4,Math.round((t-e)/2)),h=new ki(s,s,o,d,1,!0,l,c-l);return h.translate(0,i+o/2,-$a),h}function VA(s){const e=new Yn;e.name="venue";const t=[],i=Le=>(t.push(Le),Le),o=Le=>i(new tr({color:Le})),l=s.stageWidth,c=s.stageDepth,d=s.deckHeight,h=-d,f=new it(i(new Wt(l,Math.max(d,.05),c)),o(921361));f.position.set(0,-Math.max(d,.05)/2,-c/2),f.name="stage-deck",e.add(f);const g=new it(i(new Fs(l,c)),o(3026741));g.rotation.x=-Math.PI/2,g.position.set(0,.002,-c/2),e.add(g);for(const Le of[-1,1]){const We=new it(i(new Wt(Jh,Math.max(d,.05),c)),o(2039844));We.position.set(Le*(l/2+Jh/2),-Math.max(d,.05)/2,-c/2),e.add(We)}const m=new it(i(new Wt(l,.012,.06)),i(new Ho({color:14726730,toneMapped:!1})));m.position.set(0,.006,-.03),m.name="dse",e.add(m);const v=i(new tr({color:15855074})),_=i(new Wt(.5,.01,.05)),M=i(new Wt(.05,.01,.5));for(const Le of s.marks){const We=Ar(Le.point),vt=new it(_,v),At=new it(M,v);vt.position.set(We.x,.006,We.z),At.position.set(We.x,.006,We.z),e.add(vt,At);const Gt=ka(Lo(Le.id,{height:.55}));Gt.position.set(We.x,.5,We.z),e.add(Gt)}const w=l+Jh*2,y=new it(i(new Wt(w,Ps+d,.4)),o(1250328));y.position.set(0,(Ps-d)/2,-c-.2),e.add(y);for(const Le of[-1,1]){const We=new it(i(new Wt(.4,Ps+d,c)),o(1513500));We.position.set(Le*(w/2+.2),(Ps-d)/2,-c/2),e.add(We);const vt=new it(i(new Wt(1.2,Ps-1.5,.1)),o(987155));vt.position.set(Le*(l/2+.6),(Ps-1.5)/2,-1.2),e.add(vt)}const S=new it(i(new Wt(w,1.4,.6)),o(1710880));S.position.set(0,Ps-.7,.2),e.add(S);const C=Math.min(l*.55,14),L=new it(i(new Fs(C,C*9/16)),i(new Ho({map:i(zA()),toneMapped:!1})));L.position.set(0,2.8+C*9/32,-c+.25),e.add(L);const P=new it(i(new Wt(2.6,.6,2.4)),o(3948358));P.position.set(0,.3,-c*.8),e.add(P);const O=o(9080729),N=new it(i(new ki(.28,.28,.4,20)),O);N.rotation.x=Math.PI/2,N.position.set(0,.88,-c*.8+.4);const B=new it(i(new ki(.18,.18,.14,18)),O);B.position.set(.45,1.25,-c*.8+.2);const A=new it(i(new ki(.2,.2,.2,18)),O);A.position.set(-.45,1.3,-c*.8+.2),e.add(N,B,A);for(const Le of[-1,1]){const We=new it(i(new Wt(.8,1.6,.45)),o(2105895));We.position.set(Le*l*.3,.8,-c*.82),e.add(We)}const U=new it(i(new ki(.012,.012,1.5,6)),o(7040888));U.position.set(0,.75,-c*.06);const z=new it(i(new ki(.14,.14,.02,12)),o(3816772));z.position.set(0,.01,-c*.06),e.add(U,z);const k=s.pitDepth+1,X=Math.max(l+16,40),re=new it(i(new Fs(X,k+2)),o(2369067));if(re.rotation.x=-Math.PI/2,re.position.set(0,h+.001,(k+2)/2),e.add(re),s.pitDepth>2){const Le=new it(i(new Wt(l,1.1,.12)),o(2369324));Le.position.set(0,h+.55,1.6),e.add(Le)}const ue=ka(Lo("Pit (varies per show)",{height:.9}));ue.position.set(0,h+1.4,Math.max(2.5,s.pitDepth*.6)),e.add(ue);const G=[],Q=[],q=[];let K=$a+k,ae=h+.25;const le=1.6;BA.forEach((Le,We)=>{const vt=(Le.spanDeg-le*(Le.sections.length-1))/Le.sections.length,At=K;for(let Gt=0;Gt<Le.rows;Gt+=1){const j=K+Gt*Ic,It=j+Ic,ct=ae+Gt*Le.rise;Le.sections.forEach((Pt,Ie)=>{const Ut=-Le.spanDeg/2+Ie*(vt+le),D=Ut+vt;G.push(HA(j,It,Ut,D,ct)),Q.push(Pv(j,Ut,D,ct-Le.rise,Le.rise)),q.push(Pv(It-.12,Ut,D,ct,.42))})}Le.sections.forEach((Gt,j)=>{const It=-Le.spanDeg/2+j*(vt+le)+vt/2,ct=At+Le.rows*Ic/2,Pt=It*Math.PI/180,Ie=ka(Lo(Gt,{height:1.4}));Ie.position.set(ct*Math.sin(Pt),ae+Le.rows/2*Le.rise+1.6,-$a+ct*Math.cos(Pt)),e.add(Ie)}),K+=Le.rows*Ic+(We===0?2.4:0),ae+=Le.rows*Le.rise+(We===0?.9:0)});const I=new it(i(Zh(G)),o(3816773)),Z=new it(i(Zh(Q)),o(2961463)),ve=new it(i(Zh(q)),o(5909548));G.forEach(Le=>Le.dispose()),Q.forEach(Le=>Le.dispose()),q.forEach(Le=>Le.dispose()),I.name="bowl-treads",e.add(I,Z,ve);const Pe=Ar(s.camera),Fe=s.mountOrientation==="inverted",ie=Fe?Pe.y+.55:Pe.y-.5,_e=new Yn;_e.name="catwalk";const fe=30,Oe=new it(i(new Wt(fe,.08,.9)),o(6120301));Oe.position.set(Pe.x,ie,Pe.z+.6),_e.add(Oe);const qe=o(10134445);for(const Le of[.17,1.03]){const We=new it(i(new Wt(fe,.05,.05)),qe);We.position.set(Pe.x,ie+1.05,Pe.z+Le),_e.add(We);for(let vt=-fe/2;vt<=fe/2+1e-6;vt+=2.5){const At=new it(i(new Wt(.05,1.05,.05)),qe);At.position.set(Pe.x+vt,ie+.52,Pe.z+Le),_e.add(At)}}for(let Le=-fe/2;Le<=fe/2+1e-6;Le+=5){const We=new it(i(new Wt(.03,4.5,.03)),qe);We.position.set(Pe.x+Le,ie+3.3,Pe.z+.6),_e.add(We)}const nt=new it(i(new Wt(.12,Math.abs(ie-Pe.y),.12)),qe);nt.position.set(Pe.x,(ie+Pe.y)/2+(Fe?.2:-.2),Pe.z+.25),_e.add(nt),e.add(_e);const Ot=ka(Lo("Catwalk",{height:1}));Ot.position.set(Pe.x+fe/2-2,ie+2.2,Pe.z+.6),e.add(Ot);const ft=ka(Lo("DSE · stage origin",{height:.8}));ft.position.set(l/2+2.2,.8,.4),e.add(ft);const bt=K+$a;return{root:e,extent:bt,dispose(){e.traverse(Le=>{var We;if(Le.isMesh||Le.isSprite){const vt=Le.material;Le.name.startsWith("label:")&&((We=vt.map)==null||We.dispose(),vt.dispose())}}),t.forEach(Le=>Le.dispose())}}}const Dv=90;function GA(){const s=new Yn;s.name="view-cone";const e=new Float32Array(15),t=new bn;t.setAttribute("position",new li(e,3)),t.setIndex([0,1,2,0,2,3,0,3,4,0,4,1,1,2,3,1,3,4]);const i=new it(t,new Ho({color:5217791,transparent:!0,opacity:.13,side:Qi,depthWrite:!1,toneMapped:!1}));i.renderOrder=8;const o=new bn;o.setAttribute("position",new li(e,3)),o.setIndex([0,1,0,2,0,3,0,4,1,2,2,3,3,4,4,1]);const l=new oE(o,new U_({color:7911167,transparent:!0,opacity:.9,toneMapped:!1}));l.renderOrder=9,s.add(i,l);const c=[];return{root:s,corners:()=>c.map(d=>({...d})),apex:()=>({x:e[0],y:e[1],z:e[2]}),update(d){const h=[[-1,1],[1,1],[1,-1],[-1,-1]];e[0]=d.position.x,e[1]=d.position.y,e[2]=d.position.z,c.length=0,h.forEach(([g,m],v)=>{const _=oh(oh(d.forward,sc(d.right,g*d.tanH)),sc(d.up,m*d.tanV)),M=Math.hypot(_.x,_.y,_.z),w=sc(_,1/M);let y=Dv;w.y<-1e-4&&(y=Math.min(Dv,-d.position.y/w.y));const S=oh(d.position,sc(w,Math.max(.5,y)));c.push(S),e[(v+1)*3]=S.x,e[(v+1)*3+1]=S.y,e[(v+1)*3+2]=S.z});const f=t.getAttribute("position");f.needsUpdate=!0,o.getAttribute("position").needsUpdate=!0,t.computeBoundingSphere(),o.computeBoundingSphere()}}}class jA extends Error{}const Lv=[{overviewRatio:1.5,overviewEvery:1,monitorRatio:2},{overviewRatio:1,overviewEvery:1,monitorRatio:2},{overviewRatio:.75,overviewEvery:2,monitorRatio:2},{overviewRatio:.5,overviewEvery:3,monitorRatio:2},{overviewRatio:.5,overviewEvery:4,monitorRatio:1}],WA=26,XA=18,$A=55,YA=40,Nv=120;function Iv(s,e){try{const t=new _A({canvas:s,antialias:!0,powerPreference:"high-performance"});return t.outputColorSpace=Xn,t.toneMapping=hp,t.toneMappingExposure=e,t}catch(t){throw new jA(t instanceof Error?t.message:"WebGL could not start.")}}class qA{constructor(e,t,i){ge(this,"scene",new $M);ge(this,"monitor");ge(this,"overview");ge(this,"monitorCamera",new si(40,16/9,.25,900));ge(this,"overviewCamera",new si(45,1.6,.5,2500));ge(this,"controls");ge(this,"p240");ge(this,"performer");ge(this,"cone");ge(this,"cameraLabel",Lo("CAM 4 · P240",{height:1.1,alwaysVisible:!0,background:"rgba(158, 67, 43, 0.92)"}));ge(this,"venue",null);ge(this,"venueKey","");ge(this,"quality",0);ge(this,"frameCount",0);ge(this,"monitorFrames",0);ge(this,"overviewFrames",0);ge(this,"slowSince",null);ge(this,"fastSince",null);ge(this,"lastFrameTime",null);ge(this,"frameEma",16.7);ge(this,"recentIntervals",[]);ge(this,"intervalIndex",0);ge(this,"theme","light");ge(this,"lost",!1);ge(this,"diagnostics",{frames:0,monitorFrames:0,overviewFrames:0,quality:0,monitorForward:[0,0,-1],monitorPosition:[0,0,0],monitorVfovDeg:0,modelForward:[0,0,-1],modelPosition:[0,0,0],coneAxis:[0,0,-1],coneApex:[0,0,0]});ge(this,"scratch",new Y);ge(this,"cleanups",[]);this.monitorCanvas=e,this.overviewCanvas=t,this.callbacks=i,this.monitor=Iv(e,1.05);try{this.overview=Iv(t,1.5)}catch(d){throw this.monitor.dispose(),d}this.applyClearColors(),this.monitorCamera.layers.set(0),this.overviewCamera.layers.enable(ja),this.scene.add(new xE(16777215,.55)),this.scene.add(new mE(10465996,1709330,.75));const o=new vE(16770247,5.5,0,Math.PI/5,.55,0);o.position.set(0,22,24),o.target.position.set(0,1,-10),this.scene.add(o,o.target);const l=new Q0(11127039,1.3);l.position.set(0,18,-45),this.scene.add(l);const c=new Q0(16773340,.7);c.position.set(-25,30,40),this.scene.add(c),this.p240=UA(),this.p240.root.traverse(d=>d.layers.set(ja)),this.cone=GA(),this.cone.root.traverse(d=>d.layers.set(ja)),this.cameraLabel.layers.set(ja),this.performer=kA(),this.scene.add(this.p240.root,this.cone.root,this.cameraLabel,this.performer.root),this.controls=new SA(this.overviewCamera,t),this.controls.enableDamping=!0,this.controls.dampingFactor=.12,this.controls.maxPolarAngle=Math.PI*.49,this.controls.minDistance=4,this.controls.maxDistance=400;for(const[d,h]of[[e,"monitor"],[t,"overview"]]){const f=m=>{m.preventDefault(),this.lost=!0,this.callbacks.onContextLost(),d.dataset.context="lost"},g=()=>{d.dataset.context="ok",this.applyClearColors(),this.monitorCanvas.dataset.context!=="lost"&&this.overviewCanvas.dataset.context!=="lost"&&(this.lost=!1,this.callbacks.onContextRestored())};d.dataset.context="ok",d.dataset.view=h,d.addEventListener("webglcontextlost",f),d.addEventListener("webglcontextrestored",g),this.cleanups.push(()=>{d.removeEventListener("webglcontextlost",f),d.removeEventListener("webglcontextrestored",g)})}}setTheme(e){this.theme=e,this.applyClearColors()}applyClearColors(){this.monitor.setClearColor(new wt(461068)),this.overview.setClearColor(new wt(this.theme==="dark"?922652:14472391))}setGeometry(e){const t=JSON.stringify([e.stageWidth,e.stageDepth,e.deckHeight,e.pitDepth,e.camera,e.mountOrientation,e.marks.length]);if(t===this.venueKey)return;const i=this.venue===null;this.venue&&(this.scene.remove(this.venue.root),this.venue.dispose()),this.venue=VA(e),this.venueKey=t,this.scene.add(this.venue.root),i&&this.setOverviewView("house",e)}setOverviewView(e,t){var l;const i=Ar(t.camera),o=new Y(0,0,-t.stageDepth*.35);e==="top"?(this.overviewCamera.position.set(.01,Math.max(70,(((l=this.venue)==null?void 0:l.extent)??60)*1.4),-t.stageDepth*.2+.01),o.set(0,0,i.z*.3-t.stageDepth*.25)):e==="behind"?(this.overviewCamera.position.set(i.x+4,i.y+5,i.z+12),o.set(0,1,-t.stageDepth*.3)):this.overviewCamera.position.set(-38,32,i.z+26),this.controls.target.copy(o),this.controls.update()}resize(e,t,i){const o=t.clientWidth,l=t.clientHeight;if(o<2||l<2)return!1;const c=Math.min(window.devicePixelRatio||1,i),d=Math.max(1,Math.round(o*c)),h=Math.max(1,Math.round(l*c));return(t.width!==d||t.height!==h)&&(e.setPixelRatio(1),e.setSize(d,h,!1)),!0}trackPerformance(e){if(this.lastFrameTime!==null){const t=Math.min(250,e-this.lastFrameTime);if(this.frameEma+=(t-this.frameEma)*.08,this.recentIntervals.length<Nv?this.recentIntervals.push(t):(this.recentIntervals[this.intervalIndex]=t,this.intervalIndex=(this.intervalIndex+1)%Nv),this.recentIntervals.length<30){this.lastFrameTime=e;return}const i=Math.min(...this.recentIntervals),o=Math.max(WA,Math.min(i*1.6,$A)),l=Math.max(XA,Math.min(i*1.15,YA));this.frameEma>o?(this.fastSince=null,this.slowSince??(this.slowSince=e),e-this.slowSince>1500&&this.quality<Lv.length-1&&(this.quality+=1,this.slowSince=e,this.callbacks.onQualityChange(this.quality))):this.frameEma<l?(this.slowSince=null,this.fastSince??(this.fastSince=e),e-this.fastSince>6e3&&this.quality>0&&(this.quality-=1,this.fastSince=e,this.callbacks.onQualityChange(this.quality))):(this.slowSince=null,this.fastSince=null)}this.lastFrameTime=e}render(e,t,i){if(this.lost)return;this.trackPerformance(t),this.frameCount+=1;const o=Lv[this.quality],{frame:l}=e;NA(this.monitorCamera,l),this.p240.root.position.set(l.position.x,l.position.y,l.position.z),this.p240.setPose(l.headingDeg,l.tiltDeg,e.geometry.mountOrientation),this.cone.update(l),this.cameraLabel.position.set(l.position.x,l.position.y+(e.geometry.mountOrientation==="inverted"?-1.6:1.9),l.position.z),this.performer.update(e.performer),this.resize(this.monitor,this.monitorCanvas,o.monitorRatio)&&(this.monitor.render(this.scene,this.monitorCamera),this.monitorFrames+=1),i&&this.frameCount%o.overviewEvery===0&&this.resize(this.overview,this.overviewCanvas,o.overviewRatio)&&(this.overviewCamera.aspect=this.overviewCanvas.clientWidth/Math.max(1,this.overviewCanvas.clientHeight),this.overviewCamera.updateProjectionMatrix(),this.controls.update(),this.overview.render(this.scene,this.overviewCamera),this.overviewFrames+=1)}getDiagnostics(){const e=this.monitorCamera.getWorldDirection(this.scratch),t=[e.x,e.y,e.z],i=this.cone.corners(),o=this.cone.apex(),l=i.reduce((d,h)=>{const f=h.x-o.x,g=h.y-o.y,m=h.z-o.z,v=Math.hypot(f,g,m)||1;return[d[0]+f/v,d[1]+g/v,d[2]+m/v]},[0,0,0]),c=Math.hypot(...l)||1;return this.p240.root.getWorldPosition(this.scratch),this.diagnostics={frames:this.frameCount,monitorFrames:this.monitorFrames,overviewFrames:this.overviewFrames,quality:this.quality,monitorForward:t,monitorPosition:this.monitorCamera.position.toArray(),monitorVfovDeg:this.monitorCamera.fov,modelForward:FA(this.p240.tilt),modelPosition:[this.scratch.x,this.scratch.y,this.scratch.z],coneAxis:[l[0]/c,l[1]/c,l[2]/c],coneApex:[o.x,o.y,o.z]},this.diagnostics}get qualityLevel(){return this.quality}dispose(){var e;this.cleanups.forEach(t=>t()),this.controls.dispose(),(e=this.venue)==null||e.dispose(),this.monitor.dispose(),this.overview.dispose()}}const gi={onMouseDown:s=>s.preventDefault()};function Z_(){var s;(s=document.getElementById("sim-workspace"))==null||s.focus({preventScroll:!0})}function KA({state:s,theme:e,drawerOpen:t,drawerTab:i,showPanelButtons:o,onOpen:l,onHelp:c,onToggleTheme:d}){const h=s.unsettled.length>0,f=s.exercise;return E.jsxs("header",{className:"sim-bar",children:[E.jsxs("div",{className:"sim-title",children:[E.jsx("h1",{children:"Camera Simulator"}),E.jsx("p",{children:"Virtual BirdDog P240 · Camera 4 · catwalk position"})]}),E.jsxs("div",{className:"sim-flags",role:"group","aria-label":"Accuracy",children:[E.jsxs("button",{type:"button",className:`flag ${h?"flag-warn":"flag-ok"}`,onClick:g=>l("venue",g.currentTarget),title:h?`Not yet measured: ${s.unsettled.join(", ")}`:"All critical venue dimensions are measured or confirmed","data-testid":"flag-venue",children:[h?"Approximate venue":"Measured venue",h&&E.jsx("span",{className:"flag-count",children:s.unsettled.length})]}),E.jsx("button",{type:"button",className:`flag ${s.calibrated?"flag-ok":"flag-warn"}`,onClick:g=>l("camera",g.currentTarget),title:s.calibrated?"Camera behaviour calibrated":"Response, stopping and preset travel are training assumptions","data-testid":"flag-camera",children:s.calibrated?"Calibrated camera":"Uncalibrated camera"}),f&&f.progress.status==="running"&&E.jsx("button",{type:"button",className:"flag flag-live",onClick:g=>l("exercises",g.currentTarget),children:"Exercise running"})]}),E.jsxs("nav",{className:"sim-actions","aria-label":"Simulator panels",children:[o&&E.jsxs(E.Fragment,{children:[E.jsx("button",{type:"button",className:"tool-button","aria-pressed":t&&i==="exercises",onClick:g=>l("exercises",g.currentTarget),children:"Exercises"}),E.jsx("button",{type:"button",className:"tool-button","aria-pressed":t&&i!=="exercises",onClick:g=>l(i==="exercises"?"venue":i,g.currentTarget),children:"Settings"})]}),E.jsx("button",{type:"button",className:"tool-button",onClick:c,"aria-label":"Help and keyboard shortcuts",children:"Help"}),E.jsx("button",{...gi,type:"button",className:"tool-button theme-button","aria-pressed":e==="dark",onClick:d,children:"Dark mode"})]})]})}function ZA({input:s,commanded:e}){const t=He.useRef(null),i=He.useRef(null),o=He.useRef(null),l=(h,f)=>{const g=t.current,m=i.current;if(!g||!m)return;const v=g.clientWidth/2-m.clientWidth/2;m.style.transform=`translate(${(h*v).toFixed(1)}px, ${(-f*v).toFixed(1)}px)`},c=h=>{const f=t.current,g=i.current;if(!f||!g)return;const m=f.getBoundingClientRect(),v=m.width/2-g.clientWidth/2;let _=(h.clientX-(m.left+m.width/2))/v,M=-(h.clientY-(m.top+m.height/2))/v;const w=Math.hypot(_,M);w>1&&(_/=w,M/=w),l(_,M),s.set("joystick",{pan:_,tilt:M},ri(h.nativeEvent))},d=h=>{var f;h&&h.pointerId!==o.current||(o.current=null,(f=t.current)==null||f.classList.remove("is-active"),l(0,0),s.release("joystick",h?ri(h.nativeEvent):cn()))};return He.useEffect(()=>()=>s.release("joystick",cn()),[s]),He.useEffect(()=>{const h=()=>{o.current!==null&&d()};return window.addEventListener("blur",h),()=>window.removeEventListener("blur",h)}),He.useEffect(()=>{o.current===null&&l(e.pan,e.tilt)},[e.pan,e.tilt]),E.jsxs("div",{className:"joystick",children:[E.jsxs("div",{ref:t,className:"joystick-pad",role:"application","aria-roledescription":"joystick","aria-label":"Pan and tilt joystick","aria-describedby":"joystick-help",tabIndex:0,onPointerDown:h=>{o.current!==null||h.pointerType==="mouse"&&h.button!==0||(o.current=h.pointerId,h.currentTarget.setPointerCapture(h.pointerId),h.currentTarget.classList.add("is-active"),h.currentTarget.focus({preventScroll:!0}),h.preventDefault(),c(h))},onPointerMove:h=>{h.pointerId===o.current&&c(h)},onPointerUp:d,onPointerCancel:d,onLostPointerCapture:d,children:[E.jsx("span",{className:"joystick-ring","aria-hidden":"true"}),E.jsx("span",{className:"joystick-cross","aria-hidden":"true"}),E.jsx("div",{ref:i,className:"joystick-knob","aria-hidden":"true"})]}),E.jsxs("p",{id:"joystick-help",className:"control-label",children:["Pan / tilt",E.jsx("span",{className:"control-hint",children:"Drag, or arrow keys · Shift fast · Alt fine"})]})]})}function JA({presets:s,armed:e,onArm:t,onPress:i,onHome:o,onStop:l}){const c=new Map(s.map(d=>[d.slot,d]));return E.jsxs("div",{className:"preset-pad",children:[E.jsx("div",{className:"preset-head",children:E.jsxs("span",{className:"control-label",id:"preset-label",children:["Presets",E.jsx("span",{className:"control-hint",children:e?"Choose a number to store":"1–9 recall · Shift+number store"})]})}),E.jsx("div",{className:`preset-grid ${e?"is-armed":""}`,role:"group","aria-labelledby":"preset-label",children:Array.from({length:Ya},(d,h)=>h+1).map(d=>{const h=c.get(d),f=(h==null?void 0:h.name)||(h?"Stored":"Empty"),g=e?`Store current shot in preset ${d}`:h?`Recall preset ${d}, ${f}`:`Preset ${d} is empty`;return He.createElement("button",{...gi,type:"button",key:d,className:`preset-key ${h?"has-preset":""}`,"aria-label":g,onClick:()=>i(d)},E.jsx("span",{className:"preset-number",children:d}),E.jsx("span",{className:"preset-name",children:f}))})}),E.jsxs("div",{className:"preset-actions",children:[E.jsx("button",{...gi,type:"button",className:`action-button ${e?"is-armed":""}`,"aria-pressed":e,onClick:()=>t(!e),children:e?"Cancel store":"Store"}),E.jsx("button",{...gi,type:"button",className:"action-button",onClick:o,title:"Camera home: pan 0°, tilt 0°, full wide. Not the FMP safe-wide preset.",children:"Home"}),E.jsx("button",{...gi,type:"button",className:"action-button action-stop",onClick:l,children:"Stop"})]})]})}const QA=[{axis:"pan",label:"Pan"},{axis:"tilt",label:"Tilt"},{axis:"zoom",label:"Zoom"},{axis:"preset",label:"Preset"}];function eC(s,e,t){return s==="pan"?`${mu(t,e).toFixed(1)}°/s max`:s==="tilt"?`${op(t,e).toFixed(1)}°/s max`:s==="zoom"?`${(1/nu(t,e)).toFixed(1)} s wide→tele`:`${ap(t,e).toFixed(0)}°/s travel`}function tC({speeds:s,profile:e,onChange:t}){return E.jsxs("fieldset",{className:"speed-controls",children:[E.jsxs("legend",{className:"control-label",children:["Speed ",E.jsx("span",{className:"control-hint",children:"[ ] pan/tilt · Shift+[ ] zoom · , . preset"})]}),QA.map(({axis:i,label:o})=>{const l=s[i];return E.jsxs("div",{className:"speed-row",children:[E.jsx("span",{className:"speed-name",id:`speed-${i}`,children:o}),E.jsx("button",{...gi,type:"button",className:"step-button","aria-label":`${o} speed down`,disabled:l<=Us,onClick:()=>t(i,l-1),children:"−"}),E.jsxs("output",{className:"speed-value","aria-labelledby":`speed-${i}`,"aria-live":"off",children:[l,E.jsxs("span",{className:"speed-of",children:["/",rr]})]}),E.jsx("button",{...gi,type:"button",className:"step-button","aria-label":`${o} speed up`,disabled:l>=rr,onClick:()=>t(i,l+1),children:"+"}),E.jsx("span",{className:"speed-detail",children:eC(i,l,e)})]},i)})]})}const Uv=.6;function nC({input:s,lens:e,commandedZoom:t}){const i=He.useRef(null),o=He.useRef(null),l=He.useRef(null),c=He.useRef(null),d=_=>{const M=i.current,w=o.current;if(!M||!w)return;const y=M.clientHeight/2-w.clientHeight/2;w.style.transform=`translateY(${(-_*y).toFixed(1)}px)`},h=_=>{const M=i.current,w=o.current;if(!M||!w)return;const y=M.getBoundingClientRect(),S=y.height/2-w.clientHeight/2,C=Math.max(-1,Math.min(1,-(_.clientY-(y.top+y.height/2))/S));d(C),s.set("zoomRocker",{zoom:C},ri(_.nativeEvent))},f=_=>{var M;_&&_.pointerId!==l.current||(l.current=null,(M=i.current)==null||M.classList.remove("is-active"),d(0),s.release("zoomRocker",_?ri(_.nativeEvent):cn()))},g=(_,M)=>{c.current=_,s.set("zoomButton",{zoom:_==="tele"?Uv:-Uv},M)},m=_=>{c.current!==null&&(c.current=null,s.release("zoomButton",_))};He.useEffect(()=>()=>{s.release("zoomRocker",cn()),s.release("zoomButton",cn())},[s]),He.useEffect(()=>{l.current===null&&d(t)},[t]),He.useEffect(()=>{const _=()=>{l.current!==null&&f(),m(cn())};return window.addEventListener("blur",_),()=>window.removeEventListener("blur",_)});const v=_=>({...gi,onPointerDown:M=>{M.pointerType==="mouse"&&M.button!==0||(M.currentTarget.setPointerCapture(M.pointerId),g(_,ri(M.nativeEvent)))},onPointerUp:M=>m(ri(M.nativeEvent)),onPointerCancel:M=>m(ri(M.nativeEvent)),onLostPointerCapture:M=>m(ri(M.nativeEvent)),onKeyDown:M=>{(M.key===" "||M.key==="Enter")&&!M.repeat&&(M.preventDefault(),g(_,ri(M.nativeEvent)))},onKeyUp:M=>{(M.key===" "||M.key==="Enter")&&m(ri(M.nativeEvent))},onBlur:()=>m(cn()),onContextMenu:M=>M.preventDefault()});return E.jsxs("div",{className:"zoom-control",children:[E.jsxs("div",{className:"zoom-row",children:[E.jsxs("div",{className:"zoom-buttons",children:[E.jsx("button",{type:"button",className:"hold-button","aria-label":"Zoom in (tele), hold",...v("tele"),children:"T"}),E.jsx("div",{ref:i,className:"zoom-track",role:"application","aria-roledescription":"zoom rocker","aria-label":"Zoom rocker. Drag up for tele, down for wide.",tabIndex:-1,onPointerDown:_=>{l.current!==null||_.pointerType==="mouse"&&_.button!==0||(l.current=_.pointerId,_.currentTarget.setPointerCapture(_.pointerId),_.currentTarget.classList.add("is-active"),_.preventDefault(),h(_))},onPointerMove:_=>{_.pointerId===l.current&&h(_)},onPointerUp:f,onPointerCancel:f,onLostPointerCapture:f,children:E.jsx("div",{ref:o,className:"zoom-knob","aria-hidden":"true"})}),E.jsx("button",{type:"button",className:"hold-button","aria-label":"Zoom out (wide), hold",...v("wide"),children:"W"})]}),E.jsx("div",{className:"zoom-meter",role:"meter","aria-label":"Lens position","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round(e.lens*100),"aria-valuetext":`${e.zoomRatio.toFixed(1)} times, ${e.hfovDeg.toFixed(1)} degrees wide`,children:E.jsx("span",{className:"zoom-meter-fill",style:{height:`${(e.lens*100).toFixed(1)}%`}})})]}),E.jsxs("p",{className:"control-label",children:["Zoom ",e.zoomRatio.toFixed(1),"×",E.jsx("span",{className:"control-hint",children:"Hold T/W, drag, or E / Q"})]})]})}function iC({store:s,input:e,state:t}){const i=o_(s),{session:o}=t.project,l=t.announcement;return E.jsxs("section",{className:"panel controls-panel","aria-labelledby":"controls-title",children:[E.jsx("h2",{id:"controls-title",className:"visually-hidden",children:"Camera controls"}),E.jsxs("div",{className:"controls-grid",children:[E.jsx(ZA,{input:e,commanded:i.snapshot.input}),E.jsx(nC,{input:e,lens:i.lens,commandedZoom:i.snapshot.input.zoom}),E.jsx(tC,{speeds:o.speeds,profile:t.project.camera,onChange:(c,d)=>s.setSpeed(c,d)}),E.jsx(JA,{presets:o.presets,armed:t.storeArmed,onArm:c=>s.armStore(c),onPress:c=>t.storeArmed?s.storePreset(c,cn()):s.recallPreset(c,cn()),onHome:()=>s.home(cn()),onStop:()=>{e.releaseAll(cn()),s.stop(cn())}})]}),E.jsx("p",{className:`status-line ${l?`tone-${l.tone}`:""}`,role:"status","aria-live":"polite","data-testid":"status-line",children:(l==null?void 0:l.text)??"Ready. Drag the joystick, use the arrow keys, or press ? for shortcuts."})]})}const rC=[["Arrow keys or W A S D","Pan and tilt while held (about half speed)"],["Shift + move","Full deflection"],["Alt / Option + move","Fine moves"],["E or +  /  Q or −","Zoom tele / wide while held"],["1 – 9","Recall preset"],["Shift + 1 – 9","Store the current shot (press twice to replace)"],["H","Camera home: pan 0°, tilt 0°, full wide"],["Space or Esc","Stop all movement, including a recall"],["[  ]","Pan and tilt speed down / up"],["Shift + [  ]","Zoom speed down / up"],[",  .","Preset speed down / up"],["F","Expand or restore the monitor"],["?","This help"]];function sC({open:s,onClose:e}){const t=He.useRef(null);return He.useEffect(()=>{const i=t.current;i&&(s&&!i.open&&i.showModal(),!s&&i.open&&i.close())},[s]),E.jsxs("dialog",{ref:t,className:"help-dialog","aria-labelledby":"help-title",onClose:e,onCancel:e,children:[E.jsxs("div",{className:"help-head",children:[E.jsx("h2",{id:"help-title",children:"Operating the simulator"}),E.jsx("button",{type:"button",className:"tool-button",onClick:e,autoFocus:!0,children:"Close"})]}),E.jsx("p",{children:"The on-screen joystick, keyboard and touch all drive one simulated BirdDog P240. Deflection sets speed, so holding a move keeps the camera moving. Letting go, switching windows or cancelling a touch stops the commanded move. Any manual input interrupts a preset recall at once."}),E.jsxs("table",{className:"spec-table shortcuts",children:[E.jsx("caption",{className:"visually-hidden",children:"Keyboard shortcuts"}),E.jsx("tbody",{children:rC.map(([i,o])=>E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:E.jsx("kbd",{children:i})}),E.jsx("td",{children:o})]},i))})]}),E.jsx("h3",{children:"Reading the picture"}),E.jsxs("ul",{children:[E.jsx("li",{children:"Stage directions are performer-facing. Stage right is house left, which is the left of the Camera 4 picture."}),E.jsx("li",{children:"HOME is a camera function, not the FMP safe-wide show preset. Build the safe wide as a preset."}),E.jsx("li",{children:"The venue is approximate until its critical dimensions are measured, and camera behaviour is uncalibrated. Both flags stay visible."}),E.jsx("li",{children:"Nothing here connects to a real camera or controller."})]})]})}function J_({status:s,note:e}){return s==="lost"?E.jsxs("div",{className:"graphics-fallback",role:"alert",children:[E.jsx("strong",{children:"Picture paused: the browser reset its graphics."}),E.jsx("p",{children:"This is not a live view. Camera motion was stopped. The picture returns when the browser restores graphics; reload the page if it does not."})]}):E.jsxs("div",{className:"graphics-fallback",role:"alert",children:[E.jsx("strong",{children:"3D view unavailable."}),E.jsx("p",{children:"This browser could not start WebGL, which the simulator needs to draw the camera picture and venue view. Turn on hardware acceleration or use a current version of Chrome, Edge, Firefox or Safari. The controls and readouts still work, but there is no picture."}),e&&E.jsxs("p",{className:"fallback-detail",children:["Details: ",e]})]})}const oC=[{key:"safeArea",label:"Safe area"},{key:"centre",label:"Centre"},{key:"thirds",label:"Thirds"}];function aC({state:s,store:e,canvasRef:t,overlayRef:i,expanded:o,onToggleExpanded:l,onGuides:c}){const{snapshot:d,lens:h}=o_(e),{pose:f,recall:g,atLimit:m,speeds:v}=d,_=s.project.session.preferences.guides,M=s.unsettled.length>0,w=[m.pan&&`Pan ${m.pan==="max"?"right":"left"} limit`,m.tilt&&`Tilt ${m.tilt==="max"?"up":"down"} limit`].filter(Boolean).join(" · ");return E.jsxs("section",{className:"panel monitor-panel","aria-labelledby":"monitor-title",children:[E.jsxs("div",{className:"panel-head",children:[E.jsx("h2",{id:"monitor-title",children:"Camera monitor"}),E.jsxs("div",{className:"panel-tools",role:"group","aria-label":"Monitor guides",children:[oC.map(({key:y,label:S})=>E.jsx("button",{...gi,type:"button",className:"tool-button","aria-pressed":_[y],onClick:()=>c({[y]:!_[y]}),children:S},y)),E.jsx("button",{...gi,type:"button",className:"tool-button","aria-pressed":o,onClick:l,title:"F",children:o?"Restore layout":"Expand monitor"})]})]}),E.jsx("div",{className:"monitor-stage",children:E.jsxs("div",{className:"monitor-frame","data-render":s.renderStatus,onPointerDown:Z_,children:[E.jsx("canvas",{ref:t,className:"monitor-canvas",role:"img","aria-label":"Live picture from the simulated P240","data-testid":"monitor-canvas"}),E.jsx("svg",{ref:i,className:"monitor-overlay",viewBox:"0 0 1600 900",preserveAspectRatio:"none","aria-hidden":"true"}),E.jsxs("div",{className:"monitor-osd","aria-hidden":"true",children:[E.jsx("span",{className:"osd-chip",children:"SIM · CAM 4 · P240"}),E.jsxs("span",{className:"osd-chip osd-warn",children:[M?"APPROX VENUE":"MEASURED VENUE"," · ",s.calibrated?"CALIBRATED":"UNCALIBRATED"]})]}),g&&E.jsxs("div",{className:"monitor-recall","aria-hidden":"true",children:[E.jsx("span",{children:g.target.kind==="home"?"HOME":`PRESET ${g.target.slot}`}),E.jsx("span",{className:"recall-bar",children:E.jsx("span",{style:{width:`${(g.progress*100).toFixed(0)}%`}})})]}),s.renderStatus!=="ok"&&s.renderStatus!=="starting"&&E.jsx(J_,{status:s.renderStatus,note:s.renderNote}),s.hidden&&E.jsx("div",{className:"monitor-paused",children:"Paused while the page is hidden"})]})}),E.jsxs("dl",{className:"readout","aria-label":"Camera position",children:[E.jsxs("div",{children:[E.jsx("dt",{children:"Pan"}),E.jsxs("dd",{"data-testid":"readout-pan",children:[eu(f.pan,1),"°"]})]}),E.jsxs("div",{children:[E.jsx("dt",{children:"Tilt"}),E.jsxs("dd",{"data-testid":"readout-tilt",children:[eu(f.tilt,1),"°"]})]}),E.jsxs("div",{children:[E.jsx("dt",{children:"Zoom"}),E.jsxs("dd",{"data-testid":"readout-zoom",children:[h.zoomRatio.toFixed(1),"× ",E.jsxs("small",{children:[h.focalMm.toFixed(1)," mm"]})]})]}),E.jsxs("div",{children:[E.jsx("dt",{children:"HFOV"}),E.jsxs("dd",{"data-testid":"readout-hfov",children:[h.hfovDeg.toFixed(1),"°"]})]}),E.jsxs("div",{children:[E.jsx("dt",{children:"Speed"}),E.jsxs("dd",{children:["P",v.pan," T",v.tilt," Z",v.zoom," R",v.preset]})]}),E.jsxs("div",{className:"readout-state",children:[E.jsx("dt",{children:"State"}),E.jsx("dd",{"data-testid":"readout-state",children:d.paused?"Paused":g?`Recalling ${Math.round(g.progress*100)}%`:d.moving?"Moving":w||"Still"})]})]})]})}function Mu(s,e){return s.length===0||s.some(t=>t.path.startsWith(e))?s:[...s,{path:e,message:`Not applied: ${s[0].message}`}]}function ko({status:s}){return E.jsx("span",{className:`evidence evidence-${s}`,title:ey[s],children:lp[s]})}function Bi({label:s,value:e,digits:t,unit:i,step:o,help:l,error:c,onCommit:d}){const h=He.useId(),f=e.toFixed(t),[g,m]=He.useState(f);He.useEffect(()=>{c||m(f)},[f,c]);const v=()=>{const _=g.trim(),M=Number(_);if(_===""||!Number.isFinite(M)){m(f);return}M.toFixed(t)!==f||c?d(M):m(f)};return E.jsxs("div",{className:`field ${c?"has-error":""}`,children:[E.jsx("label",{htmlFor:h,children:s}),E.jsxs("div",{className:"field-input",children:[E.jsx("input",{id:h,type:"number",inputMode:"decimal",step:o??Math.pow(10,-t),value:g,"aria-invalid":!!c,"aria-describedby":c?`${h}-error`:l?`${h}-help`:void 0,onChange:_=>m(_.target.value),onBlur:v,onKeyDown:_=>{_.key==="Enter"&&(_.preventDefault(),v())}}),i&&E.jsx("span",{className:"field-unit",children:i})]}),c?E.jsx("p",{className:"field-error",id:`${h}-error`,role:"alert",children:c}):l&&E.jsx("p",{className:"field-help",id:`${h}-help`,children:l})]})}function Os({label:s,value:e,options:t,onChange:i}){const o=He.useId();return E.jsxs("div",{className:"field",children:[E.jsx("label",{htmlFor:o,children:s}),E.jsx("select",{id:o,value:e,onChange:l=>i(l.target.value),children:t.map(l=>E.jsx("option",{value:l.value,children:l.label},l.value))})]})}function Jc({label:s,value:e,onCommit:t}){const i=He.useId(),[o,l]=He.useState(e);return He.useEffect(()=>l(e),[e]),E.jsxs("div",{className:"field",children:[E.jsx("label",{htmlFor:i,children:s}),E.jsx("textarea",{id:i,rows:2,maxLength:2e3,value:o,onChange:c=>l(c.target.value),onBlur:()=>{o!==e&&t(o)}})]})}function Qc({legend:s,value:e,options:t,onChange:i}){const o=He.useId();return E.jsxs("fieldset",{className:"radio-group",children:[E.jsx("legend",{children:s}),t.map(l=>E.jsxs("label",{className:"radio-option",children:[E.jsx("input",{type:"radio",name:o,value:l.value,checked:e===l.value,onChange:()=>i(l.value)}),E.jsxs("span",{children:[l.label,l.hint&&E.jsx("small",{children:l.hint})]})]},l.value))]})}const lC={smoothstep:"Ease in and out (cubic)",smootherstep:"Gentle ease (quintic)",linear:"Constant speed"},cC=["published","measured","confirmed","estimated","demo"];function uC({store:s,state:e}){const t=e.project.camera,i=t.published,[o,l]=He.useState([]),c=He.useId(),d=(f,g)=>{const m=structuredClone(t);f(m);const v=s.updateCamera(m);l(v.ok?[]:g?Mu(v.issues,g):v.issues)},h=f=>{var g;return(g=o.find(m=>m.path===f))==null?void 0:g.message};return E.jsxs("div",{className:"settings",children:[E.jsxs("div",{className:`notice ${e.calibrated?"":"notice-warn"}`,children:[E.jsx("strong",{children:e.calibrated?"Calibrated":"Uncalibrated camera behaviour."})," ","Published P240 figures set the travel, speeds and field of view. Response curve, stopping time, zoom speed and preset travel are training assumptions until they are compared with the installed Camera 4. Changing them stops the camera."]}),E.jsxs("section",{"aria-labelledby":"published-title",children:[E.jsxs("h3",{id:"published-title",children:["Published specification ",E.jsx(ko,{status:"published"})]}),E.jsx("table",{className:"spec-table",children:E.jsxs("tbody",{children:[E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Pan travel"}),E.jsxs("td",{children:["±",i.panMaxDeg,"°"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Tilt travel"}),E.jsxs("td",{children:["+",i.tiltMaxDeg,"° to ",i.tiltMinDeg,"°"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Manual speed (zoom adaptive)"}),E.jsxs("td",{children:["Pan ",i.minSpeedDegS,"–",i.panMaxSpeedDegS,"°/s · Tilt ",i.minSpeedDegS,"–",i.tiltMaxSpeedDegS,"°/s"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Preset speed"}),E.jsxs("td",{children:["Up to ",i.presetMaxSpeedDegS,"°/s"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Horizontal field of view"}),E.jsxs("td",{children:[i.hfovWideDeg,"° wide to ",i.hfovTeleDeg,"° tele"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Lens"}),E.jsxs("td",{children:[i.focalWideMm,"–",i.focalTeleMm," mm, about ",(i.focalTeleMm/i.focalWideMm).toFixed(0),"× optical"]})]}),E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:"Presets"}),E.jsxs("td",{children:[i.presetCount," on the camera (9 in this trainer)"]})]})]})}),E.jsxs("p",{className:"field-help",children:["Source:"," ",E.jsx("a",{href:i.source.url,rel:"noopener noreferrer",target:"_blank",children:i.source.label})," ","(checked ",i.source.retrieved,"). Opens in a new tab."]})]}),E.jsxs("fieldset",{className:"dimension",children:[E.jsxs("legend",{children:["Operating limits ",E.jsx(ko,{status:t.limits.status})]}),E.jsxs("div",{className:"field-pair",children:[E.jsx(Bi,{label:"Pan left",value:t.limits.panMinDeg,digits:1,unit:"°",error:h("camera.limits.panMinDeg"),onCommit:f=>d(g=>void(g.limits.panMinDeg=f),"camera.limits.panMinDeg")}),E.jsx(Bi,{label:"Pan right",value:t.limits.panMaxDeg,digits:1,unit:"°",error:h("camera.limits.panMaxDeg"),onCommit:f=>d(g=>void(g.limits.panMaxDeg=f),"camera.limits.panMaxDeg")}),E.jsx(Bi,{label:"Tilt down",value:t.limits.tiltMinDeg,digits:1,unit:"°",error:h("camera.limits.tiltMinDeg"),onCommit:f=>d(g=>void(g.limits.tiltMinDeg=f),"camera.limits.tiltMinDeg")}),E.jsx(Bi,{label:"Tilt up",value:t.limits.tiltMaxDeg,digits:1,unit:"°",error:h("camera.limits.tiltMaxDeg"),onCommit:f=>d(g=>void(g.limits.tiltMaxDeg=f),"camera.limits.tiltMaxDeg")})]}),E.jsx("p",{className:"field-help",children:"Limits stay inside the published travel. An inverted mount mirrors the tilt range."}),E.jsx(Os,{label:"Evidence",value:t.limits.status,options:cC.map(f=>({value:f,label:lp[f]})),onChange:f=>d(g=>void(g.limits.status=f))}),E.jsx(Jc,{label:"Source note",value:t.limits.note,onCommit:f=>d(g=>void(g.limits.note=f))})]}),E.jsxs("fieldset",{className:"dimension",children:[E.jsxs("legend",{children:["Response and travel ",E.jsx(ko,{status:t.behaviour.status})]}),$v.map(f=>E.jsx(Bi,{label:f.label,value:t.behaviour[f.key],digits:f.step<.1?2:f.step<1?1:0,step:f.step,unit:f.unit,help:`${f.help} Range ${f.min}–${f.max}.`,error:h(`camera.behaviour.${f.key}`),onCommit:g=>d(m=>void(m.behaviour[f.key]=g),`camera.behaviour.${f.key}`)},f.key)),E.jsx(Os,{label:"Preset easing",value:t.behaviour.presetEasing,options:Xv.map(f=>({value:f,label:lC[f]})),onChange:f=>d(g=>void(g.behaviour.presetEasing=f))}),E.jsxs("div",{className:"field field-check",children:[E.jsx("input",{id:c,type:"checkbox",checked:t.behaviour.teleConvert,onChange:f=>d(g=>void(g.behaviour.teleConvert=f.target.checked))}),E.jsxs("label",{htmlFor:c,children:["Tele Convert",E.jsx("small",{children:"Modelled as a fixed 2× crop across the zoom range, reaching about 40× in HD. Not verified on Camera 4."})]})]})]}),E.jsxs("section",{"aria-labelledby":"speed-table-title",children:[E.jsx("h3",{id:"speed-table-title",children:"Speed levels in use"}),E.jsx("div",{className:"table-scroll",children:E.jsxs("table",{className:"spec-table speed-table",children:[E.jsx("thead",{children:E.jsxs("tr",{children:[E.jsx("th",{scope:"col",children:"Level"}),E.jsx("th",{scope:"col",children:"Pan °/s"}),E.jsx("th",{scope:"col",children:"Tilt °/s"}),E.jsx("th",{scope:"col",children:"Zoom travel s"}),E.jsx("th",{scope:"col",children:"Preset °/s"})]})}),E.jsx("tbody",{children:Array.from({length:rr},(f,g)=>g+1).map(f=>E.jsxs("tr",{children:[E.jsx("th",{scope:"row",children:f}),E.jsx("td",{children:mu(t,f).toFixed(1)}),E.jsx("td",{children:op(t,f).toFixed(1)}),E.jsx("td",{children:(1/nu(t,f)).toFixed(1)}),E.jsx("td",{children:ap(t,f).toFixed(0)})]},f))})]})}),E.jsx("p",{className:"field-help",children:"The 1–8 scale is the trainer's teaching scale, not the SuperJoy's hardware range. Pan and tilt speeds fall with zoom when zoom-adaptive sensitivity is on."})]}),E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>{const f=s.resetCamera();l(f.ok?[]:f.issues)},children:"Reset camera profile"})]})}const Qh={wide:"Establish a wide shot",follow:"Follow a performer",recall:"Save and recall two shots"},dC={wide:"The camera starts from home. Frame the whole performance area: both downstage corners and a standing performer's head height at the upstage marks, inside the safe area, and hold it steady.",follow:"The performer walks a fixed tour of the stage. Keep their chest inside the target box at a usable size for the whole walk.",recall:"Store two clearly different shots in two preset slots, move away from both, then recall each one. Both must land within tolerance."},Fv={wide:{safeAreaPct:{label:"Safe area",unit:"% of frame",digits:0},minStageFillPct:{label:"Minimum stage fill",unit:"% of width",digits:0},holdS:{label:"Hold steady for",unit:"s",digits:1}},follow:{targetWidthPct:{label:"Target box width",unit:"% of frame",digits:0},targetHeightPct:{label:"Target box height",unit:"% of frame",digits:0},minHeightPct:{label:"Performer at least",unit:"% of height",digits:0},maxHeightPct:{label:"Performer at most",unit:"% of height",digits:0},passPct:{label:"Pass when on target",unit:"% of walk",digits:0},countdownS:{label:"Countdown",unit:"s",digits:0}},recall:{panTiltToleranceDeg:{label:"Pan/tilt tolerance",unit:"°",digits:3},lensTolerance:{label:"Lens tolerance",unit:"of travel",digits:4},distinctDeg:{label:"Distinct shots: move",unit:"°",digits:1},distinctFovRatio:{label:"…or change field of view",unit:"×",digits:2},moveAwayDeg:{label:"Move away by",unit:"°",digits:1}}};function hC({store:s,state:e}){const[t,i]=He.useState([]),o=e.exercise,l=e.project.session.exerciseSettings,c=e.project.session.exerciseResults,d=(h,f,g)=>{const m=structuredClone(l);m[h][f]=g;const v=s.updateExerciseSettings(m);i(v.ok?[]:Mu(v.issues,`session.exerciseSettings.${h}.${f}`))};return E.jsxs("div",{className:"settings exercises",children:[E.jsx("p",{className:"settings-intro",children:"Three guided exercises. Thresholds are training settings for practice, not professional camera-operation standards. Each exercise can be reset and replayed."}),Zv.map(h=>{var v;const f=(o==null?void 0:o.id)===h,g=f?o.progress:null,m=[...c].reverse().find(_=>_.exercise===h);return E.jsxs("article",{className:`exercise-card ${f?"is-active":""}`,"aria-labelledby":`exercise-${h}`,children:[E.jsxs("header",{children:[E.jsx("h3",{id:`exercise-${h}`,children:Qh[h]}),g&&E.jsx("span",{className:`status-pill status-${g.status}`,children:g.status==="complete"?(v=g.result)!=null&&v.passed?"Complete":"Finished":"Running"})]}),E.jsx("p",{className:"exercise-brief",children:dC[h]}),E.jsxs("div",{className:"exercise-actions",children:[E.jsx("button",{type:"button",className:"primary-button",onClick:()=>s.startExercise(h,cn()),children:f?(g==null?void 0:g.status)==="complete"?"Replay":"Restart":"Start"}),f&&E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>s.resetExercise(),children:"Reset"})]}),g&&E.jsxs("div",{className:"exercise-progress","data-testid":`exercise-${h}-progress`,"data-status":g.status,children:[E.jsx("p",{className:"exercise-headline",children:g.headline}),g.note&&E.jsx("p",{className:"exercise-note",children:g.note}),g.checks.length>0&&E.jsx("ul",{className:"checklist",children:g.checks.map(_=>E.jsxs("li",{className:_.done?"is-done":"",children:[E.jsx("span",{"aria-hidden":"true",children:_.done?"✓":"○"})," ",_.label,E.jsx("span",{className:"visually-hidden",children:_.done?" (done)":" (not yet)"})]},_.label))}),g.figures.length>0&&E.jsx("dl",{className:"figures",children:g.figures.map(_=>E.jsxs("div",{children:[E.jsx("dt",{children:_.label}),E.jsx("dd",{children:_.value})]},_.label))}),g.result&&E.jsx("p",{className:`exercise-result ${g.result.passed?"is-pass":"is-miss"}`,children:g.result.summary})]}),!f&&m&&E.jsxs("p",{className:"exercise-last",children:["Last: ",m.passed?"passed":"not yet"," · ",new Date(m.completedAt).toLocaleString()," · ",m.summary]})]},h)}),E.jsxs("details",{className:"training-settings",children:[E.jsx("summary",{children:"Training settings"}),t.length>0&&E.jsx("div",{className:"notice notice-error",role:"alert",children:t.map(h=>E.jsxs("p",{children:[E.jsx("code",{children:h.path}),": ",h.message]},h.path))}),Object.keys(Fv).map(h=>E.jsxs("fieldset",{className:"dimension",children:[E.jsx("legend",{children:Qh[h]}),Object.entries(Fv[h]).map(([f,g])=>{var _;const m=KS[h][f],v=l[h][f];return E.jsx(Bi,{label:g.label,value:v,digits:g.digits,unit:g.unit,help:`Range ${m[0]}–${m[1]}.`,error:(_=t.find(M=>M.path===`session.exerciseSettings.${h}.${f}`))==null?void 0:_.message,onCommit:M=>d(h,f,M)},f)})]},h))]}),E.jsxs("section",{"aria-labelledby":"history-title",className:"history",children:[E.jsx("h3",{id:"history-title",children:"Results"}),c.length===0?E.jsx("p",{className:"field-help",children:"No exercises completed yet."}):E.jsxs(E.Fragment,{children:[E.jsx("ol",{className:"history-list",reversed:!0,children:[...c].reverse().slice(0,12).map(h=>E.jsxs("li",{children:[E.jsx("strong",{children:Qh[h.exercise]})," · ",h.passed?"passed":"not yet"," · ",new Date(h.completedAt).toLocaleString(),E.jsx("span",{children:h.summary})]},h.id))}),E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>s.clearResults(),children:"Clear results"})]})]})]})}function fC({store:s,state:e}){var f,g;const t=e.project.session.performer,i=e.geometry.marks,[o,l]=He.useState([]),c=((f=e.exercise)==null?void 0:f.id)==="follow"&&e.exercise.progress.status==="running",d=m=>{const v=s.updatePerformer(m),_=Object.keys(m)[0];l(v.ok?[]:_?Mu(v.issues,`session.performer.${_}`):v.issues)},h=m=>{var v;return(v=o.find(_=>_.path===`session.performer.${m}`))==null?void 0:v.message};return E.jsxs("div",{className:"settings",children:[E.jsx("p",{className:"settings-intro",children:"One human-scale performer on the stage. Marks are spike positions laid out across the deck; stage right is the performer's right."}),c&&E.jsx("div",{className:"notice notice-warn",children:"The follow exercise is driving the performer. These settings unlock when it finishes or is reset."}),E.jsxs("fieldset",{className:"plain-fieldset",disabled:c,children:[E.jsx(Qc,{legend:"Performer",value:t.mode,options:[{value:"mark",label:"Stand on a mark"},{value:"path",label:"Walk a repeatable path"}],onChange:m=>d({mode:m})}),E.jsx(Os,{label:"Mark",value:t.markId,options:qv.map(m=>{var v;return{value:m,label:`${m} · ${((v=i.find(_=>_.id===m))==null?void 0:v.label)??m}`}}),onChange:m=>d({markId:m})}),E.jsx(Os,{label:"Path",value:t.pathId,options:Kv.map(m=>({value:m,label:qS[m]})),onChange:m=>d({pathId:m})}),E.jsx(Bi,{label:"Walking speed",value:t.walkSpeed,digits:1,step:.1,unit:"m/s",help:"1.2 m/s is an easy walk.",error:h("walkSpeed"),onCommit:m=>d({walkSpeed:m})}),E.jsx(Bi,{label:"Height",value:t.height,digits:2,step:.01,unit:"m",help:`${pu(t.height).toFixed(1)} ft.`,error:h("height"),onCommit:m=>d({height:m})}),E.jsx(Bi,{label:"Pause at each point",value:t.pauseS,digits:1,step:.5,unit:"s",error:h("pauseS"),onCommit:m=>d({pauseS:m})}),E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>s.restartPerformer(),disabled:t.mode!=="path",children:"Restart the path from the beginning"})]}),o.some(m=>m.path==="session.performer")&&E.jsx("p",{className:"field-error",role:"alert",children:(g=o.find(m=>m.path==="session.performer"))==null?void 0:g.message})]})}const pC="https://housevideo.app",Q_=()=>typeof document<"u"&&document.documentElement.dataset.build==="offline";function Uc(s){return Q_()?`${pC}${s}`:s}const Fc={hub:"/fmp/",ptzGuide:"/fmp/ptz/",superJoy:"/fmp/ptz/SuperJoy-G1-Interactive-Guide.html",p240Model:"/fmp/models/p240.html"},mC="fmp-camera-simulator-offline.html";function gC({store:s,state:e}){const t=He.useId(),i=He.useRef(null),[o,l]=He.useState([]),[c,d]=He.useState(""),[h,f]=He.useState(!1),{presets:g}=e.project.session,m=e.project.camera,v=async _=>{if(!_)return;if(l([]),d(""),i.current&&(i.current.value=""),_.size>i_){d(`${_.name} is larger than 2 MB, which is too large for a simulator session. Nothing changed.`);return}let M;try{M=await _.text()}catch{d("The file could not be read.");return}const w=s.importText(M,cn());w.ok?d(`Imported ${_.name}.`):(l(w.issues),d(`${_.name} was not imported. Nothing in the open session changed.`))};return E.jsxs("div",{className:"settings",children:[E.jsxs("section",{"aria-labelledby":"presets-title",children:[E.jsx("h3",{id:"presets-title",children:"Presets"}),g.length===0?E.jsx("p",{className:"field-help",children:"No presets stored. Press Store, then a number, to keep the current shot."}):E.jsx("ul",{className:"preset-list",children:g.map(_=>{const M=tu(m,_.lens);return E.jsxs("li",{children:[E.jsx("span",{className:"preset-slot",children:_.slot}),E.jsxs("label",{className:"visually-hidden",htmlFor:`preset-name-${_.slot}`,children:["Name for preset ",_.slot]}),E.jsx("input",{id:`preset-name-${_.slot}`,className:"preset-name-input",defaultValue:_.name,maxLength:40,placeholder:"Name",onBlur:w=>{w.target.value!==_.name&&s.renamePreset(_.slot,w.target.value)}},`${_.savedAt}|${_.name}`),E.jsxs("span",{className:"preset-pose",children:[eu(_.pan),"° / ",eu(_.tilt),"° · ",M.zoomRatio.toFixed(1),"×"]}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>s.recallPreset(_.slot,cn()),children:"Recall"}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>s.deletePreset(_.slot),"aria-label":`Delete preset ${_.slot}`,children:"Delete"})]},_.slot)})})]}),E.jsxs("section",{"aria-labelledby":"save-title",children:[E.jsx("h3",{id:"save-title",children:"Save and share"}),E.jsx("p",{className:`storage-status ${e.storage.state==="ok"?"":"is-warn"}`,role:"status",children:e.storage.state==="ok"?e.storage.savedAt?`Saved in this browser at ${new Date(e.storage.savedAt).toLocaleTimeString()}.`:"Saved in this browser as you work.":`${e.storage.reason} The session still works; export it to keep it.`}),E.jsxs("div",{className:"button-row",children:[E.jsx("button",{type:"button",className:"primary-button",onClick:()=>zv(s.exportText(),Hv()),children:"Export session (.json)"}),E.jsx("button",{type:"button",className:"secondary-button","aria-describedby":t,onClick:()=>{var _;return(_=i.current)==null?void 0:_.click()},children:"Import session…"}),E.jsx("input",{ref:i,className:"visually-hidden",type:"file",tabIndex:-1,"aria-hidden":"true",accept:"application/json,.json",onChange:_=>{var M;return void v((M=_.target.files)==null?void 0:M[0])}})]}),E.jsx("p",{className:"field-help",id:t,children:"Exports carry the venue profile with its evidence notes, the camera profile, presets, performer and results. Imports are checked in full before anything changes."}),c&&E.jsxs("div",{className:`notice ${o.length?"notice-error":"notice-ok"}`,role:o.length?"alert":"status",children:[E.jsx("p",{children:c}),o.length>0&&E.jsxs("ul",{children:[o.slice(0,8).map(_=>E.jsxs("li",{children:[E.jsx("code",{children:_.path}),": ",_.message]},_.path+_.message)),o.length>8&&E.jsxs("li",{children:["and ",o.length-8," more"]})]})]})]}),!Q_()&&E.jsxs("section",{"aria-labelledby":"offline-title",children:[E.jsx("h3",{id:"offline-title",children:"Offline copy"}),E.jsx("p",{className:"field-help",children:"A single HTML file with the whole simulator. It runs from disk with networking off; its saved data stays separate from this page."}),E.jsx("a",{className:"secondary-button",href:mC,download:!0,children:"Download offline copy"})]}),E.jsxs("section",{"aria-labelledby":"refs-title",children:[E.jsx("h3",{id:"refs-title",children:"FMP references"}),E.jsxs("ul",{className:"link-list",children:[E.jsx("li",{children:E.jsx("a",{href:Uc(Fc.ptzGuide),children:"Catwalk PTZ operating guide"})}),E.jsx("li",{children:E.jsx("a",{href:Uc(Fc.superJoy),children:"3D SuperJoy G1 guide"})}),E.jsx("li",{children:E.jsx("a",{href:Uc(Fc.p240Model),children:"BirdDog P240 3D model"})}),E.jsx("li",{children:E.jsx("a",{href:Uc(Fc.hub),children:"FMP Video Operations"})})]})]}),E.jsxs("section",{"aria-labelledby":"reset-title",children:[E.jsx("h3",{id:"reset-title",children:"Reset"}),h?E.jsxs("div",{className:"button-row",children:[E.jsx("button",{type:"button",className:"danger-button",onClick:()=>{s.resetSession(cn()),f(!1)},children:"Clear presets and results"}),E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>f(!1),children:"Keep them"})]}):E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>f(!0),children:"Reset session…"}),E.jsx("p",{className:"field-help",children:"Resetting keeps the venue and camera profiles. Export first if you want the presets back later."})]})]})}const ef=Hc.map(s=>({value:s,label:lp[s]}));function vC({store:s,state:e}){const t=e.project.venue,i=e.project.session.preferences.unit,o=e.geometry,[l,c]=He.useState([]),d=(m,v)=>{const _=structuredClone(t);m(_);const M=s.updateVenue(_);c(M.ok?[]:v?Mu(M.issues,v):M.issues)},h=m=>{var v;return(v=l.find(_=>_.path.startsWith(m)))==null?void 0:v.message},f=i==="ft"?1:2,g=l.filter(m=>!qa.some(v=>m.path.startsWith(`venue.dimensions.${v.key}`))&&!m.path.startsWith("venue.mount.panZeroBearingDeg"));return E.jsxs("div",{className:"settings",children:[E.jsxs("p",{className:"settings-intro",children:["Every dimension keeps its value, its evidence status and a source note. The simulator works in metres and shows ",i==="ft"?"feet":"metres",". Anything not measured or confirmed keeps the ",E.jsx("strong",{children:"Approximate venue"})," flag on."]}),E.jsx(Qc,{legend:"Units",value:i,options:[{value:"ft",label:"Feet"},{value:"m",label:"Metres"}],onChange:m=>s.setUnit(m)}),g.length>0&&E.jsxs("div",{className:"notice notice-error",role:"alert",children:[E.jsx("strong",{children:"Change rejected."})," The last valid venue stays in use.",E.jsx("ul",{children:g.map(m=>E.jsxs("li",{children:[E.jsx("code",{children:m.path}),": ",m.message]},m.path))})]}),E.jsxs("div",{className:"derived","aria-label":"Derived camera geometry",children:[E.jsxs("div",{children:[E.jsx("span",{children:"Horizontal distance"}),E.jsx("strong",{children:r0(o.horizontalDistance,i)})]}),E.jsxs("div",{children:[E.jsx("span",{children:"Line of sight"}),E.jsx("strong",{children:r0(o.lineOfSight,i)})]}),E.jsxs("div",{children:[E.jsx("span",{children:"Looks down to the DSE"}),E.jsxs("strong",{children:[o.depressionToOriginDeg.toFixed(1),"°"]})]})]}),qa.map(m=>{const v=t.dimensions[m.key],_=`venue.dimensions.${m.key}`;return E.jsxs("fieldset",{className:"dimension",children:[E.jsxs("legend",{children:[m.label," ",E.jsx(ko,{status:v.status}),m.critical&&E.jsx("span",{className:"critical-tag",children:"Critical"})]}),E.jsx(Bi,{label:"Value",value:Gv(v.value,i),digits:f,unit:i,step:i==="ft"?.5:.1,help:m.help,error:h(_),onCommit:M=>d(w=>{w.dimensions[m.key].value=jS(M,i)},`${_}.value`)}),E.jsx(Os,{label:"Evidence",value:v.status,options:ef,onChange:M=>d(w=>{w.dimensions[m.key].status=M})}),E.jsx(Jc,{label:"Source note",value:v.note,onCommit:M=>d(w=>{w.dimensions[m.key].note=M})})]},m.key)}),E.jsxs("fieldset",{className:"dimension",children:[E.jsxs("legend",{children:["Distance basis ",E.jsx(ko,{status:t.distanceBasis.status}),E.jsx("span",{className:"critical-tag",children:"Critical"})]}),E.jsx(Qc,{legend:"The camera-to-DSE figure is",value:t.distanceBasis.value,options:[{value:"horizontal",label:"Horizontal distance",hint:"Measured level, as on a plan"},{value:"line-of-sight",label:"Line of sight",hint:"Straight from the lens; height is removed to place the camera"}],onChange:m=>d(v=>{v.distanceBasis.value=m})}),E.jsx(Os,{label:"Evidence",value:t.distanceBasis.status,options:ef,onChange:m=>d(v=>{v.distanceBasis.status=m})}),E.jsx(Jc,{label:"Source note",value:t.distanceBasis.note,onCommit:m=>d(v=>{v.distanceBasis.note=m})})]}),E.jsxs("fieldset",{className:"dimension",children:[E.jsxs("legend",{children:["Camera mounting ",E.jsx(ko,{status:t.mount.status}),E.jsx("span",{className:"critical-tag",children:"Critical"})]}),E.jsx(Qc,{legend:"Orientation",value:t.mount.orientation,options:[{value:"upright",label:"Upright",hint:"Tilt travel +90° to −30°"},{value:"inverted",label:"Inverted with E-Flip",hint:"Tilt travel +30° to −90°"}],onChange:m=>d(v=>{v.mount.orientation=m})}),E.jsx(Bi,{label:"Pan 0° heading",value:t.mount.panZeroBearingDeg,digits:1,unit:"°",help:"Where pan 0° points, clockwise from the stage centreline.",error:h("venue.mount.panZeroBearingDeg"),onCommit:m=>d(v=>{v.mount.panZeroBearingDeg=m},"venue.mount.panZeroBearingDeg")}),E.jsx(Os,{label:"Evidence",value:t.mount.status,options:ef,onChange:m=>d(v=>{v.mount.status=m})}),E.jsx(Jc,{label:"Source note",value:t.mount.note,onCommit:m=>d(v=>{v.mount.note=m})})]}),E.jsxs("section",{className:"reference-block","aria-labelledby":"cable-route-title",children:[E.jsx("h3",{id:"cable-route-title",children:"Cable route (reference only)"}),E.jsx("p",{children:t.reference.cableRoute})]}),E.jsx("p",{className:"settings-foot",children:"Stage directions are performer-facing: stage right is the performer's right, which is house left and the left side of the Camera 4 picture."}),E.jsx("button",{type:"button",className:"secondary-button",onClick:()=>{const m=s.resetVenue();c(m.ok?[]:m.issues)},children:"Reset venue to the FMP estimates"})]})}const Ov=[{id:"exercises",label:"Exercises"},{id:"venue",label:"Venue"},{id:"camera",label:"Camera"},{id:"performer",label:"Performer"},{id:"session",label:"Session"}];function _C({store:s,state:e,open:t,docked:i,tab:o,tabs:l,onTab:c,onClose:d}){var v;const h=He.useRef(null),f=He.useRef(null),g=Ov.filter(_=>!l||l.includes(_.id));He.useEffect(()=>{var _;t&&!i&&((_=f.current)==null||_.focus({preventScroll:!0}))},[t,i]);const m=(_,M)=>{var S,C;let w=M;if(_.key==="ArrowRight")w=(M+1)%g.length;else if(_.key==="ArrowLeft")w=(M-1+g.length)%g.length;else if(_.key==="Home")w=0;else if(_.key==="End")w=g.length-1;else return;_.preventDefault(),c(g[w].id);const y=(S=h.current)==null?void 0:S.querySelectorAll('[role="tab"]');(C=y==null?void 0:y[w])==null||C.focus()};return E.jsxs("aside",{ref:h,className:"side-panel","data-open":t,"data-docked":i,"aria-labelledby":"side-panel-title",hidden:!t,onKeyDown:_=>{_.key==="Escape"&&!i&&(_.preventDefault(),d())},children:[E.jsxs("div",{className:"side-head",children:[E.jsx("h2",{id:"side-panel-title",ref:f,tabIndex:-1,children:(v=Ov.find(_=>_.id===o))==null?void 0:v.label}),!i&&E.jsx("button",{type:"button",className:"tool-button",onClick:d,children:"Close"})]}),E.jsx("div",{className:"side-tabs",role:"tablist","aria-label":"Simulator settings",children:g.map((_,M)=>E.jsx("button",{...gi,type:"button",role:"tab",id:`tab-${_.id}`,"aria-selected":o===_.id,"aria-controls":`tabpanel-${_.id}`,tabIndex:o===_.id?0:-1,onClick:()=>c(_.id),onKeyDown:w=>m(w,M),children:_.label},_.id))}),E.jsxs("div",{className:"side-body",role:"tabpanel",id:`tabpanel-${o}`,"aria-labelledby":`tab-${o}`,children:[o==="exercises"&&E.jsx(hC,{store:s,state:e}),o==="venue"&&E.jsx(vC,{store:s,state:e}),o==="camera"&&E.jsx(uC,{store:s,state:e}),o==="performer"&&E.jsx(fC,{store:s,state:e}),o==="session"&&E.jsx(gC,{store:s,state:e})]})]})}const xC=[{view:"house",label:"House"},{view:"top",label:"Top"},{view:"behind",label:"Behind camera"}];function SC({state:s,canvasRef:e,shown:t,quality:i,onToggle:o,onView:l}){return E.jsxs("section",{className:"panel venue-panel","aria-labelledby":"venue-title","data-shown":t,children:[E.jsxs("div",{className:"panel-head",children:[E.jsx("h2",{id:"venue-title",children:"Venue view"}),t&&i>0&&E.jsx("span",{className:"quality-chip",title:"The venue view is drawn with less detail on this device so the camera controls stay responsive.",children:"Reduced detail"}),E.jsxs("div",{className:"panel-tools",children:[t&&xC.map(({view:c,label:d})=>E.jsx("button",{...gi,type:"button",className:"tool-button",onClick:()=>l(c),children:d},c)),E.jsx("button",{...gi,type:"button",className:"tool-button","aria-expanded":t,"aria-controls":"venue-stage",onClick:o,children:t?"Collapse":"Show venue view"})]})]}),E.jsxs("div",{className:"venue-stage",id:"venue-stage",hidden:!t,children:[E.jsx("canvas",{ref:e,onPointerDown:Z_,className:"venue-canvas",role:"img","aria-label":"Venue overview showing the stage, pit, seating bowl, catwalk, Camera 4 and its viewing cone","data-testid":"venue-canvas"}),E.jsx("p",{className:"venue-hint",children:"Drag to orbit · scroll or pinch to zoom · orbiting never moves the camera"}),E.jsxs("ul",{className:"venue-legend","aria-label":"Legend",children:[E.jsxs("li",{children:[E.jsx("span",{className:"swatch swatch-cone","aria-hidden":"true"})," What Camera 4 sees"]}),E.jsxs("li",{children:[E.jsx("span",{className:"swatch swatch-cam","aria-hidden":"true"})," P240, drawn 3× size"]}),E.jsxs("li",{children:[E.jsx("span",{className:"swatch swatch-schematic","aria-hidden":"true"})," Bowl, house and backline are schematic"]})]}),s.renderStatus!=="ok"&&s.renderStatus!=="starting"&&E.jsx(J_,{status:s.renderStatus,note:s.renderNote})]})]})}const yC=[{id:"operate",label:"Operate"},{id:"venue",label:"Venue"},{id:"exercises",label:"Exercises"},{id:"settings",label:"Settings"}],MC=["venue","camera","performer","session"],kv=s=>s==="desktop"||s==="ultrawide";function EC(){const[s]=He.useState(()=>{const I=new By(dy());return{store:I,input:new GS(I)}}),{store:e,input:t}=s,i=py(e),{theme:o,toggle:l}=Hy(),c=my(),d=c==="phone",h=c==="ultrawide",[f,g]=He.useState(()=>kv(c)),[m,v]=He.useState(!1),[_,M]=He.useState({open:!1,tab:"exercises"}),[w,y]=He.useState("operate"),[S,C]=He.useState("venue"),[L,P]=He.useState(!1),[O,N]=He.useState(0),B=He.useRef(null),A=He.useRef(null),U=He.useRef(null),z=He.useRef(null),k=He.useRef(null),X=He.useRef(o);X.current=o;const re=He.useRef(c);He.useEffect(()=>{re.current!==c&&(re.current=c,g(kv(c)),c!=="phone"&&y("operate"))},[c]),He.useEffect(()=>{const I=B.current,Z=A.current;let ve=null;if(I&&Z)try{ve=new qA(I,Z,{onContextLost:()=>e.setRenderStatus("lost"),onContextRestored:()=>e.setRenderStatus("ok"),onQualityChange:N}),ve.setGeometry(e.getState().geometry),ve.setTheme(X.current),e.setRenderStatus("ok")}catch(ie){ve=null,e.setRenderStatus("unavailable",ie instanceof Error?ie.message:"")}z.current=ve;const Pe=U.current?new qy(U.current):null,Fe=new fy({store:e,input:t,renderer:ve,overlay:Pe,overviewVisible:()=>{var ie;return(((ie=A.current)==null?void 0:ie.clientWidth)??0)>1}});return Fe.start(),()=>{Fe.stop(),ve==null||ve.dispose(),z.current=null}},[e,t]),He.useEffect(()=>{var I;(I=z.current)==null||I.setGeometry(i.geometry)},[i.geometry]),He.useEffect(()=>{var I;(I=z.current)==null||I.setTheme(o)},[o]);const ue=He.useCallback(()=>v(I=>!I),[]),G=He.useRef({toggleExpanded:ue,openHelp:()=>P(!0)});G.current={toggleExpanded:ue,openHelp:()=>P(!0)},He.useEffect(()=>$y(e,t,{toggleExpanded:()=>G.current.toggleExpanded(),openHelp:()=>G.current.openHelp()}),[e,t]),He.useEffect(()=>{if(!new URLSearchParams(window.location.search).has("diagnostics"))return;const I=()=>(e.advanceTo(Math.max(cn(),e.wall)),e.getTelemetry()),Z={snapshot:()=>I().snapshot,frame:()=>{const{frame:ve}=I();return{forward:ve.forward,position:ve.position,hfovDeg:ve.hfovDeg}},render:()=>{var ve;return((ve=z.current)==null?void 0:ve.getDiagnostics())??null},state:()=>{const ve=e.getState();return{renderStatus:ve.renderStatus,storage:ve.storage,unsettled:ve.unsettled,calibrated:ve.calibrated,exercise:ve.exercise?{id:ve.exercise.id,status:ve.exercise.progress.status,result:ve.exercise.progress.result,checks:ve.exercise.progress.checks,note:ve.exercise.progress.note}:null,presets:ve.project.session.presets,geometry:{camera:ve.geometry.camera,stageWidth:ve.geometry.stageWidth,stageDepth:ve.geometry.stageDepth},hidden:ve.hidden}}};return window.__fmpCameraSim=Z,()=>{delete window.__fmpCameraSim}},[e]);const Q=(I,Z)=>{if(k.current=Z,d){I==="exercises"?y("exercises"):(C(I),y("settings"));return}M(ve=>ve.open&&ve.tab===I&&!h?{open:!1,tab:I}:{open:!0,tab:I})},q=()=>{M(I=>({...I,open:!1})),window.setTimeout(()=>{var I;return(I=k.current)==null?void 0:I.focus()},0)},K=d?w==="exercises"||w==="settings":h||_.open,ae=d?w==="exercises"?"exercises":S:_.tab,le=d?w==="exercises"?["exercises"]:MC:void 0;return E.jsxs("div",{className:"sim-app","data-layout":c,"data-expanded":m,"data-venue":f?"shown":"collapsed","data-panel":K?"open":"closed","data-mobile-tab":w,children:[E.jsx(KA,{state:i,theme:o,drawerOpen:K,drawerTab:ae,showPanelButtons:!d,onOpen:Q,onHelp:()=>P(!0),onToggleTheme:l}),i.storageNotice&&E.jsxs("div",{className:"banner banner-warn",role:"alert",children:[E.jsx("p",{children:i.storageNotice}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>e.dismissStorageNotice(),children:"Dismiss"})]}),i.storage.state==="unavailable"&&E.jsxs("div",{className:"banner banner-warn",role:"status",children:[E.jsxs("p",{children:[i.storage.reason," The session still works. Export it to keep presets and results."]}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>zv(e.exportText(),Hv()),children:"Export session"})]}),i.storageConflict&&E.jsxs("div",{className:"banner banner-warn",role:"alert",children:[E.jsx("p",{children:"Another tab saved a different copy of this session. Autosave is paused here until you choose which copy to keep."}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>e.useSavedCopy(cn()),children:"Load the other copy"}),E.jsx("button",{type:"button",className:"tool-button",onClick:()=>e.keepThisCopy(),children:"Keep this tab's copy"})]}),E.jsxs("div",{className:"sim-workspace",children:[E.jsx(aC,{state:i,store:e,canvasRef:B,overlayRef:U,expanded:m,onToggleExpanded:ue,onGuides:I=>e.setGuides(I)}),E.jsx(SC,{state:i,canvasRef:A,shown:d?w==="venue":f&&!m,quality:O,onToggle:()=>{m&&v(!1),g(I=>!I)},onView:I=>{var Z;return(Z=z.current)==null?void 0:Z.setOverviewView(I,i.geometry)}}),E.jsx(iC,{store:e,input:t,state:i}),E.jsx(_C,{store:e,state:i,open:K,docked:h||d,tab:ae,tabs:le,onTab:I=>d?C(I):M({open:!0,tab:I}),onClose:q})]}),d&&E.jsx("nav",{className:"mobile-rail","aria-label":"Simulator sections",children:yC.map(I=>E.jsx("button",{type:"button","aria-current":w===I.id?"page":void 0,onClick:()=>{t.releaseAll(cn()),y(I.id)},children:I.label},I.id))}),E.jsx(sC,{open:L,onClose:()=>P(!1)})]})}const Bv=document.getElementById("root");Bv&&VS.createRoot(Bv).render(E.jsx(He.StrictMode,{children:E.jsx(EC,{})}));
