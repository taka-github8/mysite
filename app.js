const STORAGE_KEY = 'defect_app_records_v1';

const els = {
  form: document.getElementById('defectForm'),
  tableBody: document.getElementById('defectTableBody'),
  qFrom: document.getElementById('qFrom'),
  qTo: document.getElementById('qTo'),
  qPart: document.getElementById('qPart'),
  qStatus: document.getElementById('qStatus'),
  qImpact: document.getElementById('qImpact'),
  searchBtn: document.getElementById('searchBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportBtn: document.getElementById('exportBtn'),
  fileInput: document.getElementById('pdfFiles'),
  saveBtn: document.getElementById('saveBtn')
};

let records = loadRecords();
let editingId = null;

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }

function fmtDate(dt) { return new Date(dt).toISOString().slice(0, 10); }

function matchesFilter(r) {
  const from = els.qFrom.value;
  const to = els.qTo.value;
  const part = els.qPart.value.trim().toLowerCase();
  const status = els.qStatus.value;
  const impact = els.qImpact.value;
  if (from && r.occurrenceDate < from) return false;
  if (to && r.occurrenceDate > to) return false;
  if (part && !r.partNumber.toLowerCase().includes(part)) return false;
  if (status && r.status !== status) return false;
  if (impact && r.customerImpact !== impact) return false;
  return true;
}

function render() {
  const filtered = records.filter(matchesFilter).sort((a,b)=> b.occurrenceDate.localeCompare(a.occurrenceDate));
  els.tableBody.innerHTML = filtered.map(r => `
    <tr>
      <td>${r.occurrenceDate}</td>
      <td>${r.partNumber}</td>
      <td>${r.targetCan}</td>
      <td>${r.targetCount}</td>
      <td>${r.inProcessCount}</td>
      <td>${r.discardCount}</td>
      <td>${r.customerImpact}</td>
      <td>${r.status}</td>
      <td>${r.attachments.length}件PDF</td>
      <td>
        <button data-action="edit" data-id="${r.id}">編集</button>
        <button data-action="delete" data-id="${r.id}">削除</button>
      </td>
    </tr>`).join('');
}

function getNumber(name) {
  return Number(els.form.elements[name].value || 0);
}

async function filesToMeta(files) {
  const out = [];
  for (const f of files) {
    if (f.type !== 'application/pdf') throw new Error('PDFのみ添付できます');
    out.push({ name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString() });
  }
  return out;
}

async function onSave(e) {
  e.preventDefault();
  const targetCount = getNumber('targetCount');
  const inProcessCount = getNumber('inProcessCount');
  const discardCount = getNumber('discardCount');
  if (discardCount > targetCount) return alert('廃却数は対象数以下にしてください。');
  if (targetCount < 0 || inProcessCount < 0 || discardCount < 0) return alert('数値は0以上にしてください。');

  const attachments = await filesToMeta(els.fileInput.files);
  const rec = {
    id: editingId || uid(),
    occurrenceDate: els.form.elements.occurrenceDate.value,
    partNumber: els.form.elements.partNumber.value.trim(),
    targetCan: els.form.elements.targetCan.value.trim(),
    targetCount,
    inProcessCount,
    discardCount,
    checkItem: els.form.elements.checkItem.value.trim(),
    measurementValue: els.form.elements.measurementValue.value.trim(),
    customerImpact: els.form.elements.customerImpact.value,
    status: els.form.elements.status.value,
    attachments,
    updatedAt: new Date().toISOString(),
    createdAt: editingId ? records.find(r=>r.id===editingId)?.createdAt || new Date().toISOString() : new Date().toISOString()
  };

  if (editingId) {
    records = records.map(r => r.id === editingId ? { ...rec, attachments: [...r.attachments, ...attachments] } : r);
  } else {
    records.push(rec);
  }
  saveRecords();
  editingId = null;
  els.form.reset();
  render();
}

function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const rec = records.find(r => r.id === id);
  if (!rec) return;

  if (action === 'delete') {
    if (!confirm('削除しますか？')) return;
    records = records.filter(r => r.id !== id);
    saveRecords();
    render();
  }
  if (action === 'edit') {
    editingId = id;
    els.form.elements.occurrenceDate.value = rec.occurrenceDate;
    els.form.elements.partNumber.value = rec.partNumber;
    els.form.elements.targetCan.value = rec.targetCan;
    els.form.elements.targetCount.value = rec.targetCount;
    els.form.elements.inProcessCount.value = rec.inProcessCount;
    els.form.elements.discardCount.value = rec.discardCount;
    els.form.elements.checkItem.value = rec.checkItem;
    els.form.elements.measurementValue.value = rec.measurementValue;
    els.form.elements.customerImpact.value = rec.customerImpact;
    els.form.elements.status.value = rec.status;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function exportCsv() {
  const from = els.qFrom.value;
  const to = els.qTo.value;
  if (!from || !to) return alert('CSV出力には発生日From/Toが必要です。');
  const rows = records.filter(matchesFilter);
  const header = ['発生日','部品番号','対象缶','対象数','流動数','廃却数','確認項目','測定値','顧客への影響','ステータス','添付数','作成日時','更新日時'];
  const csvRows = rows.map(r => [r.occurrenceDate,r.partNumber,r.targetCan,r.targetCount,r.inProcessCount,r.discardCount,r.checkItem,r.measurementValue,r.customerImpact,r.status,r.attachments.length,fmtDate(r.createdAt),fmtDate(r.updatedAt)]);
  const csv = [header, ...csvRows].map(cols => cols.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `defects_${from.replaceAll('-','')}_${to.replaceAll('-','')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

els.form.addEventListener('submit', onSave);
els.tableBody.addEventListener('click', onTableClick);
els.searchBtn.addEventListener('click', render);
els.resetBtn.addEventListener('click', () => {
  els.qFrom.value = '';
  els.qTo.value = '';
  els.qPart.value = '';
  els.qStatus.value = '';
  els.qImpact.value = '';
  render();
});
els.exportBtn.addEventListener('click', exportCsv);

if (records.length === 0) {
  records = [{
    id: uid(), occurrenceDate: '2026-05-16', partNumber: 'PN-4512', targetCan: 'A缶',
    targetCount: 300, inProcessCount: 200, discardCount: 15, checkItem: '外径', measurementValue: '2.4mm',
    customerImpact: '軽微', status: '対応中', attachments: [{name:'report1.pdf', size:0, type:'application/pdf', uploadedAt:new Date().toISOString()}], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()
  }];
  saveRecords();
}
render();
