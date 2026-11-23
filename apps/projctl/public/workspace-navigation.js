const panels = new Set(['rig','all','stage','presets','log','setup','throw']);
export function panelNavigation(data) {
  if (data?.type !== 'wst:show-panel' || !panels.has(data.panel)) return null;
  if (data.projector !== undefined && !['A','B','C','D'].includes(data.projector)) return null;
  return {panel:data.panel,...(data.projector?{projector:data.projector}:{})};
}
