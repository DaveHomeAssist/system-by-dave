function a(t,c,n){const l=new Blob([t],{type:n}),o=URL.createObjectURL(l),e=document.createElement("a");e.href=o,e.download=c,e.click(),URL.revokeObjectURL(o)}export{a as downloadText};
