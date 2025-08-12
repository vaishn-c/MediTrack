// MediTrack Final Pro Plus - Doctors management, search, filters, revenue summary, 3-sheet export

const PATIENTS_KEY = 'meditrack_pp_patients';
const APPTS_KEY = 'meditrack_pp_appointments';
const DOCS_KEY = 'meditrack_pp_doctors';
const MEDS_KEY = 'meditrack_pp_medicines';

// Simple medicines list (can be edited later)
const MEDICINES = [
  { id: 'm1', name: 'Ashwagandha (Ayurvedic)' },
  { id: 'm2', name: 'Shatavari (Ayurvedic)' },
  { id: 'm3', name: 'Triphala (Ayurvedic)' },
  { id: 'm4', name: 'Paracetamol 500mg (OTC)' },
  { id: 'm5', name: 'Ibuprofen 200mg (OTC)' },
  { id: 'm6', name: 'Amoxicillin 500mg (Prescription)' },
  { id: 'm7', name: 'Cough Syrup (OTC)' }
];

// DOM refs
const btnDashboard = document.getElementById('btnDashboard');
const btnDoctors = document.getElementById('btnDoctors');
const btnPatients = document.getElementById('btnPatients');
const btnAppointments = document.getElementById('btnAppointments');
const btnExport = document.getElementById('btnExport');
const sections = { dashboard: document.getElementById('dashboard'), doctors: document.getElementById('doctors'), patients: document.getElementById('patients'), appointments: document.getElementById('appointments'), export: document.getElementById('export') };

const totalPatientsEl = document.getElementById('totalPatients');
const totalApptsEl = document.getElementById('totalAppointments');
const todayApptsEl = document.getElementById('todayAppointments');
const totalRevenueEl = document.getElementById('totalRevenue');
const revenueByDoctorEl = document.getElementById('revenueByDoctor');

// Doctors DOM
const doctorForm = document.getElementById('doctorForm');
const doc_id = document.getElementById('doc_id');
const doc_name = document.getElementById('doc_name');
const doc_spec = document.getElementById('doc_spec');
const doc_fee = document.getElementById('doc_fee');
const doctorsList = document.getElementById('doctorsList');
const doctorSearch = document.getElementById('doctorSearch');

// Patients DOM (same as before)
const patientForm = document.getElementById('patientForm');
const p_id = document.getElementById('p_id');
const p_name = document.getElementById('p_name');
const p_age = document.getElementById('p_age');
const p_contact = document.getElementById('p_contact');
const patientsList = document.getElementById('patientsList');
const patientSearch = document.getElementById('patientSearch');
const clearPatient = document.getElementById('clearPatient');

// Appointments DOM
const apptForm = document.getElementById('apptForm');
const a_id = document.getElementById('a_id');
const apptPatientSelect = document.getElementById('apptPatientSelect');
const apptDoctorSelect = document.getElementById('apptDoctorSelect');
const apptDate = document.getElementById('apptDate');
const apptTime = document.getElementById('apptTime');
const apptTreatment = document.getElementById('apptTreatment');
const apptFees = document.getElementById('apptFees');
const apptRemarks = document.getElementById('apptRemarks');
const appointmentsList = document.getElementById('appointmentsList');
const apptSearch = document.getElementById('apptSearch');
const filterDoctor = document.getElementById('filterDoctor');
const downloadExcelBtn = document.getElementById('downloadExcel');

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

let patients = [];
let appointments = [];
let doctors = [];
let medicines = [];

// helpers
function uid(prefix='X'){ return prefix + Date.now().toString().slice(-6); }
function saveState(){ localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients)); localStorage.setItem(APPTS_KEY, JSON.stringify(appointments)); localStorage.setItem(DOCS_KEY, JSON.stringify(doctors)); localStorage.setItem(MEDS_KEY, JSON.stringify(medicines)); }
function loadState(){ try{ patients = JSON.parse(localStorage.getItem(PATIENTS_KEY))||[]; appointments = JSON.parse(localStorage.getItem(APPTS_KEY))||[]; doctors = JSON.parse(localStorage.getItem(DOCS_KEY))||[]; medicines = JSON.parse(localStorage.getItem(MEDS_KEY))||MEDICINES.slice(); }catch(e){ patients=[]; appointments=[]; doctors=[]; medicines=MEDICINES.slice(); } }
loadState();

