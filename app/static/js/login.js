document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const passwordError = document.getElementById('password-error');
    
    const signupBtn = document.getElementById('signup-btn');
    const loginBtn = document.getElementById('login-btn');

    // --- Tab Switching Logic ---
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('tab-active');
        signupTab.classList.remove('tab-active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('tab-active');
        loginTab.classList.remove('tab-active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // --- Password Confirmation Logic ---
    function validatePasswords() {
        if (signupPassword.value !== signupConfirmPassword.value) {
            passwordError.classList.remove('hidden');
            signupConfirmPassword.style.borderColor = '#ef4444'; // Red border for error
            return false;
        } else {
            passwordError.classList.add('hidden');
            signupConfirmPassword.style.borderColor = '#d1d5db'; // Reset border color
            return true;
        }
    }

    signupPassword.addEventListener('input', validatePasswords);
    signupConfirmPassword.addEventListener('input', validatePasswords);

    // --- Form Submission Logic ---

    // Handle Signup Request
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from submitting the traditional way
        if (!validatePasswords()) {
            showToast('Passwords do not match. Please check again.');
            return;
        }

        const data = {
            name: document.getElementById('signup-name').value,
            surname: document.getElementById('signup-surname').value,
            email: document.getElementById('signup-email').value,
            phone: document.getElementById('signup-phone').value,
            gender: document.getElementById('signup-gender').value,
            password: document.getElementById('signup-password').value,
        };

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            showToast(result.message);
            if (result.success) {
                signupForm.reset(); // Clear the form
                loginTab.click(); // Switch to login tab after successful signup
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast('An error occurred during signup.');
        }
    });

    // Handle Login Request 
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from submitting the traditional way
        
        const data = {
            phone: document.getElementById('login-phone').value,
            password: document.getElementById('login-password').value,
        };

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            showToast(result.message);
            if (result.success) {
                // Redirect to the dashboard on successful login
                window.location.href = "/dashboard"; 
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('An error occurred during login.');
        }
    });

    // --- Toast Notification Function ---
    function showToast(message) {
        // Remove any existing toasts
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = 'toast-notification'; // Add a class for styling/identification

        // Basic styles
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(17, 24, 39, 0.8)'; // dark gray with opacity
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '1000';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease, bottom 0.4s ease';
        
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '30px';
        }, 10); // small delay to ensure transition happens

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 500); // Wait for fade out to finish
        }, 3500); // Toast visible for 3.5 seconds
    }
});
