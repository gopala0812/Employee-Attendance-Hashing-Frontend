// script.js - Robust shared frontend logic for Attendance System
const backendURL = "https://employee-attendance-hashing-backend.onrender.com"; // change to Render URL after deployment

// small helper
const $ = id => document.getElementById(id);
const showStatus = (el, msg, isError=false) => { if (!el) return; el.textContent = msg; el.style.color = isError ? "#b91c1c" : ""; };

// ---------- SIDEBAR + THEME ----------
// Robust sidebar toggle and responsive behavior
(() => {
  const sidebar = $("sidebar");
  const hamburger = $("hamburger");
  const closeSidebar = $("closeSidebar");

  const showSidebar = () => {
    sidebar?.classList.remove("hidden");
    sidebar?.classList.add("visible");
  };
  const hideSidebar = () => {
    sidebar?.classList.add("hidden");
    sidebar?.classList.remove("visible");
  };

  if (hamburger) hamburger.addEventListener("click", () => {
    // toggle visibility on small screens
    if (window.innerWidth < 900) {
      if (sidebar?.classList.contains("visible")) hideSidebar();
      else showSidebar();
    } else {
      // on large screens, keep visible
      showSidebar();
    }
  });

  if (closeSidebar) closeSidebar.addEventListener("click", hideSidebar);

  // initialize based on window width
  const initSidebar = () => {
    if (window.innerWidth < 900) hideSidebar();
    else showSidebar();
  };

  window.addEventListener("resize", initSidebar);
  document.addEventListener("DOMContentLoaded", initSidebar);
})();

// Theme persistence (toggle exists on settings page)
(() => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
})();

