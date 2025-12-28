let notes = JSON.parse(localStorage.getItem("notes")) || [];
let editIndex = null;
let autoSaveTimer = null;

const palette = ["#fff7d1", "#e2f6d3", "#d4e4ed", "#f6e2dd", "#f0e6fa", "#ffffff"];

const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const tagsInput = document.getElementById("tags");
const notesContainer = document.getElementById("notesContainer");
const searchInput = document.getElementById("search");
const addBtn = document.getElementById("addBtn");
const statusIndicator = document.getElementById("statusIndicator");
const themeToggle = document.getElementById("themeToggle");
const importInput = document.getElementById("importInput");

marked.use({ breaks: true, gfm: true });

const md = (txt) => DOMPurify.sanitize(marked.parse(txt));

const saveNotes = () => {
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
};

const debounce = (fn, t) => (...args) => {
  clearTimeout(autoSaveTimer);
  statusIndicator.innerText = "Typing...";
  autoSaveTimer = setTimeout(() => fn(...args), t);
};

const autoSave = () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value.split(",").map(t => t.trim()).filter(Boolean);

  if (editIndex !== null) {
    notes[editIndex] = { ...notes[editIndex], title, content, tags, date: "Edited just now" };
    saveNotes();
    statusIndicator.innerText = "Auto saved";
  } else {
    localStorage.setItem("currentDraft", JSON.stringify({ title, content, tags }));
    statusIndicator.innerText = "Draft saved";
  }
};

const autoSaveTrigger = debounce(autoSave, 1000);
[titleInput, contentInput, tagsInput].forEach(el => el.addEventListener("input", autoSaveTrigger));

window.onload = () => {
  const d = JSON.parse(localStorage.getItem("currentDraft"));
  if (d && editIndex === null) {
    titleInput.value = d.title || "";
    contentInput.value = d.content || "";
    tagsInput.value = (d.tags || []).join(", ");
  }
};

addBtn.onclick = () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value.split(",").map(t => t.trim()).filter(Boolean);

  if (!title && !content) return alert("Write something first.");

  if (editIndex === null) {
    notes.unshift({
      title: title || "Untitled",
      content,
      tags,
      pinned: false,
      date: new Date().toLocaleDateString(),
      color: palette[Math.floor(Math.random() * palette.length)]
    });
    localStorage.removeItem("currentDraft");
  } else {
    notes[editIndex] = { ...notes[editIndex], title, content, tags };
    editIndex = null;
    addBtn.innerText = "Save Note (Ctrl + S)";
  }

  titleInput.value = contentInput.value = tagsInput.value = "";
  statusIndicator.innerText = "Saved";
  saveNotes();
};

window.editNote = i => {
  const n = notes[i];
  titleInput.value = n.title;
  contentInput.value = n.content;
  tagsInput.value = n.tags.join(", ");
  editIndex = i;
  addBtn.innerText = "Finish Editing";
  document.querySelector(".sidebar").scrollTop = 0;
  statusIndicator.innerText = "Editing...";
};

window.deleteNote = i => {
  if (!confirm("Delete this note?")) return;
  notes.splice(i, 1);
  if (editIndex === i) {
    editIndex = null;
    addBtn.innerText = "Save Note (Ctrl + S)";
    titleInput.value = contentInput.value = tagsInput.value = "";
  }
  saveNotes();
};

window.pinNote = i => {
  notes[i].pinned = !notes[i].pinned;
  saveNotes();
};

const renderNotes = (list = notes) => {
  notesContainer.innerHTML = "";
  if (!list.length) return notesContainer.innerHTML = `<p style="opacity:0.6">No notes.</p>`;

  list.sort((a, b) => b.pinned - a.pinned).forEach(n => {
    const card = document.createElement("div");
    card.className = `note ${n.pinned ? "pinned" : ""}`;
    if (!document.body.classList.contains("dark")) card.style.background = n.color;

    card.innerHTML = `
      <div>
        <h3>${n.title}</h3>
        <div class="note-content">${md(n.content)}</div>
      </div>
      <div class="note-meta">
        <span>${n.date}</span>
        <span>${n.tags.join(", ")}</span>
      </div>
      <div class="note-actions">
        <button class="action-btn" onclick="pinNote(${notes.indexOf(n)})">${n.pinned ? "★" : "☆"}</button>
        <button class="action-btn" onclick="editNote(${notes.indexOf(n)})">Edit</button>
        <button class="action-btn" onclick="deleteNote(${notes.indexOf(n)})" style="color:#ef4444">Del</button>
      </div>
    `;
    notesContainer.appendChild(card);
  });
};

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); addBtn.click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); searchInput.focus(); }
  if (e.key === "Escape" && editIndex !== null) {
    if (confirm("Discard changes?")) {
      editIndex = null;
      addBtn.innerText = "Save Note (Ctrl + S)";
      titleInput.value = contentInput.value = tagsInput.value = "";
    }
  }
});

themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  renderNotes();
};

searchInput.oninput = e => {
  const q = e.target.value.toLowerCase();
  renderNotes(notes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  ));
};

importInput.onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (Array.isArray(data)) {
        notes.push(...data);
        saveNotes();
        alert("Notes imported.");
      }
    } catch { alert("Invalid file."); }
  };
  r.readAsText(f);
};

if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
renderNotes();
