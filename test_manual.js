// 验证手动调参模式下不同参数组合的诊断走向是否合理
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
const stub = () => ({
  textContent: '', innerHTML: '', style: {}, value: '0', width: 720, height: 220,
  addEventListener() {}, appendChild() {}, dispatchEvent() {},
  getContext: () => ({ clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fillRect(){},
    createLinearGradient: () => ({ addColorStop(){} }), setLineDash(){}, fillText(){},
    save(){}, restore(){}, fillStyle:'', strokeStyle:'', lineWidth:1, font:'', measureText:()=>({width:10}) }),
});
const els = {};
global.document = { getElementById(id){ if(!els[id]) els[id]=stub(); return els[id]; },
  createElement: () => stub(), querySelector: () => stub(), readyState: 'complete' };
global.window = { addEventListener(){} };
global.alert = () => {};
vm.createContext(global);
vm.runInContext(script + '\n;globalThis.__T__={generateSignal,extractFeatures,diagnose,CAUSE_META};', global);
const { generateSignal, extractFeatures, diagnose, CAUSE_META } = globalThis.__T__;

// 与 getSeries 中 manual 分支保持一致的参数构造
function manualSeries(rssi, snr, loss, jitter) {
  return generateSignal({
    rssi, snr, loss, jitter,
    interfere: Math.max(0, Math.min(1, (24 - snr) / 20)) * 22,
    multipath: 0.8,
  });
}

const cases = [
  ['强信号 高信噪比', -50, 30, 0.2, 1.0],
  ['默认参数',        -62, 22, 0.5, 2.0],
  ['低信噪比 6',      -62,  6, 0.5, 2.0],
  ['极低信噪比 2',    -62,  2, 0.5, 2.0],
  ['弱信号 -85',      -85, 22, 0.5, 2.0],
  ['弱信号+低信噪比', -85,  4, 0.5, 2.0],
  ['高波动 12dB',     -62, 22, 0.5, 12.0],
];

console.log('场景'.padEnd(18), '特征(jitter/spike/period)'.padEnd(30), '结论');
for (const [label, rssi, snr, loss, jit] of cases) {
  const s = manualSeries(rssi, snr, loss, jit);
  const f = extractFeatures(s);
  const r = diagnose(f, 'wifi24');
  const top = Object.entries(r.probs).sort((a,b)=>b[1]-a[1])[0];
  const healthy = r.healthy;
  const verdict = healthy ? '链路健康' : `${CAUSE_META[top[0]].name}(${top[1]}%)`;
  console.log(
    label.padEnd(16),
    `${f.jitter.toFixed(1)} / ${f.spikeRate.toFixed(2)} / ${f.bestCorr.toFixed(2)}`.padEnd(28),
    `评分${String(r.quality).padStart(3)}  ${verdict}`
  );
}


