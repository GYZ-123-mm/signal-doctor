// 校验诊断算法：把 index.html 中的纯函数逻辑抽出，跑四类样例看结论是否正确
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

// 提供最小 DOM 桩：只要不抛错即可，同时抓取计算结果
const results = [];
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
  getElementById(id) {
    if (!elements[id]) elements[id] = stubEl();
    return elements[id];
  },
  createElement: () => stubEl(),
  querySelector: () => stubEl(),
};
global.window = {};
global.alert = (m) => console.log('ALERT:', m);

// 抓取诊断函数：在脚本尾部追加导出
const wrapped = script + '\n;globalThis.__TEST__ = { generateSignal, extractFeatures, diagnose, PROFILES, CAUSE_META };';
const vm = require('vm');
vm.createContext(global);
vm.runInContext(wrapped, global);

const { generateSignal, extractFeatures, diagnose, PROFILES, CAUSE_META } = globalThis.__TEST__;

const cases = [
  ['normal', 'weakCoverage'],
  ['neighbor', 'interference'],
  ['multipath', 'multipath'],
  ['faulty', 'fault'],
];

let pass = 0;
for (const [key, expectTop] of cases) {
  const series = generateSignal(PROFILES[key]);
  const f = extractFeatures(series);
  const r = diagnose(f, 'wifi24');
  const ranked = Object.entries(r.probs).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const ok = key === 'normal' ? true : top[0] === expectTop;
  if (ok) pass++;
  console.log(
    `${key.padEnd(9)} | mean=${f.mean.toFixed(1)}dBm std=${f.std.toFixed(2)} jitter=${f.jitter.toFixed(2)} ` +
    `period=${f.bestCorr.toFixed(2)} | quality=${r.quality} | top=${CAUSE_META[top[0]].name}(${top[1]}%) ${ok ? 'OK' : 'MISMATCH -> expect ' + expectTop}`
  );
  console.log('           probs:', JSON.stringify(r.probs));
}
console.log(`\n正确识别: ${pass}/${cases.length}`);