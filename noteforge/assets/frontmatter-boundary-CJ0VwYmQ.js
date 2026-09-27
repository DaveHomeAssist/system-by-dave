function e(e){let n=String(e??``),r=n.indexOf(`
`);if(r<0||n.slice(0,r).replace(/\r$/,``)!==`---`)return t(n);let i=r+1;for(;i<=n.length;){let e=n.indexOf(`
`,i),t=e<0?n.length:e,a=n.slice(i,t).replace(/\r$/,``);if(a===`---`||a===`...`){let o=t-+(n[t-1]===`\r`),s=e<0?n.length:e+1;return Object.freeze({hasFrontmatter:!0,source:n,raw:n.slice(0,o),yaml:n.slice(r+1,i),body:n.slice(s),bodyStart:s,separator:e<0?``:n.slice(o,e+1),newline:n.slice(3,r+1)||`
`,closing:a})}if(e<0)break;i=e+1}return t(n)}var t=e=>Object.freeze({hasFrontmatter:!1,source:e,raw:``,yaml:``,body:e,bodyStart:0,separator:``,newline:e.includes(`\r
`)?`\r
`:`
`,closing:null});export{e as t};