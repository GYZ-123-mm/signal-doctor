// 打印各场景的真实特征分布，用于确定阈值
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
global.document = { getElementById(id) { if (!elements[id]) elements[id] = stubEl(); return elements[id]; }, createElement: () => stubEl(), querySelector: () => stubEl() };
global.window = {}; global.alert = () => {};
vm.createContext(global);
vm.runInContext(script + '\n;globalThis.__T__ = { generateSignal, extractFeatures, PROFILES };', global);
const { generateSignal, extractFeatures, PROFILES } = globalThis.__T__;

const stat = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const q = (p) => s[Math.floor(p * (s.length - 1))];
  return `min=${q(0).toFixed(2)} p25=${q(.25).toFixed(2)} med=${q(.5).toFixed(2)} p75=${q(.75).toFixed(2)} max=${q(1).toFixed(2)}`;
};

for (const key of Object.keys(PROFILES)) {
  const F = [];
  for (let i = 0; i < 60; i++) F.push(extractFeatures(generateSignal(PROFILES[key])));
  console.log(`\n=== ${key} ===`);
  for (const f of ['mean', 'std', 'jitter', 'spikeRate', 'bestCorr', 'drift']) {
    console.log(`  ${f.padEnd(10)} ${stat(F.map(x => x[f]))}`);
  }
}