// UI helpers: toast
function showToast(message, type='success', duration=2200){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.className = 'toast ' + (type==='error' ? 'error' : 'success') + ' show';
  t.textContent = message;
  setTimeout(()=>{ t.classList.remove('show'); }, duration);
}
function tempDisable(btn, ms=1200){ if(btn) { btn.disabled = true; setTimeout(()=> btn.disabled = false, ms); } }
function isFutureOrToday(dateStr, timeStr){ try{ const now = new Date(); const d = new Date(dateStr + 'T' + (timeStr||'00:00')); return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0); }catch(e){ return false; } }

// navigation
function setActive(btn){ document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
btnDashboard.addEventListener('click', ()=>{ showSection('dashboard'); setActive(btnDashboard); });
btnDoctors.addEventListener('click', ()=>{ showSection('doctors'); setActive(btnDoctors); });
btnPatients.addEventListener('click', ()=>{ showSection('patients'); setActive(btnPatients); });
btnAppointments.addEventListener('click', ()=>{ showSection('appointments'); setActive(btnAppointments); });
btnExport.addEventListener('click', ()=>{ showSection('export'); setActive(btnExport); });

function showSection(key){ Object.values(sections).forEach(s=>s.classList.add('hidden')); sections[key].classList.remove('hidden'); renderAll(); focusFirstInput(key); }

function focusFirstInput(sectionKey){
  if(sectionKey === 'patients') { document.getElementById('p_name').focus(); }
  if(sectionKey === 'appointments') { document.getElementById('apptPatientSelect').focus(); }
  if(sectionKey === 'doctors') { document.getElementById('doc_name').focus(); }
}

// renderers
function renderAll(){ renderDashboard(); renderDoctorsList(); renderPatientsList(); renderAppointmentsList(); populateSelects(); renderRevenueByDoctor(); }
function renderDashboard(){
  totalPatientsEl.textContent = patients.length;
  totalApptsEl.textContent = appointments.length;
  const today = new Date().toISOString().slice(0,10);
  todayApptsEl.textContent = appointments.filter(a=>a.date===today).length;
  const revenue = appointments.reduce((s,a)=>s + (Number(a.fees)||0), 0);
  totalRevenueEl.textContent = '₹' + revenue;
}
function renderRevenueByDoctor(){
  const map = {};
  doctors.forEach(d => map[d.id] = { name: d.name, total:0 });
  appointments.forEach(a => { if(map[a.doctorId]) map[a.doctorId].total += Number(a.fees)||0; });
  let html = '<h3>Revenue by doctor</h3>';
  if(doctors.length===0){ html += '<p class="muted">No doctors added yet.</p>'; revenueByDoctorEl.innerHTML = html; return; }
  html += '<ul>';
  doctors.forEach(d => { html += `<li><strong>${d.name}</strong> — ₹${map[d.id]?map[d.id].total:0}</li>`; });
  html += '</ul>';
  revenueByDoctorEl.innerHTML = html;
}

// Doctors CRUD
doctorForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const idVal = doc_id.value.trim();
  const name = doc_name.value.trim();
  const spec = doc_spec.value.trim();
  const fee = doc_fee.value ? Number(doc_fee.value) : null;
  if(!name){ showToast('⚠️ Enter doctor name', 'error'); return; }
  if(idVal){
    const idx = doctors.findIndex(x=>x.id===idVal); if(idx>=0){ doctors[idx].name=name; doctors[idx].spec=spec; doctors[idx].fee=fee; }
  }else{
    const id = uid('D'); doctors.push({ id, name, spec, fee });
  }
  saveState(); showToast('✅ Doctor saved'); doctorForm.reset(); doc_id.value=''; renderAll();
});
clearDoctor.addEventListener('click', ()=>{ doctorForm.reset(); doc_id.value=''; });

