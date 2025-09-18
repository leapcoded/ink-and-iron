// ... existing code ... -->
// --- SECTION: UI ELEMENTS ---
const signInBtn = document.getElementById('sign-in-btn');
// ... existing code ... -->
const goalModal = document.getElementById('goal-modal');
const addNewGoalBtn = document.getElementById('add-new-goal-btn');
const friendModal = document.getElementById('friend-modal');

// --- SECTION: AUTHENTICATION ---
if (auth) {
// ... existing code ... -->
// --- SECTION: DATA FETCHING ---
const fetchAllData = () => {
    if (!userId) return;
    fetchSettings();
    fetchLogs();
};

const fetchSettings = () => {
// ... existing code ... -->
    unsubscribeSettings = onSnapshot(settingsRef, docSnap => {
        userSettings = docSnap.exists() ? docSnap.data() : { achievements: {}, usedThemes: [], goals: [], friends: [] };
        // Ensure defaults
        userSettings.achievements = userSettings.achievements || {};
        userSettings.usedThemes = userSettings.usedThemes || [];
        userSettings.goals = userSettings.goals || [];
        userSettings.friends = userSettings.friends || [];
        
        applySettings();
        renderGoals();
// ... existing code ... -->
        renderAchievements();
        checkAchievements(); 
        updatePublicProfile(); // Update public profile whenever settings change
    });
};

const fetchLogs = () => {
// ... existing code ... -->
    unsubscribeLogs = onSnapshot(q, snapshot => {
        allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateDashboard();
        renderLogs();
// ... existing code ... -->
        renderJewelryCollection();
        renderStats();
        checkAchievements();
        updatePublicProfile(); // Update public profile whenever logs change
    }, error => console.error("Error fetching logs:", error));
};

// --- SECTION: ACHIEVEMENT LOGIC ---
async function checkAchievements() {
// ... existing code ... -->
        await saveSetting('achievements', newAchievements);
    }
}

// --- SECTION: FRIENDS LOGIC ---
async function updatePublicProfile() {
    if (!userId || !userSettings) return;

    const latestLog = [...allLogs].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
    const unlockedAchievements = userSettings.achievements ? Object.keys(userSettings.achievements) : [];
    const latestAchievementKey = unlockedAchievements.length > 0 ? unlockedAchievements[unlockedAchievements.length - 1] : null;
    
    const publicData = {
        displayName: userSettings.displayName || auth.currentUser?.displayName || 'Anonymous User',
        photoURL: auth.currentUser?.photoURL || 'https://placehold.co/40x40',
        latestLog: latestLog ? { mod_type: latestLog.mod_type, date: latestLog.date } : null,
        goals: userSettings.goals || [],
        latestAchievement: latestAchievementKey ? { title: allAchievements[latestAchievementKey].title, icon: allAchievements[latestAchievementKey].icon } : null,
        lastUpdated: serverTimestamp()
    };
    
    await setDoc(doc(db, `public/${userId}`), publicData);
}

async function renderFriends() {
    const container = document.getElementById('friends-content');
    if (!container) return;

    const addFriendButton = `<div class="text-center mb-6"><button id="add-friend-btn" class="btn-primary font-bold py-2 px-6 rounded-md">Add Friend</button></div>`;

    if (!userSettings.friends || userSettings.friends.length === 0) {
        container.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-center">Friends</h2>
            ${addFriendButton}
            <div class="text-center py-10 px-6 card">
                <p class="text-gray-500">You haven't added any friends yet. Click "Add Friend" and enter their User ID to see their progress!</p>
            </div>`;
        document.getElementById('add-friend-btn').addEventListener('click', () => friendModal.classList.remove('hidden'));
        return;
    }
    
    let friendsHtml = '';
    for (const friendId of userSettings.friends) {
        const friendDoc = await getDoc(doc(db, `public/${friendId}`));
        if (friendDoc.exists()) {
            const friend = friendDoc.data();
            friendsHtml += `
                <div class="card p-4 mb-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-4">
                            <img src="${friend.photoURL}" alt="${friend.displayName}'s photo" class="w-12 h-12 rounded-full">
                            <div>
                                <p class="font-bold">${friend.displayName}</p>
                                <p class="text-xs text-gray-500">User ID: ${friendId}</p>
                            </div>
                        </div>
                        <button class="remove-friend-btn text-xs text-red-500 hover:underline" data-friend-id="${friendId}">Remove</button>
                    </div>
                    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p class="font-semibold text-gray-500">Latest Log</p>
                            <p>${friend.latestLog ? `${friend.latestLog.mod_type.charAt(0).toUpperCase() + friend.latestLog.mod_type.slice(1)} on ${new Date(friend.latestLog.date + 'T00:00:00').toLocaleDateString()}` : 'N/A'}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-500">Latest Achievement</p>
                            <p>${friend.latestAchievement ? `${friend.latestAchievement.icon} ${friend.latestAchievement.title}` : 'N/A'}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-500">Goals</p>
                            ${friend.goals.length > 0 ? friend.goals.map(g => `<p class="text-xs">${g.title}: ${g.current}/${g.target}`).join('') : '<p class="text-xs">No goals set.</p>'}
                        </div>
                    </div>
                </div>`;
        }
    }

    container.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-center">Friends</h2>
        ${addFriendButton}
        ${friendsHtml}
    `;

    document.getElementById('add-friend-btn').addEventListener('click', () => friendModal.classList.remove('hidden'));
    
    document.querySelectorAll('.remove-friend-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const friendIdToRemove = e.target.dataset.friendId;
            if (confirm('Are you sure you want to remove this friend?')) {
                const updatedFriends = userSettings.friends.filter(id => id !== friendIdToRemove);
                await saveSetting('friends', updatedFriends);
            }
        });
    });
}

