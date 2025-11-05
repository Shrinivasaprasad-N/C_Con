// Language translations
const translations = {
    english: {
        languageButton: "ಕನ್ನಡ",
        title: "Create Account",
        subtitle: "Join Crop Connect today",
        usernameLabel: "Username",
        usernamePlaceholder: "Enter username",
        emailLabel: "Email",
        emailPlaceholder: "Enter email",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter password",
        roleLabel: "Who are you?",
        rolePlaceholder: "Select your role",
        farmerOption: "Farmer",
        bidderOption: "Bidder",
        adminOption: "Admin",
        registerButton: "Register",
        loginText: "Already have an account?",
        loginLink: "Login",
        successMessage: "Registration successful!",
        errorEmpty: "Please fill all fields",
        errorEmail: "Please enter valid email",
        errorPassword: "Password must be 6+ characters",
        errorServer: "Server error. Please try again."
    },
    kannada: {
        languageButton: "English",
        title: "ಖಾತೆ ರಚಿಸಿ",
        subtitle: "ಇಂದು ಕ್ರಾಪ್ ಕನೆಕ್ಟ್‌ಗೆ ಸೇರಿಕೊಳ್ಳಿ",
        usernameLabel: "ಬಳಕೆದಾರ ಹೆಸರು",
        usernamePlaceholder: "ಬಳಕೆದಾರ ಹೆಸರು ನಮೂದಿಸಿ",
        emailLabel: "ಇಮೇಲ್",
        emailPlaceholder: "ಇಮೇಲ್ ನಮೂದಿಸಿ",
        passwordLabel: "ಪಾಸ್‌ವರ್ಡ್",
        passwordPlaceholder: "ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ",
        roleLabel: "ನೀವು ಯಾರು?",
        rolePlaceholder: "ನಿಮ್ಮ ಪಾತ್ರ ಆಯ್ಕೆಮಾಡಿ",
        farmerOption: "ರೈತ",
        bidderOption: "ಬಿಡ್‌ದಾರ",
        adminOption: "ನಿರ್ವಾಹಕ",
        registerButton: "ನೋಂದಣಿ",
        loginText: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?",
        loginLink: "ಲಾಗಿನ್",
        successMessage: "ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ!",
        errorEmpty: "ದಯವಿಟ್ಟು ಎಲ್ಲಾ ಫೀಲ್ಡ್‌ಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ",
        errorEmail: "ದಯವಿಟ್ಟು ಸರಿಯಾದ ಇಮೇಲ್ ನಮೂದಿಸಿ",
        errorPassword: "ಪಾಸ್‌ವರ್ಡ್ ೬ ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚು ಇರಲೇಬೇಕು",
        errorServer: "ಸರ್ವರ್ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
    }
};

let currentLanguage = 'english';

document.addEventListener('DOMContentLoaded', function() {
    const languageButton = document.getElementById('languageButton');
    const form = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const userTypeSelect = document.getElementById('role'); // updated to match HTML

    const loginTextElement = document.getElementById('loginText');

    // Hide messages initially
    hideMessages();

    // Language toggle
    languageButton.addEventListener('click', function() {
        currentLanguage = currentLanguage === 'english' ? 'kannada' : 'english';
        updateText();
    });

    // Update all text
    function updateText() {
        const texts = translations[currentLanguage];

        languageButton.textContent = texts.languageButton;
        document.getElementById('title').textContent = texts.title;
        document.getElementById('subtitle').textContent = texts.subtitle;
        document.getElementById('usernameLabel').textContent = texts.usernameLabel;
        document.getElementById('emailLabel').textContent = texts.emailLabel;
        document.getElementById('passwordLabel').textContent = texts.passwordLabel;
        document.getElementById('roleLabel').textContent = texts.roleLabel;
        document.getElementById('registerButton').textContent = texts.registerButton;

        // Update login text with correct Flask route
        loginTextElement.innerHTML = `${texts.loginText} <a href="/login">${texts.loginLink}</a>`;

        // Update placeholders
        document.getElementById('username').placeholder = texts.usernamePlaceholder;
        document.getElementById('email').placeholder = texts.emailPlaceholder;
        document.getElementById('password').placeholder = texts.passwordPlaceholder;

        // Update dropdown options
        const placeholderOption = userTypeSelect.options[0];
        const farmerOption = userTypeSelect.options[1];
        const bidderOption = userTypeSelect.options[2];
        const adminOption = userTypeSelect.options[3];

        placeholderOption.textContent = texts.rolePlaceholder;
        farmerOption.textContent = texts.farmerOption;
        bidderOption.textContent = texts.bidderOption;
        adminOption.textContent = texts.adminOption;
    }

    function hideMessages() {
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function isValidEmail(email) {
        return email.includes('@') && email.includes('.');
    }

    // Form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = userTypeSelect.value;

        hideMessages();

        const texts = translations[currentLanguage];

        // Validation
        if (!username || !email || !password || !role) {
            showError(texts.errorEmpty);
            return;
        }

        if (!isValidEmail(email)) {
            showError(texts.errorEmail);
            return;
        }

        if (password.length < 6) {
            showError(texts.errorPassword);
            return;
        }

        try {
            // Call Flask backend
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    role: role
                })
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess(texts.successMessage);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showError(result.error || texts.errorServer);
            }
            
        } catch (error) {
            console.error('Error:', error);
            showError(texts.errorServer);
        }
    });

    // Initialize page text
    updateText();
});
