// ... existing code ... -->
function setupFriendModalListeners() {
    friendModal.querySelector('[data-action="close-friend"]').addEventListener('click', () => friendModal.classList.add('hidden'));
    document.getElementById('add-friend-confirm-btn').addEventListener('click', async () => {
        const newFriendId = document.getElementById('friend-id-input').value.trim();
        if (newFriendId && newFriendId !== userId) {
            const friendDoc = await getDoc(doc(db, `public/${newFriendId}`));
            if (!friendDoc.exists()) {
                showToast("User ID not found.");
                return;
            }
            const updatedFriends = [...new Set([...(userSettings.friends || []), newFriendId])];
            await saveSetting('friends', updatedFriends);
            document.getElementById('friend-id-input').value = '';
            friendModal.classList.add('hidden');
        } else {
            showToast("Please enter a valid User ID that is not your own.");
        }
    });
}

function setupProfileTabListeners() {
// ... existing code ... -->
// --- SECTION: UI RENDERING ---
function applySettings() {
    const theme = userSettings.theme || 'default';
// ... existing code ... -->
    document.getElementById('user-id-display').textContent = userId;
}

function updateDashboard() {
    const sortedLogs = [...allLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
// ... existing code ... -->
    }
}


function renderGoals() {
// ... existing code ... -->
    container.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('[data-goal-id]').dataset.goalId;
            showConfirmation('Are you sure you want to delete this goal?', () => {
                const updatedGoals = userSettings.goals.filter(g => g.id !== id);
                saveSetting('goals', updatedGoals).then(() => renderGoalEditList());
            });
        });
    });
}

// --- SECTION: UI RENDERING ---
function applySettings() {
// ... existing code ... -->
// ... existing code ... -->
function renderFriends() {
    const container = document.getElementById('friends-content');
    if (!container) return;
// ... existing code ... -->
    document.getElementById('add-friend-btn').addEventListener('click', () => friendModal.classList.remove('hidden'));
    
    document.querySelectorAll('.remove-friend-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const friendIdToRemove = e.target.dataset.friendId;
            showConfirmation('Are you sure you want to remove this friend?', async () => {
                const updatedFriends = userSettings.friends.filter(id => id !== friendIdToRemove);
                await saveSetting('friends', updatedFriends);
            });
        });
    });
}


// --- SECTION: INITIALIZATION & EVENT LISTENERS ---
function init() {
// ... existing code ... -->
// ... existing code ... -->
const closeModal = () => mainModal.classList.add('hidden');

function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.style.opacity = 1;
    setTimeout(() => {
        toast.style.opacity = 0;
    }, 3000);
}

function showConfirmation(message, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes-btn');
    const noBtn = document.getElementById('confirm-no-btn');
    if (!confirmModal || !confirmMessage || !yesBtn || !noBtn) return;

    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');

    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    
    const newNoBtn = noBtn.cloneNode(true);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);

    newYesBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        onConfirm();
    });
    newNoBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });
}

async function handleLogSubmit(e) {
    e.preventDefault();
    if (!userId) return;
// ... existing code ... -->

