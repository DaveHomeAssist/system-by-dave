/* Theme bootstrap: apply the operator's stored suite-wide theme choice
   before stylesheets evaluate. Stage Slate (dark) is the default. This is
   the same site-wide av-theme-mode.v1 contract every AV tool page reads.
   It also exposes a resolver for this console's own brand (SBD/Industry/
   DOS) + mode, so the app shell can paint its data-theme before first
   paint without a flash. */
(function(){
  var mode='dark';
  try{
    var stored=localStorage.getItem('av-theme-mode.v1');
    if(stored==='dark'||stored==='light'||stored==='system') mode=stored;
  }catch(e){}
  document.documentElement.setAttribute('data-av-theme',mode);
  window.__avResolveInitialTheme=function(){
    var brand='sbd';
    var m=mode==='system'?(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
    try{
      var ui=JSON.parse(localStorage.getItem('av-suite-ui.v1')||'{}')||{};
      if(ui.brand==='sbd'||ui.brand==='industry'||ui.brand==='dos') brand=ui.brand;
      if(brand!=='sbd'&&(ui.mode==='light'||ui.mode==='dark')) m=ui.mode;
    }catch(e){}
    var theme=brand==='dos'?'dos':(brand==='industry'?(m==='dark'?'ind-dark':'ind'):(m==='dark'?'slate':'paper'));
    return {brand:brand,mode:m,theme:theme};
  };
})();