// ---------- UPLOAD PAGE ----------
// ---------- UPLOAD PAGE ----------
async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("uploadStatus");
  const resultsTable = document.getElementById("resultsTable");
  const resultsBody = document.getElementById("resultsBody");

  if (!fileInput) return alert("Upload input not found!");
  const file = fileInput.files?.[0];
  if (!file) return alert("Please select a file!");

  status.textContent = "Uploading...";
  status.style.color = "#2563eb"; // blue text for uploading state

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${backendURL}/upload`, {
      method: "POST",
      body: formData,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) {
      const msg = data.message || data.error || "Upload failed!";
      status.textContent = `❌ ${msg}`;
      status.style.color = "#e11d48"; // red
      return;
    }

    // ✅ Success message
    const rows = Array.isArray(data.data) ? data.data : [];
    const count = data.count ?? rows.length;
    status.textContent = `✅ Upload successful! ${count} record(s) added to database.`;
    status.style.color = "#16a34a"; // green

    console.log("Backend response:", data);

    // ✅ Display uploaded data in table
    if (resultsBody && resultsTable) {
      resultsBody.innerHTML = "";

      if (rows.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="7" style="text-align:center; color:gray;">No records found.</td>`;
        resultsBody.appendChild(tr);
      } else {
        rows.forEach(row => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${row.id ?? ""}</td>
            <td>${row.name ?? ""}</td>
            <td>${row.department ?? ""}</td>
            <td>${row.attendance ?? ""}</td>
            <td>${row.total_days ?? ""}</td>
            <td>${row.attendance_percentage ?? ""}%</td>
            <td>${row.hash_index ?? ""}</td>
          `;
          resultsBody.appendChild(tr);
        });
      }

      // make sure table becomes visible
      resultsTable.classList.remove("hidden");
      resultsTable.style.opacity = "0";
      setTimeout(() => { resultsTable.style.opacity = "1"; }, 100);
    }

    // after upload, refresh the global view so database table is up-to-date
    await loadAllData();

  } catch (err) {
    console.error("Upload error:", err);
    status.textContent = `❌ Upload failed: ${err.message}`;
    status.style.color = "#e11d48"; // red
  }
}
async function loadAllData() {
  const resultsTable = document.getElementById("resultsTable");
  const resultsBody = document.getElementById("resultsBody");
  const status = document.getElementById("uploadStatus");

  try {
    const res = await fetch(`${backendURL}/view`);
    if (!res.ok) throw new Error("Failed to fetch records.");
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      resultsBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:gray;">No records found.</td></tr>`;
      resultsTable.classList.remove("hidden");
      return;
    }

    resultsBody.innerHTML = "";
    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.id ?? ""}</td>
        <td>${row.name ?? ""}</td>
        <td>${row.department ?? ""}</td>
        <td>${row.attendance ?? ""}</td>
        <td>${row.total_days ?? ""}</td>
        <td>${row.attendance_percentage ?? ""}%</td>
        <td>${row.hash_index ?? ""}</td>
      `;
      resultsBody.appendChild(tr);
    });
    resultsTable.classList.remove("hidden");
    if (status) {
      status.textContent = `📋 Showing ${data.length} record(s) from database.`;
      status.style.color = "#2563eb";
    }
  } catch (err) {
    console.error("View error:", err);
    if (status) {
      status.textContent = `❌ Failed to load data: ${err.message}`;
      status.style.color = "#e11d48";
    }
  }
}

// ---------- DEBOUNCE HELPER ----------
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------- LIVE DYNAMIC SEARCH ----------
async function liveSearch() {
  const id = ($("searchId")?.value || "").trim();
  const name = ($("searchName")?.value || "").trim();
  const department = ($("searchDept")?.value || "").trim();
  const status = $("searchStatus");
  const table = $("searchTable");
  const body = $("searchBody");

  // if nothing entered, hide table and clear status
  if (!id && !name && !department) {
    if (table) table.classList.add("hidden");
    if (status) status.textContent = "";
    body && (body.innerHTML = "");
    return;
  }

  try {
    const params = new URLSearchParams();
    if (id) params.append("id", id);
    if (name) params.append("name", name);
    if (department) params.append("department", department);

    const res = await fetch(`${backendURL}/search/dynamic?${params.toString()}`);
    if (!res.ok) {
      const msg = `Search failed (status ${res.status})`;
      if (status) { status.textContent = `❌ ${msg}`; status.style.color = "#e11d48"; }
      return;
    }
    const data = await res.json();

    // render
    body.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
      if (status) { status.textContent = "⚠️ No matching records."; status.style.color = ""; }
      table && table.classList.add("hidden");
      return;
    }

    data.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.id ?? ""}</td>
        <td>${r.name ?? ""}</td>
        <td>${r.department ?? ""}</td>
        <td>${r.attendance ?? ""}</td>
        <td>${r.total_days ?? ""}</td>
        <td>${r.attendance_percentage ?? ""}%</td>
        <td>${r.hash_index ?? ""}</td>
      `;
      body.appendChild(tr);
    });

    if (status) { status.textContent = `✅ Found ${data.length} record(s).`; status.style.color = "#16a34a"; }
    table && table.classList.remove("hidden");
  } catch (err) {
    console.error("liveSearch error:", err);
    if (status) { status.textContent = `❌ Search error: ${err.message}`; status.style.color = "#e11d48"; }
  }
}

// debounced version to attach to input events
const liveSearchDebounced = debounce(liveSearch, 220);

