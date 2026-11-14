// Synthetic geometry only. Private venue plots are not test or release assets.
export function stageFixture() {
  const lanes = Object.fromEntries(['A', 'B', 'C', 'D'].map((lane, i) => {
    const x = 125 + i * 250;
    return [lane, { projector: [x, 300], coverage: [[x - 100, 100], [x + 100, 100], [x + 100, 450], [x - 100, 450]], note: 'Synthetic drawing' }];
  }));
  const planLanes = Object.fromEntries(Object.entries(lanes).map(([lane, item], i) => {
    const x = 125 + i * 250, target = 1000 - x;
    return [lane, { ...item, projector: [x, 480], control: [x, 520], coverage: [[x, 480], [target - 100, 120], [target + 100, 120]] }];
  }));
  return { version: 1, title: 'Test stage', source: 'Synthetic plot fixture', views: {
    front: { caption: 'Audience view', outline: [[[25, 460], [975, 460]]], labels: [{ at: [500, 50], text: '<script>literal label</script>' }], lanes },
    plan: { caption: 'Plan view', outline: [[[25, 480], [975, 480]]], labels: [], lanes: planLanes },
  } };
}

export function measuredStageFixture() {
  const plot = stageFixture();
  plot.measurements = {
    version: 1, units: 'metres', source: 'Synthetic metric fixture',
    referenceWidth: 8, referenceHeight: 5,
    projectors: Object.fromEntries(['A', 'B', 'C', 'D'].map((lane, i) => [lane, {
      model: 'Synthetic enclosure', x: [-2, -1, .5, 2][i], y: null, z: null,
      body: [.5, .2, .6], portrait: lane === 'A' || lane === 'D', yaw: lane === 'C' ? 90 : null,
      dimensionsSource: 'Synthetic manufacturer envelope', positionSource: 'Synthetic plot offsets',
    }])),
  };
  return plot;
}
