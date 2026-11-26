"use strict";

const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Social Studies", "Pre-technical",
  "CRE", "Integrated Science", "Art and Design"
];
const GRADES = Array.from({ length: 9 }, (_, i) => `Grade ${i + 1}`);
const STORE_KEY = "elimu-cbe-portal-v1";
const root = document.getElementById("app");
let state;
let currentUser = null;
let activePage = "Dashboard";
let notice = "";
let errorNotice = "";

const seed = {
  accounts: [
    { id: "staff-admin", role: "headteacher", name: "Mary Wanjiku", username: "admin", password: "admin123" },
    { id: "staff-teacher-1", role: "teacher", name: "John Kamau", username: "teacher1", password: "teacher123", grade: "Grade 4" },
    { id: "staff-teacher-2", role: "teacher", name: "Grace Achieng", username: "teacher2", password: "teacher123", grade: "Grade 6" }
  ],
  students: [
    { admission: "CBE-2024-001", name: "Amina Otieno", grade: "Grade 4", className: "4 East", guardian: "Peter Otieno", phone: "0712345678", feesTotal: 12000, feesPaid: 8000, password: "learn123" },
    { admission: "CBE-2024-002", name: "Brian Mwangi", grade: "Grade 4", className: "4 East", guardian: "Jane Mwangi", phone: "0723456789", feesTotal: 12000, feesPaid: 12000, password: "learn123" },
    { admission: "CBE-2024-003", name: "Neema Hassan", grade: "Grade 6", className: "6 West", guardian: "Salim Hassan", phone: "0734567890", feesTotal: 15000, feesPaid: 9500, password: "learn123" },
    { admission: "CBE-2024-004", name: "David Kiptoo", grade: "Grade 6", className: "6 West", guardian: "Lydia Kiptoo", phone: "0745678901", feesTotal: 15000, feesPaid: 15000, password: "learn123" }
  ],
  marks: {
    "CBE-2024-001": { Mathematics: 78, English: 82, Kiswahili: 74, "Social Studies": 85, "Pre-technical": 70, CRE: 88, "Integrated Science": 79, "Art and Design": 91 },
    "CBE-2024-002": { Mathematics: 68, English: 75, Kiswahili: 80, "Social Studies": 72, "Pre-technical": 77, CRE: 69, "Integrated Science": 73, "Art and Design": 84 },
    "CBE-2024-003": { Mathematics: 85, English: 79, Kiswahili: 88, "Social Studies": 82, "Pre-technical": 81, CRE: 76, "Integrated Science": 90, "Art and Design": 86 },
    "CBE-2024-004": { Mathematics: 71, English: 67, Kiswahili: 74, "Social Studies": 78, "Pre-technical": 83, CRE: 80, "Integrated Science": 72, "Art and Design": 75 }
  },
  attendance: {},
  payments: [
    { id: "pay-demo", admission: "CBE-2024-001", amount: 8000, method: "M-Pesa", reference: "DEMO-PAID-001", status: "verified", date: new Date().toISOString() }
  ],
  announcements: [
    { id: "announcement-welcome", title: "Welcome to the CBE School Portal", body: "Parents can now view learner reports and submit school fee payments for verification. Please use the learner's admission number and your registered phone number to sign in.", date: new Date().toISOString() },
    { id: "announcement-meeting", title: "Parent-teacher meeting", body: "Our next parent-teacher meeting will be held on Friday at 2:00 PM in the school hall.", date: new Date().toISOString() }
  ]
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return structuredClone(seed);
    const parsed = JSON.parse(saved);
    return { ...structuredClone(seed), ...parsed };
  } catch (error) {
    console.error("Could not load saved portal data:", error);
    return structuredClone(seed);
  }
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save portal data:", error);
    showFlash("Your changes could not be saved in this browser.", true);
  }
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function money(value) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function today() { return new Date().toISOString().slice(0, 10); }
function niceDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function initials(name) {
  return String(name || "").split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}
function average(marks) {
  const values = Object.values(marks || {}).filter(value => Number.isFinite(Number(value)));
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : 0;
}
function learner(admission) { return state.students.find(student => student.admission === admission); }
function isHead() { return currentUser?.role === "headteacher"; }
function visibleStudents() {
  if (currentUser?.role === "teacher") return state.students.filter(student => student.grade === currentUser.grade);
  if (currentUser?.role === "parent" || currentUser?.role === "student") return state.students.filter(student => student.admission === currentUser.admission);
  return state.students;
}
function setFlash(message, isError = false) {
  notice = message;
  errorNotice = isError ? message : "";
  render();
}
function showFlash(message, isError = false) {
  const el = document.getElementById("flash");
  if (!el) return;
  el.className = `flash${isError ? " error" : ""}`;
  el.textContent = message;
  el.hidden = false;
  window.setTimeout(() => { if (el.isConnected) el.hidden = true; }, 4500);
}
function go(page) {
  activePage = page;
  notice = "";
  errorNotice = "";
  render();
}
function logout() {
  currentUser = null;
  activePage = "Dashboard";
  notice = "";
  render();
}

