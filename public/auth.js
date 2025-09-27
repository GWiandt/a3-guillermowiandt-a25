// Get the message element once
const messageEl = document.getElementById('message');

// Handler for the combined Login/Registration form
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous message
  if (messageEl) {
      messageEl.textContent = "Logging in...";
      messageEl.classList.remove('text-danger', 'text-success');
      messageEl.classList.add('text-info');
  }

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });

    // Check for network or server-side error before trying to parse JSON
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server responded with status: ${res.status}`);
    }

    // Server responded with 200 OK. Parse the success message.
    const data = await res.json();
    
    if (messageEl) {
        messageEl.classList.remove('text-info', 'text-danger');
        messageEl.classList.add('text-success');
        messageEl.textContent = data.message || "Login successful!";
    }

    // Redirect to the main application page
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500); // Small delay for UX

  } catch (error) {
    console.error("Login/Registration failed:", error);
    if (messageEl) {
        messageEl.classList.remove('text-info', 'text-success');
        messageEl.classList.add('text-danger');
        messageEl.textContent = error.message || "An unknown error occurred. Try again.";
    }
  }
});

// Logout function (usually called from a button on index.html)
async function logout() {
  await fetch('/logout', {
    method: 'POST',
    credentials: 'include'
  });

  window.location.href = '/login.html';
}