// ---------- SEARCH PAGE (legacy single search) ----------
async function searchEmployee() {
  const idVal = $("searchId") ? $("searchId").value.trim() : "";
  const nameVal = $("searchName") ? $("searchName").value.trim() : "";
  const status = $("searchStatus");
  const table = $("searchTable");
  const body = $("searchBody");

  if (!idVal && !nameVal) return alert("Enter ID or Name!");

  showStatus(status, "Searching...");
  const url = idVal ? `${backendURL}/search/id/${encodeURIComponent(idVal)}` : `${backendURL}/search/name/${encodeURIComponent(nameVal)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    let payload;
    try { payload = JSON.parse(text); } catch (e) { payload = { __raw: text }; }

    if (!res.ok) {
      const msg = payload?.message || payload?.error || payload?.__raw || "Not found";
      showStatus(status, `❌ ${msg}`, true);
      if (table) table.classList.add("hidden");
      return;
    }

    let results = [];
    if (payload.record) results = [payload.record];
    else if (Array.isArray(payload.records)) results = payload.records;
    else if (Array.isArray(payload)) results = payload;
    else if (payload.records && Array.isArray(payload.records)) results = payload.records;

    if (!results.length) {
      showStatus(status, "⚠️ No results found.");
      if (table) table.classList.add("hidden");
      return;
    }

    // render
    if (table && body) {
      body.innerHTML = "";
      results.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.id ?? ""}</td>
          <td>${r.name ?? ""}</td>
          <td>${r.department ?? ""}</td>
          <td>${r.attendance ?? ""}</td>
          <td>${r.total_days ?? ""}</td>
          <td>${r.attendance_percentage ?? ""}</td>
          <td>${r.hash_index ?? ""}</td>
        `;
        body.appendChild(tr);
      });
      table.classList.remove("hidden");
    }
    showStatus(status, `✅ Found ${results.length} result(s).`);
  } catch (err) {
    console.error("Search error:", err);
    showStatus(status, `❌ Search failed: ${err.message || err}`, true);
  }
}

// ---------- SORT PAGE ----------
async function sortData(order = "asc") {
  const table = $("sortTable");
  const body = $("sortBody");
  if (!table || !body) return alert("Sort table elements missing.");

  try {
    const res = await fetch(`${backendURL}/sort/${order}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.data || []);
    body.innerHTML = "";
    list.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.id ?? ""}</td>
        <td>${r.name ?? ""}</td>
        <td>${r.department ?? ""}</td>
        <td>${r.attendance ?? ""}</td>
        <td>${r.total_days ?? ""}</td>
        <td>${r.attendance_percentage ?? ""}</td>
        <td>${r.hash_index ?? ""}</td>
      `;
      body.appendChild(tr);
    });
    table.classList.remove("hidden");
  } catch (err) {
    console.error("Sort error:", err);
    alert("Sort failed: " + (err.message || err));
  }
}

// ---------- DOWNLOAD REPORT ----------
async function downloadReport() {
  const percentInput = $("filterPercent");
  if (!percentInput) return alert("Filter percent input not found.");
  const percent = percentInput.value.trim();
  if (!percent) return alert("Enter a percentage value.");

  try {
    const res = await fetch(`${backendURL}/download/pdf/${encodeURIComponent(percent)}`);
    if (!res.ok) {
      const text = await res.text();
      alert("Failed to generate PDF: " + text);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${percent}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed: " + (err.message || err));
  }
}

// expose functions for inline onclick usage
window.uploadFile = uploadFile;
window.searchEmployee = searchEmployee;
window.sortData = sortData;
window.downloadReport = downloadReport;
window.toggleTheme = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

// Attach upload button listener after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();   // prevents accidental form behavior
      e.stopPropagation();  // prevents event bubbling
      uploadFile();         // calls your async upload
    });
  }

  // Attach live search inputs
  const sId = document.getElementById("searchId");
  const sName = document.getElementById("searchName");
  const sDept = document.getElementById("searchDept");
  const clearBtn = document.getElementById("clearSearchBtn");

  if (sId) sId.addEventListener("input", liveSearchDebounced);
  if (sName) sName.addEventListener("input", liveSearchDebounced);
  if (sDept) sDept.addEventListener("input", liveSearchDebounced);

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (sId) sId.value = "";
      if (sName) sName.value = "";
      if (sDept) sDept.value = "";
      const status = document.getElementById("searchStatus");
      if (status) status.textContent = "";
      const table = document.getElementById("searchTable");
      if (table) table.classList.add("hidden");
      const body = document.getElementById("searchBody");
      if (body) body.innerHTML = "";
    });
  }

  // On load, show whatever is in DB
  loadAllData();
});

