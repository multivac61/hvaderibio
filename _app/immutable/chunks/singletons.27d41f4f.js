import{w as u}from"./index.973812ff.js";var _;const v=((_=globalThis.__sveltekit_13awx4l)==null?void 0:_.base)??"";var g;const k=((g=globalThis.__sveltekit_13awx4l)==null?void 0:g.assets)??v,w="1708851887665",R="sveltekit:snapshot",T="sveltekit:scroll",x="sveltekit:index",f={tap:1,hover:2,viewport:3,eager:4,off:-1};function y(e){let t=e.baseURI;if(!t){const n=e.getElementsByTagName("base");t=n.length?n[0].href:e.URL}return t}function I(){return{x:pageXOffset,y:pageYOffset}}function c(e,t){return e.getAttribute(`data-sveltekit-${t}`)}const d={...f,"":f.hover};function h(e){let t=e.assignedSlot??e.parentNode;return(t==null?void 0:t.nodeType)===11&&(t=t.host),t}function S(e,t){for(;e&&e!==t;){if(e.nodeName.toUpperCase()==="A"&&e.hasAttribute("href"))return e;e=h(e)}}function O(e,t){let n;try{n=new URL(e instanceof SVGAElement?e.href.baseVal:e.href,document.baseURI)}catch{}const o=e instanceof SVGAElement?e.target.baseVal:e.target,l=!n||!!o||E(n,t)||(e.getAttribute("rel")||"").split(/\s+/).includes("external"),r=(n==null?void 0:n.origin)===location.origin&&e.hasAttribute("download");return{url:n,external:l,target:o,download:r}}function U(e){let t=null,n=null,o=null,l=null,r=null,a=null,s=e;for(;s&&s!==document.documentElement;)o===null&&(o=c(s,"preload-code")),l===null&&(l=c(s,"preload-data")),t===null&&(t=c(s,"keepfocus")),n===null&&(n=c(s,"noscroll")),r===null&&(r=c(s,"reload")),a===null&&(a=c(s,"replacestate")),s=h(s);function i(b){switch(b){case"":case"true":return!0;case"off":case"false":return!1;default:return null}}return{preload_code:d[o??"off"],preload_data:d[l??"off"],keep_focus:i(t),noscroll:i(n),reload:i(r),replace_state:i(a)}}function p(e){const t=u(e);let n=!0;function o(){n=!0,t.update(a=>a)}function l(a){n=!1,t.set(a)}function r(a){let s;return t.subscribe(i=>{(s===void 0||n&&i!==s)&&a(s=i)})}return{notify:o,set:l,subscribe:r}}function m(){const{set:e,subscribe:t}=u(!1);let n;async function o(){clearTimeout(n);try{const l=await fetch(`${k}/_app/version.json`,{headers:{pragma:"no-cache","cache-control":"no-cache"}});if(!l.ok)return!1;const a=(await l.json()).version!==w;return a&&(e(!0),clearTimeout(n)),a}catch{return!1}}return{subscribe:t,check:o}}function E(e,t){return e.origin!==location.origin||!e.pathname.startsWith(t)}function L(e){e.client}const N={url:p({}),page:p({}),navigating:u(null),updated:m()};export{x as I,f as P,T as S,R as a,O as b,U as c,N as d,v as e,S as f,y as g,L as h,E as i,I as s};