function renderDoctorsList(filter=''){
  doctorsList.innerHTML = '';
  const list = doctors.filter(d => (d.name + ' ' + (d.spec||'')).toLowerCase().includes(filter.toLowerCase()));
  if(list.length===0){ doctorsList.innerHTML = '<div class="muted">No doctors yet.</div>'; return; }
  list.slice().reverse().forEach(d=>{
    const div = document.createElement('div'); div.className = 'record';
    const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML = `<strong>${d.name}</strong><br/>${d.spec || ''}<br/>Fees: ${d.fee? '₹'+d.fee : '—'}`;
    const actions = document.createElement('div'); actions.className='actions';
    const edit = document.createElement('button'); edit.className='edit'; edit.textContent='Edit'; edit.onclick = ()=>editDoctor(d.id);
    const del = document.createElement('button'); del.className='del'; del.textContent='Delete'; del.onclick = ()=>deleteDoctor(d.id);
    actions.appendChild(edit); actions.appendChild(del);
    div.appendChild(meta); div.appendChild(actions); doctorsList.appendChild(div);
  });
}
doctorSearch.addEventListener('input', (e)=> renderDoctorsList(e.target.value));
function editDoctor(id){ const d = doctors.find(x=>x.id===id); if(!d) return; doc_id.value=d.id; doc_name.value=d.name; doc_spec.value=d.spec||''; doc_fee.value=d.fee||''; showSection('doctors'); setActive(btnDoctors); }
function deleteDoctor(id){ if(!confirm('Delete doctor? Existing appointments will keep doctorId but doctor list will not show deleted doctor.')) return; doctors = doctors.filter(x=>x.id!==id); saveState(); renderAll(); showToast('✅ Doctor deleted'); }

// Patients CRUD (similar to before with duplicate check)
patientForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const idVal = p_id.value.trim();
  const name = p_name.value.trim();
  const age = Number(p_age.value);
  const contact = p_contact.value.trim();
  if(!name || !age || !contact){ showToast('⚠️ Please fill all patient fields', 'error'); return; }
  const exists = patients.some(p => p.name.toLowerCase()===name.toLowerCase() && p.contact===contact && (!p_id.value));
  if(exists){ showToast('⚠️ Patient already exists (same name & contact)', 'error'); return; }
  if(idVal){ const idx = patients.findIndex(x=>x.id===idVal); if(idx>=0){ patients[idx].name=name; patients[idx].age=age; patients[idx].contact=contact; } } else { const id = uid('P'); patients.push({ id, name, age, contact }); }
  saveState(); showToast('✅ Patient saved'); patientForm.reset(); p_id.value=''; renderAll();
});
clearPatient.addEventListener('click', ()=>{ patientForm.reset(); p_id.value=''; });
function renderPatientsList(filter=''){ patientsList.innerHTML=''; const list = patients.filter(p => (p.name + ' ' + p.id).toLowerCase().includes(filter.toLowerCase())); if(list.length===0){ patientsList.innerHTML = '<div class="muted">No patients found.</div>'; return; } list.slice().reverse().forEach(p=>{ const div=document.createElement('div'); div.className='record'; const meta=document.createElement('div'); meta.className='meta'; meta.innerHTML=`<strong>${p.name}</strong> (Age: ${p.age})<br/>ID: ${p.id} • ${p.contact}`; const actions=document.createElement('div'); actions.className='actions'; const view=document.createElement('button'); view.className='edit'; view.textContent='View'; view.onclick=()=>viewPatient(p.id); const edit=document.createElement('button'); edit.className='edit'; edit.textContent='Edit'; edit.onclick=()=>editPatient(p.id); const del=document.createElement('button'); del.className='del'; del.textContent='Delete'; del.onclick=()=>deletePatient(p.id); actions.appendChild(view); actions.appendChild(edit); actions.appendChild(del); div.appendChild(meta); div.appendChild(actions); patientsList.appendChild(div); }); }
patientSearch.addEventListener('input', (e)=> renderPatientsList(e.target.value));
function editPatient(id){ const p=patients.find(x=>x.id===id); if(!p) return; p_id.value=p.id; p_name.value=p.name; p_age.value=p.age; p_contact.value=p.contact; showSection('patients'); setActive(btnPatients); }
function deletePatient(id){ if(!confirm('Delete patient and related appointments?')) return; const pname = patients.find(x=>x.id===id)?.name; patients = patients.filter(x=>x.id!==id); appointments = appointments.filter(a=>a.patientName !== pname ); saveState(); renderAll(); showToast('✅ Patient deleted'); }
function viewPatient(id){ const p=patients.find(x=>x.id===id); if(!p) return; const history = appointments.filter(a=>a.patientName===p.name); let html=`<h3>${p.name} (ID: ${p.id})</h3><p>Age: ${p.age} • Contact: ${p.contact}</p>`; html += '<h4>Appointment History</h4>'; if(history.length===0) html += '<p class="muted">No past appointments.</p>'; else { html += '<ul>'; history.forEach(h=>{ const doc = doctors.find(d=>d.id === h.doctorId); html += `<li>${h.date} ${h.time} — ${doc?doc.name:'Unknown'} — Treatment: ${h.treatment || '-'} — Medicines: ${h.medicines? h.medicines.join(', '):''} — Fees: ₹${h.fees||0}</li>`; }); html += '</ul>'; } modalBody.innerHTML = html; modal.classList.remove('hidden'); }

