import{p as k}from"./chunk-JWPE2WC7-BxGoHaGC.js";import{s as R,g as E,o as I,n as _,a as D,b as F,_ as c,D as P,p as z,A as y,y as C,B as G,l as B,E as W,e as V}from"./MermaidBlock-DnkYjTCM.js";import{p as H}from"./cynefin-VYW2F7L2-JqWuXgcc.js";import"./index.js";import"./index-Cpzsun-R.js";import"./MessagesArea-erUqMU-8.js";import"./index-BOHXO9dq.js";import"./ChatView-BDMxw0P5.js";import"./settingsHandlers-DYOmUoRj.js";import"./vsc-icon-D5YggVGC.js";import"./useLumiSessionComfort-tnRWnnoZ.js";import"./styled-components.browser.esm-C-5WaQ3q.js";import"./index-BJJg7SPr.js";import"./OpenRouterModelPicker-XxmgIuT5.js";import"./switch-Ce-rlL8c.js";import"./format-Bh1JEAKt.js";import"./useApiConfigurationHandlers-CGnAvDHO.js";import"./LumiProgressIndicator-CiI_ITU9.js";import"./index-1xnhqre3.js";import"./McpToolRow-DEtVC9p9.js";import"./AuditHeaderJumpLink-DvdjrsG9.js";import"./useDebounceEffect-CdtOl3yu.js";var x={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},w={axes:[],curves:[],options:x},g=structuredClone(w),j=G.radar,N=c(()=>y({...j,...C().radar}),"getConfig"),b=c(()=>g.axes,"getAxes"),U=c(()=>g.curves,"getCurves"),X=c(()=>g.options,"getOptions"),Y=c(a=>{g.axes=a.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),Z=c(a=>{g.curves=a.map(t=>({name:t.name,label:t.label??t.name,entries:q(t.entries)}))},"setCurves"),q=c(a=>{if(a[0].axis==null)return a.map(e=>e.value);const t=b();if(t.length===0)throw new Error("Axes must be populated before curves for reference entries");return t.map(e=>{const r=a.find(s=>s.axis?.$refText===e.name);if(r===void 0)throw new Error("Missing entry for axis "+e.label);return r.value})},"computeCurveEntries"),J=c(a=>{const t=a.reduce((e,r)=>(e[r.name]=r,e),{});g.options={showLegend:t.showLegend?.value??x.showLegend,ticks:t.ticks?.value??x.ticks,max:t.max?.value??x.max,min:t.min?.value??x.min,graticule:t.graticule?.value??x.graticule}},"setOptions"),K=c(()=>{z(),g=structuredClone(w)},"clear"),$={getAxes:b,getCurves:U,getOptions:X,setAxes:Y,setCurves:Z,setOptions:J,getConfig:N,clear:K,setAccTitle:F,getAccTitle:D,setDiagramTitle:_,getDiagramTitle:I,getAccDescription:E,setAccDescription:R},Q=c(a=>{k(a,$);const{axes:t,curves:e,options:r}=a;$.setAxes(t),$.setCurves(e),$.setOptions(r)},"populate"),tt={parse:c(async a=>{const t=await H("radar",a);B.debug(t),Q(t)},"parse")},et=c((a,t,e,r)=>{const s=r.db,i=s.getAxes(),l=s.getCurves(),n=s.getOptions(),o=s.getConfig(),d=s.getDiagramTitle(),m=P(t),p=at(m,o),u=n.max??Math.max(...l.map(f=>Math.max(...f.entries))),h=n.min,v=Math.min(o.width,o.height)/2;rt(p,i,v,n.ticks,n.graticule),st(p,i,v,o),A(p,i,l,h,u,n.graticule,o),T(p,l,n.showLegend,o),p.append("text").attr("class","radarTitle").text(d).attr("x",0).attr("y",-o.height/2-o.marginTop)},"draw"),at=c((a,t)=>{const e=t.width+t.marginLeft+t.marginRight,r=t.height+t.marginTop+t.marginBottom,s={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return V(a,r,e,t.useMaxWidth??!0),a.attr("viewBox",`0 0 ${e} ${r}`).attr("overflow","visible"),a.append("g").attr("transform",`translate(${s.x}, ${s.y})`)},"drawFrame"),rt=c((a,t,e,r,s)=>{if(s==="circle")for(let i=0;i<r;i++){const l=e*(i+1)/r;a.append("circle").attr("r",l).attr("class","radarGraticule")}else if(s==="polygon"){const i=t.length;for(let l=0;l<r;l++){const n=e*(l+1)/r,o=t.map((d,m)=>{const p=2*m*Math.PI/i-Math.PI/2,u=n*Math.cos(p),h=n*Math.sin(p);return`${u},${h}`}).join(" ");a.append("polygon").attr("points",o).attr("class","radarGraticule")}}},"drawGraticule"),st=c((a,t,e,r)=>{const s=t.length;for(let i=0;i<s;i++){const l=t[i].label,n=2*i*Math.PI/s-Math.PI/2,o=Math.cos(n),d=Math.sin(n);a.append("line").attr("x1",0).attr("y1",0).attr("x2",e*r.axisScaleFactor*o).attr("y2",e*r.axisScaleFactor*d).attr("class","radarAxisLine");const m=o>.01?"start":o<-.01?"end":"middle",p=d>.01?"hanging":d<-.01?"auto":"central",u=4;a.append("text").text(l).attr("x",e*r.axisLabelFactor*o+u*o).attr("y",e*r.axisLabelFactor*d+u*d).attr("text-anchor",m).attr("dominant-baseline",p).attr("class","radarAxisLabel")}},"drawAxes");function A(a,t,e,r,s,i,l){const n=t.length,o=Math.min(l.width,l.height)/2;e.forEach((d,m)=>{if(d.entries.length!==n)return;const p=d.entries.map((u,h)=>{const v=2*Math.PI*h/n-Math.PI/2,f=M(u,r,s,o),S=f*Math.cos(v),O=f*Math.sin(v);return{x:S,y:O}});i==="circle"?a.append("path").attr("d",L(p,l.curveTension)).attr("class",`radarCurve-${m}`):i==="polygon"&&a.append("polygon").attr("points",p.map(u=>`${u.x},${u.y}`).join(" ")).attr("class",`radarCurve-${m}`)})}c(A,"drawCurves");function M(a,t,e,r){const s=Math.min(Math.max(a,t),e);return r*(s-t)/(e-t)}c(M,"relativeRadius");function L(a,t){const e=a.length;let r=`M${a[0].x},${a[0].y}`;for(let s=0;s<e;s++){const i=a[(s-1+e)%e],l=a[s],n=a[(s+1)%e],o=a[(s+2)%e],d={x:l.x+(n.x-i.x)*t,y:l.y+(n.y-i.y)*t},m={x:n.x-(o.x-l.x)*t,y:n.y-(o.y-l.y)*t};r+=` C${d.x},${d.y} ${m.x},${m.y} ${n.x},${n.y}`}return`${r} Z`}c(L,"closedRoundCurve");function T(a,t,e,r){if(!e)return;const s=(r.width/2+r.marginRight)*3/4,i=-(r.height/2+r.marginTop)*3/4,l=20;t.forEach((n,o)=>{const d=a.append("g").attr("transform",`translate(${s}, ${i+o*l})`);d.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${o}`),d.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(n.label)})}c(T,"drawLegend");var nt={draw:et},ot=c((a,t)=>{let e="";for(let r=0;r<a.THEME_COLOR_LIMIT;r++){const s=a[`cScale${r}`];e+=`
		.radarCurve-${r} {
			color: ${s};
			fill: ${s};
			fill-opacity: ${t.curveOpacity};
			stroke: ${s};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${r} {
			fill: ${s};
			fill-opacity: ${t.curveOpacity};
			stroke: ${s};
		}
		`}return e},"genIndexStyles"),it=c(a=>{const t=W(),e=C(),r=y(t,e.themeVariables),s=y(r.radar,a);return{themeVariables:r,radarOptions:s}},"buildRadarStyleOptions"),lt=c(({radar:a}={})=>{const{themeVariables:t,radarOptions:e}=it(a);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${e.axisColor};
		stroke-width: ${e.axisStrokeWidth};
	}
	.radarAxisLabel {
		font-size: ${e.axisLabelFontSize}px;
		color: ${e.axisColor};
	}
	.radarGraticule {
		fill: ${e.graticuleColor};
		fill-opacity: ${e.graticuleOpacity};
		stroke: ${e.graticuleColor};
		stroke-width: ${e.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${e.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${ot(t,e)}
	`},"styles"),Rt={parser:tt,db:$,renderer:nt,styles:lt};export{Rt as diagram};