// --- SECTION: INITIALIZATION & EVENT LISTENERS ---
function init() {
    if (!auth) return;
// ... existing code ... -->
    setupTabListeners();
    setupThemeSwitcher();
    setupGoalModalListeners();
    setupFriendModalListeners();
    handleModTypeChange(); // Call on init
}

function setupTabListeners() {
// ... existing code ... -->
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const tabId = e.currentTarget.dataset.tab;
            document.getElementById(`${tabId}-content`).classList.add('active');
            if (tabId === 'friends') {
                renderFriends();
            }
        });
    });
}

function setupThemeSwitcher() {
// ... existing code ... -->
// ... existing code ... -->
function setupGoalModalListeners() {
    addGoalBtn.addEventListener('click', () => {
        renderGoalEditList();
        goalModal.classList.remove('hidden');
    });
    goalModal.querySelector('[data-action="close-goal"]').addEventListener('click', () => goalModal.classList.add('hidden'));
    addNewGoalBtn.addEventListener('click', () => {
        const newGoal = { id: Date.now().toString(), title: 'New Goal', current: 0, target: 10, unit: '' };
// ... existing code ... -->
        saveSetting('goals', updatedGoals).then(() => renderGoalEditList());
    });
}

function setupFriendModalListeners() {
    friendModal.querySelector('[data-action="close-friend"]').addEventListener('click', () => friendModal.classList.add('hidden'));
    document.getElementById('add-friend-confirm-btn').addEventListener('click', async () => {
        const newFriendId = document.getElementById('friend-id-input').value.trim();
        if (newFriendId && newFriendId !== userId) {
            // Check if user exists
            const friendDoc = await getDoc(doc(db, `public/${newFriendId}`));
            if (!friendDoc.exists()) {
                alert("User ID not found.");
                return;
            }
            const updatedFriends = [...new Set([...(userSettings.friends || []), newFriendId])];
            await saveSetting('friends', updatedFriends);
            document.getElementById('friend-id-input').value = '';
            friendModal.classList.add('hidden');
        } else {
            alert("Please enter a valid User ID that is not your own.");
        }
    });
}

// --- SECTION: UI RENDERING ---
function applySettings() {
    const theme = userSettings.theme || 'default';
// ... existing code ... -->
    displayNameInput.value = displayName;
    document.getElementById('user-name').textContent = displayName;
    
    // Display User ID in Profile Tab
    const profileContent = document.getElementById('profile-content');
    if (profileContent.querySelector('#user-id-display')) {
        profileContent.querySelector('#user-id-display').textContent = userId;
    } else {
        const userIdDisplay = document.createElement('div');
        userIdDisplay.innerHTML = `
            <div class="mt-6 pt-6 border-t">
                <p class="text-sm font-medium text-center">Your User ID (for friends)</p>
                <p id="user-id-display" class="text-center font-mono bg-gray-100 p-2 rounded-md mt-1 break-all">${userId}</p>
            </div>`;
        profileContent.querySelector('.card').appendChild(userIdDisplay);
    }
}

function updateDashboard() {
    // Sort all logs by date to find the most recent one
// ... existing code ... -->
function clearAllData() {
    allLogs = [];
    userSettings = { achievements: {}, usedThemes: [], goals:[], friends: [] };
    updateDashboard();
    renderStats();
// ... existing code ... -->
    renderGoals();
    renderGallery();
    renderJewelryCollection();
}

// --- RUN ---
init();
handleModTypeChange();

