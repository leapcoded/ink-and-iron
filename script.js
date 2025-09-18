import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { achievements as allAchievements } from './achievements.js';


// --- SECTION: FIREBASE & APP INITIALIZATION ---
let app, auth, db, storage;
try {
    // This object is populated by the deploy.yml workflow
    const firebaseConfig = {
      apiKey: "AIzaSyB5_SZGECDE170o87N7DlhhVcuL0KLr4Og",
      authDomain: "ink-and-iron-57e6e.firebaseapp.com",
      projectId: "ink-and-iron-57e6e",
      storageBucket: "ink-and-iron-57e6e.firebasestorage.app",
      messagingSenderId: "795969760706",
      appId: "1:795969760706:web:bb82ba49f9880b8b113a5b",
      measurementId: "G-6F3YFPYB0T"
    };

    // Check if placeholders were replaced. If not, throw an error.
    if (firebaseConfig.apiKey.startsWith("%%")) {
        throw new Error("Firebase config placeholders not replaced.");
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Firebase configuration not found or invalid. App cannot start.", error);
    document.getElementById('app').innerHTML = '<div class="text-center p-8 bg-red-100 text-red-800 rounded-lg"><strong>Error:</strong> Firebase configuration is missing or invalid. The application cannot be loaded.</div>';
}

// --- SECTION: GLOBAL STATE ---
let userId = null;
let unsubscribeLogs, unsubscribeSettings;
let allLogs = [];
let userSettings = { achievements: {}, usedThemes: [], goals: [], friends: [] };
let currentLogFilter = 'all';
const quotes = ["Your body is a journal, and tattoos are the stories.", "Patience is the most important tool you have.", "Wear your art with pride."];

// --- SECTION: UI ELEMENTS ---
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const contentArea = document.getElementById('content-area');
const logForm = document.getElementById('log-form');
const modTypeSelect = document.getElementById('mod-type');
const mainModal = document.getElementById('main-modal');
const themeSwitcher = document.getElementById('theme-switcher');
const userBirthdayInput = document.getElementById('user-birthday');
const displayNameInput = document.getElementById('display-name');
const quoteMessage = document.getElementById('quote-message');
const addGoalBtn = document.getElementById('add-goal-btn');
const goalModal = document.getElementById('goal-modal');
const addNewGoalBtn = document.getElementById('add-new-goal-btn');
const friendModal = document.getElementById('friend-modal');

// --- SECTION: AUTHENTICATION ---
if (auth) {
    onAuthStateChanged(auth, user => {
        if (user && !user.isAnonymous) handleAuthenticatedUser(user);
        else handleSignedOutUser();
        quoteMessage.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
    });
}

function handleAuthenticatedUser(user) {
    document.getElementById('user-photo').src = user.photoURL;
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-info').classList.add('flex');
    signInBtn.classList.add('hidden');
    contentArea.classList.remove('opacity-50', 'pointer-events-none');
    document.getElementById('log-mod-btn').disabled = false;
    userId = user.uid;
    fetchAllData();
}

function handleSignedOutUser() {
    document.getElementById('user-name').textContent = "Guest";
    document.getElementById('user-info').classList.add('hidden');
    signInBtn.classList.remove('hidden');
    contentArea.classList.add('opacity-50', 'pointer-events-none');
    document.getElementById('log-mod-btn').disabled = true;
    userId = null;
    if (unsubscribeLogs) unsubscribeLogs();
    if (unsubscribeSettings) unsubscribeSettings();
    clearAllData();
}

// --- SECTION: DATA FETCHING ---
const fetchAllData = () => {
    if (!userId) return;
    fetchSettings();
    fetchLogs();
};

const fetchSettings = () => {
    if (!userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/main`);
    if (unsubscribeSettings) unsubscribeSettings();
    unsubscribeSettings = onSnapshot(settingsRef, docSnap => {
        userSettings = docSnap.exists() ? docSnap.data() : { achievements: {}, usedThemes: [], goals: [], friends: [] };
        // Ensure defaults
        userSettings.achievements = userSettings.achievements || {};
        userSettings.usedThemes = userSettings.usedThemes || [];
        userSettings.goals = userSettings.goals || [];
        userSettings.friends = userSettings.friends || [];
        
        applySettings();
        renderGoals();
        renderAchievements();
        checkAchievements(); 
        updatePublicProfile();
    });
};

const fetchLogs = () => {
    if (!userId) return;
    const logsRef = collection(db, `users/${userId}/logs`);
    const q = query(logsRef, orderBy('createdAt', 'desc'));
    if (unsubscribeLogs) unsubscribeLogs();
    unsubscribeLogs = onSnapshot(q, snapshot => {
        allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateDashboard();
        renderLogs();
        renderGallery();
        renderJewelryCollection();
        renderStats();
        checkAchievements();
        updatePublicProfile();
    }, error => console.error("Error fetching logs:", error));
};

// --- SECTION: ACHIEVEMENT LOGIC ---
async function checkAchievements() {
    if (!allLogs || !userSettings) return;

    const unlocked = new Set(Object.keys(userSettings.achievements));
    let newUnlocks = [];

    const check = (key, condition) => {
        if (allAchievements[key] && !unlocked.has(key) && condition) {
            newUnlocks.push(key);
            unlocked.add(key);
        }
    };
    
    const stretchLogs = allLogs.filter(l => l.mod_type === 'stretch' && l.stretch_type === 'up').sort((a,b) => new Date(a.date) - new Date(b.date));
    const tattooLogs = allLogs.filter(l => l.mod_type === 'tattoo');
    const piercingLogs = allLogs.filter(l => l.mod_type === 'piercing');
    const maxSizeMM = stretchLogs.reduce((max, log) => Math.max(max, parseSizeToMM(log.size)), 0);
    
    const completedGoals = (userSettings.goals || []).filter(g => g.current >= g.target);
    check('goal_set', (userSettings.goals || []).length > 0);
    check('goal_reached', completedGoals.length > 0);
    check('goal_surpassed', (userSettings.goals || []).some(g => g.current > g.target));
    
    check('size_14g', maxSizeMM >= 1.6); check('size_12g', maxSizeMM >= 2); check('size_10g', maxSizeMM >= 2.5);
    check('size_8g', maxSizeMM >= 3.2); check('size_6g', maxSizeMM >= 4); check('size_4g', maxSizeMM >= 5);
    check('size_2g', maxSizeMM >= 6); check('size_0g', maxSizeMM >= 8); check('size_00g', maxSizeMM >= 10);
    check('size_half_inch', maxSizeMM >= 12.7); check('size_1_inch', maxSizeMM >= 25.4);
    if (stretchLogs.length > 1) {
        let maxWait = 0;
        for (let i = 1; i < stretchLogs.length; i++) {
            const diffDays = (new Date(stretchLogs[i].date) - new Date(stretchLogs[i-1].date)) / (1000 * 60 * 60 * 24);
            if (diffDays > maxWait) maxWait = diffDays;
        }
        check('wait_60', maxWait >= 60); check('wait_90', maxWait >= 90); check('wait_180', maxWait >= 180);
    }
    
    check('tattoo_first', tattooLogs.length > 0); check('tattoo_count_3', tattooLogs.length >= 3); check('tattoo_count_10', tattooLogs.length >= 10);
    const uniqueArtists = new Set(tattooLogs.map(t => t.artist?.toLowerCase().trim()).filter(Boolean));
    check('artist_2', uniqueArtists.size >= 2); check('artist_5', uniqueArtists.size >= 5);
    check('session_long', tattooLogs.some(t => t.duration >= 240));

    check('piercing_first', piercingLogs.length > 0); check('piercing_count_3', piercingLogs.length >= 3); check('piercing_count_10', piercingLogs.length >= 10);
    check('facial_piercing', piercingLogs.some(p => ['nostril', 'septum', 'eyebrow', 'bridge', 'lip', 'medusa', 'monroe'].some(fp => p.piercing_type?.toLowerCase().includes(fp))));
    const earPiercings = piercingLogs.filter(p => ['lobe', 'helix', 'tragus', 'daith', 'rook', 'conch'].some(ep => p.piercing_type?.toLowerCase().includes(ep)));
    check('ear_project', earPiercings.length >= 3);
    check('first_jewelry_change', piercingLogs.some(p => p.piercing_log_type === 'jewelry_change'));

    check('logs_1', allLogs.length >= 1); check('logs_10', allLogs.length >= 10); check('logs_100', allLogs.length >= 100);
    if (userSettings.birthday) {
        const birthDate = new Date(userSettings.birthday + 'T12:00:00');
        const loggedOnBirthday = allLogs.some(log => {
            const logDate = new Date(log.date + 'T12:00:00');
            return logDate.getMonth() === birthDate.getMonth() && logDate.getDate() === birthDate.getDate();
        });
        check('quirky_birthday', loggedOnBirthday);
    }
    
    if (newUnlocks.length > 0) {
        const newAchievements = { ...userSettings.achievements };
        newUnlocks.forEach(key => {
            newAchievements[key] = true;
            showAchievementModal(allAchievements[key]);
        });
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
    document.getElementById('log-date').valueAsDate = new Date();
    signInBtn.addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));
    signOutBtn.addEventListener('click', () => signOut(auth));
    logForm.addEventListener('submit', handleLogSubmit);
    modTypeSelect.addEventListener('change', handleModTypeChange);
    
    displayNameInput.addEventListener('change', (e) => saveSetting('displayName', e.target.value));
    userBirthdayInput.addEventListener('change', (e) => saveSetting('birthday', e.target.value));

    setupTabListeners();
    setupThemeSwitcher();
    setupGoalModalListeners();
    setupFriendModalListeners();
    setupProfileTabListeners();
    handleModTypeChange();
}

function setupTabListeners() {
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
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
    themeSwitcher.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = 'antialiased text-gray-800';
        if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
        const newUsedThemes = [...new Set([...(userSettings.usedThemes || []), theme])];
        saveSetting('theme', theme);
        saveSetting('usedThemes', newUsedThemes);
    });
}

function setupGoalModalListeners() {
    addGoalBtn.addEventListener('click', () => {
        renderGoalEditList();
        goalModal.classList.remove('hidden');
    });
    goalModal.querySelector('[data-action="close-goal"]').addEventListener('click', () => goalModal.classList.add('hidden'));
    addNewGoalBtn.addEventListener('click', () => {
        const newGoal = { id: Date.now().toString(), title: 'New Goal', current: 0, target: 10, unit: '' };
        const updatedGoals = [...(userSettings.goals || []), newGoal];
        saveSetting('goals', updatedGoals).then(() => renderGoalEditList());
    });
}

function setupFriendModalListeners() {
    friendModal.querySelector('[data-action="close-friend"]').addEventListener('click', () => friendModal.classList.add('hidden'));
    document.getElementById('add-friend-confirm-btn').addEventListener('click', async () => {
        const newFriendId = document.getElementById('friend-id-input').value.trim();
        if (newFriendId && newFriendId !== userId) {
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

function setupProfileTabListeners() {
    const copyBtn = document.getElementById('copy-id-btn');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');

    copyBtn.addEventListener('click', () => {
        const userIdToCopy = document.getElementById('user-id-display').textContent;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(userIdToCopy);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = userIdToCopy;
            textArea.style.position = "fixed";
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
    themeSwitcher.value = theme;
    document.body.className = 'antialiased text-gray-800';
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);

    const displayName = userSettings.displayName || auth.currentUser?.displayName || 'User';
    userBirthdayInput.value = userSettings.birthday || '';
    displayNameInput.value = displayName;
    document.getElementById('user-name').textContent = displayName;
    
    document.getElementById('user-id-display').textContent = userId;
}

function updateDashboard() {
    const sortedLogs = [...allLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;

    if (latestLog) {
        document.getElementById('current-mod-type').textContent = latestLog.mod_type.charAt(0).toUpperCase() + latestLog.mod_type.slice(1);
        let details = 'N/A';
        if (latestLog.mod_type === 'stretch') details = latestLog.size || 'N/A';
        if (latestLog.mod_type === 'tattoo') details = latestLog.placement || 'N/A';
        if (latestLog.mod_type === 'piercing') details = latestLog.piercing_type ||.

