import{y as b,s as T,V as I,A as j,E as x}from"./scheduler.e0665e3f.js";const f=[];function O(e,t){return{subscribe:p(e,t).subscribe}}function p(e,t=b){let n;const r=new Set;function o(s){if(T(e,s)&&(e=s,n)){const i=!f.length;for(const l of r)l[1](),f.push(l,e);if(i){for(let l=0;l<f.length;l+=2)f[l][0](f[l+1]);f.length=0}}}function c(s){o(s(e))}function a(s,i=b){const l=[s,i];return r.add(l),r.size===1&&(n=t(o,c)||b),s(e),()=>{r.delete(l),r.size===0&&n&&(n(),n=null)}}return{set:o,update:c,subscribe:a}}function q(e,t,n){const r=!Array.isArray(e),o=r?[e]:e;if(!o.every(Boolean))throw new Error("derived() expects stores as input, got a falsy value");const c=t.length<2;return O(n,(a,s)=>{let i=!1;const l=[];let _=0,g=b;const v=()=>{if(_)return;g();const u=t(r?l[0]:l,a,s);c?a(u):g=x(u)?u:b},R=o.map((u,h)=>I(u,S=>{l[h]=S,_&=~(1<<h),i&&v()},()=>{_|=1<<h}));return i=!0,v(),function(){j(R),g(),i=!1}})}function K(e){return{subscribe:e.subscribe.bind(e)}}var A;const U=((A=globalThis.__sveltekit_ajonjl)==null?void 0:A.base)??"";var E;const L=((E=globalThis.__sveltekit_ajonjl)==null?void 0:E.assets)??U,N="1694743904047",$="sveltekit:snapshot",z="sveltekit:scroll",B="sveltekit:index",y={tap:1,hover:2,viewport:3,eager:4,off:-1};function C(e){let t=e.baseURI;if(!t){const n=e.getElementsByTagName("base");t=n.length?n[0].href:e.URL}return t}function D(){return{x:pageXOffset,y:pageYOffset}}function d(e,t){return e.getAttribute(`data-sveltekit-${t}`)}const k={...y,"":y.hover};function m(e){let t=e.assignedSlot??e.parentNode;return(t==null?void 0:t.nodeType)===11&&(t=t.host),t}function G(e,t){for(;e&&e!==t;){if(e.nodeName.toUpperCase()==="A"&&e.hasAttribute("href"))return e;e=m(e)}}function X(e,t){let n;try{n=new URL(e instanceof SVGAElement?e.href.baseVal:e.href,document.baseURI)}catch{}const r=e instanceof SVGAElement?e.target.baseVal:e.target,o=!n||!!r||P(n,t)||(e.getAttribute("rel")||"").split(/\s+/).includes("external"),c=(n==null?void 0:n.origin)===location.origin&&e.hasAttribute("download");return{url:n,external:o,target:r,download:c}}function H(e){let t=null,n=null,r=null,o=null,c=null,a=null,s=e;for(;s&&s!==document.documentElement;)r===null&&(r=d(s,"preload-code")),o===null&&(o=d(s,"preload-data")),t===null&&(t=d(s,"keepfocus")),n===null&&(n=d(s,"noscroll")),c===null&&(c=d(s,"reload")),a===null&&(a=d(s,"replacestate")),s=m(s);function i(l){switch(l){case"":case"true":return!0;case"off":case"false":return!1;default:return null}}return{preload_code:k[r??"off"],preload_data:k[o??"off"],keep_focus:i(t),noscroll:i(n),reload:i(c),replace_state:i(a)}}function w(e){const t=p(e);let n=!0;function r(){n=!0,t.update(a=>a)}function o(a){n=!1,t.set(a)}function c(a){let s;return t.subscribe(i=>{(s===void 0||n&&i!==s)&&a(s=i)})}return{notify:r,set:o,subscribe:c}}function V(){const{set:e,subscribe:t}=p(!1);let n;async function r(){clearTimeout(n);try{const o=await fetch(`${L}/_app/version.json`,{headers:{pragma:"no-cache","cache-control":"no-cache"}});if(!o.ok)return!1;const a=(await o.json()).version!==N;return a&&(e(!0),clearTimeout(n)),a}catch{return!1}}return{subscribe:t,check:r}}function P(e,t){return e.origin!==location.origin||!e.pathname.startsWith(t)}function W(e){e.client}const F={url:w({}),page:w({}),navigating:p(null),updated:V()};export{B as I,y as P,z as S,$ as a,X as b,H as c,F as d,U as e,G as f,C as g,W as h,P as i,q as j,K as k,O as r,D as s,p as w};
