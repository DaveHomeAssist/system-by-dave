// Synthetic geometry only. Private venue plots are not test or release assets.
export function stageFixture() {
  const lanes = Object.fromEntries(['A', 'B', 'C', 'D'].map((lane, i) => {
    const x = 125 + i * 250;
    return [lane, { projector: [x, 300], coverage: [[x - 100, 100], [x + 100, 100], [x + 100, 450], [x - 100, 450]], note: 'Synthetic drawing' }];
  }));
  return { version: 1, title: 'Test stage', source: 'Synthetic plot fixture', views: {
    front: { caption: 'Audience view', outline: [[[25, 460], [975, 460]]], labels: [{ at: [500, 50], text: '<script>literal label</script>' }], lanes },
    plan: { caption: 'Plan view', outline: [[[25, 480], [975, 480]]], labels: [], lanes: structuredClone(lanes) },
  } };
}
