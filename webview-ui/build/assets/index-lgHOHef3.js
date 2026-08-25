import{aZ as zs,R as js}from"./index.js";const de=(function(){if(typeof globalThis<"u")return globalThis;if(typeof global<"u")return global;if(typeof self<"u")return self;if(typeof window<"u")return window;try{return new Function("return this")()}catch{return{}}})();de.trustedTypes===void 0&&(de.trustedTypes={createPolicy:(i,e)=>e});const Xi={configurable:!1,enumerable:!1,writable:!1};de.FAST===void 0&&Reflect.defineProperty(de,"FAST",Object.assign({value:Object.create(null)},Xi));const Je=de.FAST;if(Je.getById===void 0){const i=Object.create(null);Reflect.defineProperty(Je,"getById",Object.assign({value(e,t){let s=i[e];return s===void 0&&(s=t?i[e]=t():null),s}},Xi))}const ve=Object.freeze([]);function Yi(){const i=new WeakMap;return function(e){let t=i.get(e);if(t===void 0){let s=Reflect.getPrototypeOf(e);for(;t===void 0&&s!==null;)t=i.get(s),s=Reflect.getPrototypeOf(s);t=t===void 0?[]:t.slice(0),i.set(e,t)}return t}}const At=de.FAST.getById(1,()=>{const i=[],e=[];function t(){if(e.length)throw e.shift()}function s(r){try{r.call()}catch(a){e.push(a),setTimeout(t,0)}}function n(){let a=0;for(;a<i.length;)if(s(i[a]),a++,a>1024){for(let c=0,d=i.length-a;c<d;c++)i[c]=i[c+a];i.length-=a,a=0}i.length=0}function o(r){i.length<1&&de.requestAnimationFrame(n),i.push(r)}return Object.freeze({enqueue:o,process:n})}),Zi=de.trustedTypes.createPolicy("fast-html",{createHTML:i=>i});let Et=Zi;const Qe=`fast-${Math.random().toString(36).substring(2,8)}`,Ji=`${Qe}{`,Jt=`}${Qe}`,x=Object.freeze({supportsAdoptedStyleSheets:Array.isArray(document.adoptedStyleSheets)&&"replace"in CSSStyleSheet.prototype,setHTMLPolicy(i){if(Et!==Zi)throw new Error("The HTML policy can only be set once.");Et=i},createHTML(i){return Et.createHTML(i)},isMarker(i){return i&&i.nodeType===8&&i.data.startsWith(Qe)},extractDirectiveIndexFromMarker(i){return parseInt(i.data.replace(`${Qe}:`,""))},createInterpolationPlaceholder(i){return`${Ji}${i}${Jt}`},createCustomAttributePlaceholder(i,e){return`${i}="${this.createInterpolationPlaceholder(e)}"`},createBlockPlaceholder(i){return`<!--${Qe}:${i}-->`},queueUpdate:At.enqueue,processUpdates:At.process,nextUpdate(){return new Promise(At.enqueue)},setAttribute(i,e,t){t==null?i.removeAttribute(e):i.setAttribute(e,t)},setBooleanAttribute(i,e,t){t?i.setAttribute(e,""):i.removeAttribute(e)},removeChildNodes(i){for(let e=i.firstChild;e!==null;e=i.firstChild)i.removeChild(e)},createTemplateWalker(i){return document.createTreeWalker(i,133,null,!1)}});class yt{constructor(e,t){this.sub1=void 0,this.sub2=void 0,this.spillover=void 0,this.source=e,this.sub1=t}has(e){return this.spillover===void 0?this.sub1===e||this.sub2===e:this.spillover.indexOf(e)!==-1}subscribe(e){const t=this.spillover;if(t===void 0){if(this.has(e))return;if(this.sub1===void 0){this.sub1=e;return}if(this.sub2===void 0){this.sub2=e;return}this.spillover=[this.sub1,this.sub2,e],this.sub1=void 0,this.sub2=void 0}else t.indexOf(e)===-1&&t.push(e)}unsubscribe(e){const t=this.spillover;if(t===void 0)this.sub1===e?this.sub1=void 0:this.sub2===e&&(this.sub2=void 0);else{const s=t.indexOf(e);s!==-1&&t.splice(s,1)}}notify(e){const t=this.spillover,s=this.source;if(t===void 0){const n=this.sub1,o=this.sub2;n!==void 0&&n.handleChange(s,e),o!==void 0&&o.handleChange(s,e)}else for(let n=0,o=t.length;n<o;++n)t[n].handleChange(s,e)}}class Ki{constructor(e){this.subscribers={},this.sourceSubscribers=null,this.source=e}notify(e){var t;const s=this.subscribers[e];s!==void 0&&s.notify(e),(t=this.sourceSubscribers)===null||t===void 0||t.notify(e)}subscribe(e,t){var s;if(t){let n=this.subscribers[t];n===void 0&&(this.subscribers[t]=n=new yt(this.source)),n.subscribe(e)}else this.sourceSubscribers=(s=this.sourceSubscribers)!==null&&s!==void 0?s:new yt(this.source),this.sourceSubscribers.subscribe(e)}unsubscribe(e,t){var s;if(t){const n=this.subscribers[t];n!==void 0&&n.unsubscribe(e)}else(s=this.sourceSubscribers)===null||s===void 0||s.unsubscribe(e)}}const v=Je.getById(2,()=>{const i=/(:|&&|\|\||if)/,e=new WeakMap,t=x.queueUpdate;let s,n=d=>{throw new Error("Must call enableArrayObservation before observing arrays.")};function o(d){let h=d.$fastController||e.get(d);return h===void 0&&(Array.isArray(d)?h=n(d):e.set(d,h=new Ki(d))),h}const r=Yi();class a{constructor(h){this.name=h,this.field=`_${h}`,this.callback=`${h}Changed`}getValue(h){return s!==void 0&&s.watch(h,this.name),h[this.field]}setValue(h,p){const g=this.field,y=h[g];if(y!==p){h[g]=p;const w=h[this.callback];typeof w=="function"&&w.call(h,y,p),o(h).notify(this.name)}}}class c extends yt{constructor(h,p,g=!1){super(h,p),this.binding=h,this.isVolatileBinding=g,this.needsRefresh=!0,this.needsQueue=!0,this.first=this,this.last=null,this.propertySource=void 0,this.propertyName=void 0,this.notifier=void 0,this.next=void 0}observe(h,p){this.needsRefresh&&this.last!==null&&this.disconnect();const g=s;s=this.needsRefresh?this:void 0,this.needsRefresh=this.isVolatileBinding;const y=this.binding(h,p);return s=g,y}disconnect(){if(this.last!==null){let h=this.first;for(;h!==void 0;)h.notifier.unsubscribe(this,h.propertyName),h=h.next;this.last=null,this.needsRefresh=this.needsQueue=!0}}watch(h,p){const g=this.last,y=o(h),w=g===null?this.first:{};if(w.propertySource=h,w.propertyName=p,w.notifier=y,y.subscribe(this,p),g!==null){if(!this.needsRefresh){let O;s=void 0,O=g.propertySource[g.propertyName],s=this,h===O&&(this.needsRefresh=!0)}g.next=w}this.last=w}handleChange(){this.needsQueue&&(this.needsQueue=!1,t(this))}call(){this.last!==null&&(this.needsQueue=!0,this.notify(this))}records(){let h=this.first;return{next:()=>{const p=h;return p===void 0?{value:void 0,done:!0}:(h=h.next,{value:p,done:!1})},[Symbol.iterator]:function(){return this}}}}return Object.freeze({setArrayObserverFactory(d){n=d},getNotifier:o,track(d,h){s!==void 0&&s.watch(d,h)},trackVolatile(){s!==void 0&&(s.needsRefresh=!0)},notify(d,h){o(d).notify(h)},defineProperty(d,h){typeof h=="string"&&(h=new a(h)),r(d).push(h),Reflect.defineProperty(d,h.name,{enumerable:!0,get:function(){return h.getValue(this)},set:function(p){h.setValue(this,p)}})},getAccessors:r,binding(d,h,p=this.isVolatileBinding(d)){return new c(d,h,p)},isVolatileBinding(d){return i.test(d.toString())}})});function b(i,e){v.defineProperty(i,e)}function Us(i,e,t){return Object.assign({},t,{get:function(){return v.trackVolatile(),t.get.apply(this)}})}const bi=Je.getById(3,()=>{let i=null;return{get(){return i},set(e){i=e}}});class Ke{constructor(){this.index=0,this.length=0,this.parent=null,this.parentContext=null}get event(){return bi.get()}get isEven(){return this.index%2===0}get isOdd(){return this.index%2!==0}get isFirst(){return this.index===0}get isInMiddle(){return!this.isFirst&&!this.isLast}get isLast(){return this.index===this.length-1}static setEvent(e){bi.set(e)}}v.defineProperty(Ke.prototype,"index");v.defineProperty(Ke.prototype,"length");const Xe=Object.seal(new Ke);class Ct{constructor(){this.targetIndex=0}}class es extends Ct{constructor(){super(...arguments),this.createPlaceholder=x.createInterpolationPlaceholder}}class Kt extends Ct{constructor(e,t,s){super(),this.name=e,this.behavior=t,this.options=s}createPlaceholder(e){return x.createCustomAttributePlaceholder(this.name,e)}createBehavior(e){return new this.behavior(e,this.options)}}function qs(i,e){this.source=i,this.context=e,this.bindingObserver===null&&(this.bindingObserver=v.binding(this.binding,this,this.isBindingVolatile)),this.updateTarget(this.bindingObserver.observe(i,e))}function Gs(i,e){this.source=i,this.context=e,this.target.addEventListener(this.targetName,this)}function Ws(){this.bindingObserver.disconnect(),this.source=null,this.context=null}function Qs(){this.bindingObserver.disconnect(),this.source=null,this.context=null;const i=this.target.$fastView;i!==void 0&&i.isComposed&&(i.unbind(),i.needsBindOnly=!0)}function Xs(){this.target.removeEventListener(this.targetName,this),this.source=null,this.context=null}function Ys(i){x.setAttribute(this.target,this.targetName,i)}function Zs(i){x.setBooleanAttribute(this.target,this.targetName,i)}function Js(i){if(i==null&&(i=""),i.create){this.target.textContent="";let e=this.target.$fastView;e===void 0?e=i.create():this.target.$fastTemplate!==i&&(e.isComposed&&(e.remove(),e.unbind()),e=i.create()),e.isComposed?e.needsBindOnly&&(e.needsBindOnly=!1,e.bind(this.source,this.context)):(e.isComposed=!0,e.bind(this.source,this.context),e.insertBefore(this.target),this.target.$fastView=e,this.target.$fastTemplate=i)}else{const e=this.target.$fastView;e!==void 0&&e.isComposed&&(e.isComposed=!1,e.remove(),e.needsBindOnly?e.needsBindOnly=!1:e.unbind()),this.target.textContent=i}}function Ks(i){this.target[this.targetName]=i}function en(i){const e=this.classVersions||Object.create(null),t=this.target;let s=this.version||0;if(i!=null&&i.length){const n=i.split(/\s+/);for(let o=0,r=n.length;o<r;++o){const a=n[o];a!==""&&(e[a]=s,t.classList.add(a))}}if(this.classVersions=e,this.version=s+1,s!==0){s-=1;for(const n in e)e[n]===s&&t.classList.remove(n)}}class ei extends es{constructor(e){super(),this.binding=e,this.bind=qs,this.unbind=Ws,this.updateTarget=Ys,this.isBindingVolatile=v.isVolatileBinding(this.binding)}get targetName(){return this.originalTargetName}set targetName(e){if(this.originalTargetName=e,e!==void 0)switch(e[0]){case":":if(this.cleanedTargetName=e.substr(1),this.updateTarget=Ks,this.cleanedTargetName==="innerHTML"){const t=this.binding;this.binding=(s,n)=>x.createHTML(t(s,n))}break;case"?":this.cleanedTargetName=e.substr(1),this.updateTarget=Zs;break;case"@":this.cleanedTargetName=e.substr(1),this.bind=Gs,this.unbind=Xs;break;default:this.cleanedTargetName=e,e==="class"&&(this.updateTarget=en);break}}targetAtContent(){this.updateTarget=Js,this.unbind=Qs}createBehavior(e){return new tn(e,this.binding,this.isBindingVolatile,this.bind,this.unbind,this.updateTarget,this.cleanedTargetName)}}class tn{constructor(e,t,s,n,o,r,a){this.source=null,this.context=null,this.bindingObserver=null,this.target=e,this.binding=t,this.isBindingVolatile=s,this.bind=n,this.unbind=o,this.updateTarget=r,this.targetName=a}handleChange(){this.updateTarget(this.bindingObserver.observe(this.source,this.context))}handleEvent(e){Ke.setEvent(e);const t=this.binding(this.source,this.context);Ke.setEvent(null),t!==!0&&e.preventDefault()}}let Dt=null;class ti{addFactory(e){e.targetIndex=this.targetIndex,this.behaviorFactories.push(e)}captureContentBinding(e){e.targetAtContent(),this.addFactory(e)}reset(){this.behaviorFactories=[],this.targetIndex=-1}release(){Dt=this}static borrow(e){const t=Dt||new ti;return t.directives=e,t.reset(),Dt=null,t}}function sn(i){if(i.length===1)return i[0];let e;const t=i.length,s=i.map(r=>typeof r=="string"?()=>r:(e=r.targetName||e,r.binding)),n=(r,a)=>{let c="";for(let d=0;d<t;++d)c+=s[d](r,a);return c},o=new ei(n);return o.targetName=e,o}const nn=Jt.length;function ts(i,e){const t=e.split(Ji);if(t.length===1)return null;const s=[];for(let n=0,o=t.length;n<o;++n){const r=t[n],a=r.indexOf(Jt);let c;if(a===-1)c=r;else{const d=parseInt(r.substring(0,a));s.push(i.directives[d]),c=r.substring(a+nn)}c!==""&&s.push(c)}return s}function gi(i,e,t=!1){const s=e.attributes;for(let n=0,o=s.length;n<o;++n){const r=s[n],a=r.value,c=ts(i,a);let d=null;c===null?t&&(d=new ei(()=>a),d.targetName=r.name):d=sn(c),d!==null&&(e.removeAttributeNode(r),n--,o--,i.addFactory(d))}}function on(i,e,t){const s=ts(i,e.textContent);if(s!==null){let n=e;for(let o=0,r=s.length;o<r;++o){const a=s[o],c=o===0?e:n.parentNode.insertBefore(document.createTextNode(""),n.nextSibling);typeof a=="string"?c.textContent=a:(c.textContent=" ",i.captureContentBinding(a)),n=c,i.targetIndex++,c!==e&&t.nextNode()}i.targetIndex--}}function rn(i,e){const t=i.content;document.adoptNode(t);const s=ti.borrow(e);gi(s,i,!0);const n=s.behaviorFactories;s.reset();const o=x.createTemplateWalker(t);let r;for(;r=o.nextNode();)switch(s.targetIndex++,r.nodeType){case 1:gi(s,r);break;case 3:on(s,r,o);break;case 8:x.isMarker(r)&&s.addFactory(e[x.extractDirectiveIndexFromMarker(r)])}let a=0;(x.isMarker(t.firstChild)||t.childNodes.length===1&&e.length)&&(t.insertBefore(document.createComment(""),t.firstChild),a=-1);const c=s.behaviorFactories;return s.release(),{fragment:t,viewBehaviorFactories:c,hostBehaviorFactories:n,targetOffset:a}}const Bt=document.createRange();class is{constructor(e,t){this.fragment=e,this.behaviors=t,this.source=null,this.context=null,this.firstChild=e.firstChild,this.lastChild=e.lastChild}appendTo(e){e.appendChild(this.fragment)}insertBefore(e){if(this.fragment.hasChildNodes())e.parentNode.insertBefore(this.fragment,e);else{const t=this.lastChild;if(e.previousSibling===t)return;const s=e.parentNode;let n=this.firstChild,o;for(;n!==t;)o=n.nextSibling,s.insertBefore(n,e),n=o;s.insertBefore(t,e)}}remove(){const e=this.fragment,t=this.lastChild;let s=this.firstChild,n;for(;s!==t;)n=s.nextSibling,e.appendChild(s),s=n;e.appendChild(t)}dispose(){const e=this.firstChild.parentNode,t=this.lastChild;let s=this.firstChild,n;for(;s!==t;)n=s.nextSibling,e.removeChild(s),s=n;e.removeChild(t);const o=this.behaviors,r=this.source;for(let a=0,c=o.length;a<c;++a)o[a].unbind(r)}bind(e,t){const s=this.behaviors;if(this.source!==e)if(this.source!==null){const n=this.source;this.source=e,this.context=t;for(let o=0,r=s.length;o<r;++o){const a=s[o];a.unbind(n),a.bind(e,t)}}else{this.source=e,this.context=t;for(let n=0,o=s.length;n<o;++n)s[n].bind(e,t)}}unbind(){if(this.source===null)return;const e=this.behaviors,t=this.source;for(let s=0,n=e.length;s<n;++s)e[s].unbind(t);this.source=null}static disposeContiguousBatch(e){if(e.length!==0){Bt.setStartBefore(e[0].firstChild),Bt.setEndAfter(e[e.length-1].lastChild),Bt.deleteContents();for(let t=0,s=e.length;t<s;++t){const n=e[t],o=n.behaviors,r=n.source;for(let a=0,c=o.length;a<c;++a)o[a].unbind(r)}}}}class mi{constructor(e,t){this.behaviorCount=0,this.hasHostBehaviors=!1,this.fragment=null,this.targetOffset=0,this.viewBehaviorFactories=null,this.hostBehaviorFactories=null,this.html=e,this.directives=t}create(e){if(this.fragment===null){let d;const h=this.html;if(typeof h=="string"){d=document.createElement("template"),d.innerHTML=x.createHTML(h);const g=d.content.firstElementChild;g!==null&&g.tagName==="TEMPLATE"&&(d=g)}else d=h;const p=rn(d,this.directives);this.fragment=p.fragment,this.viewBehaviorFactories=p.viewBehaviorFactories,this.hostBehaviorFactories=p.hostBehaviorFactories,this.targetOffset=p.targetOffset,this.behaviorCount=this.viewBehaviorFactories.length+this.hostBehaviorFactories.length,this.hasHostBehaviors=this.hostBehaviorFactories.length>0}const t=this.fragment.cloneNode(!0),s=this.viewBehaviorFactories,n=new Array(this.behaviorCount),o=x.createTemplateWalker(t);let r=0,a=this.targetOffset,c=o.nextNode();for(let d=s.length;r<d;++r){const h=s[r],p=h.targetIndex;for(;c!==null;)if(a===p){n[r]=h.createBehavior(c);break}else c=o.nextNode(),a++}if(this.hasHostBehaviors){const d=this.hostBehaviorFactories;for(let h=0,p=d.length;h<p;++h,++r)n[r]=d[h].createBehavior(e)}return new is(t,n)}render(e,t,s){typeof t=="string"&&(t=document.getElementById(t)),s===void 0&&(s=t);const n=this.create(s);return n.bind(e,Xe),n.appendTo(t),n}}const an=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;function C(i,...e){const t=[];let s="";for(let n=0,o=i.length-1;n<o;++n){const r=i[n];let a=e[n];if(s+=r,a instanceof mi){const c=a;a=()=>c}if(typeof a=="function"&&(a=new ei(a)),a instanceof es){const c=an.exec(r);c!==null&&(a.targetName=c[2])}a instanceof Ct?(s+=a.createPlaceholder(t.length),t.push(a)):s+=a}return s+=i[i.length-1],new mi(s,t)}class q{constructor(){this.targets=new WeakSet}addStylesTo(e){this.targets.add(e)}removeStylesFrom(e){this.targets.delete(e)}isAttachedTo(e){return this.targets.has(e)}withBehaviors(...e){return this.behaviors=this.behaviors===null?e:this.behaviors.concat(e),this}}q.create=(()=>{if(x.supportsAdoptedStyleSheets){const i=new Map;return e=>new ln(e,i)}return i=>new hn(i)})();function ii(i){return i.map(e=>e instanceof q?ii(e.styles):[e]).reduce((e,t)=>e.concat(t),[])}function ss(i){return i.map(e=>e instanceof q?e.behaviors:null).reduce((e,t)=>t===null?e:(e===null&&(e=[]),e.concat(t)),null)}const ns=Symbol("prependToAdoptedStyleSheets");function os(i){const e=[],t=[];return i.forEach(s=>(s[ns]?e:t).push(s)),{prepend:e,append:t}}let rs=(i,e)=>{const{prepend:t,append:s}=os(e);i.adoptedStyleSheets=[...t,...i.adoptedStyleSheets,...s]},as=(i,e)=>{i.adoptedStyleSheets=i.adoptedStyleSheets.filter(t=>e.indexOf(t)===-1)};if(x.supportsAdoptedStyleSheets)try{document.adoptedStyleSheets.push(),document.adoptedStyleSheets.splice(),rs=(i,e)=>{const{prepend:t,append:s}=os(e);i.adoptedStyleSheets.splice(0,0,...t),i.adoptedStyleSheets.push(...s)},as=(i,e)=>{for(const t of e){const s=i.adoptedStyleSheets.indexOf(t);s!==-1&&i.adoptedStyleSheets.splice(s,1)}}}catch{}class ln extends q{constructor(e,t){super(),this.styles=e,this.styleSheetCache=t,this._styleSheets=void 0,this.behaviors=ss(e)}get styleSheets(){if(this._styleSheets===void 0){const e=this.styles,t=this.styleSheetCache;this._styleSheets=ii(e).map(s=>{if(s instanceof CSSStyleSheet)return s;let n=t.get(s);return n===void 0&&(n=new CSSStyleSheet,n.replaceSync(s),t.set(s,n)),n})}return this._styleSheets}addStylesTo(e){rs(e,this.styleSheets),super.addStylesTo(e)}removeStylesFrom(e){as(e,this.styleSheets),super.removeStylesFrom(e)}}let cn=0;function dn(){return`fast-style-class-${++cn}`}class hn extends q{constructor(e){super(),this.styles=e,this.behaviors=null,this.behaviors=ss(e),this.styleSheets=ii(e),this.styleClass=dn()}addStylesTo(e){const t=this.styleSheets,s=this.styleClass;e=this.normalizeTarget(e);for(let n=0;n<t.length;n++){const o=document.createElement("style");o.innerHTML=t[n],o.className=s,e.append(o)}super.addStylesTo(e)}removeStylesFrom(e){e=this.normalizeTarget(e);const t=e.querySelectorAll(`.${this.styleClass}`);for(let s=0,n=t.length;s<n;++s)e.removeChild(t[s]);super.removeStylesFrom(e)}isAttachedTo(e){return super.isAttachedTo(this.normalizeTarget(e))}normalizeTarget(e){return e===document?document.body:e}}const xt=Object.freeze({locate:Yi()}),ls={toView(i){return i?"true":"false"},fromView(i){return!(i==null||i==="false"||i===!1||i===0)}},K={toView(i){if(i==null)return null;const e=i*1;return isNaN(e)?null:e.toString()},fromView(i){if(i==null)return null;const e=i*1;return isNaN(e)?null:e}};class wt{constructor(e,t,s=t.toLowerCase(),n="reflect",o){this.guards=new Set,this.Owner=e,this.name=t,this.attribute=s,this.mode=n,this.converter=o,this.fieldName=`_${t}`,this.callbackName=`${t}Changed`,this.hasCallback=this.callbackName in e.prototype,n==="boolean"&&o===void 0&&(this.converter=ls)}setValue(e,t){const s=e[this.fieldName],n=this.converter;n!==void 0&&(t=n.fromView(t)),s!==t&&(e[this.fieldName]=t,this.tryReflectToAttribute(e),this.hasCallback&&e[this.callbackName](s,t),e.$fastController.notify(this.name))}getValue(e){return v.track(e,this.name),e[this.fieldName]}onAttributeChangedCallback(e,t){this.guards.has(e)||(this.guards.add(e),this.setValue(e,t),this.guards.delete(e))}tryReflectToAttribute(e){const t=this.mode,s=this.guards;s.has(e)||t==="fromView"||x.queueUpdate(()=>{s.add(e);const n=e[this.fieldName];switch(t){case"reflect":const o=this.converter;x.setAttribute(e,this.attribute,o!==void 0?o.toView(n):n);break;case"boolean":x.setBooleanAttribute(e,this.attribute,n);break}s.delete(e)})}static collect(e,...t){const s=[];t.push(xt.locate(e));for(let n=0,o=t.length;n<o;++n){const r=t[n];if(r!==void 0)for(let a=0,c=r.length;a<c;++a){const d=r[a];typeof d=="string"?s.push(new wt(e,d)):s.push(new wt(e,d.property,d.attribute,d.mode,d.converter))}}return s}}function u(i,e){let t;function s(n,o){arguments.length>1&&(t.property=o),xt.locate(n.constructor).push(t)}if(arguments.length>1){t={},s(i,e);return}return t=i===void 0?{}:i,s}const vi={mode:"open"},yi={},qt=Je.getById(4,()=>{const i=new Map;return Object.freeze({register(e){return i.has(e.type)?!1:(i.set(e.type,e),!0)},getByType(e){return i.get(e)}})});class st{constructor(e,t=e.definition){typeof t=="string"&&(t={name:t}),this.type=e,this.name=t.name,this.template=t.template;const s=wt.collect(e,t.attributes),n=new Array(s.length),o={},r={};for(let a=0,c=s.length;a<c;++a){const d=s[a];n[a]=d.attribute,o[d.name]=d,r[d.attribute]=d}this.attributes=s,this.observedAttributes=n,this.propertyLookup=o,this.attributeLookup=r,this.shadowOptions=t.shadowOptions===void 0?vi:t.shadowOptions===null?void 0:Object.assign(Object.assign({},vi),t.shadowOptions),this.elementOptions=t.elementOptions===void 0?yi:Object.assign(Object.assign({},yi),t.elementOptions),this.styles=t.styles===void 0?void 0:Array.isArray(t.styles)?q.create(t.styles):t.styles instanceof q?t.styles:q.create([t.styles])}get isDefined(){return!!qt.getByType(this.type)}define(e=customElements){const t=this.type;if(qt.register(this)){const s=this.attributes,n=t.prototype;for(let o=0,r=s.length;o<r;++o)v.defineProperty(n,s[o]);Reflect.defineProperty(t,"observedAttributes",{value:this.observedAttributes,enumerable:!0})}return e.get(this.name)||e.define(this.name,t,this.elementOptions),this}}st.forType=qt.getByType;const cs=new WeakMap,un={bubbles:!0,composed:!0,cancelable:!0};function Pt(i){return i.shadowRoot||cs.get(i)||null}class si extends Ki{constructor(e,t){super(e),this.boundObservables=null,this.behaviors=null,this.needsInitialization=!0,this._template=null,this._styles=null,this._isConnected=!1,this.$fastController=this,this.view=null,this.element=e,this.definition=t;const s=t.shadowOptions;if(s!==void 0){const o=e.attachShadow(s);s.mode==="closed"&&cs.set(e,o)}const n=v.getAccessors(e);if(n.length>0){const o=this.boundObservables=Object.create(null);for(let r=0,a=n.length;r<a;++r){const c=n[r].name,d=e[c];d!==void 0&&(delete e[c],o[c]=d)}}}get isConnected(){return v.track(this,"isConnected"),this._isConnected}setIsConnected(e){this._isConnected=e,v.notify(this,"isConnected")}get template(){return this._template}set template(e){this._template!==e&&(this._template=e,this.needsInitialization||this.renderTemplate(e))}get styles(){return this._styles}set styles(e){this._styles!==e&&(this._styles!==null&&this.removeStyles(this._styles),this._styles=e,!this.needsInitialization&&e!==null&&this.addStyles(e))}addStyles(e){const t=Pt(this.element)||this.element.getRootNode();if(e instanceof HTMLStyleElement)t.append(e);else if(!e.isAttachedTo(t)){const s=e.behaviors;e.addStylesTo(t),s!==null&&this.addBehaviors(s)}}removeStyles(e){const t=Pt(this.element)||this.element.getRootNode();if(e instanceof HTMLStyleElement)t.removeChild(e);else if(e.isAttachedTo(t)){const s=e.behaviors;e.removeStylesFrom(t),s!==null&&this.removeBehaviors(s)}}addBehaviors(e){const t=this.behaviors||(this.behaviors=new Map),s=e.length,n=[];for(let o=0;o<s;++o){const r=e[o];t.has(r)?t.set(r,t.get(r)+1):(t.set(r,1),n.push(r))}if(this._isConnected){const o=this.element;for(let r=0;r<n.length;++r)n[r].bind(o,Xe)}}removeBehaviors(e,t=!1){const s=this.behaviors;if(s===null)return;const n=e.length,o=[];for(let r=0;r<n;++r){const a=e[r];if(s.has(a)){const c=s.get(a)-1;c===0||t?s.delete(a)&&o.push(a):s.set(a,c)}}if(this._isConnected){const r=this.element;for(let a=0;a<o.length;++a)o[a].unbind(r)}}onConnectedCallback(){if(this._isConnected)return;const e=this.element;this.needsInitialization?this.finishInitialization():this.view!==null&&this.view.bind(e,Xe);const t=this.behaviors;if(t!==null)for(const[s]of t)s.bind(e,Xe);this.setIsConnected(!0)}onDisconnectedCallback(){if(!this._isConnected)return;this.setIsConnected(!1);const e=this.view;e!==null&&e.unbind();const t=this.behaviors;if(t!==null){const s=this.element;for(const[n]of t)n.unbind(s)}}onAttributeChangedCallback(e,t,s){const n=this.definition.attributeLookup[e];n!==void 0&&n.onAttributeChangedCallback(this.element,s)}emit(e,t,s){return this._isConnected?this.element.dispatchEvent(new CustomEvent(e,Object.assign(Object.assign({detail:t},un),s))):!1}finishInitialization(){const e=this.element,t=this.boundObservables;if(t!==null){const n=Object.keys(t);for(let o=0,r=n.length;o<r;++o){const a=n[o];e[a]=t[a]}this.boundObservables=null}const s=this.definition;this._template===null&&(this.element.resolveTemplate?this._template=this.element.resolveTemplate():s.template&&(this._template=s.template||null)),this._template!==null&&this.renderTemplate(this._template),this._styles===null&&(this.element.resolveStyles?this._styles=this.element.resolveStyles():s.styles&&(this._styles=s.styles||null)),this._styles!==null&&this.addStyles(this._styles),this.needsInitialization=!1}renderTemplate(e){const t=this.element,s=Pt(t)||t;this.view!==null?(this.view.dispose(),this.view=null):this.needsInitialization||x.removeChildNodes(s),e&&(this.view=e.render(t,s,t))}static forCustomElement(e){const t=e.$fastController;if(t!==void 0)return t;const s=st.forType(e.constructor);if(s===void 0)throw new Error("Missing FASTElement definition.");return e.$fastController=new si(e,s)}}function xi(i){return class extends i{constructor(){super(),si.forCustomElement(this)}$emit(e,t,s){return this.$fastController.emit(e,t,s)}connectedCallback(){this.$fastController.onConnectedCallback()}disconnectedCallback(){this.$fastController.onDisconnectedCallback()}attributeChangedCallback(e,t,s){this.$fastController.onAttributeChangedCallback(e,t,s)}}}const kt=Object.assign(xi(HTMLElement),{from(i){return xi(i)},define(i,e){return new st(i,e).define().type}});class ds{createCSS(){return""}createBehavior(){}}function pn(i,e){const t=[];let s="";const n=[];for(let o=0,r=i.length-1;o<r;++o){s+=i[o];let a=e[o];if(a instanceof ds){const c=a.createBehavior();a=a.createCSS(),c&&n.push(c)}a instanceof q||a instanceof CSSStyleSheet?(s.trim()!==""&&(t.push(s),s=""),t.push(a)):s+=a}return s+=i[i.length-1],s.trim()!==""&&t.push(s),{styles:t,behaviors:n}}function S(i,...e){const{styles:t,behaviors:s}=pn(i,e),n=q.create(t);return s.length&&n.withBehaviors(...s),n}function J(i,e,t){return{index:i,removed:e,addedCount:t}}const hs=0,us=1,Gt=2,Wt=3;function fn(i,e,t,s,n,o){const r=o-n+1,a=t-e+1,c=new Array(r);let d,h;for(let p=0;p<r;++p)c[p]=new Array(a),c[p][0]=p;for(let p=0;p<a;++p)c[0][p]=p;for(let p=1;p<r;++p)for(let g=1;g<a;++g)i[e+g-1]===s[n+p-1]?c[p][g]=c[p-1][g-1]:(d=c[p-1][g]+1,h=c[p][g-1]+1,c[p][g]=d<h?d:h);return c}function bn(i){let e=i.length-1,t=i[0].length-1,s=i[e][t];const n=[];for(;e>0||t>0;){if(e===0){n.push(Gt),t--;continue}if(t===0){n.push(Wt),e--;continue}const o=i[e-1][t-1],r=i[e-1][t],a=i[e][t-1];let c;r<a?c=r<o?r:o:c=a<o?a:o,c===o?(o===s?n.push(hs):(n.push(us),s=o),e--,t--):c===r?(n.push(Wt),e--,s=r):(n.push(Gt),t--,s=a)}return n.reverse(),n}function gn(i,e,t){for(let s=0;s<t;++s)if(i[s]!==e[s])return s;return t}function mn(i,e,t){let s=i.length,n=e.length,o=0;for(;o<t&&i[--s]===e[--n];)o++;return o}function vn(i,e,t,s){return e<t||s<i?-1:e===t||s===i?0:i<t?e<s?e-t:s-t:s<e?s-i:e-i}function ps(i,e,t,s,n,o){let r=0,a=0;const c=Math.min(t-e,o-n);if(e===0&&n===0&&(r=gn(i,s,c)),t===i.length&&o===s.length&&(a=mn(i,s,c-r)),e+=r,n+=r,t-=a,o-=a,t-e===0&&o-n===0)return ve;if(e===t){const w=J(e,[],0);for(;n<o;)w.removed.push(s[n++]);return[w]}else if(n===o)return[J(e,[],t-e)];const d=bn(fn(i,e,t,s,n,o)),h=[];let p,g=e,y=n;for(let w=0;w<d.length;++w)switch(d[w]){case hs:p!==void 0&&(h.push(p),p=void 0),g++,y++;break;case us:p===void 0&&(p=J(g,[],0)),p.addedCount++,g++,p.removed.push(s[y]),y++;break;case Gt:p===void 0&&(p=J(g,[],0)),p.addedCount++,g++;break;case Wt:p===void 0&&(p=J(g,[],0)),p.removed.push(s[y]),y++;break}return p!==void 0&&h.push(p),h}const wi=Array.prototype.push;function yn(i,e,t,s){const n=J(e,t,s);let o=!1,r=0;for(let a=0;a<i.length;a++){const c=i[a];if(c.index+=r,o)continue;const d=vn(n.index,n.index+n.removed.length,c.index,c.index+c.addedCount);if(d>=0){i.splice(a,1),a--,r-=c.addedCount-c.removed.length,n.addedCount+=c.addedCount-d;const h=n.removed.length+c.removed.length-d;if(!n.addedCount&&!h)o=!0;else{let p=c.removed;if(n.index<c.index){const g=n.removed.slice(0,c.index-n.index);wi.apply(g,p),p=g}if(n.index+n.removed.length>c.index+c.addedCount){const g=n.removed.slice(c.index+c.addedCount-n.index);wi.apply(p,g)}n.removed=p,c.index<n.index&&(n.index=c.index)}}else if(n.index<c.index){o=!0,i.splice(a,0,n),a++;const h=n.addedCount-n.removed.length;c.index+=h,r+=h}}o||i.push(n)}function xn(i){const e=[];for(let t=0,s=i.length;t<s;t++){const n=i[t];yn(e,n.index,n.removed,n.addedCount)}return e}function wn(i,e){let t=[];const s=xn(e);for(let n=0,o=s.length;n<o;++n){const r=s[n];if(r.addedCount===1&&r.removed.length===1){r.removed[0]!==i[r.index]&&t.push(r);continue}t=t.concat(ps(i,r.index,r.index+r.addedCount,r.removed,0,r.removed.length))}return t}let $i=!1;function Ft(i,e){let t=i.index;const s=e.length;return t>s?t=s-i.addedCount:t<0&&(t=s+i.removed.length+t-i.addedCount),t<0&&(t=0),i.index=t,i}class $n extends yt{constructor(e){super(e),this.oldCollection=void 0,this.splices=void 0,this.needsQueue=!0,this.call=this.flush,Reflect.defineProperty(e,"$fastController",{value:this,enumerable:!1})}subscribe(e){this.flush(),super.subscribe(e)}addSplice(e){this.splices===void 0?this.splices=[e]:this.splices.push(e),this.needsQueue&&(this.needsQueue=!1,x.queueUpdate(this))}reset(e){this.oldCollection=e,this.needsQueue&&(this.needsQueue=!1,x.queueUpdate(this))}flush(){const e=this.splices,t=this.oldCollection;if(e===void 0&&t===void 0)return;this.needsQueue=!0,this.splices=void 0,this.oldCollection=void 0;const s=t===void 0?wn(this.source,e):ps(this.source,0,this.source.length,t,0,t.length);this.notify(s)}}function Cn(){if($i)return;$i=!0,v.setArrayObserverFactory(c=>new $n(c));const i=Array.prototype;if(i.$fastPatch)return;Reflect.defineProperty(i,"$fastPatch",{value:1,enumerable:!1});const e=i.pop,t=i.push,s=i.reverse,n=i.shift,o=i.sort,r=i.splice,a=i.unshift;i.pop=function(){const c=this.length>0,d=e.apply(this,arguments),h=this.$fastController;return h!==void 0&&c&&h.addSplice(J(this.length,[d],0)),d},i.push=function(){const c=t.apply(this,arguments),d=this.$fastController;return d!==void 0&&d.addSplice(Ft(J(this.length-arguments.length,[],arguments.length),this)),c},i.reverse=function(){let c;const d=this.$fastController;d!==void 0&&(d.flush(),c=this.slice());const h=s.apply(this,arguments);return d!==void 0&&d.reset(c),h},i.shift=function(){const c=this.length>0,d=n.apply(this,arguments),h=this.$fastController;return h!==void 0&&c&&h.addSplice(J(0,[d],0)),d},i.sort=function(){let c;const d=this.$fastController;d!==void 0&&(d.flush(),c=this.slice());const h=o.apply(this,arguments);return d!==void 0&&d.reset(c),h},i.splice=function(){const c=r.apply(this,arguments),d=this.$fastController;return d!==void 0&&d.addSplice(Ft(J(+arguments[0],c,arguments.length>2?arguments.length-2:0),this)),c},i.unshift=function(){const c=a.apply(this,arguments),d=this.$fastController;return d!==void 0&&d.addSplice(Ft(J(0,[],arguments.length),this)),c}}class kn{constructor(e,t){this.target=e,this.propertyName=t}bind(e){e[this.propertyName]=this.target}unbind(){}}function z(i){return new Kt("fast-ref",kn,i)}const fs=i=>typeof i=="function",Tn=()=>null;function Ci(i){return i===void 0?Tn:fs(i)?i:()=>i}function ni(i,e,t){const s=fs(i)?i:()=>i,n=Ci(e),o=Ci(t);return(r,a)=>s(r,a)?n(r,a):o(r,a)}function In(i,e,t,s){i.bind(e[t],s)}function Sn(i,e,t,s){const n=Object.create(s);n.index=t,n.length=e.length,i.bind(e[t],n)}class Rn{constructor(e,t,s,n,o,r){this.location=e,this.itemsBinding=t,this.templateBinding=n,this.options=r,this.source=null,this.views=[],this.items=null,this.itemsObserver=null,this.originalContext=void 0,this.childContext=void 0,this.bindView=In,this.itemsBindingObserver=v.binding(t,this,s),this.templateBindingObserver=v.binding(n,this,o),r.positioning&&(this.bindView=Sn)}bind(e,t){this.source=e,this.originalContext=t,this.childContext=Object.create(t),this.childContext.parent=e,this.childContext.parentContext=this.originalContext,this.items=this.itemsBindingObserver.observe(e,this.originalContext),this.template=this.templateBindingObserver.observe(e,this.originalContext),this.observeItems(!0),this.refreshAllViews()}unbind(){this.source=null,this.items=null,this.itemsObserver!==null&&this.itemsObserver.unsubscribe(this),this.unbindAllViews(),this.itemsBindingObserver.disconnect(),this.templateBindingObserver.disconnect()}handleChange(e,t){e===this.itemsBinding?(this.items=this.itemsBindingObserver.observe(this.source,this.originalContext),this.observeItems(),this.refreshAllViews()):e===this.templateBinding?(this.template=this.templateBindingObserver.observe(this.source,this.originalContext),this.refreshAllViews(!0)):this.updateViews(t)}observeItems(e=!1){if(!this.items){this.items=ve;return}const t=this.itemsObserver,s=this.itemsObserver=v.getNotifier(this.items),n=t!==s;n&&t!==null&&t.unsubscribe(this),(n||e)&&s.subscribe(this)}updateViews(e){const t=this.childContext,s=this.views,n=this.bindView,o=this.items,r=this.template,a=this.options.recycle,c=[];let d=0,h=0;for(let p=0,g=e.length;p<g;++p){const y=e[p],w=y.removed;let O=0,M=y.index;const ie=M+y.addedCount,R=s.splice(y.index,w.length),se=h=c.length+R.length;for(;M<ie;++M){const Ce=s[M],ze=Ce?Ce.firstChild:this.location;let ke;a&&h>0?(O<=se&&R.length>0?(ke=R[O],O++):(ke=c[d],d++),h--):ke=r.create(),s.splice(M,0,ke),n(ke,o,M,t),ke.insertBefore(ze)}R[O]&&c.push(...R.slice(O))}for(let p=d,g=c.length;p<g;++p)c[p].dispose();if(this.options.positioning)for(let p=0,g=s.length;p<g;++p){const y=s[p].context;y.length=g,y.index=p}}refreshAllViews(e=!1){const t=this.items,s=this.childContext,n=this.template,o=this.location,r=this.bindView;let a=t.length,c=this.views,d=c.length;if((a===0||e||!this.options.recycle)&&(is.disposeContiguousBatch(c),d=0),d===0){this.views=c=new Array(a);for(let h=0;h<a;++h){const p=n.create();r(p,t,h,s),c[h]=p,p.insertBefore(o)}}else{let h=0;for(;h<a;++h)if(h<d){const g=c[h];r(g,t,h,s)}else{const g=n.create();r(g,t,h,s),c.push(g),g.insertBefore(o)}const p=c.splice(h,d-h);for(h=0,a=p.length;h<a;++h)p[h].dispose()}}unbindAllViews(){const e=this.views;for(let t=0,s=e.length;t<s;++t)e[t].unbind()}}class bs extends Ct{constructor(e,t,s){super(),this.itemsBinding=e,this.templateBinding=t,this.options=s,this.createPlaceholder=x.createBlockPlaceholder,Cn(),this.isItemsBindingVolatile=v.isVolatileBinding(e),this.isTemplateBindingVolatile=v.isVolatileBinding(t)}createBehavior(e){return new Rn(e,this.itemsBinding,this.isItemsBindingVolatile,this.templateBinding,this.isTemplateBindingVolatile,this.options)}}function oi(i){return i?function(e,t,s){return e.nodeType===1&&e.matches(i)}:function(e,t,s){return e.nodeType===1}}class gs{constructor(e,t){this.target=e,this.options=t,this.source=null}bind(e){const t=this.options.property;this.shouldUpdate=v.getAccessors(e).some(s=>s.name===t),this.source=e,this.updateTarget(this.computeNodes()),this.shouldUpdate&&this.observe()}unbind(){this.updateTarget(ve),this.source=null,this.shouldUpdate&&this.disconnect()}handleEvent(){this.updateTarget(this.computeNodes())}computeNodes(){let e=this.getNodes();return this.options.filter!==void 0&&(e=e.filter(this.options.filter)),e}updateTarget(e){this.source[this.options.property]=e}}class On extends gs{constructor(e,t){super(e,t)}observe(){this.target.addEventListener("slotchange",this)}disconnect(){this.target.removeEventListener("slotchange",this)}getNodes(){return this.target.assignedNodes(this.options)}}function Y(i){return typeof i=="string"&&(i={property:i}),new Kt("fast-slotted",On,i)}class An extends gs{constructor(e,t){super(e,t),this.observer=null,t.childList=!0}observe(){this.observer===null&&(this.observer=new MutationObserver(this.handleEvent.bind(this))),this.observer.observe(this.target,this.options)}disconnect(){this.observer.disconnect()}getNodes(){return"subtree"in this.options?Array.from(this.target.querySelectorAll(this.options.selector)):Array.from(this.target.childNodes)}}function ms(i){return typeof i=="string"&&(i={property:i}),new Kt("fast-children",An,i)}class Fe{handleStartContentChange(){this.startContainer.classList.toggle("start",this.start.assignedNodes().length>0)}handleEndContentChange(){this.endContainer.classList.toggle("end",this.end.assignedNodes().length>0)}}const Le=(i,e)=>C`
    <span
        part="end"
        ${z("endContainer")}
        class=${t=>e.end?"end":void 0}
    >
        <slot name="end" ${z("end")} @slotchange="${t=>t.handleEndContentChange()}">
            ${e.end||""}
        </slot>
    </span>
`,He=(i,e)=>C`
    <span
        part="start"
        ${z("startContainer")}
        class="${t=>e.start?"start":void 0}"
    >
        <slot
            name="start"
            ${z("start")}
            @slotchange="${t=>t.handleStartContentChange()}"
        >
            ${e.start||""}
        </slot>
    </span>
`;C`
    <span part="end" ${z("endContainer")}>
        <slot
            name="end"
            ${z("end")}
            @slotchange="${i=>i.handleEndContentChange()}"
        ></slot>
    </span>
`;C`
    <span part="start" ${z("startContainer")}>
        <slot
            name="start"
            ${z("start")}
            @slotchange="${i=>i.handleStartContentChange()}"
        ></slot>
    </span>
`;function l(i,e,t,s){var n=arguments.length,o=n<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(i,e,t,s);else for(var a=i.length-1;a>=0;a--)(r=i[a])&&(o=(n<3?r(o):n>3?r(e,t,o):r(e,t))||o);return n>3&&o&&Object.defineProperty(e,t,o),o}const Lt=new Map;"metadata"in Reflect||(Reflect.metadata=function(i,e){return function(t){Reflect.defineMetadata(i,e,t)}},Reflect.defineMetadata=function(i,e,t){let s=Lt.get(t);s===void 0&&Lt.set(t,s=new Map),s.set(i,e)},Reflect.getOwnMetadata=function(i,e){const t=Lt.get(e);if(t!==void 0)return t.get(i)});class En{constructor(e,t){this.container=e,this.key=t}instance(e){return this.registerResolver(0,e)}singleton(e){return this.registerResolver(1,e)}transient(e){return this.registerResolver(2,e)}callback(e){return this.registerResolver(3,e)}cachedCallback(e){return this.registerResolver(3,ys(e))}aliasTo(e){return this.registerResolver(5,e)}registerResolver(e,t){const{container:s,key:n}=this;return this.container=this.key=void 0,s.registerResolver(n,new X(n,e,t))}}function je(i){const e=i.slice(),t=Object.keys(i),s=t.length;let n;for(let o=0;o<s;++o)n=t[o],xs(n)||(e[n]=i[n]);return e}const Dn=Object.freeze({none(i){throw Error(`${i.toString()} not registered, did you forget to add @singleton()?`)},singleton(i){return new X(i,1,i)},transient(i){return new X(i,2,i)}}),Ht=Object.freeze({default:Object.freeze({parentLocator:()=>null,responsibleForOwnerRequests:!1,defaultResolver:Dn.singleton})}),ki=new Map;function Ti(i){return e=>Reflect.getOwnMetadata(i,e)}let Ii=null;const I=Object.freeze({createContainer(i){return new Ye(null,Object.assign({},Ht.default,i))},findResponsibleContainer(i){const e=i.$$container$$;return e&&e.responsibleForOwnerRequests?e:I.findParentContainer(i)},findParentContainer(i){const e=new CustomEvent(vs,{bubbles:!0,composed:!0,cancelable:!0,detail:{container:void 0}});return i.dispatchEvent(e),e.detail.container||I.getOrCreateDOMContainer()},getOrCreateDOMContainer(i,e){return i?i.$$container$$||new Ye(i,Object.assign({},Ht.default,e,{parentLocator:I.findParentContainer})):Ii||(Ii=new Ye(null,Object.assign({},Ht.default,e,{parentLocator:()=>null})))},getDesignParamtypes:Ti("design:paramtypes"),getAnnotationParamtypes:Ti("di:paramtypes"),getOrCreateAnnotationParamTypes(i){let e=this.getAnnotationParamtypes(i);return e===void 0&&Reflect.defineMetadata("di:paramtypes",e=[],i),e},getDependencies(i){let e=ki.get(i);if(e===void 0){const t=i.inject;if(t===void 0){const s=I.getDesignParamtypes(i),n=I.getAnnotationParamtypes(i);if(s===void 0)if(n===void 0){const o=Object.getPrototypeOf(i);typeof o=="function"&&o!==Function.prototype?e=je(I.getDependencies(o)):e=[]}else e=je(n);else if(n===void 0)e=je(s);else{e=je(s);let o=n.length,r;for(let d=0;d<o;++d)r=n[d],r!==void 0&&(e[d]=r);const a=Object.keys(n);o=a.length;let c;for(let d=0;d<o;++d)c=a[d],xs(c)||(e[c]=n[c])}}else e=je(t);ki.set(i,e)}return e},defineProperty(i,e,t,s=!1){const n=`$di_${e}`;Reflect.defineProperty(i,e,{get:function(){let o=this[n];if(o===void 0&&(o=(this instanceof HTMLElement?I.findResponsibleContainer(this):I.getOrCreateDOMContainer()).get(t),this[n]=o,s&&this instanceof kt)){const a=this.$fastController,c=()=>{const h=I.findResponsibleContainer(this).get(t),p=this[n];h!==p&&(this[n]=o,a.notify(e))};a.subscribe({handleChange:c},"isConnected")}return o}})},createInterface(i,e){const t=typeof i=="function"?i:e,s=typeof i=="string"?i:i&&"friendlyName"in i&&i.friendlyName||Ai,n=typeof i=="string"?!1:i&&"respectConnection"in i&&i.respectConnection||!1,o=function(r,a,c){if(r==null||new.target!==void 0)throw new Error(`No registration for interface: '${o.friendlyName}'`);if(a)I.defineProperty(r,a,o,n);else{const d=I.getOrCreateAnnotationParamTypes(r);d[c]=o}};return o.$isInterface=!0,o.friendlyName=s??"(anonymous)",t!=null&&(o.register=function(r,a){return t(new En(r,a??o))}),o.toString=function(){return`InterfaceSymbol<${o.friendlyName}>`},o},inject(...i){return function(e,t,s){if(typeof s=="number"){const n=I.getOrCreateAnnotationParamTypes(e),o=i[0];o!==void 0&&(n[s]=o)}else if(t)I.defineProperty(e,t,i[0]);else{const n=s?I.getOrCreateAnnotationParamTypes(s.value):I.getOrCreateAnnotationParamTypes(e);let o;for(let r=0;r<i.length;++r)o=i[r],o!==void 0&&(n[r]=o)}}},transient(i){return i.register=function(t){return et.transient(i,i).register(t)},i.registerInRequestor=!1,i},singleton(i,e=Pn){return i.register=function(s){return et.singleton(i,i).register(s)},i.registerInRequestor=e.scoped,i}}),Bn=I.createInterface("Container");I.inject;const Pn={scoped:!1};class X{constructor(e,t,s){this.key=e,this.strategy=t,this.state=s,this.resolving=!1}get $isResolver(){return!0}register(e){return e.registerResolver(this.key,this)}resolve(e,t){switch(this.strategy){case 0:return this.state;case 1:{if(this.resolving)throw new Error(`Cyclic dependency found: ${this.state.name}`);return this.resolving=!0,this.state=e.getFactory(this.state).construct(t),this.strategy=0,this.resolving=!1,this.state}case 2:{const s=e.getFactory(this.state);if(s===null)throw new Error(`Resolver for ${String(this.key)} returned a null factory`);return s.construct(t)}case 3:return this.state(e,t,this);case 4:return this.state[0].resolve(e,t);case 5:return t.get(this.state);default:throw new Error(`Invalid resolver strategy specified: ${this.strategy}.`)}}getFactory(e){var t,s,n;switch(this.strategy){case 1:case 2:return e.getFactory(this.state);case 5:return(n=(s=(t=e.getResolver(this.state))===null||t===void 0?void 0:t.getFactory)===null||s===void 0?void 0:s.call(t,e))!==null&&n!==void 0?n:null;default:return null}}}function Si(i){return this.get(i)}function Fn(i,e){return e(i)}class Ln{constructor(e,t){this.Type=e,this.dependencies=t,this.transformers=null}construct(e,t){let s;return t===void 0?s=new this.Type(...this.dependencies.map(Si,e)):s=new this.Type(...this.dependencies.map(Si,e),...t),this.transformers==null?s:this.transformers.reduce(Fn,s)}registerTransformer(e){(this.transformers||(this.transformers=[])).push(e)}}const Hn={$isResolver:!0,resolve(i,e){return e}};function gt(i){return typeof i.register=="function"}function Vn(i){return gt(i)&&typeof i.registerInRequestor=="boolean"}function Ri(i){return Vn(i)&&i.registerInRequestor}function Mn(i){return i.prototype!==void 0}const Nn=new Set(["Array","ArrayBuffer","Boolean","DataView","Date","Error","EvalError","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Map","Number","Object","Promise","RangeError","ReferenceError","RegExp","Set","SharedArrayBuffer","String","SyntaxError","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","URIError","WeakMap","WeakSet"]),vs="__DI_LOCATE_PARENT__",Vt=new Map;class Ye{constructor(e,t){this.owner=e,this.config=t,this._parent=void 0,this.registerDepth=0,this.context=null,e!==null&&(e.$$container$$=this),this.resolvers=new Map,this.resolvers.set(Bn,Hn),e instanceof Node&&e.addEventListener(vs,s=>{s.composedPath()[0]!==this.owner&&(s.detail.container=this,s.stopImmediatePropagation())})}get parent(){return this._parent===void 0&&(this._parent=this.config.parentLocator(this.owner)),this._parent}get depth(){return this.parent===null?0:this.parent.depth+1}get responsibleForOwnerRequests(){return this.config.responsibleForOwnerRequests}registerWithContext(e,...t){return this.context=e,this.register(...t),this.context=null,this}register(...e){if(++this.registerDepth===100)throw new Error("Unable to autoregister dependency");let t,s,n,o,r;const a=this.context;for(let c=0,d=e.length;c<d;++c)if(t=e[c],!!Ei(t))if(gt(t))t.register(this,a);else if(Mn(t))et.singleton(t,t).register(this);else for(s=Object.keys(t),o=0,r=s.length;o<r;++o)n=t[s[o]],Ei(n)&&(gt(n)?n.register(this,a):this.register(n));return--this.registerDepth,this}registerResolver(e,t){ct(e);const s=this.resolvers,n=s.get(e);return n==null?s.set(e,t):n instanceof X&&n.strategy===4?n.state.push(t):s.set(e,new X(e,4,[n,t])),t}registerTransformer(e,t){const s=this.getResolver(e);if(s==null)return!1;if(s.getFactory){const n=s.getFactory(this);return n==null?!1:(n.registerTransformer(t),!0)}return!1}getResolver(e,t=!0){if(ct(e),e.resolve!==void 0)return e;let s=this,n;for(;s!=null;)if(n=s.resolvers.get(e),n==null){if(s.parent==null){const o=Ri(e)?this:s;return t?this.jitRegister(e,o):null}s=s.parent}else return n;return null}has(e,t=!1){return this.resolvers.has(e)?!0:t&&this.parent!=null?this.parent.has(e,!0):!1}get(e){if(ct(e),e.$isResolver)return e.resolve(this,this);let t=this,s;for(;t!=null;)if(s=t.resolvers.get(e),s==null){if(t.parent==null){const n=Ri(e)?this:t;return s=this.jitRegister(e,n),s.resolve(t,this)}t=t.parent}else return s.resolve(t,this);throw new Error(`Unable to resolve key: ${String(e)}`)}getAll(e,t=!1){ct(e);const s=this;let n=s,o;if(t){let r=ve;for(;n!=null;)o=n.resolvers.get(e),o!=null&&(r=r.concat(Oi(o,n,s))),n=n.parent;return r}else for(;n!=null;)if(o=n.resolvers.get(e),o==null){if(n=n.parent,n==null)return ve}else return Oi(o,n,s);return ve}getFactory(e){let t=Vt.get(e);if(t===void 0){if(_n(e))throw new Error(`${e.name} is a native function and therefore cannot be safely constructed by DI. If this is intentional, please use a callback or cachedCallback resolver.`);Vt.set(e,t=new Ln(e,I.getDependencies(e)))}return t}registerFactory(e,t){Vt.set(e,t)}createChild(e){return new Ye(null,Object.assign({},this.config,e,{parentLocator:()=>this}))}jitRegister(e,t){if(typeof e!="function")throw new Error(`Attempted to jitRegister something that is not a constructor: '${e}'. Did you forget to register this dependency?`);if(Nn.has(e.name))throw new Error(`Attempted to jitRegister an intrinsic type: ${e.name}. Did you forget to add @inject(Key)`);if(gt(e)){const s=e.register(t);if(!(s instanceof Object)||s.resolve==null){const n=t.resolvers.get(e);if(n!=null)return n;throw new Error("A valid resolver was not returned from the static register method")}return s}else{if(e.$isInterface)throw new Error(`Attempted to jitRegister an interface: ${e.friendlyName}`);{const s=this.config.defaultResolver(e,t);return t.resolvers.set(e,s),s}}}}const Mt=new WeakMap;function ys(i){return function(e,t,s){if(Mt.has(s))return Mt.get(s);const n=i(e,t,s);return Mt.set(s,n),n}}const et=Object.freeze({instance(i,e){return new X(i,0,e)},singleton(i,e){return new X(i,1,e)},transient(i,e){return new X(i,2,e)},callback(i,e){return new X(i,3,e)},cachedCallback(i,e){return new X(i,3,ys(e))},aliasTo(i,e){return new X(e,5,i)}});function ct(i){if(i==null)throw new Error("key/value cannot be null or undefined. Are you trying to inject/register something that doesn't exist with DI?")}function Oi(i,e,t){if(i instanceof X&&i.strategy===4){const s=i.state;let n=s.length;const o=new Array(n);for(;n--;)o[n]=s[n].resolve(e,t);return o}return[i.resolve(e,t)]}const Ai="(anonymous)";function Ei(i){return typeof i=="object"&&i!==null||typeof i=="function"}const _n=(function(){const i=new WeakMap;let e=!1,t="",s=0;return function(n){return e=i.get(n),e===void 0&&(t=n.toString(),s=t.length,e=s>=29&&s<=100&&t.charCodeAt(s-1)===125&&t.charCodeAt(s-2)<=32&&t.charCodeAt(s-3)===93&&t.charCodeAt(s-4)===101&&t.charCodeAt(s-5)===100&&t.charCodeAt(s-6)===111&&t.charCodeAt(s-7)===99&&t.charCodeAt(s-8)===32&&t.charCodeAt(s-9)===101&&t.charCodeAt(s-10)===118&&t.charCodeAt(s-11)===105&&t.charCodeAt(s-12)===116&&t.charCodeAt(s-13)===97&&t.charCodeAt(s-14)===110&&t.charCodeAt(s-15)===88,i.set(n,e)),e}})(),dt={};function xs(i){switch(typeof i){case"number":return i>=0&&(i|0)===i;case"string":{const e=dt[i];if(e!==void 0)return e;const t=i.length;if(t===0)return dt[i]=!1;let s=0;for(let n=0;n<t;++n)if(s=i.charCodeAt(n),n===0&&s===48&&t>1||s<48||s>57)return dt[i]=!1;return dt[i]=!0}default:return!1}}function Di(i){return`${i.toLowerCase()}:presentation`}const ht=new Map,ws=Object.freeze({define(i,e,t){const s=Di(i);ht.get(s)===void 0?ht.set(s,e):ht.set(s,!1),t.register(et.instance(s,e))},forTag(i,e){const t=Di(i),s=ht.get(t);return s===!1?I.findResponsibleContainer(e).get(t):s||null}});class zn{constructor(e,t){this.template=e||null,this.styles=t===void 0?null:Array.isArray(t)?q.create(t):t instanceof q?t:q.create([t])}applyTo(e){const t=e.$fastController;t.template===null&&(t.template=this.template),t.styles===null&&(t.styles=this.styles)}}class k extends kt{constructor(){super(...arguments),this._presentation=void 0}get $presentation(){return this._presentation===void 0&&(this._presentation=ws.forTag(this.tagName,this)),this._presentation}templateChanged(){this.template!==void 0&&(this.$fastController.template=this.template)}stylesChanged(){this.styles!==void 0&&(this.$fastController.styles=this.styles)}connectedCallback(){this.$presentation!==null&&this.$presentation.applyTo(this),super.connectedCallback()}static compose(e){return(t={})=>new $s(this===k?class extends k{}:this,e,t)}}l([b],k.prototype,"template",void 0);l([b],k.prototype,"styles",void 0);function Ue(i,e,t){return typeof i=="function"?i(e,t):i}class $s{constructor(e,t,s){this.type=e,this.elementDefinition=t,this.overrideDefinition=s,this.definition=Object.assign(Object.assign({},this.elementDefinition),this.overrideDefinition)}register(e,t){const s=this.definition,n=this.overrideDefinition,r=`${s.prefix||t.elementPrefix}-${s.baseName}`;t.tryDefineElement({name:r,type:this.type,baseClass:this.elementDefinition.baseClass,callback:a=>{const c=new zn(Ue(s.template,a,s),Ue(s.styles,a,s));a.definePresentation(c);let d=Ue(s.shadowOptions,a,s);a.shadowRootMode&&(d?n.shadowOptions||(d.mode=a.shadowRootMode):d!==null&&(d={mode:a.shadowRootMode})),a.defineElement({elementOptions:Ue(s.elementOptions,a,s),shadowOptions:d,attributes:Ue(s.attributes,a,s)})}})}}function W(i,...e){const t=xt.locate(i);e.forEach(s=>{Object.getOwnPropertyNames(s.prototype).forEach(o=>{o!=="constructor"&&Object.defineProperty(i.prototype,o,Object.getOwnPropertyDescriptor(s.prototype,o))}),xt.locate(s).forEach(o=>t.push(o))})}const ri={horizontal:"horizontal"};function jn(i,e){let t=i.length;for(;t--;)if(e(i[t],t,i))return t;return-1}function Un(){return!!(typeof window<"u"&&window.document&&window.document.createElement)}function qn(...i){return i.every(e=>e instanceof HTMLElement)}function Gn(){const i=document.querySelector('meta[property="csp-nonce"]');return i?i.getAttribute("content"):null}let be;function Wn(){if(typeof be=="boolean")return be;if(!Un())return be=!1,be;const i=document.createElement("style"),e=Gn();e!==null&&i.setAttribute("nonce",e),document.head.appendChild(i);try{i.sheet.insertRule("foo:focus-visible {color:inherit}",0),be=!0}catch{be=!1}finally{document.head.removeChild(i)}return be}const Bi="focus",Pi="focusin",De="focusout",Be="keydown";var Fi;(function(i){i[i.alt=18]="alt",i[i.arrowDown=40]="arrowDown",i[i.arrowLeft=37]="arrowLeft",i[i.arrowRight=39]="arrowRight",i[i.arrowUp=38]="arrowUp",i[i.back=8]="back",i[i.backSlash=220]="backSlash",i[i.break=19]="break",i[i.capsLock=20]="capsLock",i[i.closeBracket=221]="closeBracket",i[i.colon=186]="colon",i[i.colon2=59]="colon2",i[i.comma=188]="comma",i[i.ctrl=17]="ctrl",i[i.delete=46]="delete",i[i.end=35]="end",i[i.enter=13]="enter",i[i.equals=187]="equals",i[i.equals2=61]="equals2",i[i.equals3=107]="equals3",i[i.escape=27]="escape",i[i.forwardSlash=191]="forwardSlash",i[i.function1=112]="function1",i[i.function10=121]="function10",i[i.function11=122]="function11",i[i.function12=123]="function12",i[i.function2=113]="function2",i[i.function3=114]="function3",i[i.function4=115]="function4",i[i.function5=116]="function5",i[i.function6=117]="function6",i[i.function7=118]="function7",i[i.function8=119]="function8",i[i.function9=120]="function9",i[i.home=36]="home",i[i.insert=45]="insert",i[i.menu=93]="menu",i[i.minus=189]="minus",i[i.minus2=109]="minus2",i[i.numLock=144]="numLock",i[i.numPad0=96]="numPad0",i[i.numPad1=97]="numPad1",i[i.numPad2=98]="numPad2",i[i.numPad3=99]="numPad3",i[i.numPad4=100]="numPad4",i[i.numPad5=101]="numPad5",i[i.numPad6=102]="numPad6",i[i.numPad7=103]="numPad7",i[i.numPad8=104]="numPad8",i[i.numPad9=105]="numPad9",i[i.numPadDivide=111]="numPadDivide",i[i.numPadDot=110]="numPadDot",i[i.numPadMinus=109]="numPadMinus",i[i.numPadMultiply=106]="numPadMultiply",i[i.numPadPlus=107]="numPadPlus",i[i.openBracket=219]="openBracket",i[i.pageDown=34]="pageDown",i[i.pageUp=33]="pageUp",i[i.period=190]="period",i[i.print=44]="print",i[i.quote=222]="quote",i[i.scrollLock=145]="scrollLock",i[i.shift=16]="shift",i[i.space=32]="space",i[i.tab=9]="tab",i[i.tilde=192]="tilde",i[i.windowsLeft=91]="windowsLeft",i[i.windowsOpera=219]="windowsOpera",i[i.windowsRight=92]="windowsRight"})(Fi||(Fi={}));const ye="ArrowDown",tt="ArrowLeft",it="ArrowRight",xe="ArrowUp",nt="Enter",Tt="Escape",Ve="Home",Me="End",Qn="F2",Xn="PageDown",Yn="PageUp",ot=" ",ai="Tab",Zn={ArrowDown:ye,ArrowLeft:tt,ArrowRight:it,ArrowUp:xe};var Pe;(function(i){i.ltr="ltr",i.rtl="rtl"})(Pe||(Pe={}));function Jn(i,e,t){return Math.min(Math.max(t,i),e)}function ut(i,e,t=0){return[e,t]=[e,t].sort((s,n)=>s-n),e<=i&&i<t}let Kn=0;function $t(i=""){return`${i}${Kn++}`}const eo=(i,e)=>C`
    <a
        class="control"
        part="control"
        download="${t=>t.download}"
        href="${t=>t.href}"
        hreflang="${t=>t.hreflang}"
        ping="${t=>t.ping}"
        referrerpolicy="${t=>t.referrerpolicy}"
        rel="${t=>t.rel}"
        target="${t=>t.target}"
        type="${t=>t.type}"
        aria-atomic="${t=>t.ariaAtomic}"
        aria-busy="${t=>t.ariaBusy}"
        aria-controls="${t=>t.ariaControls}"
        aria-current="${t=>t.ariaCurrent}"
        aria-describedby="${t=>t.ariaDescribedby}"
        aria-details="${t=>t.ariaDetails}"
        aria-disabled="${t=>t.ariaDisabled}"
        aria-errormessage="${t=>t.ariaErrormessage}"
        aria-expanded="${t=>t.ariaExpanded}"
        aria-flowto="${t=>t.ariaFlowto}"
        aria-haspopup="${t=>t.ariaHaspopup}"
        aria-hidden="${t=>t.ariaHidden}"
        aria-invalid="${t=>t.ariaInvalid}"
        aria-keyshortcuts="${t=>t.ariaKeyshortcuts}"
        aria-label="${t=>t.ariaLabel}"
        aria-labelledby="${t=>t.ariaLabelledby}"
        aria-live="${t=>t.ariaLive}"
        aria-owns="${t=>t.ariaOwns}"
        aria-relevant="${t=>t.ariaRelevant}"
        aria-roledescription="${t=>t.ariaRoledescription}"
        ${z("control")}
    >
        ${He(i,e)}
        <span class="content" part="content">
            <slot ${Y("defaultSlottedContent")}></slot>
        </span>
        ${Le(i,e)}
    </a>
`;class T{}l([u({attribute:"aria-atomic"})],T.prototype,"ariaAtomic",void 0);l([u({attribute:"aria-busy"})],T.prototype,"ariaBusy",void 0);l([u({attribute:"aria-controls"})],T.prototype,"ariaControls",void 0);l([u({attribute:"aria-current"})],T.prototype,"ariaCurrent",void 0);l([u({attribute:"aria-describedby"})],T.prototype,"ariaDescribedby",void 0);l([u({attribute:"aria-details"})],T.prototype,"ariaDetails",void 0);l([u({attribute:"aria-disabled"})],T.prototype,"ariaDisabled",void 0);l([u({attribute:"aria-errormessage"})],T.prototype,"ariaErrormessage",void 0);l([u({attribute:"aria-flowto"})],T.prototype,"ariaFlowto",void 0);l([u({attribute:"aria-haspopup"})],T.prototype,"ariaHaspopup",void 0);l([u({attribute:"aria-hidden"})],T.prototype,"ariaHidden",void 0);l([u({attribute:"aria-invalid"})],T.prototype,"ariaInvalid",void 0);l([u({attribute:"aria-keyshortcuts"})],T.prototype,"ariaKeyshortcuts",void 0);l([u({attribute:"aria-label"})],T.prototype,"ariaLabel",void 0);l([u({attribute:"aria-labelledby"})],T.prototype,"ariaLabelledby",void 0);l([u({attribute:"aria-live"})],T.prototype,"ariaLive",void 0);l([u({attribute:"aria-owns"})],T.prototype,"ariaOwns",void 0);l([u({attribute:"aria-relevant"})],T.prototype,"ariaRelevant",void 0);l([u({attribute:"aria-roledescription"})],T.prototype,"ariaRoledescription",void 0);class ee extends k{constructor(){super(...arguments),this.handleUnsupportedDelegatesFocus=()=>{var e;window.ShadowRoot&&!window.ShadowRoot.prototype.hasOwnProperty("delegatesFocus")&&(!((e=this.$fastController.definition.shadowOptions)===null||e===void 0)&&e.delegatesFocus)&&(this.focus=()=>{var t;(t=this.control)===null||t===void 0||t.focus()})}}connectedCallback(){super.connectedCallback(),this.handleUnsupportedDelegatesFocus()}}l([u],ee.prototype,"download",void 0);l([u],ee.prototype,"href",void 0);l([u],ee.prototype,"hreflang",void 0);l([u],ee.prototype,"ping",void 0);l([u],ee.prototype,"referrerpolicy",void 0);l([u],ee.prototype,"rel",void 0);l([u],ee.prototype,"target",void 0);l([u],ee.prototype,"type",void 0);l([b],ee.prototype,"defaultSlottedContent",void 0);class li{}l([u({attribute:"aria-expanded"})],li.prototype,"ariaExpanded",void 0);W(li,T);W(ee,Fe,li);const to=i=>{const e=i.closest("[dir]");return e!==null&&e.dir==="rtl"?Pe.rtl:Pe.ltr},Cs=(i,e)=>C`
    <template class="${t=>t.circular?"circular":""}">
        <div class="control" part="control" style="${t=>t.generateBadgeStyle()}">
            <slot></slot>
        </div>
    </template>
`;let rt=class extends k{constructor(){super(...arguments),this.generateBadgeStyle=()=>{if(!this.fill&&!this.color)return;const e=`background-color: var(--badge-fill-${this.fill});`,t=`color: var(--badge-color-${this.color});`;return this.fill&&!this.color?e:this.color&&!this.fill?t:`${t} ${e}`}}};l([u({attribute:"fill"})],rt.prototype,"fill",void 0);l([u({attribute:"color"})],rt.prototype,"color",void 0);l([u({mode:"boolean"})],rt.prototype,"circular",void 0);const io=(i,e)=>C`
    <button
        class="control"
        part="control"
        ?autofocus="${t=>t.autofocus}"
        ?disabled="${t=>t.disabled}"
        form="${t=>t.formId}"
        formaction="${t=>t.formaction}"
        formenctype="${t=>t.formenctype}"
        formmethod="${t=>t.formmethod}"
        formnovalidate="${t=>t.formnovalidate}"
        formtarget="${t=>t.formtarget}"
        name="${t=>t.name}"
        type="${t=>t.type}"
        value="${t=>t.value}"
        aria-atomic="${t=>t.ariaAtomic}"
        aria-busy="${t=>t.ariaBusy}"
        aria-controls="${t=>t.ariaControls}"
        aria-current="${t=>t.ariaCurrent}"
        aria-describedby="${t=>t.ariaDescribedby}"
        aria-details="${t=>t.ariaDetails}"
        aria-disabled="${t=>t.ariaDisabled}"
        aria-errormessage="${t=>t.ariaErrormessage}"
        aria-expanded="${t=>t.ariaExpanded}"
        aria-flowto="${t=>t.ariaFlowto}"
        aria-haspopup="${t=>t.ariaHaspopup}"
        aria-hidden="${t=>t.ariaHidden}"
        aria-invalid="${t=>t.ariaInvalid}"
        aria-keyshortcuts="${t=>t.ariaKeyshortcuts}"
        aria-label="${t=>t.ariaLabel}"
        aria-labelledby="${t=>t.ariaLabelledby}"
        aria-live="${t=>t.ariaLive}"
        aria-owns="${t=>t.ariaOwns}"
        aria-pressed="${t=>t.ariaPressed}"
        aria-relevant="${t=>t.ariaRelevant}"
        aria-roledescription="${t=>t.ariaRoledescription}"
        ${z("control")}
    >
        ${He(i,e)}
        <span class="content" part="content">
            <slot ${Y("defaultSlottedContent")}></slot>
        </span>
        ${Le(i,e)}
    </button>
`,Li="form-associated-proxy",Hi="ElementInternals",Vi=Hi in window&&"setFormValue"in window[Hi].prototype,Mi=new WeakMap;function at(i){const e=class extends i{constructor(...t){super(...t),this.dirtyValue=!1,this.disabled=!1,this.proxyEventsToBlock=["change","click"],this.proxyInitialized=!1,this.required=!1,this.initialValue=this.initialValue||"",this.elementInternals||(this.formResetCallback=this.formResetCallback.bind(this))}static get formAssociated(){return Vi}get validity(){return this.elementInternals?this.elementInternals.validity:this.proxy.validity}get form(){return this.elementInternals?this.elementInternals.form:this.proxy.form}get validationMessage(){return this.elementInternals?this.elementInternals.validationMessage:this.proxy.validationMessage}get willValidate(){return this.elementInternals?this.elementInternals.willValidate:this.proxy.willValidate}get labels(){if(this.elementInternals)return Object.freeze(Array.from(this.elementInternals.labels));if(this.proxy instanceof HTMLElement&&this.proxy.ownerDocument&&this.id){const t=this.proxy.labels,s=Array.from(this.proxy.getRootNode().querySelectorAll(`[for='${this.id}']`)),n=t?s.concat(Array.from(t)):s;return Object.freeze(n)}else return ve}valueChanged(t,s){this.dirtyValue=!0,this.proxy instanceof HTMLElement&&(this.proxy.value=this.value),this.currentValue=this.value,this.setFormValue(this.value),this.validate()}currentValueChanged(){this.value=this.currentValue}initialValueChanged(t,s){this.dirtyValue||(this.value=this.initialValue,this.dirtyValue=!1)}disabledChanged(t,s){this.proxy instanceof HTMLElement&&(this.proxy.disabled=this.disabled),x.queueUpdate(()=>this.classList.toggle("disabled",this.disabled))}nameChanged(t,s){this.proxy instanceof HTMLElement&&(this.proxy.name=this.name)}requiredChanged(t,s){this.proxy instanceof HTMLElement&&(this.proxy.required=this.required),x.queueUpdate(()=>this.classList.toggle("required",this.required)),this.validate()}get elementInternals(){if(!Vi)return null;let t=Mi.get(this);return t||(t=this.attachInternals(),Mi.set(this,t)),t}connectedCallback(){super.connectedCallback(),this.addEventListener("keypress",this._keypressHandler),this.value||(this.value=this.initialValue,this.dirtyValue=!1),this.elementInternals||(this.attachProxy(),this.form&&this.form.addEventListener("reset",this.formResetCallback))}disconnectedCallback(){super.disconnectedCallback(),this.proxyEventsToBlock.forEach(t=>this.proxy.removeEventListener(t,this.stopPropagation)),!this.elementInternals&&this.form&&this.form.removeEventListener("reset",this.formResetCallback)}checkValidity(){return this.elementInternals?this.elementInternals.checkValidity():this.proxy.checkValidity()}reportValidity(){return this.elementInternals?this.elementInternals.reportValidity():this.proxy.reportValidity()}setValidity(t,s,n){this.elementInternals?this.elementInternals.setValidity(t,s,n):typeof s=="string"&&this.proxy.setCustomValidity(s)}formDisabledCallback(t){this.disabled=t}formResetCallback(){this.value=this.initialValue,this.dirtyValue=!1}attachProxy(){var t;this.proxyInitialized||(this.proxyInitialized=!0,this.proxy.style.display="none",this.proxyEventsToBlock.forEach(s=>this.proxy.addEventListener(s,this.stopPropagation)),this.proxy.disabled=this.disabled,this.proxy.required=this.required,typeof this.name=="string"&&(this.proxy.name=this.name),typeof this.value=="string"&&(this.proxy.value=this.value),this.proxy.setAttribute("slot",Li),this.proxySlot=document.createElement("slot"),this.proxySlot.setAttribute("name",Li)),(t=this.shadowRoot)===null||t===void 0||t.appendChild(this.proxySlot),this.appendChild(this.proxy)}detachProxy(){var t;this.removeChild(this.proxy),(t=this.shadowRoot)===null||t===void 0||t.removeChild(this.proxySlot)}validate(t){this.proxy instanceof HTMLElement&&this.setValidity(this.proxy.validity,this.proxy.validationMessage,t)}setFormValue(t,s){this.elementInternals&&this.elementInternals.setFormValue(t,s||t)}_keypressHandler(t){switch(t.key){case nt:if(this.form instanceof HTMLFormElement){const s=this.form.querySelector("[type=submit]");s?.click()}break}}stopPropagation(t){t.stopPropagation()}};return u({mode:"boolean"})(e.prototype,"disabled"),u({mode:"fromView",attribute:"value"})(e.prototype,"initialValue"),u({attribute:"current-value"})(e.prototype,"currentValue"),u(e.prototype,"name"),u({mode:"boolean"})(e.prototype,"required"),b(e.prototype,"value"),e}function ks(i){class e extends at(i){}class t extends e{constructor(...n){super(n),this.dirtyChecked=!1,this.checkedAttribute=!1,this.checked=!1,this.dirtyChecked=!1}checkedAttributeChanged(){this.defaultChecked=this.checkedAttribute}defaultCheckedChanged(){this.dirtyChecked||(this.checked=this.defaultChecked,this.dirtyChecked=!1)}checkedChanged(n,o){this.dirtyChecked||(this.dirtyChecked=!0),this.currentChecked=this.checked,this.updateForm(),this.proxy instanceof HTMLInputElement&&(this.proxy.checked=this.checked),n!==void 0&&this.$emit("change"),this.validate()}currentCheckedChanged(n,o){this.checked=this.currentChecked}updateForm(){const n=this.checked?this.value:null;this.setFormValue(n,n)}connectedCallback(){super.connectedCallback(),this.updateForm()}formResetCallback(){super.formResetCallback(),this.checked=!!this.checkedAttribute,this.dirtyChecked=!1}}return u({attribute:"checked",mode:"boolean"})(t.prototype,"checkedAttribute"),u({attribute:"current-checked",converter:ls})(t.prototype,"currentChecked"),b(t.prototype,"defaultChecked"),b(t.prototype,"checked"),t}class so extends k{}class no extends at(so){constructor(){super(...arguments),this.proxy=document.createElement("input")}}let te=class extends no{constructor(){super(...arguments),this.handleClick=e=>{var t;this.disabled&&((t=this.defaultSlottedContent)===null||t===void 0?void 0:t.length)<=1&&e.stopPropagation()},this.handleSubmission=()=>{if(!this.form)return;const e=this.proxy.isConnected;e||this.attachProxy(),typeof this.form.requestSubmit=="function"?this.form.requestSubmit(this.proxy):this.proxy.click(),e||this.detachProxy()},this.handleFormReset=()=>{var e;(e=this.form)===null||e===void 0||e.reset()},this.handleUnsupportedDelegatesFocus=()=>{var e;window.ShadowRoot&&!window.ShadowRoot.prototype.hasOwnProperty("delegatesFocus")&&(!((e=this.$fastController.definition.shadowOptions)===null||e===void 0)&&e.delegatesFocus)&&(this.focus=()=>{this.control.focus()})}}formactionChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.formAction=this.formaction)}formenctypeChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.formEnctype=this.formenctype)}formmethodChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.formMethod=this.formmethod)}formnovalidateChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.formNoValidate=this.formnovalidate)}formtargetChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.formTarget=this.formtarget)}typeChanged(e,t){this.proxy instanceof HTMLInputElement&&(this.proxy.type=this.type),t==="submit"&&this.addEventListener("click",this.handleSubmission),e==="submit"&&this.removeEventListener("click",this.handleSubmission),t==="reset"&&this.addEventListener("click",this.handleFormReset),e==="reset"&&this.removeEventListener("click",this.handleFormReset)}validate(){super.validate(this.control)}connectedCallback(){var e;super.connectedCallback(),this.proxy.setAttribute("type",this.type),this.handleUnsupportedDelegatesFocus();const t=Array.from((e=this.control)===null||e===void 0?void 0:e.children);t&&t.forEach(s=>{s.addEventListener("click",this.handleClick)})}disconnectedCallback(){var e;super.disconnectedCallback();const t=Array.from((e=this.control)===null||e===void 0?void 0:e.children);t&&t.forEach(s=>{s.removeEventListener("click",this.handleClick)})}};l([u({mode:"boolean"})],te.prototype,"autofocus",void 0);l([u({attribute:"form"})],te.prototype,"formId",void 0);l([u],te.prototype,"formaction",void 0);l([u],te.prototype,"formenctype",void 0);l([u],te.prototype,"formmethod",void 0);l([u({mode:"boolean"})],te.prototype,"formnovalidate",void 0);l([u],te.prototype,"formtarget",void 0);l([u],te.prototype,"type",void 0);l([b],te.prototype,"defaultSlottedContent",void 0);class It{}l([u({attribute:"aria-expanded"})],It.prototype,"ariaExpanded",void 0);l([u({attribute:"aria-pressed"})],It.prototype,"ariaPressed",void 0);W(It,T);W(te,Fe,It);const pt={none:"none",default:"default",sticky:"sticky"},le={default:"default",columnHeader:"columnheader",rowHeader:"rowheader"},Ze={default:"default",header:"header",stickyHeader:"sticky-header"};let L=class extends k{constructor(){super(...arguments),this.rowType=Ze.default,this.rowData=null,this.columnDefinitions=null,this.isActiveRow=!1,this.cellsRepeatBehavior=null,this.cellsPlaceholder=null,this.focusColumnIndex=0,this.refocusOnLoad=!1,this.updateRowStyle=()=>{this.style.gridTemplateColumns=this.gridTemplateColumns}}gridTemplateColumnsChanged(){this.$fastController.isConnected&&this.updateRowStyle()}rowTypeChanged(){this.$fastController.isConnected&&this.updateItemTemplate()}rowDataChanged(){if(this.rowData!==null&&this.isActiveRow){this.refocusOnLoad=!0;return}}cellItemTemplateChanged(){this.updateItemTemplate()}headerCellItemTemplateChanged(){this.updateItemTemplate()}connectedCallback(){super.connectedCallback(),this.cellsRepeatBehavior===null&&(this.cellsPlaceholder=document.createComment(""),this.appendChild(this.cellsPlaceholder),this.updateItemTemplate(),this.cellsRepeatBehavior=new bs(e=>e.columnDefinitions,e=>e.activeCellItemTemplate,{positioning:!0}).createBehavior(this.cellsPlaceholder),this.$fastController.addBehaviors([this.cellsRepeatBehavior])),this.addEventListener("cell-focused",this.handleCellFocus),this.addEventListener(De,this.handleFocusout),this.addEventListener(Be,this.handleKeydown),this.updateRowStyle(),this.refocusOnLoad&&(this.refocusOnLoad=!1,this.cellElements.length>this.focusColumnIndex&&this.cellElements[this.focusColumnIndex].focus())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("cell-focused",this.handleCellFocus),this.removeEventListener(De,this.handleFocusout),this.removeEventListener(Be,this.handleKeydown)}handleFocusout(e){this.contains(e.target)||(this.isActiveRow=!1,this.focusColumnIndex=0)}handleCellFocus(e){this.isActiveRow=!0,this.focusColumnIndex=this.cellElements.indexOf(e.target),this.$emit("row-focused",this)}handleKeydown(e){if(e.defaultPrevented)return;let t=0;switch(e.key){case tt:t=Math.max(0,this.focusColumnIndex-1),this.cellElements[t].focus(),e.preventDefault();break;case it:t=Math.min(this.cellElements.length-1,this.focusColumnIndex+1),this.cellElements[t].focus(),e.preventDefault();break;case Ve:e.ctrlKey||(this.cellElements[0].focus(),e.preventDefault());break;case Me:e.ctrlKey||(this.cellElements[this.cellElements.length-1].focus(),e.preventDefault());break}}updateItemTemplate(){this.activeCellItemTemplate=this.rowType===Ze.default&&this.cellItemTemplate!==void 0?this.cellItemTemplate:this.rowType===Ze.default&&this.cellItemTemplate===void 0?this.defaultCellItemTemplate:this.headerCellItemTemplate!==void 0?this.headerCellItemTemplate:this.defaultHeaderCellItemTemplate}};l([u({attribute:"grid-template-columns"})],L.prototype,"gridTemplateColumns",void 0);l([u({attribute:"row-type"})],L.prototype,"rowType",void 0);l([b],L.prototype,"rowData",void 0);l([b],L.prototype,"columnDefinitions",void 0);l([b],L.prototype,"cellItemTemplate",void 0);l([b],L.prototype,"headerCellItemTemplate",void 0);l([b],L.prototype,"rowIndex",void 0);l([b],L.prototype,"isActiveRow",void 0);l([b],L.prototype,"activeCellItemTemplate",void 0);l([b],L.prototype,"defaultCellItemTemplate",void 0);l([b],L.prototype,"defaultHeaderCellItemTemplate",void 0);l([b],L.prototype,"cellElements",void 0);function oo(i){const e=i.tagFor(L);return C`
    <${e}
        :rowData="${t=>t}"
        :cellItemTemplate="${(t,s)=>s.parent.cellItemTemplate}"
        :headerCellItemTemplate="${(t,s)=>s.parent.headerCellItemTemplate}"
    ></${e}>
`}const ro=(i,e)=>{const t=oo(i),s=i.tagFor(L);return C`
        <template
            role="grid"
            tabindex="0"
            :rowElementTag="${()=>s}"
            :defaultRowItemTemplate="${t}"
            ${ms({property:"rowElements",filter:oi("[role=row]")})}
        >
            <slot></slot>
        </template>
    `};let H=class Qt extends k{constructor(){super(),this.noTabbing=!1,this.generateHeader=pt.default,this.rowsData=[],this.columnDefinitions=null,this.focusRowIndex=0,this.focusColumnIndex=0,this.rowsPlaceholder=null,this.generatedHeader=null,this.isUpdatingFocus=!1,this.pendingFocusUpdate=!1,this.rowindexUpdateQueued=!1,this.columnDefinitionsStale=!0,this.generatedGridTemplateColumns="",this.focusOnCell=(e,t,s)=>{if(this.rowElements.length===0){this.focusRowIndex=0,this.focusColumnIndex=0;return}const n=Math.max(0,Math.min(this.rowElements.length-1,e)),r=this.rowElements[n].querySelectorAll('[role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"]'),a=Math.max(0,Math.min(r.length-1,t)),c=r[a];s&&this.scrollHeight!==this.clientHeight&&(n<this.focusRowIndex&&this.scrollTop>0||n>this.focusRowIndex&&this.scrollTop<this.scrollHeight-this.clientHeight)&&c.scrollIntoView({block:"center",inline:"center"}),c.focus()},this.onChildListChange=(e,t)=>{e&&e.length&&(e.forEach(s=>{s.addedNodes.forEach(n=>{n.nodeType===1&&n.getAttribute("role")==="row"&&(n.columnDefinitions=this.columnDefinitions)})}),this.queueRowIndexUpdate())},this.queueRowIndexUpdate=()=>{this.rowindexUpdateQueued||(this.rowindexUpdateQueued=!0,x.queueUpdate(this.updateRowIndexes))},this.updateRowIndexes=()=>{let e=this.gridTemplateColumns;if(e===void 0){if(this.generatedGridTemplateColumns===""&&this.rowElements.length>0){const t=this.rowElements[0];this.generatedGridTemplateColumns=new Array(t.cellElements.length).fill("1fr").join(" ")}e=this.generatedGridTemplateColumns}this.rowElements.forEach((t,s)=>{const n=t;n.rowIndex=s,n.gridTemplateColumns=e,this.columnDefinitionsStale&&(n.columnDefinitions=this.columnDefinitions)}),this.rowindexUpdateQueued=!1,this.columnDefinitionsStale=!1}}static generateTemplateColumns(e){let t="";return e.forEach(s=>{t=`${t}${t===""?"":" "}1fr`}),t}noTabbingChanged(){this.$fastController.isConnected&&(this.noTabbing?this.setAttribute("tabIndex","-1"):this.setAttribute("tabIndex",this.contains(document.activeElement)||this===document.activeElement?"-1":"0"))}generateHeaderChanged(){this.$fastController.isConnected&&this.toggleGeneratedHeader()}gridTemplateColumnsChanged(){this.$fastController.isConnected&&this.updateRowIndexes()}rowsDataChanged(){this.columnDefinitions===null&&this.rowsData.length>0&&(this.columnDefinitions=Qt.generateColumns(this.rowsData[0])),this.$fastController.isConnected&&this.toggleGeneratedHeader()}columnDefinitionsChanged(){if(this.columnDefinitions===null){this.generatedGridTemplateColumns="";return}this.generatedGridTemplateColumns=Qt.generateTemplateColumns(this.columnDefinitions),this.$fastController.isConnected&&(this.columnDefinitionsStale=!0,this.queueRowIndexUpdate())}headerCellItemTemplateChanged(){this.$fastController.isConnected&&this.generatedHeader!==null&&(this.generatedHeader.headerCellItemTemplate=this.headerCellItemTemplate)}focusRowIndexChanged(){this.$fastController.isConnected&&this.queueFocusUpdate()}focusColumnIndexChanged(){this.$fastController.isConnected&&this.queueFocusUpdate()}connectedCallback(){super.connectedCallback(),this.rowItemTemplate===void 0&&(this.rowItemTemplate=this.defaultRowItemTemplate),this.rowsPlaceholder=document.createComment(""),this.appendChild(this.rowsPlaceholder),this.toggleGeneratedHeader(),this.rowsRepeatBehavior=new bs(e=>e.rowsData,e=>e.rowItemTemplate,{positioning:!0}).createBehavior(this.rowsPlaceholder),this.$fastController.addBehaviors([this.rowsRepeatBehavior]),this.addEventListener("row-focused",this.handleRowFocus),this.addEventListener(Bi,this.handleFocus),this.addEventListener(Be,this.handleKeydown),this.addEventListener(De,this.handleFocusOut),this.observer=new MutationObserver(this.onChildListChange),this.observer.observe(this,{childList:!0}),this.noTabbing&&this.setAttribute("tabindex","-1"),x.queueUpdate(this.queueRowIndexUpdate)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("row-focused",this.handleRowFocus),this.removeEventListener(Bi,this.handleFocus),this.removeEventListener(Be,this.handleKeydown),this.removeEventListener(De,this.handleFocusOut),this.observer.disconnect(),this.rowsPlaceholder=null,this.generatedHeader=null}handleRowFocus(e){this.isUpdatingFocus=!0;const t=e.target;this.focusRowIndex=this.rowElements.indexOf(t),this.focusColumnIndex=t.focusColumnIndex,this.setAttribute("tabIndex","-1"),this.isUpdatingFocus=!1}handleFocus(e){this.focusOnCell(this.focusRowIndex,this.focusColumnIndex,!0)}handleFocusOut(e){(e.relatedTarget===null||!this.contains(e.relatedTarget))&&this.setAttribute("tabIndex",this.noTabbing?"-1":"0")}handleKeydown(e){if(e.defaultPrevented)return;let t;const s=this.rowElements.length-1,n=this.offsetHeight+this.scrollTop,o=this.rowElements[s];switch(e.key){case xe:e.preventDefault(),this.focusOnCell(this.focusRowIndex-1,this.focusColumnIndex,!0);break;case ye:e.preventDefault(),this.focusOnCell(this.focusRowIndex+1,this.focusColumnIndex,!0);break;case Yn:if(e.preventDefault(),this.rowElements.length===0){this.focusOnCell(0,0,!1);break}if(this.focusRowIndex===0){this.focusOnCell(0,this.focusColumnIndex,!1);return}for(t=this.focusRowIndex-1,t;t>=0;t--){const r=this.rowElements[t];if(r.offsetTop<this.scrollTop){this.scrollTop=r.offsetTop+r.clientHeight-this.clientHeight;break}}this.focusOnCell(t,this.focusColumnIndex,!1);break;case Xn:if(e.preventDefault(),this.rowElements.length===0){this.focusOnCell(0,0,!1);break}if(this.focusRowIndex>=s||o.offsetTop+o.offsetHeight<=n){this.focusOnCell(s,this.focusColumnIndex,!1);return}for(t=this.focusRowIndex+1,t;t<=s;t++){const r=this.rowElements[t];if(r.offsetTop+r.offsetHeight>n){let a=0;this.generateHeader===pt.sticky&&this.generatedHeader!==null&&(a=this.generatedHeader.clientHeight),this.scrollTop=r.offsetTop-a;break}}this.focusOnCell(t,this.focusColumnIndex,!1);break;case Ve:e.ctrlKey&&(e.preventDefault(),this.focusOnCell(0,0,!0));break;case Me:e.ctrlKey&&this.columnDefinitions!==null&&(e.preventDefault(),this.focusOnCell(this.rowElements.length-1,this.columnDefinitions.length-1,!0));break}}queueFocusUpdate(){this.isUpdatingFocus&&(this.contains(document.activeElement)||this===document.activeElement)||this.pendingFocusUpdate===!1&&(this.pendingFocusUpdate=!0,x.queueUpdate(()=>this.updateFocus()))}updateFocus(){this.pendingFocusUpdate=!1,this.focusOnCell(this.focusRowIndex,this.focusColumnIndex,!0)}toggleGeneratedHeader(){if(this.generatedHeader!==null&&(this.removeChild(this.generatedHeader),this.generatedHeader=null),this.generateHeader!==pt.none&&this.rowsData.length>0){const e=document.createElement(this.rowElementTag);this.generatedHeader=e,this.generatedHeader.columnDefinitions=this.columnDefinitions,this.generatedHeader.gridTemplateColumns=this.gridTemplateColumns,this.generatedHeader.rowType=this.generateHeader===pt.sticky?Ze.stickyHeader:Ze.header,(this.firstChild!==null||this.rowsPlaceholder!==null)&&this.insertBefore(e,this.firstChild!==null?this.firstChild:this.rowsPlaceholder);return}}};H.generateColumns=i=>Object.getOwnPropertyNames(i).map((e,t)=>({columnDataKey:e,gridColumn:`${t}`}));l([u({attribute:"no-tabbing",mode:"boolean"})],H.prototype,"noTabbing",void 0);l([u({attribute:"generate-header"})],H.prototype,"generateHeader",void 0);l([u({attribute:"grid-template-columns"})],H.prototype,"gridTemplateColumns",void 0);l([b],H.prototype,"rowsData",void 0);l([b],H.prototype,"columnDefinitions",void 0);l([b],H.prototype,"rowItemTemplate",void 0);l([b],H.prototype,"cellItemTemplate",void 0);l([b],H.prototype,"headerCellItemTemplate",void 0);l([b],H.prototype,"focusRowIndex",void 0);l([b],H.prototype,"focusColumnIndex",void 0);l([b],H.prototype,"defaultRowItemTemplate",void 0);l([b],H.prototype,"rowElementTag",void 0);l([b],H.prototype,"rowElements",void 0);const ao=C`
    <template>
        ${i=>i.rowData===null||i.columnDefinition===null||i.columnDefinition.columnDataKey===null?null:i.rowData[i.columnDefinition.columnDataKey]}
    </template>
`,lo=C`
    <template>
        ${i=>i.columnDefinition===null?null:i.columnDefinition.title===void 0?i.columnDefinition.columnDataKey:i.columnDefinition.title}
    </template>
`;let ue=class extends k{constructor(){super(...arguments),this.cellType=le.default,this.rowData=null,this.columnDefinition=null,this.isActiveCell=!1,this.customCellView=null,this.updateCellStyle=()=>{this.style.gridColumn=this.gridColumn}}cellTypeChanged(){this.$fastController.isConnected&&this.updateCellView()}gridColumnChanged(){this.$fastController.isConnected&&this.updateCellStyle()}columnDefinitionChanged(e,t){this.$fastController.isConnected&&this.updateCellView()}connectedCallback(){var e;super.connectedCallback(),this.addEventListener(Pi,this.handleFocusin),this.addEventListener(De,this.handleFocusout),this.addEventListener(Be,this.handleKeydown),this.style.gridColumn=`${((e=this.columnDefinition)===null||e===void 0?void 0:e.gridColumn)===void 0?0:this.columnDefinition.gridColumn}`,this.updateCellView(),this.updateCellStyle()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener(Pi,this.handleFocusin),this.removeEventListener(De,this.handleFocusout),this.removeEventListener(Be,this.handleKeydown),this.disconnectCellView()}handleFocusin(e){if(!this.isActiveCell){switch(this.isActiveCell=!0,this.cellType){case le.columnHeader:if(this.columnDefinition!==null&&this.columnDefinition.headerCellInternalFocusQueue!==!0&&typeof this.columnDefinition.headerCellFocusTargetCallback=="function"){const t=this.columnDefinition.headerCellFocusTargetCallback(this);t!==null&&t.focus()}break;default:if(this.columnDefinition!==null&&this.columnDefinition.cellInternalFocusQueue!==!0&&typeof this.columnDefinition.cellFocusTargetCallback=="function"){const t=this.columnDefinition.cellFocusTargetCallback(this);t!==null&&t.focus()}break}this.$emit("cell-focused",this)}}handleFocusout(e){this!==document.activeElement&&!this.contains(document.activeElement)&&(this.isActiveCell=!1)}handleKeydown(e){if(!(e.defaultPrevented||this.columnDefinition===null||this.cellType===le.default&&this.columnDefinition.cellInternalFocusQueue!==!0||this.cellType===le.columnHeader&&this.columnDefinition.headerCellInternalFocusQueue!==!0))switch(e.key){case nt:case Qn:if(this.contains(document.activeElement)&&document.activeElement!==this)return;switch(this.cellType){case le.columnHeader:if(this.columnDefinition.headerCellFocusTargetCallback!==void 0){const t=this.columnDefinition.headerCellFocusTargetCallback(this);t!==null&&t.focus(),e.preventDefault()}break;default:if(this.columnDefinition.cellFocusTargetCallback!==void 0){const t=this.columnDefinition.cellFocusTargetCallback(this);t!==null&&t.focus(),e.preventDefault()}break}break;case Tt:this.contains(document.activeElement)&&document.activeElement!==this&&(this.focus(),e.preventDefault());break}}updateCellView(){if(this.disconnectCellView(),this.columnDefinition!==null)switch(this.cellType){case le.columnHeader:this.columnDefinition.headerCellTemplate!==void 0?this.customCellView=this.columnDefinition.headerCellTemplate.render(this,this):this.customCellView=lo.render(this,this);break;case void 0:case le.rowHeader:case le.default:this.columnDefinition.cellTemplate!==void 0?this.customCellView=this.columnDefinition.cellTemplate.render(this,this):this.customCellView=ao.render(this,this);break}}disconnectCellView(){this.customCellView!==null&&(this.customCellView.dispose(),this.customCellView=null)}};l([u({attribute:"cell-type"})],ue.prototype,"cellType",void 0);l([u({attribute:"grid-column"})],ue.prototype,"gridColumn",void 0);l([b],ue.prototype,"rowData",void 0);l([b],ue.prototype,"columnDefinition",void 0);function co(i){const e=i.tagFor(ue);return C`
    <${e}
        cell-type="${t=>t.isRowHeader?"rowheader":void 0}"
        grid-column="${(t,s)=>s.index+1}"
        :rowData="${(t,s)=>s.parent.rowData}"
        :columnDefinition="${t=>t}"
    ></${e}>
`}function ho(i){const e=i.tagFor(ue);return C`
    <${e}
        cell-type="columnheader"
        grid-column="${(t,s)=>s.index+1}"
        :columnDefinition="${t=>t}"
    ></${e}>
`}const uo=(i,e)=>{const t=co(i),s=ho(i);return C`
        <template
            role="row"
            class="${n=>n.rowType!=="default"?n.rowType:""}"
            :defaultCellItemTemplate="${t}"
            :defaultHeaderCellItemTemplate="${s}"
            ${ms({property:"cellElements",filter:oi('[role="cell"],[role="gridcell"],[role="columnheader"],[role="rowheader"]')})}
        >
            <slot ${Y("slottedCellElements")}></slot>
        </template>
    `},po=(i,e)=>C`
        <template
            tabindex="-1"
            role="${t=>!t.cellType||t.cellType==="default"?"gridcell":t.cellType}"
            class="
            ${t=>t.cellType==="columnheader"?"column-header":t.cellType==="rowheader"?"row-header":""}
            "
        >
            <slot></slot>
        </template>
    `,fo=(i,e)=>C`
    <template
        role="checkbox"
        aria-checked="${t=>t.checked}"
        aria-required="${t=>t.required}"
        aria-disabled="${t=>t.disabled}"
        aria-readonly="${t=>t.readOnly}"
        tabindex="${t=>t.disabled?null:0}"
        @keypress="${(t,s)=>t.keypressHandler(s.event)}"
        @click="${(t,s)=>t.clickHandler(s.event)}"
        class="${t=>t.readOnly?"readonly":""} ${t=>t.checked?"checked":""} ${t=>t.indeterminate?"indeterminate":""}"
    >
        <div part="control" class="control">
            <slot name="checked-indicator">
                ${e.checkedIndicator||""}
            </slot>
            <slot name="indeterminate-indicator">
                ${e.indeterminateIndicator||""}
            </slot>
        </div>
        <label
            part="label"
            class="${t=>t.defaultSlottedNodes&&t.defaultSlottedNodes.length?"label":"label label__hidden"}"
        >
            <slot ${Y("defaultSlottedNodes")}></slot>
        </label>
    </template>
`;class bo extends k{}class go extends ks(bo){constructor(){super(...arguments),this.proxy=document.createElement("input")}}let St=class extends go{constructor(){super(),this.initialValue="on",this.indeterminate=!1,this.keypressHandler=e=>{this.readOnly||e.key===ot&&(this.indeterminate&&(this.indeterminate=!1),this.checked=!this.checked)},this.clickHandler=e=>{!this.disabled&&!this.readOnly&&(this.indeterminate&&(this.indeterminate=!1),this.checked=!this.checked)},this.proxy.setAttribute("type","checkbox")}readOnlyChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.readOnly=this.readOnly)}};l([u({attribute:"readonly",mode:"boolean"})],St.prototype,"readOnly",void 0);l([b],St.prototype,"defaultSlottedNodes",void 0);l([b],St.prototype,"indeterminate",void 0);function Ts(i){return qn(i)&&(i.getAttribute("role")==="option"||i instanceof HTMLOptionElement)}class re extends k{constructor(e,t,s,n){super(),this.defaultSelected=!1,this.dirtySelected=!1,this.selected=this.defaultSelected,this.dirtyValue=!1,e&&(this.textContent=e),t&&(this.initialValue=t),s&&(this.defaultSelected=s),n&&(this.selected=n),this.proxy=new Option(`${this.textContent}`,this.initialValue,this.defaultSelected,this.selected),this.proxy.disabled=this.disabled}checkedChanged(e,t){if(typeof t=="boolean"){this.ariaChecked=t?"true":"false";return}this.ariaChecked=null}contentChanged(e,t){this.proxy instanceof HTMLOptionElement&&(this.proxy.textContent=this.textContent),this.$emit("contentchange",null,{bubbles:!0})}defaultSelectedChanged(){this.dirtySelected||(this.selected=this.defaultSelected,this.proxy instanceof HTMLOptionElement&&(this.proxy.selected=this.defaultSelected))}disabledChanged(e,t){this.ariaDisabled=this.disabled?"true":"false",this.proxy instanceof HTMLOptionElement&&(this.proxy.disabled=this.disabled)}selectedAttributeChanged(){this.defaultSelected=this.selectedAttribute,this.proxy instanceof HTMLOptionElement&&(this.proxy.defaultSelected=this.defaultSelected)}selectedChanged(){this.ariaSelected=this.selected?"true":"false",this.dirtySelected||(this.dirtySelected=!0),this.proxy instanceof HTMLOptionElement&&(this.proxy.selected=this.selected)}initialValueChanged(e,t){this.dirtyValue||(this.value=this.initialValue,this.dirtyValue=!1)}get label(){var e;return(e=this.value)!==null&&e!==void 0?e:this.text}get text(){var e,t;return(t=(e=this.textContent)===null||e===void 0?void 0:e.replace(/\s+/g," ").trim())!==null&&t!==void 0?t:""}set value(e){const t=`${e??""}`;this._value=t,this.dirtyValue=!0,this.proxy instanceof HTMLOptionElement&&(this.proxy.value=t),v.notify(this,"value")}get value(){var e;return v.track(this,"value"),(e=this._value)!==null&&e!==void 0?e:this.text}get form(){return this.proxy?this.proxy.form:null}}l([b],re.prototype,"checked",void 0);l([b],re.prototype,"content",void 0);l([b],re.prototype,"defaultSelected",void 0);l([u({mode:"boolean"})],re.prototype,"disabled",void 0);l([u({attribute:"selected",mode:"boolean"})],re.prototype,"selectedAttribute",void 0);l([b],re.prototype,"selected",void 0);l([u({attribute:"value",mode:"fromView"})],re.prototype,"initialValue",void 0);class Ne{}l([b],Ne.prototype,"ariaChecked",void 0);l([b],Ne.prototype,"ariaPosInSet",void 0);l([b],Ne.prototype,"ariaSelected",void 0);l([b],Ne.prototype,"ariaSetSize",void 0);W(Ne,T);W(re,Fe,Ne);class _ extends k{constructor(){super(...arguments),this._options=[],this.selectedIndex=-1,this.selectedOptions=[],this.shouldSkipFocus=!1,this.typeaheadBuffer="",this.typeaheadExpired=!0,this.typeaheadTimeout=-1}get firstSelectedOption(){var e;return(e=this.selectedOptions[0])!==null&&e!==void 0?e:null}get hasSelectableOptions(){return this.options.length>0&&!this.options.every(e=>e.disabled)}get length(){var e,t;return(t=(e=this.options)===null||e===void 0?void 0:e.length)!==null&&t!==void 0?t:0}get options(){return v.track(this,"options"),this._options}set options(e){this._options=e,v.notify(this,"options")}get typeAheadExpired(){return this.typeaheadExpired}set typeAheadExpired(e){this.typeaheadExpired=e}clickHandler(e){const t=e.target.closest("option,[role=option]");if(t&&!t.disabled)return this.selectedIndex=this.options.indexOf(t),!0}focusAndScrollOptionIntoView(e=this.firstSelectedOption){this.contains(document.activeElement)&&e!==null&&(e.focus(),requestAnimationFrame(()=>{e.scrollIntoView({block:"nearest"})}))}focusinHandler(e){!this.shouldSkipFocus&&e.target===e.currentTarget&&(this.setSelectedOptions(),this.focusAndScrollOptionIntoView()),this.shouldSkipFocus=!1}getTypeaheadMatches(){const e=this.typeaheadBuffer.replace(/[.*+\-?^${}()|[\]\\]/g,"\\$&"),t=new RegExp(`^${e}`,"gi");return this.options.filter(s=>s.text.trim().match(t))}getSelectableIndex(e=this.selectedIndex,t){const s=e>t?-1:e<t?1:0,n=e+s;let o=null;switch(s){case-1:{o=this.options.reduceRight((r,a,c)=>!r&&!a.disabled&&c<n?a:r,o);break}case 1:{o=this.options.reduce((r,a,c)=>!r&&!a.disabled&&c>n?a:r,o);break}}return this.options.indexOf(o)}handleChange(e,t){t==="selected"&&(_.slottedOptionFilter(e)&&(this.selectedIndex=this.options.indexOf(e)),this.setSelectedOptions())}handleTypeAhead(e){this.typeaheadTimeout&&window.clearTimeout(this.typeaheadTimeout),this.typeaheadTimeout=window.setTimeout(()=>this.typeaheadExpired=!0,_.TYPE_AHEAD_TIMEOUT_MS),!(e.length>1)&&(this.typeaheadBuffer=`${this.typeaheadExpired?"":this.typeaheadBuffer}${e}`)}keydownHandler(e){if(this.disabled)return!0;this.shouldSkipFocus=!1;const t=e.key;switch(t){case Ve:{e.shiftKey||(e.preventDefault(),this.selectFirstOption());break}case ye:{e.shiftKey||(e.preventDefault(),this.selectNextOption());break}case xe:{e.shiftKey||(e.preventDefault(),this.selectPreviousOption());break}case Me:{e.preventDefault(),this.selectLastOption();break}case ai:return this.focusAndScrollOptionIntoView(),!0;case nt:case Tt:return!0;case ot:if(this.typeaheadExpired)return!0;default:return t.length===1&&this.handleTypeAhead(`${t}`),!0}}mousedownHandler(e){return this.shouldSkipFocus=!this.contains(document.activeElement),!0}multipleChanged(e,t){this.ariaMultiSelectable=t?"true":null}selectedIndexChanged(e,t){var s;if(!this.hasSelectableOptions){this.selectedIndex=-1;return}if(!((s=this.options[this.selectedIndex])===null||s===void 0)&&s.disabled&&typeof e=="number"){const n=this.getSelectableIndex(e,t),o=n>-1?n:e;this.selectedIndex=o,t===o&&this.selectedIndexChanged(t,o);return}this.setSelectedOptions()}selectedOptionsChanged(e,t){var s;const n=t.filter(_.slottedOptionFilter);(s=this.options)===null||s===void 0||s.forEach(o=>{const r=v.getNotifier(o);r.unsubscribe(this,"selected"),o.selected=n.includes(o),r.subscribe(this,"selected")})}selectFirstOption(){var e,t;this.disabled||(this.selectedIndex=(t=(e=this.options)===null||e===void 0?void 0:e.findIndex(s=>!s.disabled))!==null&&t!==void 0?t:-1)}selectLastOption(){this.disabled||(this.selectedIndex=jn(this.options,e=>!e.disabled))}selectNextOption(){!this.disabled&&this.selectedIndex<this.options.length-1&&(this.selectedIndex+=1)}selectPreviousOption(){!this.disabled&&this.selectedIndex>0&&(this.selectedIndex=this.selectedIndex-1)}setDefaultSelectedOption(){var e,t;this.selectedIndex=(t=(e=this.options)===null||e===void 0?void 0:e.findIndex(s=>s.defaultSelected))!==null&&t!==void 0?t:-1}setSelectedOptions(){var e,t,s;!((e=this.options)===null||e===void 0)&&e.length&&(this.selectedOptions=[this.options[this.selectedIndex]],this.ariaActiveDescendant=(s=(t=this.firstSelectedOption)===null||t===void 0?void 0:t.id)!==null&&s!==void 0?s:"",this.focusAndScrollOptionIntoView())}slottedOptionsChanged(e,t){this.options=t.reduce((n,o)=>(Ts(o)&&n.push(o),n),[]);const s=`${this.options.length}`;this.options.forEach((n,o)=>{n.id||(n.id=$t("option-")),n.ariaPosInSet=`${o+1}`,n.ariaSetSize=s}),this.$fastController.isConnected&&(this.setSelectedOptions(),this.setDefaultSelectedOption())}typeaheadBufferChanged(e,t){if(this.$fastController.isConnected){const s=this.getTypeaheadMatches();if(s.length){const n=this.options.indexOf(s[0]);n>-1&&(this.selectedIndex=n)}this.typeaheadExpired=!1}}}_.slottedOptionFilter=i=>Ts(i)&&!i.hidden;_.TYPE_AHEAD_TIMEOUT_MS=1e3;l([u({mode:"boolean"})],_.prototype,"disabled",void 0);l([b],_.prototype,"selectedIndex",void 0);l([b],_.prototype,"selectedOptions",void 0);l([b],_.prototype,"slottedOptions",void 0);l([b],_.prototype,"typeaheadBuffer",void 0);class we{}l([b],we.prototype,"ariaActiveDescendant",void 0);l([b],we.prototype,"ariaDisabled",void 0);l([b],we.prototype,"ariaExpanded",void 0);l([b],we.prototype,"ariaMultiSelectable",void 0);W(we,T);W(_,we);const Nt={above:"above",below:"below"};function Xt(i){const e=i.parentElement;if(e)return e;{const t=i.getRootNode();if(t.host instanceof HTMLElement)return t.host}return null}function mo(i,e){let t=e;for(;t!==null;){if(t===i)return!0;t=Xt(t)}return!1}const oe=document.createElement("div");function vo(i){return i instanceof kt}class ci{setProperty(e,t){x.queueUpdate(()=>this.target.setProperty(e,t))}removeProperty(e){x.queueUpdate(()=>this.target.removeProperty(e))}}class yo extends ci{constructor(e){super();const t=new CSSStyleSheet;t[ns]=!0,this.target=t.cssRules[t.insertRule(":host{}")].style,e.$fastController.addStyles(q.create([t]))}}class xo extends ci{constructor(){super();const e=new CSSStyleSheet;this.target=e.cssRules[e.insertRule(":root{}")].style,document.adoptedStyleSheets=[...document.adoptedStyleSheets,e]}}class wo extends ci{constructor(){super(),this.style=document.createElement("style"),document.head.appendChild(this.style);const{sheet:e}=this.style;if(e){const t=e.insertRule(":root{}",e.cssRules.length);this.target=e.cssRules[t].style}}}class Is{constructor(e){this.store=new Map,this.target=null;const t=e.$fastController;this.style=document.createElement("style"),t.addStyles(this.style),v.getNotifier(t).subscribe(this,"isConnected"),this.handleChange(t,"isConnected")}targetChanged(){if(this.target!==null)for(const[e,t]of this.store.entries())this.target.setProperty(e,t)}setProperty(e,t){this.store.set(e,t),x.queueUpdate(()=>{this.target!==null&&this.target.setProperty(e,t)})}removeProperty(e){this.store.delete(e),x.queueUpdate(()=>{this.target!==null&&this.target.removeProperty(e)})}handleChange(e,t){const{sheet:s}=this.style;if(s){const n=s.insertRule(":host{}",s.cssRules.length);this.target=s.cssRules[n].style}else this.target=null}}l([b],Is.prototype,"target",void 0);class $o{constructor(e){this.target=e.style}setProperty(e,t){x.queueUpdate(()=>this.target.setProperty(e,t))}removeProperty(e){x.queueUpdate(()=>this.target.removeProperty(e))}}class B{setProperty(e,t){B.properties[e]=t;for(const s of B.roots.values())Ie.getOrCreate(B.normalizeRoot(s)).setProperty(e,t)}removeProperty(e){delete B.properties[e];for(const t of B.roots.values())Ie.getOrCreate(B.normalizeRoot(t)).removeProperty(e)}static registerRoot(e){const{roots:t}=B;if(!t.has(e)){t.add(e);const s=Ie.getOrCreate(this.normalizeRoot(e));for(const n in B.properties)s.setProperty(n,B.properties[n])}}static unregisterRoot(e){const{roots:t}=B;if(t.has(e)){t.delete(e);const s=Ie.getOrCreate(B.normalizeRoot(e));for(const n in B.properties)s.removeProperty(n)}}static normalizeRoot(e){return e===oe?document:e}}B.roots=new Set;B.properties={};const _t=new WeakMap,Co=x.supportsAdoptedStyleSheets?yo:Is,Ie=Object.freeze({getOrCreate(i){if(_t.has(i))return _t.get(i);let e;return i===oe?e=new B:i instanceof Document?e=x.supportsAdoptedStyleSheets?new xo:new wo:vo(i)?e=new Co(i):e=new $o(i),_t.set(i,e),e}});class N extends ds{constructor(e){super(),this.subscribers=new WeakMap,this._appliedTo=new Set,this.name=e.name,e.cssCustomPropertyName!==null&&(this.cssCustomProperty=`--${e.cssCustomPropertyName}`,this.cssVar=`var(${this.cssCustomProperty})`),this.id=N.uniqueId(),N.tokensById.set(this.id,this)}get appliedTo(){return[...this._appliedTo]}static from(e){return new N({name:typeof e=="string"?e:e.name,cssCustomPropertyName:typeof e=="string"?e:e.cssCustomPropertyName===void 0?e.name:e.cssCustomPropertyName})}static isCSSDesignToken(e){return typeof e.cssCustomProperty=="string"}static isDerivedDesignTokenValue(e){return typeof e=="function"}static getTokenById(e){return N.tokensById.get(e)}getOrCreateSubscriberSet(e=this){return this.subscribers.get(e)||this.subscribers.set(e,new Set)&&this.subscribers.get(e)}createCSS(){return this.cssVar||""}getValueFor(e){const t=A.getOrCreate(e).get(this);if(t!==void 0)return t;throw new Error(`Value could not be retrieved for token named "${this.name}". Ensure the value is set for ${e} or an ancestor of ${e}.`)}setValueFor(e,t){return this._appliedTo.add(e),t instanceof N&&(t=this.alias(t)),A.getOrCreate(e).set(this,t),this}deleteValueFor(e){return this._appliedTo.delete(e),A.existsFor(e)&&A.getOrCreate(e).delete(this),this}withDefault(e){return this.setValueFor(oe,e),this}subscribe(e,t){const s=this.getOrCreateSubscriberSet(t);t&&!A.existsFor(t)&&A.getOrCreate(t),s.has(e)||s.add(e)}unsubscribe(e,t){const s=this.subscribers.get(t||this);s&&s.has(e)&&s.delete(e)}notify(e){const t=Object.freeze({token:this,target:e});this.subscribers.has(this)&&this.subscribers.get(this).forEach(s=>s.handleChange(t)),this.subscribers.has(e)&&this.subscribers.get(e).forEach(s=>s.handleChange(t))}alias(e){return(t=>e.getValueFor(t))}}N.uniqueId=(()=>{let i=0;return()=>(i++,i.toString(16))})();N.tokensById=new Map;class ko{startReflection(e,t){e.subscribe(this,t),this.handleChange({token:e,target:t})}stopReflection(e,t){e.unsubscribe(this,t),this.remove(e,t)}handleChange(e){const{token:t,target:s}=e;this.add(t,s)}add(e,t){Ie.getOrCreate(t).setProperty(e.cssCustomProperty,this.resolveCSSValue(A.getOrCreate(t).get(e)))}remove(e,t){Ie.getOrCreate(t).removeProperty(e.cssCustomProperty)}resolveCSSValue(e){return e&&typeof e.createCSS=="function"?e.createCSS():e}}class To{constructor(e,t,s){this.source=e,this.token=t,this.node=s,this.dependencies=new Set,this.observer=v.binding(e,this,!1),this.observer.handleChange=this.observer.call,this.handleChange()}disconnect(){this.observer.disconnect()}handleChange(){try{this.node.store.set(this.token,this.observer.observe(this.node.target,Xe))}catch(e){console.error(e)}}}class Io{constructor(){this.values=new Map}set(e,t){this.values.get(e)!==t&&(this.values.set(e,t),v.getNotifier(this).notify(e.id))}get(e){return v.track(this,e.id),this.values.get(e)}delete(e){this.values.delete(e),v.getNotifier(this).notify(e.id)}all(){return this.values.entries()}}const qe=new WeakMap,Ge=new WeakMap;class A{constructor(e){this.target=e,this.store=new Io,this.children=[],this.assignedValues=new Map,this.reflecting=new Set,this.bindingObservers=new Map,this.tokenValueChangeHandler={handleChange:(t,s)=>{const n=N.getTokenById(s);n&&(n.notify(this.target),this.updateCSSTokenReflection(t,n))}},qe.set(e,this),v.getNotifier(this.store).subscribe(this.tokenValueChangeHandler),e instanceof kt?e.$fastController.addBehaviors([this]):e.isConnected&&this.bind()}static getOrCreate(e){return qe.get(e)||new A(e)}static existsFor(e){return qe.has(e)}static findParent(e){if(oe!==e.target){let t=Xt(e.target);for(;t!==null;){if(qe.has(t))return qe.get(t);t=Xt(t)}return A.getOrCreate(oe)}return null}static findClosestAssignedNode(e,t){let s=t;do{if(s.has(e))return s;s=s.parent?s.parent:s.target!==oe?A.getOrCreate(oe):null}while(s!==null);return null}get parent(){return Ge.get(this)||null}updateCSSTokenReflection(e,t){if(N.isCSSDesignToken(t)){const s=this.parent,n=this.isReflecting(t);if(s){const o=s.get(t),r=e.get(t);o!==r&&!n?this.reflectToCSS(t):o===r&&n&&this.stopReflectToCSS(t)}else n||this.reflectToCSS(t)}}has(e){return this.assignedValues.has(e)}get(e){const t=this.store.get(e);if(t!==void 0)return t;const s=this.getRaw(e);if(s!==void 0)return this.hydrate(e,s),this.get(e)}getRaw(e){var t;return this.assignedValues.has(e)?this.assignedValues.get(e):(t=A.findClosestAssignedNode(e,this))===null||t===void 0?void 0:t.getRaw(e)}set(e,t){N.isDerivedDesignTokenValue(this.assignedValues.get(e))&&this.tearDownBindingObserver(e),this.assignedValues.set(e,t),N.isDerivedDesignTokenValue(t)?this.setupBindingObserver(e,t):this.store.set(e,t)}delete(e){this.assignedValues.delete(e),this.tearDownBindingObserver(e);const t=this.getRaw(e);t?this.hydrate(e,t):this.store.delete(e)}bind(){const e=A.findParent(this);e&&e.appendChild(this);for(const t of this.assignedValues.keys())t.notify(this.target)}unbind(){this.parent&&Ge.get(this).removeChild(this);for(const e of this.bindingObservers.keys())this.tearDownBindingObserver(e)}appendChild(e){e.parent&&Ge.get(e).removeChild(e);const t=this.children.filter(s=>e.contains(s));Ge.set(e,this),this.children.push(e),t.forEach(s=>e.appendChild(s)),v.getNotifier(this.store).subscribe(e);for(const[s,n]of this.store.all())e.hydrate(s,this.bindingObservers.has(s)?this.getRaw(s):n),e.updateCSSTokenReflection(e.store,s)}removeChild(e){const t=this.children.indexOf(e);if(t!==-1&&this.children.splice(t,1),v.getNotifier(this.store).unsubscribe(e),e.parent!==this)return!1;const s=Ge.delete(e);for(const[n]of this.store.all())e.hydrate(n,e.getRaw(n)),e.updateCSSTokenReflection(e.store,n);return s}contains(e){return mo(this.target,e.target)}reflectToCSS(e){this.isReflecting(e)||(this.reflecting.add(e),A.cssCustomPropertyReflector.startReflection(e,this.target))}stopReflectToCSS(e){this.isReflecting(e)&&(this.reflecting.delete(e),A.cssCustomPropertyReflector.stopReflection(e,this.target))}isReflecting(e){return this.reflecting.has(e)}handleChange(e,t){const s=N.getTokenById(t);s&&(this.hydrate(s,this.getRaw(s)),this.updateCSSTokenReflection(this.store,s))}hydrate(e,t){if(!this.has(e)){const s=this.bindingObservers.get(e);N.isDerivedDesignTokenValue(t)?s?s.source!==t&&(this.tearDownBindingObserver(e),this.setupBindingObserver(e,t)):this.setupBindingObserver(e,t):(s&&this.tearDownBindingObserver(e),this.store.set(e,t))}}setupBindingObserver(e,t){const s=new To(t,e,this);return this.bindingObservers.set(e,s),s}tearDownBindingObserver(e){return this.bindingObservers.has(e)?(this.bindingObservers.get(e).disconnect(),this.bindingObservers.delete(e),!0):!1}}A.cssCustomPropertyReflector=new ko;l([b],A.prototype,"children",void 0);function So(i){return N.from(i)}const Ss=Object.freeze({create:So,notifyConnection(i){return!i.isConnected||!A.existsFor(i)?!1:(A.getOrCreate(i).bind(),!0)},notifyDisconnection(i){return i.isConnected||!A.existsFor(i)?!1:(A.getOrCreate(i).unbind(),!0)},registerRoot(i=oe){B.registerRoot(i)},unregisterRoot(i=oe){B.unregisterRoot(i)}}),zt=Object.freeze({definitionCallbackOnly:null,ignoreDuplicate:Symbol()}),jt=new Map,mt=new Map;let Re=null;const We=I.createInterface(i=>i.cachedCallback(e=>(Re===null&&(Re=new Os(null,e)),Re))),Rs=Object.freeze({tagFor(i){return mt.get(i)},responsibleFor(i){const e=i.$$designSystem$$;return e||I.findResponsibleContainer(i).get(We)},getOrCreate(i){if(!i)return Re===null&&(Re=I.getOrCreateDOMContainer().get(We)),Re;const e=i.$$designSystem$$;if(e)return e;const t=I.getOrCreateDOMContainer(i);if(t.has(We,!1))return t.get(We);{const s=new Os(i,t);return t.register(et.instance(We,s)),s}}});function Ro(i,e,t){return typeof i=="string"?{name:i,type:e,callback:t}:i}class Os{constructor(e,t){this.owner=e,this.container=t,this.designTokensInitialized=!1,this.prefix="fast",this.shadowRootMode=void 0,this.disambiguate=()=>zt.definitionCallbackOnly,e!==null&&(e.$$designSystem$$=this)}withPrefix(e){return this.prefix=e,this}withShadowRootMode(e){return this.shadowRootMode=e,this}withElementDisambiguation(e){return this.disambiguate=e,this}withDesignTokenRoot(e){return this.designTokenRoot=e,this}register(...e){const t=this.container,s=[],n=this.disambiguate,o=this.shadowRootMode,r={elementPrefix:this.prefix,tryDefineElement(a,c,d){const h=Ro(a,c,d),{name:p,callback:g,baseClass:y}=h;let{type:w}=h,O=p,M=jt.get(O),ie=!0;for(;M;){const R=n(O,w,M);switch(R){case zt.ignoreDuplicate:return;case zt.definitionCallbackOnly:ie=!1,M=void 0;break;default:O=R,M=jt.get(O);break}}ie&&((mt.has(w)||w===k)&&(w=class extends w{}),jt.set(O,w),mt.set(w,O),y&&mt.set(y,O)),s.push(new Oo(t,O,w,o,g,ie))}};this.designTokensInitialized||(this.designTokensInitialized=!0,this.designTokenRoot!==null&&Ss.registerRoot(this.designTokenRoot)),t.registerWithContext(r,...e);for(const a of s)a.callback(a),a.willDefine&&a.definition!==null&&a.definition.define();return this}}class Oo{constructor(e,t,s,n,o,r){this.container=e,this.name=t,this.type=s,this.shadowRootMode=n,this.callback=o,this.willDefine=r,this.definition=null}definePresentation(e){ws.define(this.name,e,this.container)}defineElement(e){this.definition=new st(this.type,Object.assign(Object.assign({},e),{name:this.name}))}tagFor(e){return Rs.tagFor(e)}}const Ao=(i,e)=>C`
    <template role="${t=>t.role}" aria-orientation="${t=>t.orientation}"></template>
`,Eo={separator:"separator"};let di=class extends k{constructor(){super(...arguments),this.role=Eo.separator,this.orientation=ri.horizontal}};l([u],di.prototype,"role",void 0);l([u],di.prototype,"orientation",void 0);const Do=(i,e)=>C`
    <template
        aria-checked="${t=>t.ariaChecked}"
        aria-disabled="${t=>t.ariaDisabled}"
        aria-posinset="${t=>t.ariaPosInSet}"
        aria-selected="${t=>t.ariaSelected}"
        aria-setsize="${t=>t.ariaSetSize}"
        class="${t=>[t.checked&&"checked",t.selected&&"selected",t.disabled&&"disabled"].filter(Boolean).join(" ")}"
        role="option"
    >
        ${He(i,e)}
        <span class="content" part="content">
            <slot ${Y("content")}></slot>
        </span>
        ${Le(i,e)}
    </template>
`;class Rt extends _{constructor(){super(...arguments),this.activeIndex=-1,this.rangeStartIndex=-1}get activeOption(){return this.options[this.activeIndex]}get checkedOptions(){var e;return(e=this.options)===null||e===void 0?void 0:e.filter(t=>t.checked)}get firstSelectedOptionIndex(){return this.options.indexOf(this.firstSelectedOption)}activeIndexChanged(e,t){var s,n;this.ariaActiveDescendant=(n=(s=this.options[t])===null||s===void 0?void 0:s.id)!==null&&n!==void 0?n:"",this.focusAndScrollOptionIntoView()}checkActiveIndex(){if(!this.multiple)return;const e=this.activeOption;e&&(e.checked=!0)}checkFirstOption(e=!1){e?(this.rangeStartIndex===-1&&(this.rangeStartIndex=this.activeIndex+1),this.options.forEach((t,s)=>{t.checked=ut(s,this.rangeStartIndex)})):this.uncheckAllOptions(),this.activeIndex=0,this.checkActiveIndex()}checkLastOption(e=!1){e?(this.rangeStartIndex===-1&&(this.rangeStartIndex=this.activeIndex),this.options.forEach((t,s)=>{t.checked=ut(s,this.rangeStartIndex,this.options.length)})):this.uncheckAllOptions(),this.activeIndex=this.options.length-1,this.checkActiveIndex()}connectedCallback(){super.connectedCallback(),this.addEventListener("focusout",this.focusoutHandler)}disconnectedCallback(){this.removeEventListener("focusout",this.focusoutHandler),super.disconnectedCallback()}checkNextOption(e=!1){e?(this.rangeStartIndex===-1&&(this.rangeStartIndex=this.activeIndex),this.options.forEach((t,s)=>{t.checked=ut(s,this.rangeStartIndex,this.activeIndex+1)})):this.uncheckAllOptions(),this.activeIndex+=this.activeIndex<this.options.length-1?1:0,this.checkActiveIndex()}checkPreviousOption(e=!1){e?(this.rangeStartIndex===-1&&(this.rangeStartIndex=this.activeIndex),this.checkedOptions.length===1&&(this.rangeStartIndex+=1),this.options.forEach((t,s)=>{t.checked=ut(s,this.activeIndex,this.rangeStartIndex)})):this.uncheckAllOptions(),this.activeIndex-=this.activeIndex>0?1:0,this.checkActiveIndex()}clickHandler(e){var t;if(!this.multiple)return super.clickHandler(e);const s=(t=e.target)===null||t===void 0?void 0:t.closest("[role=option]");if(!(!s||s.disabled))return this.uncheckAllOptions(),this.activeIndex=this.options.indexOf(s),this.checkActiveIndex(),this.toggleSelectedForAllCheckedOptions(),!0}focusAndScrollOptionIntoView(){super.focusAndScrollOptionIntoView(this.activeOption)}focusinHandler(e){if(!this.multiple)return super.focusinHandler(e);!this.shouldSkipFocus&&e.target===e.currentTarget&&(this.uncheckAllOptions(),this.activeIndex===-1&&(this.activeIndex=this.firstSelectedOptionIndex!==-1?this.firstSelectedOptionIndex:0),this.checkActiveIndex(),this.setSelectedOptions(),this.focusAndScrollOptionIntoView()),this.shouldSkipFocus=!1}focusoutHandler(e){this.multiple&&this.uncheckAllOptions()}keydownHandler(e){if(!this.multiple)return super.keydownHandler(e);if(this.disabled)return!0;const{key:t,shiftKey:s}=e;switch(this.shouldSkipFocus=!1,t){case Ve:{this.checkFirstOption(s);return}case ye:{this.checkNextOption(s);return}case xe:{this.checkPreviousOption(s);return}case Me:{this.checkLastOption(s);return}case ai:return this.focusAndScrollOptionIntoView(),!0;case Tt:return this.uncheckAllOptions(),this.checkActiveIndex(),!0;case ot:if(e.preventDefault(),this.typeAheadExpired){this.toggleSelectedForAllCheckedOptions();return}default:return t.length===1&&this.handleTypeAhead(`${t}`),!0}}mousedownHandler(e){if(e.offsetX>=0&&e.offsetX<=this.scrollWidth)return super.mousedownHandler(e)}multipleChanged(e,t){var s;this.ariaMultiSelectable=t?"true":null,(s=this.options)===null||s===void 0||s.forEach(n=>{n.checked=t?!1:void 0}),this.setSelectedOptions()}setSelectedOptions(){if(!this.multiple){super.setSelectedOptions();return}this.$fastController.isConnected&&this.options&&(this.selectedOptions=this.options.filter(e=>e.selected),this.focusAndScrollOptionIntoView())}sizeChanged(e,t){var s;const n=Math.max(0,parseInt((s=t?.toFixed())!==null&&s!==void 0?s:"",10));n!==t&&x.queueUpdate(()=>{this.size=n})}toggleSelectedForAllCheckedOptions(){const e=this.checkedOptions.filter(s=>!s.disabled),t=!e.every(s=>s.selected);e.forEach(s=>s.selected=t),this.selectedIndex=this.options.indexOf(e[e.length-1]),this.setSelectedOptions()}typeaheadBufferChanged(e,t){if(!this.multiple){super.typeaheadBufferChanged(e,t);return}if(this.$fastController.isConnected){const s=this.getTypeaheadMatches(),n=this.options.indexOf(s[0]);n>-1&&(this.activeIndex=n,this.uncheckAllOptions(),this.checkActiveIndex()),this.typeAheadExpired=!1}}uncheckAllOptions(e=!1){this.options.forEach(t=>t.checked=this.multiple?!1:void 0),e||(this.rangeStartIndex=-1)}}l([b],Rt.prototype,"activeIndex",void 0);l([u({mode:"boolean"})],Rt.prototype,"multiple",void 0);l([u({converter:K})],Rt.prototype,"size",void 0);class Bo extends k{}class Po extends at(Bo){constructor(){super(...arguments),this.proxy=document.createElement("input")}}const Fo={text:"text"};let Q=class extends Po{constructor(){super(...arguments),this.type=Fo.text}readOnlyChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.readOnly=this.readOnly,this.validate())}autofocusChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.autofocus=this.autofocus,this.validate())}placeholderChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.placeholder=this.placeholder)}typeChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.type=this.type,this.validate())}listChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.setAttribute("list",this.list),this.validate())}maxlengthChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.maxLength=this.maxlength,this.validate())}minlengthChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.minLength=this.minlength,this.validate())}patternChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.pattern=this.pattern,this.validate())}sizeChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.size=this.size)}spellcheckChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.spellcheck=this.spellcheck)}connectedCallback(){super.connectedCallback(),this.proxy.setAttribute("type",this.type),this.validate(),this.autofocus&&x.queueUpdate(()=>{this.focus()})}select(){this.control.select(),this.$emit("select")}handleTextInput(){this.value=this.control.value}handleChange(){this.$emit("change")}validate(){super.validate(this.control)}};l([u({attribute:"readonly",mode:"boolean"})],Q.prototype,"readOnly",void 0);l([u({mode:"boolean"})],Q.prototype,"autofocus",void 0);l([u],Q.prototype,"placeholder",void 0);l([u],Q.prototype,"type",void 0);l([u],Q.prototype,"list",void 0);l([u({converter:K})],Q.prototype,"maxlength",void 0);l([u({converter:K})],Q.prototype,"minlength",void 0);l([u],Q.prototype,"pattern",void 0);l([u({converter:K})],Q.prototype,"size",void 0);l([u({mode:"boolean"})],Q.prototype,"spellcheck",void 0);l([b],Q.prototype,"defaultSlottedNodes",void 0);class hi{}W(hi,T);W(Q,Fe,hi);const Ni=44,Lo=(i,e)=>C`
    <template
        role="progressbar"
        aria-valuenow="${t=>t.value}"
        aria-valuemin="${t=>t.min}"
        aria-valuemax="${t=>t.max}"
        class="${t=>t.paused?"paused":""}"
    >
        ${ni(t=>typeof t.value=="number",C`
                <svg
                    class="progress"
                    part="progress"
                    viewBox="0 0 16 16"
                    slot="determinate"
                >
                    <circle
                        class="background"
                        part="background"
                        cx="8px"
                        cy="8px"
                        r="7px"
                    ></circle>
                    <circle
                        class="determinate"
                        part="determinate"
                        style="stroke-dasharray: ${t=>Ni*t.percentComplete/100}px ${Ni}px"
                        cx="8px"
                        cy="8px"
                        r="7px"
                    ></circle>
                </svg>
            `,C`
                <slot name="indeterminate" slot="indeterminate">
                    ${e.indeterminateIndicator||""}
                </slot>
            `)}
    </template>
`;class _e extends k{constructor(){super(...arguments),this.percentComplete=0}valueChanged(){this.$fastController.isConnected&&this.updatePercentComplete()}minChanged(){this.$fastController.isConnected&&this.updatePercentComplete()}maxChanged(){this.$fastController.isConnected&&this.updatePercentComplete()}connectedCallback(){super.connectedCallback(),this.updatePercentComplete()}updatePercentComplete(){const e=typeof this.min=="number"?this.min:0,t=typeof this.max=="number"?this.max:100,s=typeof this.value=="number"?this.value:0,n=t-e;this.percentComplete=n===0?0:Math.fround((s-e)/n*100)}}l([u({converter:K})],_e.prototype,"value",void 0);l([u({converter:K})],_e.prototype,"min",void 0);l([u({converter:K})],_e.prototype,"max",void 0);l([u({mode:"boolean"})],_e.prototype,"paused",void 0);l([b],_e.prototype,"percentComplete",void 0);const Ho=(i,e)=>C`
    <template
        role="radiogroup"
        aria-disabled="${t=>t.disabled}"
        aria-readonly="${t=>t.readOnly}"
        @click="${(t,s)=>t.clickHandler(s.event)}"
        @keydown="${(t,s)=>t.keydownHandler(s.event)}"
        @focusout="${(t,s)=>t.focusOutHandler(s.event)}"
    >
        <slot name="label"></slot>
        <div
            class="positioning-region ${t=>t.orientation===ri.horizontal?"horizontal":"vertical"}"
            part="positioning-region"
        >
            <slot
                ${Y({property:"slottedRadioButtons",filter:oi("[role=radio]")})}
            ></slot>
        </div>
    </template>
`;let pe=class extends k{constructor(){super(...arguments),this.orientation=ri.horizontal,this.radioChangeHandler=e=>{const t=e.target;t.checked&&(this.slottedRadioButtons.forEach(s=>{s!==t&&(s.checked=!1,this.isInsideFoundationToolbar||s.setAttribute("tabindex","-1"))}),this.selectedRadio=t,this.value=t.value,t.setAttribute("tabindex","0"),this.focusedRadio=t),e.stopPropagation()},this.moveToRadioByIndex=(e,t)=>{const s=e[t];this.isInsideToolbar||(s.setAttribute("tabindex","0"),s.readOnly?this.slottedRadioButtons.forEach(n=>{n!==s&&n.setAttribute("tabindex","-1")}):(s.checked=!0,this.selectedRadio=s)),this.focusedRadio=s,s.focus()},this.moveRightOffGroup=()=>{var e;(e=this.nextElementSibling)===null||e===void 0||e.focus()},this.moveLeftOffGroup=()=>{var e;(e=this.previousElementSibling)===null||e===void 0||e.focus()},this.focusOutHandler=e=>{const t=this.slottedRadioButtons,s=e.target,n=s!==null?t.indexOf(s):0,o=this.focusedRadio?t.indexOf(this.focusedRadio):-1;return(o===0&&n===o||o===t.length-1&&o===n)&&(this.selectedRadio?(this.focusedRadio=this.selectedRadio,this.isInsideFoundationToolbar||(this.selectedRadio.setAttribute("tabindex","0"),t.forEach(r=>{r!==this.selectedRadio&&r.setAttribute("tabindex","-1")}))):(this.focusedRadio=t[0],this.focusedRadio.setAttribute("tabindex","0"),t.forEach(r=>{r!==this.focusedRadio&&r.setAttribute("tabindex","-1")}))),!0},this.clickHandler=e=>{const t=e.target;if(t){const s=this.slottedRadioButtons;t.checked||s.indexOf(t)===0?(t.setAttribute("tabindex","0"),this.selectedRadio=t):(t.setAttribute("tabindex","-1"),this.selectedRadio=null),this.focusedRadio=t}e.preventDefault()},this.shouldMoveOffGroupToTheRight=(e,t,s)=>e===t.length&&this.isInsideToolbar&&s===it,this.shouldMoveOffGroupToTheLeft=(e,t)=>(this.focusedRadio?e.indexOf(this.focusedRadio)-1:0)<0&&this.isInsideToolbar&&t===tt,this.checkFocusedRadio=()=>{this.focusedRadio!==null&&!this.focusedRadio.readOnly&&!this.focusedRadio.checked&&(this.focusedRadio.checked=!0,this.focusedRadio.setAttribute("tabindex","0"),this.focusedRadio.focus(),this.selectedRadio=this.focusedRadio)},this.moveRight=e=>{const t=this.slottedRadioButtons;let s=0;if(s=this.focusedRadio?t.indexOf(this.focusedRadio)+1:1,this.shouldMoveOffGroupToTheRight(s,t,e.key)){this.moveRightOffGroup();return}else s===t.length&&(s=0);for(;s<t.length&&t.length>1;)if(t[s].disabled){if(this.focusedRadio&&s===t.indexOf(this.focusedRadio))break;if(s+1>=t.length){if(this.isInsideToolbar)break;s=0}else s+=1}else{this.moveToRadioByIndex(t,s);break}},this.moveLeft=e=>{const t=this.slottedRadioButtons;let s=0;if(s=this.focusedRadio?t.indexOf(this.focusedRadio)-1:0,s=s<0?t.length-1:s,this.shouldMoveOffGroupToTheLeft(t,e.key)){this.moveLeftOffGroup();return}for(;s>=0&&t.length>1;)if(t[s].disabled){if(this.focusedRadio&&s===t.indexOf(this.focusedRadio))break;s-1<0?s=t.length-1:s-=1}else{this.moveToRadioByIndex(t,s);break}},this.keydownHandler=e=>{const t=e.key;if(t in Zn&&this.isInsideFoundationToolbar)return!0;switch(t){case nt:{this.checkFocusedRadio();break}case it:case ye:{this.direction===Pe.ltr?this.moveRight(e):this.moveLeft(e);break}case tt:case xe:{this.direction===Pe.ltr?this.moveLeft(e):this.moveRight(e);break}default:return!0}}}readOnlyChanged(){this.slottedRadioButtons!==void 0&&this.slottedRadioButtons.forEach(e=>{this.readOnly?e.readOnly=!0:e.readOnly=!1})}disabledChanged(){this.slottedRadioButtons!==void 0&&this.slottedRadioButtons.forEach(e=>{this.disabled?e.disabled=!0:e.disabled=!1})}nameChanged(){this.slottedRadioButtons&&this.slottedRadioButtons.forEach(e=>{e.setAttribute("name",this.name)})}valueChanged(){this.slottedRadioButtons&&this.slottedRadioButtons.forEach(e=>{e.value===this.value&&(e.checked=!0,this.selectedRadio=e)}),this.$emit("change")}slottedRadioButtonsChanged(e,t){this.slottedRadioButtons&&this.slottedRadioButtons.length>0&&this.setupRadioButtons()}get parentToolbar(){return this.closest('[role="toolbar"]')}get isInsideToolbar(){var e;return(e=this.parentToolbar)!==null&&e!==void 0?e:!1}get isInsideFoundationToolbar(){var e;return!!(!((e=this.parentToolbar)===null||e===void 0)&&e.$fastController)}connectedCallback(){super.connectedCallback(),this.direction=to(this),this.setupRadioButtons()}disconnectedCallback(){this.slottedRadioButtons.forEach(e=>{e.removeEventListener("change",this.radioChangeHandler)})}setupRadioButtons(){const e=this.slottedRadioButtons.filter(n=>n.hasAttribute("checked")),t=e?e.length:0;if(t>1){const n=e[t-1];n.checked=!0}let s=!1;if(this.slottedRadioButtons.forEach(n=>{this.name!==void 0&&n.setAttribute("name",this.name),this.disabled&&(n.disabled=!0),this.readOnly&&(n.readOnly=!0),this.value&&this.value===n.value?(this.selectedRadio=n,this.focusedRadio=n,n.checked=!0,n.setAttribute("tabindex","0"),s=!0):(this.isInsideFoundationToolbar||n.setAttribute("tabindex","-1"),n.checked=!1),n.addEventListener("change",this.radioChangeHandler)}),this.value===void 0&&this.slottedRadioButtons.length>0){const n=this.slottedRadioButtons.filter(r=>r.hasAttribute("checked")),o=n!==null?n.length:0;if(o>0&&!s){const r=n[o-1];r.checked=!0,this.focusedRadio=r,r.setAttribute("tabindex","0")}else this.slottedRadioButtons[0].setAttribute("tabindex","0"),this.focusedRadio=this.slottedRadioButtons[0]}}};l([u({attribute:"readonly",mode:"boolean"})],pe.prototype,"readOnly",void 0);l([u({attribute:"disabled",mode:"boolean"})],pe.prototype,"disabled",void 0);l([u],pe.prototype,"name",void 0);l([u],pe.prototype,"value",void 0);l([u],pe.prototype,"orientation",void 0);l([b],pe.prototype,"childItems",void 0);l([b],pe.prototype,"slottedRadioButtons",void 0);const Vo=(i,e)=>C`
    <template
        role="radio"
        class="${t=>t.checked?"checked":""} ${t=>t.readOnly?"readonly":""}"
        aria-checked="${t=>t.checked}"
        aria-required="${t=>t.required}"
        aria-disabled="${t=>t.disabled}"
        aria-readonly="${t=>t.readOnly}"
        @keypress="${(t,s)=>t.keypressHandler(s.event)}"
        @click="${(t,s)=>t.clickHandler(s.event)}"
    >
        <div part="control" class="control">
            <slot name="checked-indicator">
                ${e.checkedIndicator||""}
            </slot>
        </div>
        <label
            part="label"
            class="${t=>t.defaultSlottedNodes&&t.defaultSlottedNodes.length?"label":"label label__hidden"}"
        >
            <slot ${Y("defaultSlottedNodes")}></slot>
        </label>
    </template>
`;class Mo extends k{}class No extends ks(Mo){constructor(){super(...arguments),this.proxy=document.createElement("input")}}let Ot=class extends No{constructor(){super(),this.initialValue="on",this.keypressHandler=e=>{if(e.key===ot){!this.checked&&!this.readOnly&&(this.checked=!0);return}return!0},this.proxy.setAttribute("type","radio")}readOnlyChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.readOnly=this.readOnly)}defaultCheckedChanged(){var e;this.$fastController.isConnected&&!this.dirtyChecked&&(this.isInsideRadioGroup()||(this.checked=(e=this.defaultChecked)!==null&&e!==void 0?e:!1,this.dirtyChecked=!1))}connectedCallback(){var e,t;super.connectedCallback(),this.validate(),((e=this.parentElement)===null||e===void 0?void 0:e.getAttribute("role"))!=="radiogroup"&&this.getAttribute("tabindex")===null&&(this.disabled||this.setAttribute("tabindex","0")),this.checkedAttribute&&(this.dirtyChecked||this.isInsideRadioGroup()||(this.checked=(t=this.defaultChecked)!==null&&t!==void 0?t:!1,this.dirtyChecked=!1))}isInsideRadioGroup(){return this.closest("[role=radiogroup]")!==null}clickHandler(e){!this.disabled&&!this.readOnly&&!this.checked&&(this.checked=!0)}};l([u({attribute:"readonly",mode:"boolean"})],Ot.prototype,"readOnly",void 0);l([b],Ot.prototype,"name",void 0);l([b],Ot.prototype,"defaultSlottedNodes",void 0);function _o(i,e,t){return i.nodeType!==Node.TEXT_NODE?!0:typeof i.nodeValue=="string"&&!!i.nodeValue.trim().length}class zo extends Rt{}class jo extends at(zo){constructor(){super(...arguments),this.proxy=document.createElement("select")}}class fe extends jo{constructor(){super(...arguments),this.open=!1,this.forcedPosition=!1,this.listboxId=$t("listbox-"),this.maxHeight=0}openChanged(e,t){if(this.collapsible){if(this.open){this.ariaControls=this.listboxId,this.ariaExpanded="true",this.setPositioning(),this.focusAndScrollOptionIntoView(),this.indexWhenOpened=this.selectedIndex,x.queueUpdate(()=>this.focus());return}this.ariaControls="",this.ariaExpanded="false"}}get collapsible(){return!(this.multiple||typeof this.size=="number")}get value(){return v.track(this,"value"),this._value}set value(e){var t,s,n,o,r,a,c;const d=`${this._value}`;if(!((t=this._options)===null||t===void 0)&&t.length){const h=this._options.findIndex(y=>y.value===e),p=(n=(s=this._options[this.selectedIndex])===null||s===void 0?void 0:s.value)!==null&&n!==void 0?n:null,g=(r=(o=this._options[h])===null||o===void 0?void 0:o.value)!==null&&r!==void 0?r:null;(h===-1||p!==g)&&(e="",this.selectedIndex=h),e=(c=(a=this.firstSelectedOption)===null||a===void 0?void 0:a.value)!==null&&c!==void 0?c:e}d!==e&&(this._value=e,super.valueChanged(d,e),v.notify(this,"value"),this.updateDisplayValue())}updateValue(e){var t,s;this.$fastController.isConnected&&(this.value=(s=(t=this.firstSelectedOption)===null||t===void 0?void 0:t.value)!==null&&s!==void 0?s:""),e&&(this.$emit("input"),this.$emit("change",this,{bubbles:!0,composed:void 0}))}selectedIndexChanged(e,t){super.selectedIndexChanged(e,t),this.updateValue()}positionChanged(e,t){this.positionAttribute=t,this.setPositioning()}setPositioning(){const e=this.getBoundingClientRect(),s=window.innerHeight-e.bottom;this.position=this.forcedPosition?this.positionAttribute:e.top>s?Nt.above:Nt.below,this.positionAttribute=this.forcedPosition?this.positionAttribute:this.position,this.maxHeight=this.position===Nt.above?~~e.top:~~s}get displayValue(){var e,t;return v.track(this,"displayValue"),(t=(e=this.firstSelectedOption)===null||e===void 0?void 0:e.text)!==null&&t!==void 0?t:""}disabledChanged(e,t){super.disabledChanged&&super.disabledChanged(e,t),this.ariaDisabled=this.disabled?"true":"false"}formResetCallback(){this.setProxyOptions(),super.setDefaultSelectedOption(),this.selectedIndex===-1&&(this.selectedIndex=0)}clickHandler(e){if(!this.disabled){if(this.open){const t=e.target.closest("option,[role=option]");if(t&&t.disabled)return}return super.clickHandler(e),this.open=this.collapsible&&!this.open,!this.open&&this.indexWhenOpened!==this.selectedIndex&&this.updateValue(!0),!0}}focusoutHandler(e){var t;if(super.focusoutHandler(e),!this.open)return!0;const s=e.relatedTarget;if(this.isSameNode(s)){this.focus();return}!((t=this.options)===null||t===void 0)&&t.includes(s)||(this.open=!1,this.indexWhenOpened!==this.selectedIndex&&this.updateValue(!0))}handleChange(e,t){super.handleChange(e,t),t==="value"&&this.updateValue()}slottedOptionsChanged(e,t){this.options.forEach(s=>{v.getNotifier(s).unsubscribe(this,"value")}),super.slottedOptionsChanged(e,t),this.options.forEach(s=>{v.getNotifier(s).subscribe(this,"value")}),this.setProxyOptions(),this.updateValue()}mousedownHandler(e){var t;return e.offsetX>=0&&e.offsetX<=((t=this.listbox)===null||t===void 0?void 0:t.scrollWidth)?super.mousedownHandler(e):this.collapsible}multipleChanged(e,t){super.multipleChanged(e,t),this.proxy&&(this.proxy.multiple=t)}selectedOptionsChanged(e,t){var s;super.selectedOptionsChanged(e,t),(s=this.options)===null||s===void 0||s.forEach((n,o)=>{var r;const a=(r=this.proxy)===null||r===void 0?void 0:r.options.item(o);a&&(a.selected=n.selected)})}setDefaultSelectedOption(){var e;const t=(e=this.options)!==null&&e!==void 0?e:Array.from(this.children).filter(_.slottedOptionFilter),s=t?.findIndex(n=>n.hasAttribute("selected")||n.selected||n.value===this.value);if(s!==-1){this.selectedIndex=s;return}this.selectedIndex=0}setProxyOptions(){this.proxy instanceof HTMLSelectElement&&this.options&&(this.proxy.options.length=0,this.options.forEach(e=>{const t=e.proxy||(e instanceof HTMLOptionElement?e.cloneNode():null);t&&this.proxy.options.add(t)}))}keydownHandler(e){super.keydownHandler(e);const t=e.key||e.key.charCodeAt(0);switch(t){case ot:{e.preventDefault(),this.collapsible&&this.typeAheadExpired&&(this.open=!this.open);break}case Ve:case Me:{e.preventDefault();break}case nt:{e.preventDefault(),this.open=!this.open;break}case Tt:{this.collapsible&&this.open&&(e.preventDefault(),this.open=!1);break}case ai:return this.collapsible&&this.open&&(e.preventDefault(),this.open=!1),!0}return!this.open&&this.indexWhenOpened!==this.selectedIndex&&(this.updateValue(!0),this.indexWhenOpened=this.selectedIndex),!(t===ye||t===xe)}connectedCallback(){super.connectedCallback(),this.forcedPosition=!!this.positionAttribute,this.addEventListener("contentchange",this.updateDisplayValue)}disconnectedCallback(){this.removeEventListener("contentchange",this.updateDisplayValue),super.disconnectedCallback()}sizeChanged(e,t){super.sizeChanged(e,t),this.proxy&&(this.proxy.size=t)}updateDisplayValue(){this.collapsible&&v.notify(this,"displayValue")}}l([u({attribute:"open",mode:"boolean"})],fe.prototype,"open",void 0);l([Us],fe.prototype,"collapsible",null);l([b],fe.prototype,"control",void 0);l([u({attribute:"position"})],fe.prototype,"positionAttribute",void 0);l([b],fe.prototype,"position",void 0);l([b],fe.prototype,"maxHeight",void 0);class ui{}l([b],ui.prototype,"ariaControls",void 0);W(ui,we);W(fe,Fe,ui);const Uo=(i,e)=>C`
    <template
        class="${t=>[t.collapsible&&"collapsible",t.collapsible&&t.open&&"open",t.disabled&&"disabled",t.collapsible&&t.position].filter(Boolean).join(" ")}"
        aria-activedescendant="${t=>t.ariaActiveDescendant}"
        aria-controls="${t=>t.ariaControls}"
        aria-disabled="${t=>t.ariaDisabled}"
        aria-expanded="${t=>t.ariaExpanded}"
        aria-haspopup="${t=>t.collapsible?"listbox":null}"
        aria-multiselectable="${t=>t.ariaMultiSelectable}"
        ?open="${t=>t.open}"
        role="combobox"
        tabindex="${t=>t.disabled?null:"0"}"
        @click="${(t,s)=>t.clickHandler(s.event)}"
        @focusin="${(t,s)=>t.focusinHandler(s.event)}"
        @focusout="${(t,s)=>t.focusoutHandler(s.event)}"
        @keydown="${(t,s)=>t.keydownHandler(s.event)}"
        @mousedown="${(t,s)=>t.mousedownHandler(s.event)}"
    >
        ${ni(t=>t.collapsible,C`
                <div
                    class="control"
                    part="control"
                    ?disabled="${t=>t.disabled}"
                    ${z("control")}
                >
                    ${He(i,e)}
                    <slot name="button-container">
                        <div class="selected-value" part="selected-value">
                            <slot name="selected-value">${t=>t.displayValue}</slot>
                        </div>
                        <div aria-hidden="true" class="indicator" part="indicator">
                            <slot name="indicator">
                                ${e.indicator||""}
                            </slot>
                        </div>
                    </slot>
                    ${Le(i,e)}
                </div>
            `)}
        <div
            class="listbox"
            id="${t=>t.listboxId}"
            part="listbox"
            role="listbox"
            ?disabled="${t=>t.disabled}"
            ?hidden="${t=>t.collapsible?!t.open:!1}"
            ${z("listbox")}
        >
            <slot
                ${Y({filter:_.slottedOptionFilter,flatten:!0,property:"slottedOptions"})}
            ></slot>
        </div>
    </template>
`,qo=(i,e)=>C`
    <template slot="tabpanel" role="tabpanel">
        <slot></slot>
    </template>
`;class Go extends k{}const Wo=(i,e)=>C`
    <template slot="tab" role="tab" aria-disabled="${t=>t.disabled}">
        <slot></slot>
    </template>
`;class As extends k{}l([u({mode:"boolean"})],As.prototype,"disabled",void 0);const Qo=(i,e)=>C`
    <template class="${t=>t.orientation}">
        ${He(i,e)}
        <div class="tablist" part="tablist" role="tablist">
            <slot class="tab" name="tab" part="tab" ${Y("tabs")}></slot>

            ${ni(t=>t.showActiveIndicator,C`
                    <div
                        ${z("activeIndicatorRef")}
                        class="activeIndicator"
                        part="activeIndicator"
                    ></div>
                `)}
        </div>
        ${Le(i,e)}
        <div class="tabpanel" part="tabpanel">
            <slot name="tabpanel" ${Y("tabpanels")}></slot>
        </div>
    </template>
`,Yt={horizontal:"horizontal"};class ae extends k{constructor(){super(...arguments),this.orientation=Yt.horizontal,this.activeindicator=!0,this.showActiveIndicator=!0,this.prevActiveTabIndex=0,this.activeTabIndex=0,this.ticking=!1,this.change=()=>{this.$emit("change",this.activetab)},this.isDisabledElement=e=>e.getAttribute("aria-disabled")==="true",this.isHiddenElement=e=>e.hasAttribute("hidden"),this.isFocusableElement=e=>!this.isDisabledElement(e)&&!this.isHiddenElement(e),this.setTabs=()=>{const e="gridColumn",t="gridRow",s=this.isHorizontal()?e:t;this.activeTabIndex=this.getActiveIndex(),this.showActiveIndicator=!1,this.tabs.forEach((n,o)=>{if(n.slot==="tab"){const r=this.activeTabIndex===o&&this.isFocusableElement(n);this.activeindicator&&this.isFocusableElement(n)&&(this.showActiveIndicator=!0);const a=this.tabIds[o],c=this.tabpanelIds[o];n.setAttribute("id",a),n.setAttribute("aria-selected",r?"true":"false"),n.setAttribute("aria-controls",c),n.addEventListener("click",this.handleTabClick),n.addEventListener("keydown",this.handleTabKeyDown),n.setAttribute("tabindex",r?"0":"-1"),r&&(this.activetab=n,this.activeid=a)}n.style[e]="",n.style[t]="",n.style[s]=`${o+1}`,this.isHorizontal()?n.classList.remove("vertical"):n.classList.add("vertical")})},this.setTabPanels=()=>{this.tabpanels.forEach((e,t)=>{const s=this.tabIds[t],n=this.tabpanelIds[t];e.setAttribute("id",n),e.setAttribute("aria-labelledby",s),this.activeTabIndex!==t?e.setAttribute("hidden",""):e.removeAttribute("hidden")})},this.handleTabClick=e=>{const t=e.currentTarget;t.nodeType===1&&this.isFocusableElement(t)&&(this.prevActiveTabIndex=this.activeTabIndex,this.activeTabIndex=this.tabs.indexOf(t),this.setComponent())},this.handleTabKeyDown=e=>{if(this.isHorizontal())switch(e.key){case tt:e.preventDefault(),this.adjustBackward(e);break;case it:e.preventDefault(),this.adjustForward(e);break}else switch(e.key){case xe:e.preventDefault(),this.adjustBackward(e);break;case ye:e.preventDefault(),this.adjustForward(e);break}switch(e.key){case Ve:e.preventDefault(),this.adjust(-this.activeTabIndex);break;case Me:e.preventDefault(),this.adjust(this.tabs.length-this.activeTabIndex-1);break}},this.adjustForward=e=>{const t=this.tabs;let s=0;for(s=this.activetab?t.indexOf(this.activetab)+1:1,s===t.length&&(s=0);s<t.length&&t.length>1;)if(this.isFocusableElement(t[s])){this.moveToTabByIndex(t,s);break}else{if(this.activetab&&s===t.indexOf(this.activetab))break;s+1>=t.length?s=0:s+=1}},this.adjustBackward=e=>{const t=this.tabs;let s=0;for(s=this.activetab?t.indexOf(this.activetab)-1:0,s=s<0?t.length-1:s;s>=0&&t.length>1;)if(this.isFocusableElement(t[s])){this.moveToTabByIndex(t,s);break}else s-1<0?s=t.length-1:s-=1},this.moveToTabByIndex=(e,t)=>{const s=e[t];this.activetab=s,this.prevActiveTabIndex=this.activeTabIndex,this.activeTabIndex=t,s.focus(),this.setComponent()}}orientationChanged(){this.$fastController.isConnected&&(this.setTabs(),this.setTabPanels(),this.handleActiveIndicatorPosition())}activeidChanged(e,t){this.$fastController.isConnected&&this.tabs.length<=this.tabpanels.length&&(this.prevActiveTabIndex=this.tabs.findIndex(s=>s.id===e),this.setTabs(),this.setTabPanels(),this.handleActiveIndicatorPosition())}tabsChanged(){this.$fastController.isConnected&&this.tabs.length<=this.tabpanels.length&&(this.tabIds=this.getTabIds(),this.tabpanelIds=this.getTabPanelIds(),this.setTabs(),this.setTabPanels(),this.handleActiveIndicatorPosition())}tabpanelsChanged(){this.$fastController.isConnected&&this.tabpanels.length<=this.tabs.length&&(this.tabIds=this.getTabIds(),this.tabpanelIds=this.getTabPanelIds(),this.setTabs(),this.setTabPanels(),this.handleActiveIndicatorPosition())}getActiveIndex(){return this.activeid!==void 0?this.tabIds.indexOf(this.activeid)===-1?0:this.tabIds.indexOf(this.activeid):0}getTabIds(){return this.tabs.map(e=>{var t;return(t=e.getAttribute("id"))!==null&&t!==void 0?t:`tab-${$t()}`})}getTabPanelIds(){return this.tabpanels.map(e=>{var t;return(t=e.getAttribute("id"))!==null&&t!==void 0?t:`panel-${$t()}`})}setComponent(){this.activeTabIndex!==this.prevActiveTabIndex&&(this.activeid=this.tabIds[this.activeTabIndex],this.focusTab(),this.change())}isHorizontal(){return this.orientation===Yt.horizontal}handleActiveIndicatorPosition(){this.showActiveIndicator&&this.activeindicator&&this.activeTabIndex!==this.prevActiveTabIndex&&(this.ticking?this.ticking=!1:(this.ticking=!0,this.animateActiveIndicator()))}animateActiveIndicator(){this.ticking=!0;const e=this.isHorizontal()?"gridColumn":"gridRow",t=this.isHorizontal()?"translateX":"translateY",s=this.isHorizontal()?"offsetLeft":"offsetTop",n=this.activeIndicatorRef[s];this.activeIndicatorRef.style[e]=`${this.activeTabIndex+1}`;const o=this.activeIndicatorRef[s];this.activeIndicatorRef.style[e]=`${this.prevActiveTabIndex+1}`;const r=o-n;this.activeIndicatorRef.style.transform=`${t}(${r}px)`,this.activeIndicatorRef.classList.add("activeIndicatorTransition"),this.activeIndicatorRef.addEventListener("transitionend",()=>{this.ticking=!1,this.activeIndicatorRef.style[e]=`${this.activeTabIndex+1}`,this.activeIndicatorRef.style.transform=`${t}(0px)`,this.activeIndicatorRef.classList.remove("activeIndicatorTransition")})}adjust(e){const t=this.tabs.filter(r=>this.isFocusableElement(r)),s=t.indexOf(this.activetab),n=Jn(0,t.length-1,s+e),o=this.tabs.indexOf(t[n]);o>-1&&this.moveToTabByIndex(this.tabs,o)}focusTab(){this.tabs[this.activeTabIndex].focus()}connectedCallback(){super.connectedCallback(),this.tabIds=this.getTabIds(),this.tabpanelIds=this.getTabPanelIds(),this.activeTabIndex=this.getActiveIndex()}}l([u],ae.prototype,"orientation",void 0);l([u],ae.prototype,"activeid",void 0);l([b],ae.prototype,"tabs",void 0);l([b],ae.prototype,"tabpanels",void 0);l([u({mode:"boolean"})],ae.prototype,"activeindicator",void 0);l([b],ae.prototype,"activeIndicatorRef",void 0);l([b],ae.prototype,"showActiveIndicator",void 0);W(ae,Fe);class Xo extends k{}class Yo extends at(Xo){constructor(){super(...arguments),this.proxy=document.createElement("textarea")}}const Es={none:"none"};let U=class extends Yo{constructor(){super(...arguments),this.resize=Es.none,this.cols=20,this.handleTextInput=()=>{this.value=this.control.value}}readOnlyChanged(){this.proxy instanceof HTMLTextAreaElement&&(this.proxy.readOnly=this.readOnly)}autofocusChanged(){this.proxy instanceof HTMLTextAreaElement&&(this.proxy.autofocus=this.autofocus)}listChanged(){this.proxy instanceof HTMLTextAreaElement&&this.proxy.setAttribute("list",this.list)}maxlengthChanged(){this.proxy instanceof HTMLTextAreaElement&&(this.proxy.maxLength=this.maxlength)}minlengthChanged(){this.proxy instanceof HTMLTextAreaElement&&(this.proxy.minLength=this.minlength)}spellcheckChanged(){this.proxy instanceof HTMLTextAreaElement&&(this.proxy.spellcheck=this.spellcheck)}select(){this.control.select(),this.$emit("select")}handleChange(){this.$emit("change")}validate(){super.validate(this.control)}};l([u({mode:"boolean"})],U.prototype,"readOnly",void 0);l([u],U.prototype,"resize",void 0);l([u({mode:"boolean"})],U.prototype,"autofocus",void 0);l([u({attribute:"form"})],U.prototype,"formId",void 0);l([u],U.prototype,"list",void 0);l([u({converter:K})],U.prototype,"maxlength",void 0);l([u({converter:K})],U.prototype,"minlength",void 0);l([u],U.prototype,"name",void 0);l([u],U.prototype,"placeholder",void 0);l([u({converter:K,mode:"fromView"})],U.prototype,"cols",void 0);l([u({converter:K,mode:"fromView"})],U.prototype,"rows",void 0);l([u({mode:"boolean"})],U.prototype,"spellcheck",void 0);l([b],U.prototype,"defaultSlottedNodes",void 0);W(U,hi);const Zo=(i,e)=>C`
    <template
        class="
            ${t=>t.readOnly?"readonly":""}
            ${t=>t.resize!==Es.none?`resize-${t.resize}`:""}"
    >
        <label
            part="label"
            for="control"
            class="${t=>t.defaultSlottedNodes&&t.defaultSlottedNodes.length?"label":"label label__hidden"}"
        >
            <slot ${Y("defaultSlottedNodes")}></slot>
        </label>
        <textarea
            part="control"
            class="control"
            id="control"
            ?autofocus="${t=>t.autofocus}"
            cols="${t=>t.cols}"
            ?disabled="${t=>t.disabled}"
            form="${t=>t.form}"
            list="${t=>t.list}"
            maxlength="${t=>t.maxlength}"
            minlength="${t=>t.minlength}"
            name="${t=>t.name}"
            placeholder="${t=>t.placeholder}"
            ?readonly="${t=>t.readOnly}"
            ?required="${t=>t.required}"
            rows="${t=>t.rows}"
            ?spellcheck="${t=>t.spellcheck}"
            :value="${t=>t.value}"
            aria-atomic="${t=>t.ariaAtomic}"
            aria-busy="${t=>t.ariaBusy}"
            aria-controls="${t=>t.ariaControls}"
            aria-current="${t=>t.ariaCurrent}"
            aria-describedby="${t=>t.ariaDescribedby}"
            aria-details="${t=>t.ariaDetails}"
            aria-disabled="${t=>t.ariaDisabled}"
            aria-errormessage="${t=>t.ariaErrormessage}"
            aria-flowto="${t=>t.ariaFlowto}"
            aria-haspopup="${t=>t.ariaHaspopup}"
            aria-hidden="${t=>t.ariaHidden}"
            aria-invalid="${t=>t.ariaInvalid}"
            aria-keyshortcuts="${t=>t.ariaKeyshortcuts}"
            aria-label="${t=>t.ariaLabel}"
            aria-labelledby="${t=>t.ariaLabelledby}"
            aria-live="${t=>t.ariaLive}"
            aria-owns="${t=>t.ariaOwns}"
            aria-relevant="${t=>t.ariaRelevant}"
            aria-roledescription="${t=>t.ariaRoledescription}"
            @input="${(t,s)=>t.handleTextInput()}"
            @change="${t=>t.handleChange()}"
            ${z("control")}
        ></textarea>
    </template>
`,Jo=(i,e)=>C`
    <template
        class="
            ${t=>t.readOnly?"readonly":""}
        "
    >
        <label
            part="label"
            for="control"
            class="${t=>t.defaultSlottedNodes&&t.defaultSlottedNodes.length?"label":"label label__hidden"}"
        >
            <slot
                ${Y({property:"defaultSlottedNodes",filter:_o})}
            ></slot>
        </label>
        <div class="root" part="root">
            ${He(i,e)}
            <input
                class="control"
                part="control"
                id="control"
                @input="${t=>t.handleTextInput()}"
                @change="${t=>t.handleChange()}"
                ?autofocus="${t=>t.autofocus}"
                ?disabled="${t=>t.disabled}"
                list="${t=>t.list}"
                maxlength="${t=>t.maxlength}"
                minlength="${t=>t.minlength}"
                pattern="${t=>t.pattern}"
                placeholder="${t=>t.placeholder}"
                ?readonly="${t=>t.readOnly}"
                ?required="${t=>t.required}"
                size="${t=>t.size}"
                ?spellcheck="${t=>t.spellcheck}"
                :value="${t=>t.value}"
                type="${t=>t.type}"
                aria-atomic="${t=>t.ariaAtomic}"
                aria-busy="${t=>t.ariaBusy}"
                aria-controls="${t=>t.ariaControls}"
                aria-current="${t=>t.ariaCurrent}"
                aria-describedby="${t=>t.ariaDescribedby}"
                aria-details="${t=>t.ariaDetails}"
                aria-disabled="${t=>t.ariaDisabled}"
                aria-errormessage="${t=>t.ariaErrormessage}"
                aria-flowto="${t=>t.ariaFlowto}"
                aria-haspopup="${t=>t.ariaHaspopup}"
                aria-hidden="${t=>t.ariaHidden}"
                aria-invalid="${t=>t.ariaInvalid}"
                aria-keyshortcuts="${t=>t.ariaKeyshortcuts}"
                aria-label="${t=>t.ariaLabel}"
                aria-labelledby="${t=>t.ariaLabelledby}"
                aria-live="${t=>t.ariaLive}"
                aria-owns="${t=>t.ariaOwns}"
                aria-relevant="${t=>t.ariaRelevant}"
                aria-roledescription="${t=>t.ariaRoledescription}"
                ${z("control")}
            />
            ${Le(i,e)}
        </div>
    </template>
`,he="not-allowed",Ko=":host([hidden]){display:none}";function V(i){return`${Ko}:host{display:${i}}`}const F=Wn()?"focus-visible":"focus",er=new Set(["children","localName","ref","style","className"]),tr=Object.freeze(Object.create(null)),_i="_default",ft=new Map;function ir(i,e){typeof i=="function"?i(e):i.current=e}function Ds(i,e){if(!e.name){const t=st.forType(i);if(t)e.name=t.name;else throw new Error("React wrappers must wrap a FASTElement or be configured with a name.")}return e.name}function Zt(i){return i.events||(i.events={})}function zi(i,e,t){return er.has(t)?(console.warn(`${Ds(i,e)} contains property ${t} which is a React reserved property. It will be used by React and not set on the element.`),!1):!0}function sr(i,e){if(!e.keys)if(e.properties)e.keys=new Set(e.properties.concat(Object.keys(Zt(e))));else{const t=new Set(Object.keys(Zt(e))),s=v.getAccessors(i.prototype);if(s.length>0)for(const n of s)zi(i,e,n.name)&&t.add(n.name);else for(const n in i.prototype)!(n in HTMLElement.prototype)&&zi(i,e,n)&&t.add(n);e.keys=t}return e.keys}function nr(i,e){let t=[];const s={register(o,...r){t.forEach(a=>a.register(o,...r)),t=[]}};function n(o,r={}){var a,c;o instanceof $s&&(e?e.register(o):t.push(o),o=o.type);const d=ft.get(o);if(d){const g=d.get((a=r.name)!==null&&a!==void 0?a:_i);if(g)return g}class h extends i.Component{constructor(){super(...arguments),this._element=null}_updateElement(y){const w=this._element;if(w===null)return;const O=this.props,M=y||tr,ie=Zt(r);for(const R in this._elementProps){const se=O[R],Ce=ie[R];if(Ce===void 0)w[R]=se;else{const ze=M[R];if(se===ze)continue;ze!==void 0&&w.removeEventListener(Ce,ze),se!==void 0&&w.addEventListener(Ce,se)}}}componentDidMount(){this._updateElement()}componentDidUpdate(y){this._updateElement(y)}render(){const y=this.props.__forwardedRef;(this._ref===void 0||this._userRef!==y)&&(this._ref=R=>{this._element===null&&(this._element=R),y!==null&&ir(y,R),this._userRef=y});const w={ref:this._ref},O=this._elementProps={},M=sr(o,r),ie=this.props;for(const R in ie){const se=ie[R];M.has(R)?O[R]=se:w[R==="className"?"class":R]=se}return i.createElement(Ds(o,r),w)}}const p=i.forwardRef((g,y)=>i.createElement(h,Object.assign(Object.assign({},g),{__forwardedRef:y}),g?.children));return ft.has(o)||ft.set(o,new Map),ft.get(o).set((c=r.name)!==null&&c!==void 0?c:_i,p),p}return{wrap:n,registry:s}}function or(i){return Rs.getOrCreate(i).withPrefix("vscode")}function rr(i){window.addEventListener("load",()=>{new MutationObserver(()=>{ji(i)}).observe(document.body,{attributes:!0,attributeFilter:["class"]}),ji(i)})}function ji(i){const e=getComputedStyle(document.body),t=document.querySelector("body");if(t){const s=t.getAttribute("data-vscode-theme-kind");for(const[n,o]of i){let r=e.getPropertyValue(n).toString();if(s==="vscode-high-contrast")r.length===0&&o.name.includes("background")&&(r="transparent"),o.name==="button-icon-hover-background"&&(r="transparent");else if(s==="vscode-high-contrast-light"){if(r.length===0&&o.name.includes("background"))switch(o.name){case"button-primary-hover-background":r="#0F4A85";break;case"button-secondary-hover-background":r="transparent";break;case"button-icon-hover-background":r="transparent";break}}else o.name==="contrast-active-border"&&(r="transparent");o.setValueFor(t,r)}}}const Ui=new Map;let qi=!1;function f(i,e){const t=Ss.create(i);if(e){if(e.includes("--fake-vscode-token")){const s="id"+Math.random().toString(16).slice(2);e=`${e}-${s}`}Ui.set(e,t)}return qi||(rr(Ui),qi=!0),t}const ar=f("background","--vscode-editor-background").withDefault("#1e1e1e"),$=f("border-width").withDefault(1),Bs=f("contrast-active-border","--vscode-contrastActiveBorder").withDefault("#f38518");f("contrast-border","--vscode-contrastBorder").withDefault("#6fc3df");const lt=f("corner-radius").withDefault(0),Oe=f("corner-radius-round").withDefault(2),m=f("design-unit").withDefault(4),$e=f("disabled-opacity").withDefault(.4),E=f("focus-border","--vscode-focusBorder").withDefault("#007fd4"),Z=f("font-family","--vscode-font-family").withDefault("-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol");f("font-weight","--vscode-font-weight").withDefault("400");const P=f("foreground","--vscode-foreground").withDefault("#cccccc"),vt=f("input-height").withDefault("26"),pi=f("input-min-width").withDefault("100px"),j=f("type-ramp-base-font-size","--vscode-font-size").withDefault("13px"),G=f("type-ramp-base-line-height").withDefault("normal"),Ps=f("type-ramp-minus1-font-size").withDefault("11px"),Fs=f("type-ramp-minus1-line-height").withDefault("16px");f("type-ramp-minus2-font-size").withDefault("9px");f("type-ramp-minus2-line-height").withDefault("16px");f("type-ramp-plus1-font-size").withDefault("16px");f("type-ramp-plus1-line-height").withDefault("24px");const lr=f("scrollbarWidth").withDefault("10px"),cr=f("scrollbarHeight").withDefault("10px"),dr=f("scrollbar-slider-background","--vscode-scrollbarSlider-background").withDefault("#79797966"),hr=f("scrollbar-slider-hover-background","--vscode-scrollbarSlider-hoverBackground").withDefault("#646464b3"),ur=f("scrollbar-slider-active-background","--vscode-scrollbarSlider-activeBackground").withDefault("#bfbfbf66"),Ls=f("badge-background","--vscode-badge-background").withDefault("#4d4d4d"),Hs=f("badge-foreground","--vscode-badge-foreground").withDefault("#ffffff"),fi=f("button-border","--vscode-button-border").withDefault("transparent"),Gi=f("button-icon-background").withDefault("transparent"),pr=f("button-icon-corner-radius").withDefault("5px"),fr=f("button-icon-outline-offset").withDefault(0),Wi=f("button-icon-hover-background","--fake-vscode-token").withDefault("rgba(90, 93, 94, 0.31)"),br=f("button-icon-padding").withDefault("3px"),Ae=f("button-primary-background","--vscode-button-background").withDefault("#0e639c"),Vs=f("button-primary-foreground","--vscode-button-foreground").withDefault("#ffffff"),Ms=f("button-primary-hover-background","--vscode-button-hoverBackground").withDefault("#1177bb"),Ut=f("button-secondary-background","--vscode-button-secondaryBackground").withDefault("#3a3d41"),gr=f("button-secondary-foreground","--vscode-button-secondaryForeground").withDefault("#ffffff"),mr=f("button-secondary-hover-background","--vscode-button-secondaryHoverBackground").withDefault("#45494e"),vr=f("button-padding-horizontal").withDefault("11px"),yr=f("button-padding-vertical").withDefault("4px"),ne=f("checkbox-background","--vscode-checkbox-background").withDefault("#3c3c3c"),Se=f("checkbox-border","--vscode-checkbox-border").withDefault("#3c3c3c"),xr=f("checkbox-corner-radius").withDefault(3);f("checkbox-foreground","--vscode-checkbox-foreground").withDefault("#f0f0f0");const ge=f("list-active-selection-background","--vscode-list-activeSelectionBackground").withDefault("#094771"),Ee=f("list-active-selection-foreground","--vscode-list-activeSelectionForeground").withDefault("#ffffff"),wr=f("list-hover-background","--vscode-list-hoverBackground").withDefault("#2a2d2e"),$r=f("divider-background","--vscode-settings-dropdownListBorder").withDefault("#454545"),bt=f("dropdown-background","--vscode-dropdown-background").withDefault("#3c3c3c"),ce=f("dropdown-border","--vscode-dropdown-border").withDefault("#3c3c3c");f("dropdown-foreground","--vscode-dropdown-foreground").withDefault("#f0f0f0");const Cr=f("dropdown-list-max-height").withDefault("200px"),me=f("input-background","--vscode-input-background").withDefault("#3c3c3c"),Ns=f("input-foreground","--vscode-input-foreground").withDefault("#cccccc");f("input-placeholder-foreground","--vscode-input-placeholderForeground").withDefault("#cccccc");const Qi=f("link-active-foreground","--vscode-textLink-activeForeground").withDefault("#3794ff"),kr=f("link-foreground","--vscode-textLink-foreground").withDefault("#3794ff"),Tr=f("progress-background","--vscode-progressBar-background").withDefault("#0e70c0"),Ir=f("panel-tab-active-border","--vscode-panelTitle-activeBorder").withDefault("#e7e7e7"),Te=f("panel-tab-active-foreground","--vscode-panelTitle-activeForeground").withDefault("#e7e7e7"),Sr=f("panel-tab-foreground","--vscode-panelTitle-inactiveForeground").withDefault("#e7e7e799");f("panel-view-background","--vscode-panel-background").withDefault("#1e1e1e");f("panel-view-border","--vscode-panel-border").withDefault("#80808059");const Rr=f("tag-corner-radius").withDefault("2px"),Or=(i,e)=>S`
	${V("inline-block")} :host {
		box-sizing: border-box;
		font-family: ${Z};
		font-size: ${Ps};
		line-height: ${Fs};
		text-align: center;
	}
	.control {
		align-items: center;
		background-color: ${Ls};
		border: calc(${$} * 1px) solid ${fi};
		border-radius: 11px;
		box-sizing: border-box;
		color: ${Hs};
		display: flex;
		height: calc(${m} * 4px);
		justify-content: center;
		min-width: calc(${m} * 4px + 2px);
		min-height: calc(${m} * 4px + 2px);
		padding: 3px 6px;
	}
`;class Ar extends rt{connectedCallback(){super.connectedCallback(),this.circular||(this.circular=!0)}}const Er=Ar.compose({baseName:"badge",template:Cs,styles:Or}),Dr=S`
	${V("inline-flex")} :host {
		outline: none;
		font-family: ${Z};
		font-size: ${j};
		line-height: ${G};
		color: ${Vs};
		background: ${Ae};
		border-radius: calc(${Oe} * 1px);
		fill: currentColor;
		cursor: pointer;
	}
	.control {
		background: transparent;
		height: inherit;
		flex-grow: 1;
		box-sizing: border-box;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		padding: ${yr} ${vr};
		white-space: wrap;
		outline: none;
		text-decoration: none;
		border: calc(${$} * 1px) solid ${fi};
		color: inherit;
		border-radius: inherit;
		fill: inherit;
		cursor: inherit;
		font-family: inherit;
	}
	:host(:hover) {
		background: ${Ms};
	}
	:host(:active) {
		background: ${Ae};
	}
	.control:${F} {
		outline: calc(${$} * 1px) solid ${E};
		outline-offset: calc(${$} * 2px);
	}
	.control::-moz-focus-inner {
		border: 0;
	}
	:host([disabled]) {
		opacity: ${$e};
		background: ${Ae};
		cursor: ${he};
	}
	.content {
		display: flex;
	}
	.start {
		display: flex;
	}
	::slotted(svg),
	::slotted(span) {
		width: calc(${m} * 4px);
		height: calc(${m} * 4px);
	}
	.start {
		margin-inline-end: 8px;
	}
`,Br=S`
	:host([appearance='primary']) {
		background: ${Ae};
		color: ${Vs};
	}
	:host([appearance='primary']:hover) {
		background: ${Ms};
	}
	:host([appearance='primary']:active) .control:active {
		background: ${Ae};
	}
	:host([appearance='primary']) .control:${F} {
		outline: calc(${$} * 1px) solid ${E};
		outline-offset: calc(${$} * 2px);
	}
	:host([appearance='primary'][disabled]) {
		background: ${Ae};
	}
`,Pr=S`
	:host([appearance='secondary']) {
		background: ${Ut};
		color: ${gr};
	}
	:host([appearance='secondary']:hover) {
		background: ${mr};
	}
	:host([appearance='secondary']:active) .control:active {
		background: ${Ut};
	}
	:host([appearance='secondary']) .control:${F} {
		outline: calc(${$} * 1px) solid ${E};
		outline-offset: calc(${$} * 2px);
	}
	:host([appearance='secondary'][disabled]) {
		background: ${Ut};
	}
`,Fr=S`
	:host([appearance='icon']) {
		background: ${Gi};
		border-radius: ${pr};
		color: ${P};
	}
	:host([appearance='icon']:hover) {
		background: ${Wi};
		outline: 1px dotted ${Bs};
		outline-offset: -1px;
	}
	:host([appearance='icon']) .control {
		padding: ${br};
		border: none;
	}
	:host([appearance='icon']:active) .control:active {
		background: ${Wi};
	}
	:host([appearance='icon']) .control:${F} {
		outline: calc(${$} * 1px) solid ${E};
		outline-offset: ${fr};
	}
	:host([appearance='icon'][disabled]) {
		background: ${Gi};
	}
`,Lr=(i,e)=>S`
	${Dr}
	${Br}
	${Pr}
	${Fr}
`;class _s extends te{connectedCallback(){if(super.connectedCallback(),!this.appearance){const e=this.getAttribute("appearance");this.appearance=e}}attributeChangedCallback(e,t,s){e==="appearance"&&s==="icon"&&(this.getAttribute("aria-label")||(this.ariaLabel="Icon Button")),e==="aria-label"&&(this.ariaLabel=s),e==="disabled"&&(this.disabled=s!==null)}}zs([u],_s.prototype,"appearance",void 0);const Hr=_s.compose({baseName:"button",template:io,styles:Lr,shadowOptions:{delegatesFocus:!0}}),Vr=(i,e)=>S`
	${V("inline-flex")} :host {
		align-items: center;
		outline: none;
		margin: calc(${m} * 1px) 0;
		user-select: none;
		font-size: ${j};
		line-height: ${G};
	}
	.control {
		position: relative;
		width: calc(${m} * 4px + 2px);
		height: calc(${m} * 4px + 2px);
		box-sizing: border-box;
		border-radius: calc(${xr} * 1px);
		border: calc(${$} * 1px) solid ${Se};
		background: ${ne};
		outline: none;
		cursor: pointer;
	}
	.label {
		font-family: ${Z};
		color: ${P};
		padding-inline-start: calc(${m} * 2px + 2px);
		margin-inline-end: calc(${m} * 2px + 2px);
		cursor: pointer;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.checked-indicator {
		width: 100%;
		height: 100%;
		display: block;
		fill: ${P};
		opacity: 0;
		pointer-events: none;
	}
	.indeterminate-indicator {
		border-radius: 2px;
		background: ${P};
		position: absolute;
		top: 50%;
		left: 50%;
		width: 50%;
		height: 50%;
		transform: translate(-50%, -50%);
		opacity: 0;
	}
	:host(:enabled) .control:hover {
		background: ${ne};
		border-color: ${Se};
	}
	:host(:enabled) .control:active {
		background: ${ne};
		border-color: ${E};
	}
	:host(:${F}) .control {
		border: calc(${$} * 1px) solid ${E};
	}
	:host(.disabled) .label,
	:host(.readonly) .label,
	:host(.readonly) .control,
	:host(.disabled) .control {
		cursor: ${he};
	}
	:host(.checked:not(.indeterminate)) .checked-indicator,
	:host(.indeterminate) .indeterminate-indicator {
		opacity: 1;
	}
	:host(.disabled) {
		opacity: ${$e};
	}
`;class Mr extends St{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Checkbox")}}const Nr=Mr.compose({baseName:"checkbox",template:fo,styles:Vr,checkedIndicator:`
		<svg 
			part="checked-indicator"
			class="checked-indicator"
			width="16" 
			height="16" 
			viewBox="0 0 16 16" 
			xmlns="http://www.w3.org/2000/svg" 
			fill="currentColor"
		>
			<path 
				fill-rule="evenodd" 
				clip-rule="evenodd" 
				d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
			/>
		</svg>
	`,indeterminateIndicator:`
		<div part="indeterminate-indicator" class="indeterminate-indicator"></div>
	`}),_r=(i,e)=>S`
	:host {
		display: flex;
		position: relative;
		flex-direction: column;
		width: 100%;
	}
`,zr=(i,e)=>S`
	:host {
		display: grid;
		padding: calc((${m} / 4) * 1px) 0;
		box-sizing: border-box;
		width: 100%;
		background: transparent;
	}
	:host(.header) {
	}
	:host(.sticky-header) {
		background: ${ar};
		position: sticky;
		top: 0;
	}
	:host(:hover) {
		background: ${wr};
		outline: 1px dotted ${Bs};
		outline-offset: -1px;
	}
`,jr=(i,e)=>S`
	:host {
		padding: calc(${m} * 1px) calc(${m} * 3px);
		color: ${P};
		opacity: 1;
		box-sizing: border-box;
		font-family: ${Z};
		font-size: ${j};
		line-height: ${G};
		font-weight: 400;
		border: solid calc(${$} * 1px) transparent;
		border-radius: calc(${lt} * 1px);
		white-space: wrap;
		overflow-wrap: anywhere;
	}
	:host(.column-header) {
		font-weight: 600;
	}
	:host(:${F}),
	:host(:focus),
	:host(:active) {
		background: ${ge};
		border: solid calc(${$} * 1px) ${E};
		color: ${Ee};
		outline: none;
	}
	:host(:${F}) ::slotted(*),
	:host(:focus) ::slotted(*),
	:host(:active) ::slotted(*) {
		color: ${Ee} !important;
	}
`;class Ur extends H{connectedCallback(){super.connectedCallback(),this.getAttribute("aria-label")||this.setAttribute("aria-label","Data Grid")}}const qr=Ur.compose({baseName:"data-grid",baseClass:H,template:ro,styles:_r});class Gr extends L{}const Wr=Gr.compose({baseName:"data-grid-row",baseClass:L,template:uo,styles:zr});class Qr extends ue{}const Xr=Qr.compose({baseName:"data-grid-cell",baseClass:ue,template:po,styles:jr}),Yr=(i,e)=>S`
	${V("block")} :host {
		border: none;
		border-top: calc(${$} * 1px) solid ${$r};
		box-sizing: content-box;
		height: 0;
		margin: calc(${m} * 1px) 0;
		width: 100%;
	}
`;class Zr extends di{}const Jr=Zr.compose({baseName:"divider",template:Ao,styles:Yr}),Kr=(i,e)=>S`
	${V("inline-flex")} :host {
		background: ${bt};
		border-radius: calc(${Oe} * 1px);
		box-sizing: border-box;
		color: ${P};
		contain: contents;
		font-family: ${Z};
		height: calc(${vt} * 1px);
		position: relative;
		user-select: none;
		min-width: ${pi};
		outline: none;
		vertical-align: top;
	}
	.control {
		align-items: center;
		box-sizing: border-box;
		border: calc(${$} * 1px) solid ${ce};
		border-radius: calc(${Oe} * 1px);
		cursor: pointer;
		display: flex;
		font-family: inherit;
		font-size: ${j};
		line-height: ${G};
		min-height: 100%;
		padding: 2px 6px 2px 8px;
		width: 100%;
	}
	.listbox {
		background: ${bt};
		border: calc(${$} * 1px) solid ${E};
		border-radius: calc(${Oe} * 1px);
		box-sizing: border-box;
		display: inline-flex;
		flex-direction: column;
		left: 0;
		max-height: ${Cr};
		padding: 0;
		overflow-y: auto;
		position: absolute;
		width: 100%;
		z-index: 1;
	}
	.listbox[hidden] {
		display: none;
	}
	:host(:${F}) .control {
		border-color: ${E};
	}
	:host(:not([disabled]):hover) {
		background: ${bt};
		border-color: ${ce};
	}
	:host(:${F}) ::slotted([aria-selected="true"][role="option"]:not([disabled])) {
		background: ${ge};
		border: calc(${$} * 1px) solid transparent;
		color: ${Ee};
	}
	:host([disabled]) {
		cursor: ${he};
		opacity: ${$e};
	}
	:host([disabled]) .control {
		cursor: ${he};
		user-select: none;
	}
	:host([disabled]:hover) {
		background: ${bt};
		color: ${P};
		fill: currentcolor;
	}
	:host(:not([disabled])) .control:active {
		border-color: ${E};
	}
	:host(:empty) .listbox {
		display: none;
	}
	:host([open]) .control {
		border-color: ${E};
	}
	:host([open][position='above']) .listbox {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	:host([open][position='below']) .listbox {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
	:host([open][position='above']) .listbox {
		bottom: calc(${vt} * 1px);
	}
	:host([open][position='below']) .listbox {
		top: calc(${vt} * 1px);
	}
	.selected-value {
		flex: 1 1 auto;
		font-family: inherit;
		overflow: hidden;
		text-align: start;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.indicator {
		flex: 0 0 auto;
		margin-inline-start: 1em;
	}
	slot[name='listbox'] {
		display: none;
		width: 100%;
	}
	:host([open]) slot[name='listbox'] {
		display: flex;
		position: absolute;
	}
	.end {
		margin-inline-start: auto;
	}
	.start,
	.end,
	.indicator,
	.select-indicator,
	::slotted(svg),
	::slotted(span) {
		fill: currentcolor;
		height: 1em;
		min-height: calc(${m} * 4px);
		min-width: calc(${m} * 4px);
		width: 1em;
	}
	::slotted([role='option']),
	::slotted(option) {
		flex: 0 0 auto;
	}
`;class ea extends fe{}const ta=ea.compose({baseName:"dropdown",template:Uo,styles:Kr,indicator:`
		<svg 
			class="select-indicator"
			part="select-indicator"
			width="16" 
			height="16" 
			viewBox="0 0 16 16" 
			xmlns="http://www.w3.org/2000/svg" 
			fill="currentColor"
		>
			<path 
				fill-rule="evenodd" 
				clip-rule="evenodd" 
				d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
			/>
		</svg>
	`}),ia=(i,e)=>S`
	${V("inline-flex")} :host {
		background: transparent;
		box-sizing: border-box;
		color: ${kr};
		cursor: pointer;
		fill: currentcolor;
		font-family: ${Z};
		font-size: ${j};
		line-height: ${G};
		outline: none;
	}
	.control {
		background: transparent;
		border: calc(${$} * 1px) solid transparent;
		border-radius: calc(${lt} * 1px);
		box-sizing: border-box;
		color: inherit;
		cursor: inherit;
		fill: inherit;
		font-family: inherit;
		height: inherit;
		padding: 0;
		outline: none;
		text-decoration: none;
		word-break: break-word;
	}
	.control::-moz-focus-inner {
		border: 0;
	}
	:host(:hover) {
		color: ${Qi};
	}
	:host(:hover) .content {
		text-decoration: underline;
	}
	:host(:active) {
		background: transparent;
		color: ${Qi};
	}
	:host(:${F}) .control,
	:host(:focus) .control {
		border: calc(${$} * 1px) solid ${E};
	}
`;class sa extends ee{}const na=sa.compose({baseName:"link",template:eo,styles:ia,shadowOptions:{delegatesFocus:!0}}),oa=(i,e)=>S`
	${V("inline-flex")} :host {
		font-family: var(--body-font);
		border-radius: ${lt};
		border: calc(${$} * 1px) solid transparent;
		box-sizing: border-box;
		color: ${P};
		cursor: pointer;
		fill: currentcolor;
		font-size: ${j};
		line-height: ${G};
		margin: 0;
		outline: none;
		overflow: hidden;
		padding: 0 calc((${m} / 2) * 1px)
			calc((${m} / 4) * 1px);
		user-select: none;
		white-space: nowrap;
	}
	:host(:${F}) {
		border-color: ${E};
		background: ${ge};
		color: ${P};
	}
	:host([aria-selected='true']) {
		background: ${ge};
		border: calc(${$} * 1px) solid transparent;
		color: ${Ee};
	}
	:host(:active) {
		background: ${ge};
		color: ${Ee};
	}
	:host(:not([aria-selected='true']):hover) {
		background: ${ge};
		border: calc(${$} * 1px) solid transparent;
		color: ${Ee};
	}
	:host(:not([aria-selected='true']):active) {
		background: ${ge};
		color: ${P};
	}
	:host([disabled]) {
		cursor: ${he};
		opacity: ${$e};
	}
	:host([disabled]:hover) {
		background-color: inherit;
	}
	.content {
		grid-column-start: 2;
		justify-self: start;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;let ra=class extends re{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Option")}};const aa=ra.compose({baseName:"option",template:Do,styles:oa}),la=(i,e)=>S`
	${V("grid")} :host {
		box-sizing: border-box;
		font-family: ${Z};
		font-size: ${j};
		line-height: ${G};
		color: ${P};
		grid-template-columns: auto 1fr auto;
		grid-template-rows: auto 1fr;
		overflow-x: auto;
	}
	.tablist {
		display: grid;
		grid-template-rows: auto auto;
		grid-template-columns: auto;
		column-gap: calc(${m} * 8px);
		position: relative;
		width: max-content;
		align-self: end;
		padding: calc(${m} * 1px) calc(${m} * 1px) 0;
		box-sizing: border-box;
	}
	.start,
	.end {
		align-self: center;
	}
	.activeIndicator {
		grid-row: 2;
		grid-column: 1;
		width: 100%;
		height: calc((${m} / 4) * 1px);
		justify-self: center;
		background: ${Te};
		margin: 0;
		border-radius: calc(${lt} * 1px);
	}
	.activeIndicatorTransition {
		transition: transform 0.01s linear;
	}
	.tabpanel {
		grid-row: 2;
		grid-column-start: 1;
		grid-column-end: 4;
		position: relative;
	}
`,ca=(i,e)=>S`
	${V("inline-flex")} :host {
		box-sizing: border-box;
		font-family: ${Z};
		font-size: ${j};
		line-height: ${G};
		height: calc(${m} * 7px);
		padding: calc(${m} * 1px) 0;
		color: ${Sr};
		fill: currentcolor;
		border-radius: calc(${lt} * 1px);
		border: solid calc(${$} * 1px) transparent;
		align-items: center;
		justify-content: center;
		grid-row: 1;
		cursor: pointer;
	}
	:host(:hover) {
		color: ${Te};
		fill: currentcolor;
	}
	:host(:active) {
		color: ${Te};
		fill: currentcolor;
	}
	:host([aria-selected='true']) {
		background: transparent;
		color: ${Te};
		fill: currentcolor;
	}
	:host([aria-selected='true']:hover) {
		background: transparent;
		color: ${Te};
		fill: currentcolor;
	}
	:host([aria-selected='true']:active) {
		background: transparent;
		color: ${Te};
		fill: currentcolor;
	}
	:host(:${F}) {
		outline: none;
		border: solid calc(${$} * 1px) ${Ir};
	}
	:host(:focus) {
		outline: none;
	}
	::slotted(vscode-badge) {
		margin-inline-start: calc(${m} * 2px);
	}
`,da=(i,e)=>S`
	${V("flex")} :host {
		color: inherit;
		background-color: transparent;
		border: solid calc(${$} * 1px) transparent;
		box-sizing: border-box;
		font-size: ${j};
		line-height: ${G};
		padding: 10px calc((${m} + 2) * 1px);
	}
`;class ha extends ae{connectedCallback(){super.connectedCallback(),this.orientation&&(this.orientation=Yt.horizontal),this.getAttribute("aria-label")||this.setAttribute("aria-label","Panels")}}const ua=ha.compose({baseName:"panels",template:Qo,styles:la});class pa extends As{connectedCallback(){super.connectedCallback(),this.disabled&&(this.disabled=!1),this.textContent&&this.setAttribute("aria-label",this.textContent)}}const fa=pa.compose({baseName:"panel-tab",template:Wo,styles:ca});class ba extends Go{}const ga=ba.compose({baseName:"panel-view",template:qo,styles:da}),ma=(i,e)=>S`
	${V("flex")} :host {
		align-items: center;
		outline: none;
		height: calc(${m} * 7px);
		width: calc(${m} * 7px);
		margin: 0;
	}
	.progress {
		height: 100%;
		width: 100%;
	}
	.background {
		fill: none;
		stroke: transparent;
		stroke-width: calc(${m} / 2 * 1px);
	}
	.indeterminate-indicator-1 {
		fill: none;
		stroke: ${Tr};
		stroke-width: calc(${m} / 2 * 1px);
		stroke-linecap: square;
		transform-origin: 50% 50%;
		transform: rotate(-90deg);
		transition: all 0.2s ease-in-out;
		animation: spin-infinite 2s linear infinite;
	}
	@keyframes spin-infinite {
		0% {
			stroke-dasharray: 0.01px 43.97px;
			transform: rotate(0deg);
		}
		50% {
			stroke-dasharray: 21.99px 21.99px;
			transform: rotate(450deg);
		}
		100% {
			stroke-dasharray: 0.01px 43.97px;
			transform: rotate(1080deg);
		}
	}
`;class va extends _e{connectedCallback(){super.connectedCallback(),this.paused&&(this.paused=!1),this.setAttribute("aria-label","Loading"),this.setAttribute("aria-live","assertive"),this.setAttribute("role","alert")}attributeChangedCallback(e,t,s){e==="value"&&this.removeAttribute("value")}}const ya=va.compose({baseName:"progress-ring",template:Lo,styles:ma,indeterminateIndicator:`
		<svg class="progress" part="progress" viewBox="0 0 16 16">
			<circle
				class="background"
				part="background"
				cx="8px"
				cy="8px"
				r="7px"
			></circle>
			<circle
				class="indeterminate-indicator-1"
				part="indeterminate-indicator-1"
				cx="8px"
				cy="8px"
				r="7px"
			></circle>
		</svg>
	`}),xa=(i,e)=>S`
	${V("flex")} :host {
		align-items: flex-start;
		margin: calc(${m} * 1px) 0;
		flex-direction: column;
	}
	.positioning-region {
		display: flex;
		flex-wrap: wrap;
	}
	:host([orientation='vertical']) .positioning-region {
		flex-direction: column;
	}
	:host([orientation='horizontal']) .positioning-region {
		flex-direction: row;
	}
	::slotted([slot='label']) {
		color: ${P};
		font-size: ${j};
		margin: calc(${m} * 1px) 0;
	}
`;class wa extends pe{connectedCallback(){super.connectedCallback();const e=this.querySelector("label");if(e){const t="radio-group-"+Math.random().toString(16).slice(2);e.setAttribute("id",t),this.setAttribute("aria-labelledby",t)}}}const $a=wa.compose({baseName:"radio-group",template:Ho,styles:xa}),Ca=(i,e)=>S`
	${V("inline-flex")} :host {
		align-items: center;
		flex-direction: row;
		font-size: ${j};
		line-height: ${G};
		margin: calc(${m} * 1px) 0;
		outline: none;
		position: relative;
		transition: all 0.2s ease-in-out;
		user-select: none;
	}
	.control {
		background: ${ne};
		border-radius: 999px;
		border: calc(${$} * 1px) solid ${Se};
		box-sizing: border-box;
		cursor: pointer;
		height: calc(${m} * 4px);
		position: relative;
		outline: none;
		width: calc(${m} * 4px);
	}
	.label {
		color: ${P};
		cursor: pointer;
		font-family: ${Z};
		margin-inline-end: calc(${m} * 2px + 2px);
		padding-inline-start: calc(${m} * 2px + 2px);
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.control,
	.checked-indicator {
		flex-shrink: 0;
	}
	.checked-indicator {
		background: ${P};
		border-radius: 999px;
		display: inline-block;
		inset: calc(${m} * 1px);
		opacity: 0;
		pointer-events: none;
		position: absolute;
	}
	:host(:not([disabled])) .control:hover {
		background: ${ne};
		border-color: ${Se};
	}
	:host(:not([disabled])) .control:active {
		background: ${ne};
		border-color: ${E};
	}
	:host(:${F}) .control {
		border: calc(${$} * 1px) solid ${E};
	}
	:host([aria-checked='true']) .control {
		background: ${ne};
		border: calc(${$} * 1px) solid ${Se};
	}
	:host([aria-checked='true']:not([disabled])) .control:hover {
		background: ${ne};
		border: calc(${$} * 1px) solid ${Se};
	}
	:host([aria-checked='true']:not([disabled])) .control:active {
		background: ${ne};
		border: calc(${$} * 1px) solid ${E};
	}
	:host([aria-checked="true"]:${F}:not([disabled])) .control {
		border: calc(${$} * 1px) solid ${E};
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${he};
	}
	:host([aria-checked='true']) .checked-indicator {
		opacity: 1;
	}
	:host([disabled]) {
		opacity: ${$e};
	}
`;class ka extends Ot{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Radio")}}const Ta=ka.compose({baseName:"radio",template:Vo,styles:Ca,checkedIndicator:`
		<div part="checked-indicator" class="checked-indicator"></div>
	`}),Ia=(i,e)=>S`
	${V("inline-block")} :host {
		box-sizing: border-box;
		font-family: ${Z};
		font-size: ${Ps};
		line-height: ${Fs};
	}
	.control {
		background-color: ${Ls};
		border: calc(${$} * 1px) solid ${fi};
		border-radius: ${Rr};
		color: ${Hs};
		padding: calc(${m} * 0.5px) calc(${m} * 1px);
		text-transform: uppercase;
	}
`;class Sa extends rt{connectedCallback(){super.connectedCallback(),this.circular&&(this.circular=!1)}}const Ra=Sa.compose({baseName:"tag",template:Cs,styles:Ia}),Oa=(i,e)=>S`
	${V("inline-block")} :host {
		font-family: ${Z};
		outline: none;
		user-select: none;
	}
	.control {
		box-sizing: border-box;
		position: relative;
		color: ${Ns};
		background: ${me};
		border-radius: calc(${Oe} * 1px);
		border: calc(${$} * 1px) solid ${ce};
		font: inherit;
		font-size: ${j};
		line-height: ${G};
		padding: calc(${m} * 2px + 1px);
		width: 100%;
		min-width: ${pi};
		resize: none;
	}
	.control:hover:enabled {
		background: ${me};
		border-color: ${ce};
	}
	.control:active:enabled {
		background: ${me};
		border-color: ${E};
	}
	.control:hover,
	.control:${F},
	.control:disabled,
	.control:active {
		outline: none;
	}
	.control::-webkit-scrollbar {
		width: ${lr};
		height: ${cr};
	}
	.control::-webkit-scrollbar-corner {
		background: ${me};
	}
	.control::-webkit-scrollbar-thumb {
		background: ${dr};
	}
	.control::-webkit-scrollbar-thumb:hover {
		background: ${hr};
	}
	.control::-webkit-scrollbar-thumb:active {
		background: ${ur};
	}
	:host(:focus-within:not([disabled])) .control {
		border-color: ${E};
	}
	:host([resize='both']) .control {
		resize: both;
	}
	:host([resize='horizontal']) .control {
		resize: horizontal;
	}
	:host([resize='vertical']) .control {
		resize: vertical;
	}
	.label {
		display: block;
		color: ${P};
		cursor: pointer;
		font-size: ${j};
		line-height: ${G};
		margin-bottom: 2px;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${he};
	}
	:host([disabled]) {
		opacity: ${$e};
	}
	:host([disabled]) .control {
		border-color: ${ce};
	}
`;class Aa extends U{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Text area")}}const Ea=Aa.compose({baseName:"text-area",template:Zo,styles:Oa,shadowOptions:{delegatesFocus:!0}}),Da=(i,e)=>S`
	${V("inline-block")} :host {
		font-family: ${Z};
		outline: none;
		user-select: none;
	}
	.root {
		box-sizing: border-box;
		position: relative;
		display: flex;
		flex-direction: row;
		color: ${Ns};
		background: ${me};
		border-radius: calc(${Oe} * 1px);
		border: calc(${$} * 1px) solid ${ce};
		height: calc(${vt} * 1px);
		min-width: ${pi};
	}
	.control {
		-webkit-appearance: none;
		font: inherit;
		background: transparent;
		border: 0;
		color: inherit;
		height: calc(100% - (${m} * 1px));
		width: 100%;
		margin-top: auto;
		margin-bottom: auto;
		border: none;
		padding: 0 calc(${m} * 2px + 1px);
		font-size: ${j};
		line-height: ${G};
	}
	.control:hover,
	.control:${F},
	.control:disabled,
	.control:active {
		outline: none;
	}
	.label {
		display: block;
		color: ${P};
		cursor: pointer;
		font-size: ${j};
		line-height: ${G};
		margin-bottom: 2px;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.start,
	.end {
		display: flex;
		margin: auto;
		fill: currentcolor;
	}
	::slotted(svg),
	::slotted(span) {
		width: calc(${m} * 4px);
		height: calc(${m} * 4px);
	}
	.start {
		margin-inline-start: calc(${m} * 2px);
	}
	.end {
		margin-inline-end: calc(${m} * 2px);
	}
	:host(:hover:not([disabled])) .root {
		background: ${me};
		border-color: ${ce};
	}
	:host(:active:not([disabled])) .root {
		background: ${me};
		border-color: ${E};
	}
	:host(:focus-within:not([disabled])) .root {
		border-color: ${E};
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${he};
	}
	:host([disabled]) {
		opacity: ${$e};
	}
	:host([disabled]) .control {
		border-color: ${ce};
	}
`;class Ba extends Q{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Text field")}}const Pa=Ba.compose({baseName:"text-field",template:Jo,styles:Da,shadowOptions:{delegatesFocus:!0}}),{wrap:D}=nr(js,or());D(Er(),{name:"vscode-badge"});const Wa=D(Hr(),{name:"vscode-button"}),Qa=D(Nr(),{name:"vscode-checkbox",events:{onChange:"change"}});D(qr(),{name:"vscode-data-grid"});D(Xr(),{name:"vscode-data-grid-cell"});D(Wr(),{name:"vscode-data-grid-row"});D(Jr(),{name:"vscode-divider"});const Xa=D(ta(),{name:"vscode-dropdown",events:{onChange:"change"}}),Ya=D(na(),{name:"vscode-link"}),Za=D(aa(),{name:"vscode-option"});D(ua(),{name:"vscode-panels",events:{onChange:"change"}});D(fa(),{name:"vscode-panel-tab"});D(ga(),{name:"vscode-panel-view"});const Ja=D(ya(),{name:"vscode-progress-ring"});D(Ta(),{name:"vscode-radio",events:{onChange:"change"}});D($a(),{name:"vscode-radio-group",events:{onChange:"change"}});D(Ra(),{name:"vscode-tag"});D(Ea(),{name:"vscode-text-area",events:{onChange:"change",onInput:"input"}});const Ka=D(Pa(),{name:"vscode-text-field",events:{onChange:"change",onInput:"input"}});export{Ka as V,Wa as a,Qa as b,Ya as c,Xa as d,Za as e,Ja as f};
