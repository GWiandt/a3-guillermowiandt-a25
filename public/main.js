// public/main.js - FINAL CORRECTED VERSION with Logout, Add, Modify, and Delete logic

// Get references to key DOM elements (assuming they exist in index.html)
const form = document.getElementById("anime-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");

/**
 * Helper to clear and reset the form to "Add New Entry" mode.
 */
function resetForm() {
    form.reset();
    document.getElementById("_id").value = "";
    submitBtn.textContent = "Add New Entry";
    submitBtn.classList.remove("btn-warning");
    submitBtn.classList.add("btn-success");
}

/**
 * Loads data into the form for editing.
 */
function populateFormForEdit(anime) {
    document.getElementById("_id").value = anime._id;
    document.getElementById("title").value = anime.title;
    document.getElementById("episodes").value = anime.episodes;
    document.getElementById("watched").value = anime.watched;
    document.getElementById("status").value = anime.status;

    // Change button text and style to reflect "Edit" mode
    submitBtn.textContent = "Save Changes";
    submitBtn.classList.remove("btn-success");
    submitBtn.classList.add("btn-warning");
    
    // Scroll to the form
    window.scrollTo(0, 0); 
}

/**
 * Fetches the user's anime list from the server and handles authentication.
 */
async function fetchData() {
    const res = await fetch('/results');

    // Authentication Check
    if (res.status === 401) {
        window.location.href = '/login.html';
        return;
    }

    if (!res.ok) {
        console.error(`Failed to fetch data. Status: ${res.status}`);
        return;
    }

    try {
        const data = await res.json();
        renderTable(data);
    } catch (e) {
        console.error("Error parsing JSON response:", e);
    }
}

/**
 * Renders the data array into the HTML table.
 */
function renderTable(data) {
    const tbody = document.querySelector("#anime-table tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No entries found. Add one above!</td></tr>`;
        return;
    }
    
    data.forEach(anime => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${anime.title}</td>
            <td>${anime.episodes}</td>
            <td>${anime.watched}</td>
            <td>${anime.status}</td>
            <td>${anime.progress}%</td>
            <td>${anime.category}</td>
            <td>
                <button class="btn btn-sm btn-info edit-btn me-2" data-anime='${JSON.stringify(anime)}'>Edit</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${anime._id}">X</button>
            </td>
        `;

        // 1. Setup Delete Listener (Uses _id)
        row.querySelector(".delete-btn").onclick = async function() {
            if (!confirm(`Are you sure you want to delete "${anime.title}"?`)) {
                return;
            }
            
            const animeId = this.dataset.id;
            const deleteRes = await fetch("/delete", {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: animeId }) 
            });

            if (deleteRes.ok) {
                fetchData(); 
            } else {
                const errorData = await deleteRes.json();
                alert("Delete failed: " + (errorData.error || 'Unknown Error'));
            }
        };

        // 2. Setup Edit Listener
        row.querySelector(".edit-btn").onclick = function() {
            const animeData = JSON.parse(this.dataset.anime);
            populateFormForEdit(animeData);
        };

        tbody.appendChild(row);
    });
}

/**
 * FIX: Handles the logout request and redirects to login.html.
 */
async function logout() {
  await fetch('/logout', {
    method: 'POST',
    credentials: 'include'   // CRITICAL: Sends the session cookie
  });
  
  window.location.href = '/login.html';
}

/**
 * Main function that runs when the page loads, setting up event handlers.
 */
window.onload = function() {

    // === Form Submission (ADD/UPDATE Logic) ===
    form.onsubmit = async function(event) {
        event.preventDefault();

        const _id = document.getElementById("_id").value; // Check for hidden ID
        const title = document.getElementById("title").value;
        const episodes = document.getElementById("episodes").value;
        const watched = document.getElementById("watched").value;
        const status = document.getElementById("status").value;

        const animeData = { _id, title, episodes, watched, status };

        let url = "/add";
        let method = "POST";

        if (_id) {
            // Modify/Update mode
            url = "/update";
            method = "PUT"; 
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(animeData)
        });

        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        if (res.ok) { 
            resetForm(); 
            fetchData(); 
        } else {
            const errorData = await res.json();
            console.error("Server Error:", errorData.error);
            alert("Failed to save anime: " + (errorData.error || 'Unknown error.'));
        }
    }

    // Attach listener for the Clear Form button
    if (resetBtn) {
        resetBtn.onclick = resetForm;
    }
    
    // FIX: Attach listener for the Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Initial call to load data when the page loads
    fetchData();
}