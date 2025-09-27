// Get the message element once
const messageEl = document.getElementById('message');

// Function to set status message
function setStatus(text, type = 'info') {
    if (messageEl) {
        messageEl.classList.remove('text-danger', 'text-success', 'text-info');
        messageEl.classList.add(`text-${type}`);
        messageEl.textContent = text;
    }
}

// Handler for the combined Login/Registration form
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    setStatus("Processing request...");

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const body = JSON.stringify({ username, password });
    const headers = { 'Content-Type': 'application/json' };

    // 1. ATTEMPT LOGIN
    try {
        let res = await fetch('/login', {
            method: 'POST',
            headers: headers,
            body: body,
            credentials: 'include'
        });

        if (res.ok) {
            // SUCCESS: Logged in (Existing User)
            const data = await res.json();
            setStatus(data.message || "Login successful!", 'success');
        } else if (res.status === 400) {
            // FAILURE: Invalid Credentials or User Not Found. Proceed to Registration Attempt.
            const errorData = await res.json();
            
            setStatus("User not found or credentials invalid. Attempting to register...", 'info');

            // 2. ATTEMPT REGISTRATION
            res = await fetch('/register', {
                method: 'POST',
                headers: headers,
                body: body,
                credentials: 'include'
            });

            if (res.ok) {
                // SUCCESS: Registered and Logged in (New User)
                const data = await res.json();
                setStatus(data.message || "Registration successful!", 'success');
            } else {
                // FAILURE: Registration failed (e.g., username already exists)
                const errorData = await res.json();
                throw new Error(errorData.error || `Registration failed: ${res.statusText}`);
            }

        } else {
            // FAILURE: Server or Network Error (e.g., 500 or 401)
            const errorData = await res.json();
            throw new Error(errorData.error || `Server error: ${res.statusText}`);
        }

        // Redirect on success (applies to both successful login and successful registration)
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 500);

    } catch (error) {
        console.error("Authentication failed:", error);
        setStatus(error.message || "An unknown error occurred. Try again.", 'danger');
    }
});


// Logout function (usually called from a button on index.html)
async function logout() {
    await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    });

    document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/login.html';
}
