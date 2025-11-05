// 🌐 ===== LANGUAGE HANDLING =====
let currentLanguage = 'english';

// All text translations
const translations = {
    english: {
        languageButton: 'ಕನ್ನಡ',
        title: 'User Login',
        subtitle: 'Login to access your account',
        emailLabel: 'Email Address',
        emailPlaceholder: 'Enter your email',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password',
        roleLabel: 'Who are you?',
        rememberLabel: 'Remember me',
        loginButton: 'Login',
        signupText: 'New user?',
        signupLink: 'Create an account',
        errorEmpty: 'Please fill in all fields',
        errorEmail: 'Please enter a valid email address',
        errorCredentials: 'Invalid email or password',
        successMessage: 'Login successful! Redirecting...'
    },
    kannada: {
        languageButton: 'English',
        title: 'ಬಳಕೆದಾರ ಲಾಗಿನ್',
        subtitle: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಪ್ರವೇಶಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ',
        emailLabel: 'ಇಮೇಲ್ ವಿಳಾಸ',
        emailPlaceholder: 'ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ',
        passwordLabel: 'ಪಾಸ್‌ವರ್ಡ್',
        passwordPlaceholder: 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
        roleLabel: 'ನೀವು ಯಾರು?',
        rememberLabel: 'ನನ್ನನ್ನು ನೆನಪಿಡಿ',
        loginButton: 'ಲಾಗಿನ್',
        signupText: 'ಹೊಸ ಬಳಕೆದಾರ?',
        signupLink: 'ಖಾತೆ ರಚಿಸಿ',
        errorEmpty: 'ದಯವಿಟ್ಟು ಎಲ್ಲಾ ಕ್ಷೇತ್ರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ',
        errorEmail: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ',
        errorCredentials: 'ಅಮಾನ್ಯ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್',
        successMessage: 'ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ! ದಾರಿ ತೋರಿಸಲಾಗುತ್ತಿದೆ...'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const rememberCheck = document.getElementById("rememberCheck");
    const roleSelect = document.getElementById("roleSelect");
    const errorBox = document.getElementById("errorBox");
    const successBox = document.getElementById("successBox");
    const languageButton = document.getElementById("languageButton");
    const signupText = document.getElementById("signupText");

    hideMessages();
    updatePageText();

    // Language toggle
    languageButton.addEventListener('click', function() {
        currentLanguage = currentLanguage === 'english' ? 'kannada' : 'english';
        updatePageText();
    });

    // ===== MESSAGE FUNCTIONS =====
    function hideMessages() {
        errorBox.style.display = 'none';
        successBox.style.display = 'none';
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
        successBox.style.display = 'none';
    }

    function showSuccess(message) {
        successBox.textContent = message;
        successBox.style.display = 'block';
        errorBox.style.display = 'none';
    }

    function checkEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ===== UPDATE PAGE TEXT =====
    function updatePageText() {
        const texts = translations[currentLanguage];
        document.getElementById('languageButton').textContent = texts.languageButton;
        document.getElementById('title').textContent = texts.title;
        document.getElementById('subtitle').textContent = texts.subtitle;
        document.getElementById('emailLabel').textContent = texts.emailLabel;
        emailInput.placeholder = texts.emailPlaceholder;
        document.getElementById('passwordLabel').textContent = texts.passwordLabel;
        passwordInput.placeholder = texts.passwordPlaceholder;
        document.getElementById('roleLabel').textContent = texts.roleLabel;
        document.getElementById('rememberLabel').textContent = texts.rememberLabel;
        document.getElementById('loginButton').textContent = texts.loginButton;

        // Signup section uses Flask route "/"
        signupText.innerHTML = `${texts.signupText} <a href="/">${texts.signupLink}</a>`;
    }

    // ===== LOGIN HANDLER =====
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const userEmail = emailInput.value.trim();
        const userPassword = passwordInput.value.trim();
        const userRole = roleSelect.value;
        const texts = translations[currentLanguage];
        hideMessages();

        // Validation
        if (!userEmail || !userPassword || !userRole) {
            showError(texts.errorEmpty);
            return;
        }

        if (!checkEmail(userEmail)) {
            showError(texts.errorEmail);
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    password: userPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess(texts.successMessage);
                localStorage.setItem("loggedInUser", JSON.stringify(result.user));

                // Redirect based on role
                setTimeout(() => {
                    redirectUser(result.user.role);
                }, 1500);
            } else {
                showError(result.error || texts.errorCredentials);
            }
        } catch (error) {
            console.error("Server error:", error);
            showError(texts.errorCredentials);
        }
    });

    function redirectUser(role) {
        if (role === "farmer") {
            window.location.href = "../farmerportal";
        } else if (role === "bidder") {
            window.location.href = "../bidderportal";
        } else if (role === "admin") {
            window.location.href = "../admin_portal.html";
        }
    }
});