// Appointments CRUD with doctor dropdown dynamic and filter
apptForm.addEventListener('submit', (e)=>{ e.preventDefault(); const idVal=a_id.value.trim(); const patientName=apptPatientSelect.value; const doctorId=apptDoctorSelect.value; const date=apptDate.value; const time=apptTime.value; const treatment=apptTreatment.value.trim(); const prescription=''; const fees=apptFees.value ? Number(apptFees.value) : 0; const remarks=apptRemarks.value.trim(); const meds=[]; if(!patientName || !doctorId || !date || !time){ showToast('⚠️ Please fill all appointment fields', 'error'); return; } if(!isFutureOrToday(date,time)){ showToast('⚠️ Appointment date cannot be in the past', 'error'); return; } const dup = appointments.some(a => a.patientName===patientName && a.date===date && a.time===time && (!a_id.value)); if(dup){ showToast('⚠️ Appointment already exists at this date & time', 'error'); return; } if(idVal){ const idx = appointments.findIndex(x=>x.id===idVal); if(idx>=0){ appointments[idx] = { ...appointments[idx], patientName, doctorId, date, time, treatment, prescription, fees, remarks, medicines: meds }; } } else { const id = uid('A'); appointments.push({ id, patientName, doctorId, date, time, treatment, prescription, fees, remarks, medicines: meds }); } saveState(); showToast('✅ Appointment saved'); apptForm.reset(); a_id.value=''; renderAll(); });

clearAppt.addEventListener('click', ()=>{ apptForm.reset(); a_id.value=''; });

function renderAppointmentsList(filter=''){
  appointmentsList.innerHTML='';
  let list = appointments.filter(a => (a.patientName + ' ' + a.id).toLowerCase().includes(filter.toLowerCase()));
  const fdoc = filterDoctor.value;
  if(fdoc){ list = list.filter(a=>a.doctorId===fdoc); }
  if(list.length===0){ appointmentsList.innerHTML = '<div class="muted">No appointments found.</div>'; return; }
  list.slice().reverse().forEach(a=>{ const div=document.createElement('div'); div.className='record'; const doctor = doctors.find(d=>d.id === a.doctorId); const meta=document.createElement('div'); meta.className='meta'; meta.innerHTML=`<strong>${a.patientName}</strong> → ${doctor?doctor.name:'Unknown'}<br/>${a.date} ${a.time} • Treatment: ${a.treatment || '-'} • Fees: ₹${a.fees || 0}`; const actions=document.createElement('div'); actions.className='actions'; const view=document.createElement('button'); view.className='edit'; view.textContent='View'; view.onclick=()=>viewAppointment(a.id); const edit=document.createElement('button'); edit.className='edit'; edit.textContent='Edit'; edit.onclick=()=>editAppointment(a.id); const del=document.createElement('button'); del.className='del'; del.textContent='Delete'; del.onclick=()=>deleteAppointment(a.id); actions.appendChild(view); actions.appendChild(edit); actions.appendChild(del); div.appendChild(meta); div.appendChild(actions); appointmentsList.appendChild(div); });
}

