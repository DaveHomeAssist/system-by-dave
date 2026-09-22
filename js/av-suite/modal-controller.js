export function setModalBackgroundInert(inert){
  const app=document.getElementById('avApp');
  if(app){
    ['[data-r="head"]','[data-r="body"]','[data-dosbar]'].forEach(function(selector){
      const el=app.querySelector(selector);
      if(!el) return;
      if(inert) el.setAttribute('inert',''); else el.removeAttribute('inert');
    });
  }
  const siteHeader=document.querySelector('.sbd-site-header');
  if(siteHeader){if(inert) siteHeader.setAttribute('inert',''); else siteHeader.removeAttribute('inert');}
}
