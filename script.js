// -----------------------------------------------------
// ✅ Employee Attendance Hashing System - script.js
// -----------------------------------------------------

const backendURL = "https://employee-attendance-hashing-backend.onrender.com"; // backend endpoint

// ---------- Helper utilities ----------
const $ = id => document.getElementById(id);
const showStatus = (el, msg, isError = false) => {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "#b91c1c" : "";
};

// ---------- Sidebar + Theme Handling ----------
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

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      if (window.innerWidth < 900) {
        if (sidebar?.classList.contains("visible")) hideSidebar();
        else showSidebar();
      } else {
        showSidebar();
      }
    });
  }

  if (closeSidebar) closeSidebar.addEventListener("click", hideSidebar);

  const initSidebar = () => {
    if (window.innerWidth < 900) hideSidebar();
    else showSidebar();
  };

  window.addEventListener("resize", initSidebar);
  document.addEventListener("DOMContentLoaded", initSidebar);
})();

// ---------- Theme Persistence ----------
(() => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
})();

// -----------------------------------------------------
// ✅ UPLOAD PAGE LOGIC
// -----------------------------------------------------
async function uploadFile() {
  const fileInput = $("fileInput");
  const status = $("uploadStatus");
  const resultsTable = $("resultsTable");
  const resultsBody = $("resultsBody");

  if (!fileInput) return alert("Upload input not found!");
  const file = fileInput.files?.[0];
  if (!file) return alert("Please select a file!");

  status.textContent = "Uploading...";
  status.style.color = "#2563eb";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${backendURL}/upload`, { method: "POST", body: formData });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) {
      const msg = data.message || data.error || "Upload failed!";
      showStatus(status, `❌ ${msg}`, true);
      return;
    }

    const rows = Array.isArray(data.data) ? data.data : [];
    const count = data.count ?? rows.length;
    status.textContent = `✅ Upload successful! ${count} record(s) added to database.`;
    status.style.color = "#16a34a";

    console.log("Backend response:", data);

    // populate table
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

      resultsTable.classList.remove("hidden");
      resultsTable.style.opacity = "0";
      setTimeout(() => { resultsTable.style.opacity = "1"; }, 100);
    }

    // refresh view
    await loadAllData();

  } catch (err) {
    console.error("Upload error:", err);
    showStatus(status, `❌ Upload failed: ${err.message}`, true);
  }
}

async function loadAllData() {
  const resultsTable = $("resultsTable");
  const resultsBody = $("resultsBody");
  const status = $("uploadStatus");

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
    if (status) showStatus(status, `❌ Failed to load data: ${err.message}`, true);
  }
}

// -----------------------------------------------------
// ✅ DYNAMIC LIVE SEARCH (for search.html)
// -----------------------------------------------------
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

async function liveSearch() {
  const id = ($("searchId")?.value || "").trim();
  const name = ($("searchName")?.value || "").trim();
  const dept = ($("searchDept")?.value || "").trim();
  const status = $("searchStatus");
  const table = $("searchTable");
  const body = $("searchBody");

  // if empty inputs — clear everything
  if (!id && !name && !dept) {
    if (table) table.classList.add("hidden");
    if (status) status.textContent = "";
    if (body) body.innerHTML = "";
    return;
  }

  try {
    const params = new URLSearchParams();
    if (id) params.append("id", id);
    if (name) params.append("name", name);
    if (dept) params.append("department", dept);

    const res = await fetch(`${backendURL}/search/dynamic?${params.toString()}`);
    if (!res.ok) {
      showStatus(status, `❌ Search failed (${res.status})`, true);
      return;
    }

    const data = await res.json();
    body.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      showStatus(status, "⚠️ No matching records found.");
      if (table) table.classList.add("hidden");
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

    showStatus(status, `✅ Found ${data.length} record(s).`);
    table && table.classList.remove("hidden");
  } catch (err) {
    console.error("Live search error:", err);
    showStatus(status, `❌ Search error: ${err.message}`, true);
  }
}

const liveSearchDebounced = debounce(liveSearch, 250);

// -----------------------------------------------------
// ✅ CLEAR SEARCH BUTTON (manual reset)
// -----------------------------------------------------
function clearSearch() {
  const sId = $("searchId");
  const sName = $("searchName");
  const sDept = $("searchDept");
  const status = $("searchStatus");
  const table = $("searchTable");
  const body = $("searchBody");

  if (sId) sId.value = "";
  if (sName) sName.value = "";
  if (sDept) sDept.value = "";
  if (status) status.textContent = "";
  if (table) table.classList.add("hidden");
  if (body) body.innerHTML = "";
}

// -----------------------------------------------------
// ✅ SORT, DOWNLOAD, and EXPORT HELPERS
// -----------------------------------------------------
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

// -----------------------------------------------------
// ✅ GLOBAL FUNCTION EXPORTS
// -----------------------------------------------------
window.uploadFile = uploadFile;
window.sortData = sortData;
window.downloadReport = downloadReport;
window.clearSearch = clearSearch;
window.liveSearch = liveSearch;

// Theme toggle
window.toggleTheme = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

// -----------------------------------------------------
// ✅ EVENT INITIALIZATION
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = $("uploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      uploadFile();
    });
  }

  const sId = $("searchId");
  const sName = $("searchName");
  const sDept = $("searchDept");

  if (sId) sId.addEventListener("input", liveSearchDebounced);
  if (sName) sName.addEventListener("input", liveSearchDebounced);
  if (sDept) sDept.addEventListener("input", liveSearchDebounced);
});