function editAppointment(id){ const a = appointments.find(x=>x.id===id); if(!a) return; a_id.value=a.id; apptPatientSelect.value=a.patientName; apptDoctorSelect.value=a.doctorId; apptDate.value=a.date; apptTime.value=a.time; apptTreatment.value=a.treatment||'';  apptFees.value=a.fees||''; apptRemarks.value=a.remarks||''; Array.from(apptMedicineSelect.options).forEach(opt=> opt.selected = (a.medicines||[]).includes(opt.value)); showSection('appointments'); setActive(btnAppointments); }
function deleteAppointment(id){ if(!confirm('Delete appointment?')) return; appointments = appointments.filter(x=>x.id!==id); saveState(); renderAll(); showToast('✅ Appointment deleted'); }
function viewAppointment(id){ const a = appointments.find(x=>x.id===id); if(!a) return; const doc = doctors.find(d=>d.id===a.doctorId); let html = `<h3>Appointment ${a.id}</h3><p><strong>Patient:</strong> ${a.patientName}</p><p><strong>Doctor:</strong> ${doc?doc.name:'Unknown'}</p>`; html += `<p><strong>Date & Time:</strong> ${a.date} ${a.time}</p>`; html += `<p><strong>Treatment:</strong> ${a.treatment || '-'}</p>`; html += `<p><strong>Medicines:</strong> ${a.medicines? a.medicines.join(', '): '-'}</p>`;  html += `<p><strong>Fees:</strong> ₹${a.fees || 0}</p>`; html += `<p><strong>Remarks:</strong> ${a.remarks || '-'}</p>`; modalBody.innerHTML = html; modal.classList.remove('hidden'); }

// populate selects and lists
function populateSelects(){ apptPatientSelect.innerHTML=''; const defaultOpt = document.createElement('option'); defaultOpt.value=''; defaultOpt.textContent='Select patient'; defaultOpt.disabled=true; defaultOpt.selected=true; apptPatientSelect.appendChild(defaultOpt); patients.forEach(p=>{ const o=document.createElement('option'); o.value=p.name; o.textContent=`${p.name} (ID:${p.id})`; apptPatientSelect.appendChild(o); }); apptDoctorSelect.innerHTML=''; const dd = document.createElement('option'); dd.value=''; dd.textContent='Select doctor'; dd.disabled=true; dd.selected=true; apptDoctorSelect.appendChild(dd); filterDoctor.innerHTML = '<option value="">Filter by doctor</option>'; doctors.forEach(d=>{ const o=document.createElement('option'); o.value=d.id; o.textContent=d.name; apptDoctorSelect.appendChild(o); const fopt=document.createElement('option'); fopt.value=d.id; fopt.textContent=d.name; filterDoctor.appendChild(fopt); });  }

// search listeners
apptSearch.addEventListener('input', (e)=> renderAppointmentsList(e.target.value));
filterDoctor.addEventListener('change', ()=> renderAppointmentsList(apptSearch.value));

// export - 3 sheets: Doctors, Patients, Appointments
downloadExcelBtn.addEventListener('click', ()=>{
  const wb = XLSX.utils.book_new();
  const docData = doctors.map(d=>({ ID:d.id, Name:d.name, Specialization: d.spec||'', Fee: d.fee||'' }));
  const patientData = patients.map(p=>({ ID:p.id, Name:p.name, Age:p.age, Contact:p.contact }));
  const apptData = appointments.map(a=>{ const doc = doctors.find(d=>d.id===a.doctorId); return { ID:a.id, Patient:a.patientName, Doctor: doc?doc.name:a.doctorId, Date:a.date, Time:a.time, Treatment:a.treatment||'', Medicines:(a.medicines||[]).join(', '), Fees:a.fees||0, Remarks:a.remarks||'' }; });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docData), 'Doctors');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientData), 'Patients');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apptData), 'Appointments');
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const blob = new Blob([wbout], {type:'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0,10);
  const fname = `MediTrack_Data_${today}.xlsx`;
  const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// modal close and outside click
closeModal.addEventListener('click', ()=> modal.classList.add('hidden'));
window.addEventListener('click', function(event) { const modalC = document.querySelector('.modal-content'); if (!modal.classList.contains('hidden') && !modalC.contains(event.target)) { modal.classList.add('hidden'); } });

// dark mode toggle

// initial render
renderAll();
