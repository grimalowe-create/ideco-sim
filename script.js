// --- Slider live display ---
function bindSlider(id, displayId, format) {
  const el = document.getElementById(id);
  const disp = document.getElementById(displayId);
  el.addEventListener('input', () => { disp.textContent = format(el.value); });
}

bindSlider('age', 'age-val', v => v);
bindSlider('monthly', 'monthly-val', v => Number(v).toLocaleString());
bindSlider('rate', 'rate-val', v => parseFloat(v).toFixed(1));

// --- Calculation ---
function calculate() {
  const age = parseInt(document.getElementById('age').value);
  const monthly = parseInt(document.getElementById('monthly').value);
  const annualRate = parseFloat(document.getElementById('rate').value) / 100;
  const incomeTaxRate = parseInt(document.getElementById('tax-rate').value) / 100;
  const residentTaxRate = 0.10;

  const years = 60 - age;
  if (years <= 0) {
    alert('現在の年齢は59歳以下で入力してください。');
    return;
  }

  const months = years * 12;
  const principal = monthly * months;

  // Future value of annuity
  let totalAsset;
  if (annualRate === 0) {
    totalAsset = principal;
  } else {
    const r = annualRate / 12;
    totalAsset = monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  }

  const gain = totalAsset - principal;

  // Tax saving: annual deduction = monthly * 12, tax saved per year = amount * (income + resident)
  const annualContrib = monthly * 12;
  const taxSavingPerYear = annualContrib * (incomeTaxRate + residentTaxRate);
  const totalTaxSaving = taxSavingPerYear * years;

  // Year-by-year data
  const yearData = [];
  for (let y = 1; y <= years; y++) {
    const m = y * 12;
    const p = monthly * m;
    let fv;
    if (annualRate === 0) {
      fv = p;
    } else {
      const r = annualRate / 12;
      fv = monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r);
    }
    yearData.push({ year: y, age: age + y, principal: p, total: fv });
  }

  renderResults({ years, totalAsset, principal, gain, totalTaxSaving, incomeTaxRate, residentTaxRate, annualContrib, yearData });
}

function renderResults({ years, totalAsset, principal, gain, totalTaxSaving, incomeTaxRate, residentTaxRate, annualContrib, yearData }) {
  const card = document.getElementById('result-card');
  card.classList.add('visible');

  // Result grid
  const grid = document.getElementById('result-grid');
  grid.innerHTML = '';

  const items = [
    { label: '最終的な受取額', value: fmt(totalAsset) + ' 円', sub: '60歳時点の試算', highlight: true },
    { label: '積立期間', value: years + ' 年間', sub: `${years * 12}ヶ月` },
    { label: '元本合計', value: fmt(principal) + ' 円', sub: `月 ${fmt(annualContrib / 12)} 円 × ${years * 12}ヶ月` },
    { label: '運用益', value: fmt(gain) + ' 円', sub: '複利運用の効果' },
    { label: '節税効果（合計）', value: fmt(totalTaxSaving) + ' 円', sub: `所得税 ${Math.round(incomeTaxRate * 100)}% ＋ 住民税 10%` },
    { label: '年間節税額', value: fmt(annualContrib * (incomeTaxRate + residentTaxRate)) + ' 円', sub: '毎年の税負担軽減額' },
  ];

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result-item' + (item.highlight ? ' highlight' : '');
    div.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div><div class="sub">${item.sub}</div>`;
    grid.appendChild(div);
  });

  // Donut chart
  drawDonut(principal, gain, totalTaxSaving);

  // Line chart
  drawLine(yearData);

  // SNS share
  updateShare(totalAsset, years, totalTaxSaving);

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fmt(n) {
  return Math.round(n).toLocaleString();
}

// --- Donut Chart ---
function drawDonut(principal, gain, taxSaving) {
  const canvas = document.getElementById('donut-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 280;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const total = principal + gain + taxSaving;
  const slices = [
    { label: '元本', value: principal, color: '#2A9D8F' },
    { label: '運用益', value: gain, color: '#E9C46A' },
    { label: '節税効果', value: taxSaving, color: '#E76F51' },
  ];

  const cx = size / 2, cy = size / 2;
  const outerR = 110, innerR = 65;
  let startAngle = -Math.PI / 2;

  slices.forEach(s => {
    const angle = (s.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    startAngle += angle;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#264653';
  ctx.font = `bold ${dpr > 1 ? 13 : 13}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('合計', cx, cy - 10);
  ctx.font = `bold 14px sans-serif`;
  ctx.fillStyle = '#2A9D8F';
  ctx.fillText(fmtMan(principal + gain + taxSaving), cx, cy + 12);

  // Legend
  const legend = document.getElementById('donut-legend');
  legend.innerHTML = '';
  slices.forEach(s => {
    const pct = ((s.value / total) * 100).toFixed(1);
    legend.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${s.label}：${pct}%</div>`;
  });
}

function fmtMan(n) {
  const man = Math.round(n / 10000);
  return man.toLocaleString() + '万円';
}

// --- Line Chart ---
function drawLine(yearData) {
  const canvas = document.getElementById('line-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 680;
  const H = 240;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...yearData.map(d => d.total));
  const years = yearData.length;

  function xPos(i) { return pad.left + (i / (years - 1 || 1)) * chartW; }
  function yPos(v) { return pad.top + chartH - (v / maxVal) * chartH; }

  // Grid lines
  ctx.strokeStyle = '#e0f0ee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    const val = maxVal * (1 - i / 4);
    ctx.fillStyle = '#9fb8b5';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtMan(val), pad.left - 6, y + 4);
  }

  // Principal area
  ctx.beginPath();
  yearData.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xPos(i), yPos(d.principal));
    else ctx.lineTo(xPos(i), yPos(d.principal));
  });
  ctx.lineTo(xPos(years - 1), pad.top + chartH);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(42,157,143,0.12)';
  ctx.fill();

  // Total line
  ctx.beginPath();
  yearData.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xPos(i), yPos(d.total));
    else ctx.lineTo(xPos(i), yPos(d.total));
  });
  ctx.strokeStyle = '#2A9D8F';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Principal line
  ctx.beginPath();
  yearData.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xPos(i), yPos(d.principal));
    else ctx.lineTo(xPos(i), yPos(d.principal));
  });
  ctx.strokeStyle = '#E9C46A';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // X-axis labels
  ctx.fillStyle = '#7a9fa0';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(years / 6));
  yearData.forEach((d, i) => {
    if (i % step === 0 || i === years - 1) {
      ctx.fillText(d.age + '歳', xPos(i), H - 8);
    }
  });

  // Legend
  const lx = pad.left;
  const ly = pad.top - 5;
  ctx.fillStyle = '#2A9D8F'; ctx.fillRect(lx, ly, 20, 3);
  ctx.fillStyle = '#264653'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('資産総額', lx + 24, ly + 4);
  ctx.fillStyle = '#E9C46A'; ctx.fillRect(lx + 80, ly, 20, 3);
  ctx.fillStyle = '#264653';
  ctx.fillText('元本', lx + 104, ly + 4);
}

// --- SNS Share ---
function updateShare(totalAsset, years, taxSaving) {
  const text = `iDeCoを${years}年間積み立てると、受取額は約${fmtMan(totalAsset)}！節税効果は約${fmtMan(taxSaving)}になりました。無料シミュレーターで試してみて→`;
  const url = location.href;
  document.getElementById('share-x').href =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  document.getElementById('share-line').href =
    `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

// --- Modal ---
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
