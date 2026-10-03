(function(){
  'use strict';
  const suite=document.getElementById('ledWallConfigurator');
  const editor=document.createElement('div');editor.className='led-editor';
  const inputGrid=suite.querySelector('.led-input-grid');
  inputGrid.before(editor);editor.append(inputGrid);
  const panels=[...inputGrid.querySelectorAll('.led-module')];
  const details=suite.querySelector('.led-detail-grid');details.id='ledResultsPanel';
  const tools=document.createElement('section');tools.id='ledToolsPanel';tools.tabIndex=-1;
  tools.append(suite.querySelector('.led-suite-actions'),document.getElementById('ledCabinetInspector'),suite.querySelector('.led-disclaimer'));
  editor.append(details,tools);panels.push(details,tools);
  // Keep the canonical result nodes; no second calculation or mirrored state.
  for(const id of ['ledCabinetCount','ledCabinetMass']){
    const row=document.getElementById(id).parentElement;
    row.className='led-result';document.getElementById('ledResultStrip').append(row);
  }
  for(const id of ['ledContentResult','ledProcessingResult'])details.prepend(document.getElementById(id));
  const mode=document.getElementById('ledMode').closest('.field');
  document.getElementById('ledLayoutFields').after(mode);
  const buttons=[...document.querySelectorAll('[data-led-jump]')];
  function activate(id,{focus=false}={}){
    const key=id==='ledResultStrip'?'ledResultsPanel':id;
    suite.dataset.activeSection=id;
    panels.forEach(panel=>{
      panel.hidden=panel.id!==key;
      const fields=panel.querySelector('.led-module-fields');
      if(fields){fields.hidden=false;panel.querySelector('.led-module-toggle').setAttribute('aria-expanded','true');}
    });
    buttons.forEach(button=>{if(button.dataset.ledJump===id)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');});
    const active=id==='ledPreviewView'?suite.querySelector('.led-stage'):document.getElementById(key);active.tabIndex=-1;
    if(focus)active.focus({preventScroll:true});
    AVWorkspace.refresh();
  }
  panels.forEach(panel=>AVWorkspace.paginate(panel,{label:panel.id==='ledToolsPanel'?'Tools':panel.id==='ledResultsPanel'?'Details':panel.querySelector('legend span').textContent}));
  // The product controller delegates to this view adapter; scene/calculation state stays untouched.
  suite.addEventListener('led-section-request',event=>activate(event.detail.id,{focus:true}));
  document.getElementById('ledWallPreview').addEventListener('led-wall:select',()=>{
    activate('ledToolsPanel');
    requestAnimationFrame(()=>document.getElementById('ledInspectRow').focus({preventScroll:true}));
  });
  activate('ledLayoutSection');
})();