function renderLogin() {
  root.innerHTML = `
    <main class="login-screen">
      <section class="login-brand">
        <div class="brand-lockup"><span class="brand-mark">E</span><span>Elimu CBE</span></div>
        <div class="brand-message">
          <div class="eyebrow">Competency-based education</div>
          <h1>Every learner, moving forward.</h1>
          <p>A shared school space for teachers, learners, families and school leadership.</p>
        </div>
        <div class="login-footer">© ${new Date().getFullYear()} Elimu CBE School Portal</div>
      </section>
      <section class="login-pane">
        <div class="login-card">
          <div class="eyebrow">School portal</div>
          <h2>Welcome back</h2>
          <p>Sign in to continue to your learning community.</p>
          <form id="login-form">
            <div class="field"><label for="login-role">I am a</label>
              <select id="login-role" name="role">
                <option value="headteacher">Headteacher</option>
                <option value="teacher">Class teacher</option>
                <option value="parent">Parent / guardian</option>
                <option value="student">Learner</option>
              </select>
            </div>
            <div id="login-fields"></div>
            <div id="login-error"></div>
            <button class="btn btn-full" type="submit">Sign in <span aria-hidden="true">→</span></button>
          </form>
          <div class="login-help">
            <strong>Demo access</strong><br>
            Headteacher: admin / admin123<br>
            Teacher: teacher1 / teacher123<br>
            Parent: CBE-2024-001 / 0712345678<br>
            Learner: CBE-2024-001 / learn123
          </div>
        </div>
      </section>
    </main>`;
  const role = document.getElementById("login-role");
  const fields = document.getElementById("login-fields");
  const renderFields = () => {
    const parent = role.value === "parent";
    const student = role.value === "student";
    fields.innerHTML = parent || student
      ? `<div class="field"><label for="login-admission">Learner admission number</label><input id="login-admission" name="admission" autocomplete="username" required placeholder="e.g. CBE-2024-001"></div>
         <div class="field"><label for="login-secret">${parent ? "Registered parent phone number" : "Learner password"}</label><input id="login-secret" name="secret" type="${parent ? "tel" : "password"}" required placeholder="${parent ? "e.g. 0712345678" : "Enter learner password"}" autocomplete="${parent ? "tel" : "current-password"}"></div>`
      : `<div class="field"><label for="login-username">Username</label><input id="login-username" name="username" autocomplete="username" required placeholder="Enter your username"></div>
         <div class="field"><label for="login-secret">Password</label><input id="login-secret" name="secret" type="password" autocomplete="current-password" required placeholder="Enter your password"></div>`;
  };
  role.addEventListener("change", renderFields);
  renderFields();
  document.getElementById("login-form").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selectedRole = data.get("role");
    let account;
    if (selectedRole === "parent" || selectedRole === "student") {
      const studentRecord = learner(String(data.get("admission")).trim());
      const valid = studentRecord && (selectedRole === "parent"
        ? studentRecord.phone.replace(/\D/g, "") === String(data.get("secret")).replace(/\D/g, "")
        : studentRecord.password === data.get("secret"));
      if (valid) account = { role: selectedRole, name: selectedRole === "parent" ? studentRecord.guardian : studentRecord.name, admission: studentRecord.admission };
    } else {
      account = state.accounts.find(item => item.role === selectedRole && item.username.toLowerCase() === String(data.get("username")).trim().toLowerCase() && item.password === data.get("secret"));
    }
    if (!account) {
      document.getElementById("login-error").innerHTML = `<div class="flash error">Those details don't match an account. Please check and try again.</div>`;
      return;
    }
    currentUser = { ...account };
    activePage = "Dashboard";
    render();
  });
}

