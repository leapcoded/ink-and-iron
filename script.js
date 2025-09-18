// ... existing code ... -->
// --- SECTION: INITIALIZATION & EVENT LISTENERS ---
function init() {
    if (!auth) return;
// ... existing code ... -->
    setupTabListeners();
    setupThemeSwitcher();
    setupGoalModalListeners();
    setupFriendModalListeners();
    setupProfileTabListeners(); // Add listener for the new copy button
    handleModTypeChange(); // Call on init
}

function setupTabListeners() {
// ... existing code ... -->
// ... existing code ... -->
        saveSetting('goals', updatedGoals).then(() => renderGoalEditList());
    });
}

function setupFriendModalListeners() {
// ... existing code ... -->
            alert("Please enter a valid User ID that is not your own.");
        }
    });
}

function setupProfileTabListeners() {
    const copyBtn = document.getElementById('copy-id-btn');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');

    copyBtn.addEventListener('click', () => {
        const userIdToCopy = document.getElementById('user-id-display').textContent;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(userIdToCopy);
        } else {
            // Fallback for insecure contexts or older browsers
            const textArea = document.createElement("textarea");
            textArea.value = userIdToCopy;
            textArea.style.position = "fixed"; // Prevent scrolling to bottom of page in MS Edge.
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
        
        // Visual feedback
        copyIcon.classList.add('hidden');
        checkIcon.classList.remove('hidden');
        setTimeout(() => {
            copyIcon.classList.remove('hidden');
            checkIcon.classList.add('hidden');
        }, 2000);
    });
}

// --- SECTION: UI RENDERING ---
function applySettings() {
    const theme = userSettings.theme || 'default';
// ... existing code ... -->
    userBirthdayInput.value = userSettings.birthday || '';
    displayNameInput.value = displayName;
    document.getElementById('user-name').textContent = displayName;
    
    // Display User ID in Profile Tab by updating the static element
    document.getElementById('user-id-display').textContent = userId;
}

function updateDashboard() {
    // Sort all logs by date to find the most recent one
// ... existing code ... -->

