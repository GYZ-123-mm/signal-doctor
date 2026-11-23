// 多轮随机测试：每个场景跑 30 次，统计正确识别率
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

const stubEl = () => ({
  textContent: '', innerHTML: '', style: {}, value: '0', width: 720, height: 220,
  addEventListener() {}, appendChild() {}, getContext: () => ({
    clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillRect() {},
    createLinearGradient: () => ({ addColorStop() {} }), setLineDash() {},
    fillText() {}, save() {}, restore() {}, fillStyle: '', strokeStyle: '', lineWidth: 1,
    font: '', measureText: () => ({ width: 10 }),
  }),
  dispatchEvent() {},
});
const elements = {};
global.document = {
  getElementById(id) { if (!elements[id]) elements[id] = stubEl(); return elements[id]; },
  createElement: () => stubEl(), querySelector: () => stubEl(),
};
global.window = { addEventListener() {} };
global.alert = () => {};
vm.createContext(global);
vm.runInContext(script + '\n;globalThis.__T__ = { generateSignal, extractFeatures, diagnose, PROFILES, CAUSE_META };', global);
const { generateSignal, extractFeatures, diagnose, PROFILES, CAUSE_META } = globalThis.__T__;

const cases = [
  ['normal', 'healthy', '正常链路'],
  ['neighbor', 'interference', '邻频干扰'],
  ['multipath', 'multipath', '多径衰落'],
  ['faulty', 'fault', '设备故障'],
];

const N = 30;
let totalCorrect = 0, totalRuns = 0;
const rows = [];

for (const [key, expectTop, label] of cases) {
  let correct = 0;
  const dist = {};
  for (let i = 0; i < N; i++) {
    const s = generateSignal(PROFILES[key]);
    const f = extractFeatures(s);
    const r = diagnose(f, 'wifi24');
    const healthy = r.healthy;
    const top = healthy ? 'healthy' : Object.entries(r.probs).sort((a, b) => b[1] - a[1])[0][0];
    dist[top] = (dist[top] || 0) + 1;
    if (top === expectTop) correct++;
  }
  totalCorrect += correct; totalRuns += N;
  const nameOf = k => (k === 'healthy' ? '链路健康' : CAUSE_META[k].name.split(' ')[0]);
  rows.push(`${label.padEnd(10)} 正确 ${correct}/${N} (${(correct / N * 100).toFixed(0)}%)  分布: ` +
    Object.entries(dist).map(([k, v]) => `${nameOf(k)}:${v}`).join(' '));
}

rows.forEach(r => console.log(r));
console.log(`\n总体正确率: ${totalCorrect}/${totalRuns} = ${(totalCorrect / totalRuns * 100).toFixed(1)}%`);