function menuForUser() {
  if (isHead()) return [
    ["Dashboard", "⌂"], ["Accounts", "♙"], ["Learners", "▤"], ["Fees & payments", "＄"],
    ["Class performance", "▥"], ["Announcements", "◉"]
  ];
  if (currentUser.role === "teacher") return [
    ["Dashboard", "⌂"], ["My learners", "♙"], ["Attendance register", "✓"], ["Enter marks", "✎"], ["Report cards", "▤"]
  ];
  return [["Dashboard", "⌂"], ["Report card", "▤"], ["School fees", "＄"], ["Announcements", "◉"]];
}
function pageTitle() { return activePage; }
function shell() {
  const menu = menuForUser();
  const roleName = currentUser.role === "headteacher" ? "Headteacher" : currentUser.role === "teacher" ? `Class teacher · ${currentUser.grade}` : currentUser.role === "parent" ? "Parent / guardian" : "Learner";
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand-lockup"><span class="brand-mark">E</span><span>Elimu CBE</span></div>
      <div class="nav-caption">School workspace</div>
      <nav class="nav-list">${menu.map(([label, icon]) => `<button class="nav-item${activePage === label ? " active" : ""}" data-page="${esc(label)}"><span class="nav-icon">${icon}</span>${esc(label)}</button>`).join("")}</nav>
      <div class="sidebar-bottom">
        <div class="user-chip"><span class="avatar">${esc(initials(currentUser.name))}</span><div><strong>${esc(currentUser.name)}</strong><small>${esc(roleName)}</small></div></div>
        <button class="logout" id="logout">Sign out</button>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div class="topbar-left"><button class="mobile-toggle" id="mobile-toggle" aria-label="Open menu">☰</button><div class="breadcrumb">Elimu CBE <strong>/ ${esc(pageTitle())}</strong></div></div><div class="topbar-date">${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></header>
      <section class="content">
        <div id="flash" class="flash${errorNotice ? " error" : ""}" ${notice ? "" : "hidden"}>${esc(notice)}</div>
        <div id="page-content"></div>
      </section>
    </main>
  </div>`;
}
function bindShell() {
  document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => go(button.dataset.page)));
  document.getElementById("logout").addEventListener("click", logout);
  document.getElementById("mobile-toggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
}
function heading(kicker, title, description, actions = "") {
  return `<div class="welcome-row"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions}</div>`;
}
function panel(title, body, options = {}) {
  const head = options.subtitle
    ? `<div><h2>${esc(title)}</h2><p>${esc(options.subtitle)}</p></div>`
    : `<h2>${esc(title)}</h2>`;
  return `<section class="panel"><div class="panel-head">${head}${options.actions || ""}</div>${body}</section>`;
}
function stats(items) {
  return `<div class="grid stats-grid">${items.map(item => `<div class="stat-card"><div class="stat-top">${esc(item.label)}<span class="stat-icon">${item.icon}</span></div><div class="stat-number">${esc(item.value)}</div><div class="stat-note">${esc(item.note || "")}</div></div>`).join("")}</div>`;
}
function person(name, detail) {
  return `<div class="table-person"><span class="avatar">${esc(initials(name))}</span><div><strong>${esc(name)}</strong><small>${esc(detail)}</small></div></div>`;
}
function status(label, kind = "") { return `<span class="status ${kind}">${esc(label)}</span>`; }
function table(headers, rows, emptyMessage = "Nothing to show yet.") {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td class="empty" colspan="${headers.length}">${esc(emptyMessage)}</td></tr>`}</tbody></table></div>`;
}
function announcementList(records = state.announcements) {
  if (!records.length) return `<div class="no-data">No announcements yet.</div>`;
  return records.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => `<article class="announcement"><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><time>${niceDate(item.date)}</time></article>`).join("");
}
function reportRows(student) {
  const marks = state.marks[student.admission] || {};
  return SUBJECTS.map(subject => {
    const mark = marks[subject];
    return `<tr><td>${esc(subject)}</td><td>${mark === undefined ? "—" : `${esc(mark)} / 100`}</td><td>${mark === undefined ? "Not entered" : esc(gradeBand(mark))}</td></tr>`;
  });
}
function gradeBand(mark) {
  if (mark >= 80) return "Exceeding expectations";
  if (mark >= 60) return "Meeting expectations";
  if (mark >= 40) return "Approaching expectations";
  return "Below expectations";
}
function reportPanel(student, allowPrint = true) {
  const marks = state.marks[student.admission] || {};
  const scored = Object.values(marks).filter(value => Number.isFinite(Number(value)));
  const mean = average(marks);
  const rows = reportRows(student);
  return `<div class="print-header"><h1>Elimu CBE School</h1><p>Learner Report Card · ${esc(student.grade)} · ${esc(student.className || "")}</p></div>
    ${panel(`Learner report card`, `<div class="panel-body"><div class="grid form-grid"><div><div class="muted">Learner</div><strong>${esc(student.name)}</strong></div><div><div class="muted">Admission number</div><strong>${esc(student.admission)}</strong></div><div><div class="muted">Grade and class</div><strong>${esc(student.grade)} · ${esc(student.className || "—")}</strong></div><div><div class="muted">Mean score</div><strong>${scored.length ? `${mean.toFixed(1)} / 100 · ${esc(gradeBand(mean))}` : "Marks not yet entered"}</strong></div></div></div>${table(["Learning area", "Score", "Achievement"], rows, "No marks have been entered.")}`, { actions: allowPrint ? `<button class="btn btn-quiet btn-small no-print" id="print-report">Print / save PDF</button>` : "" })}
    <div class="panel" style="margin-top:16px"><div class="panel-head"><h2>Attendance summary</h2></div><div class="panel-body">${attendanceSummary(student)}</div></div>`;
}
function attendanceSummary(student) {
  const dates = Object.entries(state.attendance);
  const total = dates.length;
  const present = dates.filter(([, register]) => register[student.admission] === "Present").length;
  return total ? `${present} of ${total} school days present (${Math.round(present / total * 100)}%).` : "No attendance has been recorded yet.";
}
function printReport(admission) {
  const original = activePage;
  currentUser._printAdmission = admission;
  activePage = "Report cards";
  render();
  window.print();
  currentUser._printAdmission = null;
  activePage = original;
  render();
}

function renderDashboard() {
  const students = visibleStudents();
  if (isHead()) {
    const pending = state.payments.filter(item => item.status === "pending");
    const unpaid = state.students.reduce((sum, item) => sum + Math.max(0, item.feesTotal - item.feesPaid), 0);
    const rows = state.students.slice(0, 5).map(student => `<tr><td>${person(student.name, student.admission)}</td><td>${esc(student.grade)}</td><td>${esc(student.className || "—")}</td><td>${status(`${Math.round(average(state.marks[student.admission] || {})) || 0} mean`)}</td></tr>`);
    return `${heading("School overview", `Good day, ${currentUser.name.split(" ")[0]}`, "Here is what's happening across your school today.", `<button class="btn btn-soft" data-go="Accounts">Manage accounts →</button>`)}
      ${stats([{ label: "Enrolled learners", value: state.students.length, note: "Across Grades 1–9", icon: "♙" }, { label: "Teaching staff", value: state.accounts.filter(a => a.role === "teacher").length, note: "Class teachers", icon: "▣" }, { label: "Payments to verify", value: pending.length, note: `${money(pending.reduce((sum, item) => sum + Number(item.amount), 0))} submitted`, icon: "＄" }, { label: "Fees outstanding", value: money(unpaid), note: "Total learner balances", icon: "◷" }])}
      <div class="grid two-column"><div class="stack">${panel("Learners across the school", table(["Learner", "Grade", "Class", "Overall mean"], rows), { subtitle: "Recently enrolled learners", actions: `<button class="btn btn-quiet btn-small" data-go="Learners">View all</button>` })}${panel("Recent fee submissions", paymentTable(pending.slice(0, 4), true), { subtitle: "Waiting for headteacher verification", actions: `<button class="btn btn-quiet btn-small" data-go="Fees & payments">Review</button>` })}</div><div class="stack">${panel("Latest announcements", `<div class="panel-body">${announcementList()}</div>`, { actions: `<button class="btn btn-quiet btn-small" data-go="Announcements">Manage</button>` })}</div></div>`;
  }
  if (currentUser.role === "teacher") {
    const date = today();
    const register = state.attendance[date] || {};
    const rows = students.slice(0, 5).map(student => {
      const mark = state.marks[student.admission] || {};
      return `<tr><td>${person(student.name, student.admission)}</td><td>${esc(student.className || "—")}</td><td>${status(register[student.admission] || "Not marked", register[student.admission] === "Absent" ? "absent" : register[student.admission] ? "" : "neutral")}</td><td>${Object.keys(mark).length ? `${average(mark).toFixed(1)} / 100` : "—"}</td></tr>`;
    });
    const present = Object.values(register).filter(value => value === "Present").length;
    return `${heading("Classroom overview", `Good day, ${currentUser.name.split(" ")[0]}`, `${currentUser.grade} · Your class at a glance.`, `<button class="btn btn-soft" data-go="Attendance register">Take attendance →</button>`)}
      ${stats([{ label: "Learners in your grade", value: students.length, note: currentUser.grade, icon: "♙" }, { label: "Present today", value: `${present} / ${students.length}`, note: date, icon: "✓" }, { label: "Marks entered", value: students.filter(s => Object.keys(state.marks[s.admission] || {}).length > 0).length, note: "Learners with results", icon: "✎" }, { label: "Learning areas", value: SUBJECTS.length, note: "CBE assessment areas", icon: "▤" }])}
      <div class="grid two-column"><div>${panel("My learners", table(["Learner", "Class", "Today's register", "Mean score"], rows), { subtitle: currentUser.grade, actions: `<button class="btn btn-quiet btn-small" data-go="My learners">View learners</button>` })}</div><div class="stack">${panel("School announcements", `<div class="panel-body">${announcementList().slice(0, 3)}</div>`)}</div></div>`;
  }
  const student = students[0];
  if (!student) return `${heading("Learner space", "No learner record found", "Please contact the school office.")}`;
  const balance = Math.max(0, student.feesTotal - student.feesPaid);
  const reports = state.marks[student.admission] || {};
  return `${heading(currentUser.role === "parent" ? "Family space" : "Learner space", `Welcome, ${currentUser.name.split(" ")[0]}`, `${student.name} · ${student.grade} · Admission ${student.admission}`, `<button class="btn btn-soft" data-go="Report card">View learner report →</button>`)}
    ${stats([{ label: "Latest mean score", value: Object.keys(reports).length ? `${average(reports).toFixed(1)} / 100` : "Pending", note: "Across learning areas", icon: "▥" }, { label: "Attendance", value: attendanceSummary(student).split(" (")[0], note: "Recorded school days", icon: "✓" }, { label: "Fees paid", value: money(student.feesPaid), note: `of ${money(student.feesTotal)} total`, icon: "＄" }, { label: "Balance due", value: money(balance), note: balance ? "Payment can be submitted below" : "Account is up to date", icon: "◷" }])}
    <div class="grid two-column"><div class="stack">${reportPanel(student, false)}${feesSummary(student)}</div><div>${panel("School announcements", `<div class="panel-body">${announcementList()}</div>`)}</div></div>`;
}
function paymentTable(records, showActions = false) {
  const rows = records.map(item => {
    const student = learner(item.admission);
    const stateTag = status(item.status === "verified" ? "Verified" : item.status === "rejected" ? "Rejected" : "Pending", item.status === "pending" ? "pending" : item.status === "rejected" ? "absent" : "");
    const actions = showActions && item.status === "pending" ? `<button class="btn btn-soft btn-small" data-payment="${esc(item.id)}" data-action="verify">Verify</button> <button class="btn btn-danger btn-small" data-payment="${esc(item.id)}" data-action="reject">Reject</button>` : "";
    return `<tr><td>${student ? person(student.name, student.admission) : esc(item.admission)}</td><td>${money(item.amount)}</td><td>${esc(item.method)} · ${esc(item.reference)}</td><td>${niceDate(item.date)}</td><td>${stateTag}</td>${showActions ? `<td>${actions}</td>` : ""}</tr>`;
  });
  return table(showActions ? ["Learner", "Amount", "Payment details", "Date", "Status", "Actions"] : ["Learner", "Amount", "Payment details", "Date", "Status"], rows, "No fee payments have been submitted.");
}
function feesSummary(student) {
  const balance = Math.max(0, student.feesTotal - student.feesPaid);
  const payments = state.payments.filter(item => item.admission === student.admission);
  return panel("School fees", `<div class="panel-body">
      <div class="grid form-grid"><div><div class="muted">Total fees</div><strong>${money(student.feesTotal)}</strong></div><div><div class="muted">Verified payments</div><strong>${money(student.feesPaid)}</strong></div><div><div class="muted">Balance due</div><strong class="${balance ? "balance" : ""}">${money(balance)}</strong></div></div>
      <div style="margin-top:16px" class="progress-track"><div class="progress-fill" style="width:${student.feesTotal ? Math.min(100, student.feesPaid / student.feesTotal * 100) : 0}%"></div></div>
      ${currentUser.role === "parent" ? `<form id="payment-form" style="margin-top:17px"><div class="form-grid"><div class="field"><label for="payment-amount">Amount to submit (KES)</label><input id="payment-amount" name="amount" type="number" min="1" max="${balance || ""}" required ${balance ? "" : "disabled"} placeholder="${balance ? "Enter amount" : "No balance due"}"></div><div class="field"><label for="payment-method">Payment method</label><select id="payment-method" name="method" ${balance ? "" : "disabled"}><option>M-Pesa</option><option>Bank transfer</option><option>Cash at school</option></select></div><div class="field" style="grid-column:1/-1"><label for="payment-reference">Payment reference / transaction code</label><input id="payment-reference" name="reference" required ${balance ? "" : "disabled"} placeholder="Enter the payment reference"></div></div><button class="btn" ${balance ? "" : "disabled"}>Submit for verification</button><p class="muted" style="font-size:10px;line-height:1.6;margin:11px 0 0">Payment submissions are recorded as pending until the headteacher verifies them. No money is transferred by this demo portal.</p></form>` : ""}
    </div>${payments.length ? `<div class="panel-head"><h2>Payment history</h2></div>${paymentTable(payments)}` : ""}`);
}

function renderAccounts() {
  const teachers = state.accounts.filter(item => item.role === "teacher");
  const rows = teachers.map(item => `<tr><td>${person(item.name, item.username)}</td><td>${esc(item.grade)}</td><td>${status("Class teacher")}</td><td><button class="btn btn-danger btn-small" data-delete-account="${esc(item.id)}">Remove</button></td></tr>`);
  return `${heading("School administration", "Accounts", "Create and manage class teacher access. Parent access is linked to each learner's admission number and guardian phone.")}
    <div class="grid two-column"><div>${panel("Add class teacher", `<div class="panel-body"><form id="teacher-form"><div class="form-grid"><div class="field"><label for="teacher-name">Full name</label><input id="teacher-name" name="name" required></div><div class="field"><label for="teacher-username">Username</label><input id="teacher-username" name="username" required autocomplete="off"></div><div class="field"><label for="teacher-password">Temporary password</label><input id="teacher-password" name="password" type="password" minlength="6" required autocomplete="new-password"></div><div class="field"><label for="teacher-grade">Assigned grade</label><select id="teacher-grade" name="grade">${GRADES.map(grade => `<option>${grade}</option>`).join("")}</select></div></div><button class="btn">Create teacher account</button></form></div>`)}</div><div>${panel("Account access", `<div class="panel-body"><div class="announcement"><h3>Headteacher</h3><p>Manages teacher accounts, learner records, fees, results, and school announcements.</p></div><div class="announcement"><h3>Class teachers</h3><p>Each teacher is assigned to one grade and can manage that grade's learners, attendance, and assessment marks.</p></div><div class="announcement"><h3>Parents and learners</h3><p>Parent sign-in uses a learner admission number and registered guardian phone. Learner sign-in uses their admission number and password.</p></div></div>`)}</div></div>
    <div style="margin-top:18px">${panel("Class teacher accounts", table(["Teacher", "Assigned grade", "Access", "Manage"], rows, "No class teacher accounts yet."))}</div>`;
}
function renderLearners() {
  const gradeOptions = `<option value="">All grades</option>${GRADES.map(grade => `<option>${grade}</option>`).join("")}`;
  const rows = visibleStudents().map(student => `<tr data-grade="${esc(student.grade)}"><td>${person(student.name, student.admission)}</td><td>${esc(student.grade)}</td><td>${esc(student.className || "—")}</td><td>${esc(student.guardian)} · ${esc(student.phone)}</td><td>${money(Math.max(0, student.feesTotal - student.feesPaid))}</td><td>${isHead() ? `<button class="btn btn-danger btn-small" data-delete-student="${esc(student.admission)}">Delete learner</button>` : `<button class="btn btn-quiet btn-small" data-print="${esc(student.admission)}">Print report</button>`}</td></tr>`);
  const enrollment = isHead() || currentUser.role === "teacher" ? panel("Enroll a learner", `<div class="panel-body"><form id="learner-form"><div class="form-grid"><div class="field"><label for="learner-name">Learner full name</label><input id="learner-name" name="name" required></div><div class="field"><label for="learner-admission">Admission number</label><input id="learner-admission" name="admission" required></div><div class="field"><label for="learner-grade">Grade</label><select id="learner-grade" name="grade" ${currentUser.role === "teacher" ? "disabled" : ""}>${GRADES.map(grade => `<option ${currentUser.role === "teacher" && grade === currentUser.grade ? "selected" : ""}>${grade}</option>`).join("")}</select>${currentUser.role === "teacher" ? `<input type="hidden" name="grade" value="${esc(currentUser.grade)}">` : ""}</div><div class="field"><label for="learner-class">Class / stream</label><input id="learner-class" name="className" required placeholder="e.g. 4 East"></div><div class="field"><label for="guardian-name">Parent / guardian name</label><input id="guardian-name" name="guardian" required></div><div class="field"><label for="guardian-phone">Parent phone (portal sign-in)</label><input id="guardian-phone" name="phone" type="tel" required placeholder="e.g. 0712345678"></div><div class="field"><label for="fees-total">Annual fees (KES)</label><input id="fees-total" name="feesTotal" type="number" min="0" value="12000" required></div><div class="field"><label for="learner-password">Learner password</label><input id="learner-password" name="password" type="password" minlength="6" value="learn123" required></div></div><button class="btn">Enroll learner</button><span class="muted" style="margin-left:9px;font-size:10px">Share the admission number and learner password securely with the family.</span></form></div>`) : "";
  const controls = isHead() ? `<div class="toolbar"><select id="grade-filter" aria-label="Filter by grade">${gradeOptions}</select><button class="btn btn-quiet btn-small no-print" id="print-list">Print list</button></div>` : `<div class="toolbar"><button class="btn btn-quiet btn-small no-print" id="print-list">Print list</button></div>`;
  return `${heading("Learner records", isHead() ? "Learners" : "My learners", isHead() ? "Manage enrollment and learner records across all grades." : `Learners enrolled in ${currentUser.grade}.`, controls)}
    ${enrollment}<div style="margin-top:18px">${panel("Learner register", table(["Learner", "Grade", "Class", "Parent / guardian", "Fees due", "Actions"], rows, "No learners match this view."))}</div>`;
}
function renderAttendance() {
  const date = today();
  const students = visibleStudents();
  const register = state.attendance[date] || {};
  const rows = students.map(student => `<tr><td>${person(student.name, student.admission)}</td><td>${esc(student.className || "—")}</td><td><select class="inline-select attendance-choice" data-admission="${esc(student.admission)}"><option ${!register[student.admission] ? "selected" : ""} value="">Not marked</option><option ${register[student.admission] === "Present" ? "selected" : ""}>Present</option><option ${register[student.admission] === "Absent" ? "selected" : ""}>Absent</option><option ${register[student.admission] === "Late" ? "selected" : ""}>Late</option></select></td></tr>`);
  return `${heading("Classroom tools", "Attendance register", `Mark today's attendance for ${currentUser.grade}.`, `<button class="btn" id="save-attendance">Save register</button>`)}
    ${panel(`Daily register · ${niceDate(date)}`, table(["Learner", "Class", "Attendance"], rows, "Enroll learners before taking attendance."), { subtitle: "Attendance is recorded for the current school date." })}`;
}
function renderMarks() {
  const students = visibleStudents();
  const subject = document.getElementById("subject-filter")?.value || SUBJECTS[0];
  const rows = students.map(student => {
    const value = state.marks[student.admission]?.[subject];
    return `<tr><td>${person(student.name, student.admission)}</td><td>${esc(student.grade)}</td><td><input class="mark-input" type="number" min="0" max="100" step="1" value="${value === undefined ? "" : esc(value)}" data-mark-student="${esc(student.admission)}" aria-label="${esc(subject)} mark for ${esc(student.name)}" placeholder="—"></td><td class="marks-total">${value === undefined ? "Not entered" : esc(gradeBand(value))}</td></tr>`;
  });
  const page = `${heading("Assessment tools", "Enter marks", `Record assessment marks for ${currentUser.grade}.`, `<button class="btn" id="save-marks">Save marks</button>`)}
    ${panel("Learning area marks", table(["Learner", "Grade", "Score / 100", "Achievement"], rows, "Enroll learners before entering marks."), { subtitle: "Scores must be from 0 to 100.", actions: `<select id="subject-filter" class="inline-select" aria-label="Select learning area">${SUBJECTS.map(item => `<option ${item === subject ? "selected" : ""}>${esc(item)}</option>`).join("")}</select>` })}`;
  return page;
}
function renderReportCards() {
  const students = visibleStudents();
  const rows = students.map(student => `<tr><td>${person(student.name, student.admission)}</td><td>${esc(student.grade)}</td><td>${esc(student.className || "—")}</td><td>${Object.keys(state.marks[student.admission] || {}).length ? `${average(state.marks[student.admission]).toFixed(1)} / 100` : "Pending"}</td><td><button class="btn btn-quiet btn-small" data-print="${esc(student.admission)}">View / print</button></td></tr>`);
  if (currentUser._printAdmission) {
    const student = learner(currentUser._printAdmission);
    return student ? reportPanel(student) : `${heading("Assessment tools", "Report cards", "Learner not found.")}`;
  }
  return `${heading("Assessment tools", "Report cards", `View and print overall results for learners in ${currentUser.grade}.`)}
    ${panel("Learner results", table(["Learner", "Grade", "Class", "Overall mean", "Report"], rows, "No learners in this grade yet."))}`;
}
function renderFees() {
  const pending = state.payments.filter(item => item.status === "pending");
  const verified = state.payments.filter(item => item.status === "verified");
  const totalDue = state.students.reduce((sum, student) => sum + Math.max(0, student.feesTotal - student.feesPaid), 0);
  return `${heading("School finance", "Fees & payments", "Review parent-submitted payments and manage fee balances.")}
    ${stats([{ label: "Awaiting verification", value: pending.length, note: money(pending.reduce((sum, item) => sum + Number(item.amount), 0)), icon: "◷" }, { label: "Verified payments", value: verified.length, note: money(verified.reduce((sum, item) => sum + Number(item.amount), 0)), icon: "✓" }, { label: "Total balances due", value: money(totalDue), note: "Across all learners", icon: "＄" }, { label: "Enrolled learners", value: state.students.length, note: "Fee accounts", icon: "♙" }])}
    <div class="stack">${panel("Pending verification", paymentTable(pending, true), { subtitle: "Verify only after confirming the payment reference." })}${panel("All payment history", paymentTable(state.payments), { subtitle: "Parent-submitted school fee payments" })}
    <div>${panel("Update learner fee amount", `<div class="panel-body"><form id="fee-form"><div class="form-grid"><div class="field"><label for="fee-student">Learner</label><select id="fee-student" name="admission">${state.students.map(student => `<option value="${esc(student.admission)}">${esc(student.name)} · ${esc(student.grade)} (${esc(student.admission)})</option>`).join("")}</select></div><div class="field"><label for="fee-amount">Total fees (KES)</label><input id="fee-amount" name="feesTotal" type="number" min="0" required></div></div><button class="btn">Update fee amount</button></form></div>`)}</div></div>`;
}
function renderPerformance() {
  const grade = document.getElementById("performance-grade")?.value || GRADES[0];
  const students = state.students.filter(student => student.grade === grade);
  const subjectRows = SUBJECTS.map(subject => {
    const values = students.map(student => state.marks[student.admission]?.[subject]).filter(value => Number.isFinite(Number(value)));
    const mean = values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
    return `<tr><td>${esc(subject)}</td><td>${mean === null ? "—" : `${mean.toFixed(1)} / 100`}</td><td>${mean === null ? "—" : esc(gradeBand(mean))}</td><td>${values.length} / ${students.length}</td></tr>`;
  });
  const learnerRows = students.map(student => {
    const marks = state.marks[student.admission] || {};
    return `<tr><td>${person(student.name, student.admission)}</td><td>${Object.keys(marks).length ? `${average(marks).toFixed(1)} / 100` : "—"}</td><td>${Object.keys(marks).length ? esc(gradeBand(average(marks))) : "Not assessed"}</td></tr>`;
  });
  return `${heading("School performance", "Class performance", "Review overall results and mean scores by learning area.", `<div class="toolbar"><select id="performance-grade">${GRADES.map(item => `<option ${item === grade ? "selected" : ""}>${item}</option>`).join("")}</select><button class="btn btn-quiet btn-small no-print" id="print-performance">Print report</button></div>`)}
    ${stats([{ label: "Grade", value: grade.replace("Grade ", ""), note: "Selected class", icon: "▤" }, { label: "Learners", value: students.length, note: "Currently enrolled", icon: "♙" }, { label: "Class mean", value: students.some(student => Object.keys(state.marks[student.admission] || {}).length) ? `${(students.reduce((sum, student) => {
      const marks = state.marks[student.admission] || {};
      return sum + (Object.keys(marks).length ? average(marks) : 0);
    }, 0) / students.filter(student => Object.keys(state.marks[student.admission] || {}).length).length).toFixed(1)} / 100` : "—", note: "Mean among assessed learners", icon: "▥" }, { label: "Learning areas", value: SUBJECTS.length, note: "Subject-level comparison", icon: "✎" }])}
    <div class="stack">${panel(`${grade} · Mean score by learning area`, table(["Learning area", "Class mean", "Achievement", "Marks entered"], subjectRows, "No marks are available."), { subtitle: "Means include learners with recorded marks in each learning area." })}${panel(`${grade} · Learner performance`, table(["Learner", "Overall mean", "Achievement"], learnerRows, "No learners in this grade."))}</div>`;
}
function renderAnnouncements() {
  return `${heading("School communication", "Announcements", "Share important updates with teachers, learners and families.", `<span class="muted">${state.announcements.length} published</span>`)}
    <div class="grid two-column"><div>${panel("Publish an announcement", `<div class="panel-body"><form id="announcement-form"><div class="field"><label for="announcement-title">Announcement title</label><input id="announcement-title" name="title" maxlength="100" required></div><div class="field"><label for="announcement-body">Message</label><textarea id="announcement-body" name="body" maxlength="2000" required></textarea></div><button class="btn">Publish announcement</button></form></div>`)}</div>
    <div>${panel("Published announcements", `<div class="panel-body">${state.announcements.length ? state.announcements.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => `<article class="announcement"><div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(item.title)}</h3><button class="btn btn-danger btn-small no-print" data-delete-announcement="${esc(item.id)}" aria-label="Delete announcement">Delete</button></div><p>${esc(item.body)}</p><time>${niceDate(item.date)}</time></article>`).join("") : `<div class="no-data">No announcements yet.</div>`}</div>`)}</div></div>`;
}
function renderPage() {
  const pages = {
    Dashboard: renderDashboard,
    Accounts: renderAccounts,
    Learners: renderLearners,
    "My learners": renderLearners,
    "Attendance register": renderAttendance,
    "Enter marks": renderMarks,
    "Report cards": renderReportCards,
    "Report card": () => {
      const student = learner(currentUser.admission);
      return student ? reportPanel(student) : `${heading("Learner report", "Report card", "Learner record not found.")}`;
    },
    "Fees & payments": renderFees,
    "School fees": () => {
      const student = learner(currentUser.admission);
      return student ? `${heading("Family space", "School fees", `${student.name} · ${student.admission}`)}${feesSummary(student)}` : `${heading("Family space", "School fees", "Learner record not found.")}`;
    },
    "Class performance": renderPerformance,
    Announcements: renderAnnouncements
  };
  return (pages[activePage] || renderDashboard)();
}
function render() {
  if (!currentUser) {
    renderLogin();
    return;
  }
  root.innerHTML = shell();
  bindShell();
  const pageContent = document.getElementById("page-content");
  pageContent.innerHTML = renderPage();
  bindPageActions();
}
function bindPageActions() {
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => go(button.dataset.go)));
  const teacherForm = document.getElementById("teacher-form");
  if (teacherForm) teacherForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(teacherForm));
    if (state.accounts.some(item => item.username.toLowerCase() === data.username.trim().toLowerCase())) return showFlash("That username is already in use.", true);
    state.accounts.push({ id: crypto.randomUUID(), role: "teacher", name: data.name.trim(), username: data.username.trim(), password: data.password, grade: data.grade });
    saveState();
    setFlash("Class teacher account created.");
  });
  const learnerForm = document.getElementById("learner-form");
  if (learnerForm) learnerForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(learnerForm));
    data.admission = data.admission.trim();
    if (learner(data.admission)) return showFlash("That admission number is already registered.", true);
    state.students.push({ ...data, name: data.name.trim(), className: data.className.trim(), guardian: data.guardian.trim(), phone: data.phone.trim(), feesTotal: Number(data.feesTotal), feesPaid: 0 });
    state.marks[data.admission] = {};
    saveState();
    setFlash(`Learner ${data.name.trim()} enrolled. Parent access is ${data.admission} plus the registered phone number.`);
  });
  document.querySelectorAll("[data-delete-student]").forEach(button => button.addEventListener("click", () => {
    const student = learner(button.dataset.deleteStudent);
    if (!student || !window.confirm(`Delete ${student.name} (${student.admission}) and their portal records? This cannot be undone.`)) return;
    state.students = state.students.filter(item => item.admission !== student.admission);
    delete state.marks[student.admission];
    Object.values(state.attendance).forEach(register => delete register[student.admission]);
    state.payments = state.payments.filter(item => item.admission !== student.admission);
    saveState();
    setFlash("Learner and associated records deleted.");
  }));
  document.querySelectorAll("[data-delete-account]").forEach(button => button.addEventListener("click", () => {
    const account = state.accounts.find(item => item.id === button.dataset.deleteAccount);
    if (!account || !window.confirm(`Remove ${account.name}'s teacher account?`)) return;
    state.accounts = state.accounts.filter(item => item.id !== account.id);
    saveState();
    setFlash("Teacher account removed.");
  }));
  const saveAttendance = document.getElementById("save-attendance");
  if (saveAttendance) saveAttendance.addEventListener("click", () => {
    const register = {};
    document.querySelectorAll(".attendance-choice").forEach(select => { if (select.value) register[select.dataset.admission] = select.value; });
    state.attendance[today()] = register;
    saveState();
    setFlash("Today's attendance register has been saved.");
  });
  const saveMarks = document.getElementById("save-marks");
  if (saveMarks) saveMarks.addEventListener("click", () => {
    const subject = document.getElementById("subject-filter").value;
    const inputs = [...document.querySelectorAll("[data-mark-student]")];
    for (const input of inputs) {
      if (input.value !== "" && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0 || Number(input.value) > 100)) return showFlash("Marks must be a number from 0 to 100.", true);
    }
    inputs.forEach(input => {
      const record = state.marks[input.dataset.markStudent] || (state.marks[input.dataset.markStudent] = {});
      if (input.value === "") delete record[subject];
      else record[subject] = Number(input.value);
    });
    saveState();
    setFlash(`${subject} marks have been saved.`);
  });
  const subjectSelect = document.getElementById("subject-filter");
  if (subjectSelect) subjectSelect.addEventListener("change", () => {
    const scrollY = window.scrollY;
    render();
    window.scrollTo(0, scrollY);
  });
  const attendanceChoices = document.querySelectorAll(".attendance-choice");
  if (attendanceChoices.length && !isHead()) {
    const grade = document.getElementById("learner-grade");
    if (grade) grade.addEventListener("change", () => {});
  }
  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) paymentForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(paymentForm));
    const student = learner(currentUser.admission);
    const amount = Number(data.amount);
    const balance = Math.max(0, student.feesTotal - student.feesPaid);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) return showFlash("Enter a payment amount greater than zero and no more than the balance due.", true);
    if (state.payments.some(item => item.admission === student.admission && item.reference.toLowerCase() === data.reference.trim().toLowerCase())) return showFlash("That payment reference has already been submitted.", true);
    state.payments.push({ id: crypto.randomUUID(), admission: student.admission, amount, method: data.method, reference: data.reference.trim(), status: "pending", date: new Date().toISOString() });
    saveState();
    setFlash("Payment submitted. The headteacher must verify it before the balance changes.");
  });
  document.querySelectorAll("[data-payment][data-action]").forEach(button => button.addEventListener("click", () => {
    const item = state.payments.find(payment => payment.id === button.dataset.payment);
    if (!item || item.status !== "pending") return;
    if (button.dataset.action === "verify") {
      const student = learner(item.admission);
      if (!student) return showFlash("The learner record for this payment no longer exists.", true);
      if (item.amount > Math.max(0, student.feesTotal - student.feesPaid)) return showFlash("This payment exceeds the learner's remaining balance. Update the fee amount or resolve the excess before verifying.", true);
      item.status = "verified";
      student.feesPaid += Number(item.amount);
    } else if (button.dataset.action === "reject") item.status = "rejected";
    saveState();
    setFlash(`Payment ${item.status}.`);
  }));
  const feeForm = document.getElementById("fee-form");
  if (feeForm) {
    const select = document.getElementById("fee-student");
    const amount = document.getElementById("fee-amount");
    const updateAmount = () => { amount.value = learner(select.value)?.feesTotal ?? 0; };
    select.addEventListener("change", updateAmount);
    updateAmount();
    feeForm.addEventListener("submit", event => {
      event.preventDefault();
      const student = learner(select.value);
      const next = Number(amount.value);
      if (!student || !Number.isFinite(next) || next < student.feesPaid) return showFlash("Total fees cannot be less than verified payments already received.", true);
      student.feesTotal = next;
      saveState();
      setFlash(`Fee amount updated for ${student.name}.`);
    });
  }
  const announceForm = document.getElementById("announcement-form");
  if (announceForm) announceForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(announceForm));
    state.announcements.push({ id: crypto.randomUUID(), title: data.title.trim(), body: data.body.trim(), date: new Date().toISOString() });
    saveState();
    setFlash("Announcement published for the school community.");
  });
  document.querySelectorAll("[data-delete-announcement]").forEach(button => button.addEventListener("click", () => {
    state.announcements = state.announcements.filter(item => item.id !== button.dataset.deleteAnnouncement);
    saveState();
    setFlash("Announcement deleted.");
  }));
  document.querySelectorAll("[data-print]").forEach(button => button.addEventListener("click", () => printReport(button.dataset.print)));
  const printReportButton = document.getElementById("print-report");
  if (printReportButton) printReportButton.addEventListener("click", () => window.print());
  const printList = document.getElementById("print-list");
  if (printList) printList.addEventListener("click", () => window.print());
  const gradeFilter = document.getElementById("grade-filter");
  if (gradeFilter) gradeFilter.addEventListener("change", () => {
    const selected = gradeFilter.value;
    document.querySelectorAll("#page-content tbody tr[data-grade]").forEach(row => { row.hidden = Boolean(selected && row.dataset.grade !== selected); });
  });
  const performanceGrade = document.getElementById("performance-grade");
  if (performanceGrade) performanceGrade.addEventListener("change", () => {
    const scrollY = window.scrollY;
    render();
    window.scrollTo(0, scrollY);
  });
  const printPerformance = document.getElementById("print-performance");
  if (printPerformance) printPerformance.addEventListener("click", () => window.print());
}

state = loadState();
render();
