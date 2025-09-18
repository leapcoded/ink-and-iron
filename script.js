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
let userSettings = { achievements: {}, usedThemes: [], goals: [] };
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
        userSettings = docSnap.exists() ? docSnap.data() : { achievements: {}, usedThemes: [], goals: [] };
        // Ensure defaults
        userSettings.achievements = userSettings.achievements || {};
        userSettings.usedThemes = userSettings.usedThemes || [];
        userSettings.goals = userSettings.goals || [];
        
        applySettings();
        renderGoals();
        renderAchievements();
        checkAchievements(); 
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
        renderStats();
        checkAchievements();
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
    
    // Data processing
    const stretchLogs = allLogs.filter(l => l.mod_type === 'stretch' && l.stretch_type === 'up').sort((a,b) => new Date(a.date) - new Date(b.date));
    const tattooLogs = allLogs.filter(l => l.mod_type === 'tattoo');
    const piercingLogs = allLogs.filter(l => l.mod_type === 'piercing');
    const maxSizeMM = stretchLogs.reduce((max, log) => Math.max(max, parseSizeToMM(log.size)), 0);
    
    // Goal Achievements
    const completedGoals = (userSettings.goals || []).filter(g => g.current >= g.target);
    check('goal_set', (userSettings.goals || []).length > 0);
    check('goal_reached', completedGoals.length > 0);
    check('goal_surpassed', (userSettings.goals || []).some(g => g.current > g.target));
    
    // Stretching Achievements
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
    
    // Tattoo Achievements
    check('tattoo_first', tattooLogs.length > 0); check('tattoo_count_3', tattooLogs.length >= 3); check('tattoo_count_10', tattooLogs.length >= 10);
    const uniqueArtists = new Set(tattooLogs.map(t => t.artist?.toLowerCase().trim()).filter(Boolean));
    check('artist_2', uniqueArtists.size >= 2); check('artist_5', uniqueArtists.size >= 5);
    check('session_long', tattooLogs.some(t => t.duration >= 240));

    // Piercing Achievements
    check('piercing_first', piercingLogs.length > 0); check('piercing_count_3', piercingLogs.length >= 3); check('piercing_count_10', piercingLogs.length >= 10);
    check('facial_piercing', piercingLogs.some(p => ['nostril', 'septum', 'eyebrow', 'bridge', 'lip', 'medusa', 'monroe'].some(fp => p.piercing_type?.toLowerCase().includes(fp))));
    const earPiercings = piercingLogs.filter(p => ['lobe', 'helix', 'tragus', 'daith', 'rook', 'conch'].some(ep => p.piercing_type?.toLowerCase().includes(ep)));
    check('ear_project', earPiercings.length >= 3);
    check('first_jewelry_change', piercingLogs.some(p => p.piercing_log_type === 'jewelry_change'));

    // General & Quirky Achievements
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
    handleModTypeChange(); // Call on init
}

function setupTabListeners() {
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(`${e.currentTarget.dataset.tab}-content`).classList.add('active');
        });
    });
}

function setupThemeSwitcher() {
    themeSwitcher.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = 'antialiased text-gray-800'; // Reset
        if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
        const newUsedThemes = [...new Set([...(userSettings.usedThemes || []), theme])];
        saveSetting('theme', theme);
        saveSetting('usedThemes', newUsedThemes);
    });
}

function handleModTypeChange() {
    const selectedType = modTypeSelect.value;
    const container = document.getElementById('dynamic-fields-container');
    let fieldsHtml = '';

    if (selectedType === 'stretch') {
        fieldsHtml = `
            <div class="md:col-span-2">
                <label for="stretch-type" class="block text-sm font-medium mb-1">Stretch Type</label>
                <select id="stretch-type" class="w-full p-2 border border-gray-300 rounded-md">
                    <option value="up">Stretch Up</option>
                    <option value="downsize">Downsize</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>
            <div>
                <label for="stretch-size" class="block text-sm font-medium mb-1">Current Size (mm or g)</label>
                <input type="text" id="stretch-size" placeholder="e.g., 1.6mm / 14g" class="w-full p-2 border border-gray-300 rounded-md">
            </div>
            <div>
                <label for="stretch-irritation" class="block text-sm font-medium mb-1">Irritation (1=None, 5=Severe)</label>
                <input type="range" id="stretch-irritation" min="1" max="5" value="1" class="w-full">
            </div>`;
    } else if (selectedType === 'tattoo') {
        fieldsHtml = `
             <div><label for="tattoo-placement" class="block text-sm font-medium mb-1">Placement</label><input type="text" id="tattoo-placement" placeholder="e.g., Left forearm" class="w-full p-2 border border-gray-300 rounded-md"></div>
             <div><label for="tattoo-artist" class="block text-sm font-medium mb-1">Artist</label><input type="text" id="tattoo-artist" placeholder="e.g., Jane Doe" class="w-full p-2 border border-gray-300 rounded-md"></div>
             <div><label for="tattoo-studio" class="block text-sm font-medium mb-1">Studio</label><input type="text" id="tattoo-studio" placeholder="e.g., Inked Up" class="w-full p-2 border border-gray-300 rounded-md"></div>
             <div><label for="tattoo-duration" class="block text-sm font-medium mb-1">Session Duration (minutes)</label><input type="number" id="tattoo-duration" placeholder="e.g., 240" class="w-full p-2 border border-gray-300 rounded-md"></div>`;
    } else if (selectedType === 'piercing') {
        fieldsHtml = `
            <div><label for="piercing-type" class="block text-sm font-medium mb-1">Type of Piercing</label><input type="text" id="piercing-type" placeholder="e.g., Septum, Nostril" class="w-full p-2 border border-gray-300 rounded-md"></div>
            <div><label for="piercing-placement" class="block text-sm font-medium mb-1">Placement / Side</label><input type="text" id="piercing-placement" placeholder="e.g., Left, Right, Center" class="w-full p-2 border border-gray-300 rounded-md"></div>
            <div class="md:col-span-2"><label for="piercing-log-type" class="block text-sm font-medium mb-1">Log Type</label><select id="piercing-log-type" class="w-full p-2 border border-gray-300 rounded-md"><option value="new">New Piercing</option><option value="jewelry_change">Jewelry Change</option></select></div>
            <div id="jewelry-fields" class="hidden md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label for="jewelry-material" class="block text-sm font-medium mb-1">Jewelry Material</label><input type="text" id="jewelry-material" placeholder="e.g., Titanium" class="w-full p-2 border border-gray-300 rounded-md"></div>
                 <div><label for="jewelry-description" class="block text-sm font-medium mb-1">Brand / Description</label><input type="text" id="jewelry-description" placeholder="e.g., BVLA" class="w-full p-2 border border-gray-300 rounded-md"></div>
            </div>
            `;
    } else if (selectedType === 'care') {
        fieldsHtml = `<p class="text-sm text-gray-500 md:col-span-2">Log your daily massage, oiling, or cleaning routine to track healthy habits.</p>`;
    }
    container.innerHTML = fieldsHtml;

    // Add listener for piercing log type to show/hide jewelry fields
    if (selectedType === 'piercing') {
        const piercingLogTypeSelect = document.getElementById('piercing-log-type');
        const jewelryFields = document.getElementById('jewelry-fields');
        piercingLogTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'jewelry_change') {
                jewelryFields.classList.remove('hidden');
            } else {
                jewelryFields.classList.add('hidden');
            }
        });
    }
}

// --- SECTION: GOAL MANAGEMENT ---
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

function renderGoalEditList() {
    const container = document.getElementById('goal-edit-list');
    const goals = userSettings.goals || [];
    if (goals.length === 0) {
        container.innerHTML = `<p class="text-sm text-center text-gray-400 p-4">Click "Add New Goal" to start.</p>`;
    } else {
        container.innerHTML = goals.map(goal => `
            <div class="p-3 border rounded-md" data-goal-id="${goal.id}">
                <input type="text" value="${goal.title}" data-field="title" class="font-semibold w-full mb-2 p-1 border-b" placeholder="Goal Title">
                <div class="grid grid-cols-3 gap-2 text-sm">
                    <input type="number" step="any" value="${goal.current}" data-field="current" class="w-full p-1 border rounded-md" placeholder="Current">
                    <input type="number" step="any" value="${goal.target}" data-field="target" class="w-full p-1 border rounded-md" placeholder="Target">
                    <input type="text" value="${goal.unit || ''}" data-field="unit" class="w-full p-1 border rounded-md" placeholder="Unit">
                </div>
                <button data-action="delete" class="text-xs text-red-500 hover:underline mt-2">Delete Goal</button>
            </div>
        `).join('');
    }

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.closest('[data-goal-id]').dataset.goalId;
            const field = e.target.dataset.field;
            const value = (e.target.type === 'number') ? parseFloat(e.target.value) || 0 : e.target.value;
            const updatedGoals = userSettings.goals.map(g => g.id === id ? { ...g, [field]: value } : g);
            saveSetting('goals', updatedGoals);
        });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('[data-goal-id]').dataset.goalId;
            if (confirm('Are you sure you want to delete this goal?')) {
                const updatedGoals = userSettings.goals.filter(g => g.id !== id);
                saveSetting('goals', updatedGoals).then(() => renderGoalEditList());
            }
        });
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
}

function updateDashboard() {
    const latestLog = allLogs.length > 0 ? allLogs[0] : null;

    if (latestLog) {
        document.getElementById('current-mod-type').textContent = latestLog.mod_type.charAt(0).toUpperCase() + latestLog.mod_type.slice(1);
        let details = 'N/A';
        if(latestLog.mod_type === 'stretch') details = latestLog.size || 'N/A';
        if(latestLog.mod_type === 'tattoo') details = latestLog.placement || 'N/A';
        if(latestLog.mod_type === 'piercing') details = latestLog.piercing_type || 'N/A';
        document.getElementById('current-mod-details').textContent = details;
        document.getElementById('last-mod-date').textContent = new Date(latestLog.date + 'T00:00:00').toLocaleDateString();

        const nextStretchContainer = document.getElementById('next-stretch-container');
        if (latestLog.mod_type === 'stretch' && latestLog.stretch_type === 'up') {
            const lastStretchDate = new Date(latestLog.date + 'T00:00:00');
            const lastSizeMM = parseSizeToMM(latestLog.size);
            let waitDays;

            // Using the new, more detailed wait times based on the provided image
            if (lastSizeMM < 2.5) { // Up to 10g (2.5mm)
                waitDays = 45; // 1.5+ months
            } else if (lastSizeMM < 4) { // Up to 6g (4mm)
                waitDays = 75; // ~2.5 months
            } else if (lastSizeMM < 7) { // Up to 2g (6mm) -> 1g is 7mm
                waitDays = 150; // ~5 months
            } else { // For larger sizes, maintain a long wait
                waitDays = 180; // 6+ months
            }
            
            const nextDate = new Date(lastStretchDate);
            nextDate.setDate(nextDate.getDate() + waitDays);
            
            document.getElementById('next-stretch-date').textContent = nextDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ` (after ${waitDays} days)`;
            nextStretchContainer.classList.remove('hidden');
        } else {
            nextStretchContainer.classList.add('hidden');
        }
    } else {
        document.getElementById('current-mod-type').textContent = 'N/A';
        document.getElementById('current-mod-details').textContent = 'N/A';
        document.getElementById('last-mod-date').textContent = 'N/A';
        document.getElementById('next-stretch-container').classList.add('hidden');
    }
}

function renderGoals() {
    const container = document.getElementById('goal-list-container');
    const goals = userSettings.goals || [];
    if (goals.length === 0) {
        container.innerHTML = `<p class="text-sm text-center text-gray-400 p-4">Click "Add / Edit" to start tracking your progress!</p>`;
        return;
    }

    container.innerHTML = goals.map(goal => {
        const percentage = Math.max(0, Math.min(((goal.current || 0) / (goal.target || 1)) * 100, 100));
        return `
            <div>
                <div class="flex justify-between items-center text-sm mb-1">
                    <span class="font-semibold">${goal.title}</span>
                    <span class="text-gray-500">${goal.current || 0} / ${goal.target || 0} ${goal.unit || ''}</span>
                </div>
                <div class="progress-bar-bg w-full h-3 rounded-full overflow-hidden">
                    <div class="progress-bar-fill h-full" style="width: ${percentage}%;"></div>
                </div>
            </div>`;
    }).join('');
}


function renderLogs() {
    const container = document.getElementById('log-container');
    if (!container) return;

    if (allLogs.length === 0) {
        container.innerHTML = `<div class="text-center py-10 px-6 card"><p class="text-gray-500">You haven't logged any activity yet. Fill out the form above to get started!</p></div>`;
        return;
    }

    const logEntriesHtml = allLogs.map(log => {
        const date = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        let detailsHtml = '';

        switch (log.mod_type) {
            case 'stretch':
                detailsHtml = `
                    <p><strong>Type:</strong> <span class="capitalize">${log.stretch_type || 'N/A'}</span></p>
                    <p><strong>Size:</strong> ${log.size || 'N/A'}</p>
                    <p><strong>Irritation:</strong> ${log.irritation || '1'}/5</p>
                `;
                break;
            case 'tattoo':
                detailsHtml = `
                    <p><strong>Placement:</strong> ${log.placement || 'N/A'}</p>
                    <p><strong>Artist:</strong> ${log.artist || 'N/A'}</p>
                    <p><strong>Duration:</strong> ${log.duration ? `${log.duration} minutes` : 'N/A'}</p>
                `;
                break;
            case 'piercing':
                detailsHtml = `
                    <p><strong>Type:</strong> ${log.piercing_type || 'N/A'}</p>
                    <p><strong>Placement:</strong> ${log.placement || 'N/A'}</p>
                    <p><strong>Log Type:</strong> <span class="capitalize">${(log.piercing_log_type || 'N/A').replace('_', ' ')}</span></p>
                `;
                if (log.piercing_log_type === 'jewelry_change') {
                    detailsHtml += `
                        <p><strong>Jewelry Material:</strong> ${log.jewelry_material || 'N/A'}</p>
                        <p><strong>Jewelry Info:</strong> ${log.jewelry_description || 'N/A'}</p>
                    `;
                }
                break;
            case 'care':
                 detailsHtml = `<p>Logged a care routine.</p>`;
                 break;
        }

        return `
            <div class="card mb-4 overflow-hidden">
                <div class="flex flex-col md:flex-row">
                    ${log.photoURL ? `<img src="${log.photoURL}" class="w-full md:w-48 h-48 object-cover" alt="Log entry photo">` : ''}
                    <div class="p-4 flex-grow">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-bold text-lg capitalize">${log.mod_type}</h3>
                                <p class="text-sm text-gray-500">${date}</p>
                            </div>
                        </div>
                        <div class="text-sm space-y-1 mb-3">${detailsHtml}</div>
                        ${log.notes ? `<p class="text-sm italic bg-gray-50 p-2 rounded-md">"${log.notes}"</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<h2 class="text-2xl font-bold mb-4 mt-8">Your Logbook</h2>${logEntriesHtml}`;
}
function renderStats() {
    const container = document.getElementById('stats-content');
    if (!container) return;

    if (allLogs.length === 0) {
        container.innerHTML = `<div class="text-center py-10 px-6 card"><p class="text-gray-500">Log some activity to see your stats here!</p></div>`;
        return;
    }

    // Calculate stats
    const totalLogs = allLogs.length;
    const logTypes = allLogs.reduce((acc, log) => {
        acc[log.mod_type] = (acc[log.mod_type] || 0) + 1;
        return acc;
    }, {});
    
    const stretchLogs = allLogs.filter(l => l.mod_type === 'stretch' && l.stretch_type === 'up');
    const largestStretch = stretchLogs.reduce((max, log) => {
        const currentMM = parseSizeToMM(log.size);
        return currentMM > max.mm ? { size: log.size, mm: currentMM } : max;
    }, { size: 'N/A', mm: 0 });

    const totalTattooTime = allLogs
        .filter(l => l.mod_type === 'tattoo' && l.duration)
        .reduce((total, log) => total + parseInt(log.duration), 0);
    const totalTattooHours = Math.floor(totalTattooTime / 60);
    const totalTattooMinutes = totalTattooTime % 60;
    
    const firstLogDate = allLogs.length > 0 ? new Date(allLogs[allLogs.length - 1].date + 'T00:00:00') : new Date();
    const daysSinceFirstLog = Math.floor((new Date() - firstLogDate) / (1000 * 60 * 60 * 24));

    const statsHtml = `
        <h2 class="text-3xl font-bold mb-6 text-center">Your Stats</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div class="card p-4">
                <p class="text-3xl font-bold">${totalLogs}</p>
                <p class="text-sm text-gray-500">Total Logs</p>
            </div>
            <div class="card p-4">
                <p class="text-3xl font-bold">${logTypes.stretch || 0}</p>
                <p class="text-sm text-gray-500">Stretches</p>
            </div>
            <div class="card p-4">
                <p class="text-3xl font-bold">${logTypes.tattoo || 0}</p>
                <p class="text-sm text-gray-500">Tattoos</p>
            </div>
            <div class="card p-4">
                <p class="text-3xl font-bold">${logTypes.piercing || 0}</p>
                <p class="text-sm text-gray-500">Piercings</p>
            </div>
            <div class="card p-4">
                <p class="text-3xl font-bold">${largestStretch.size}</p>
                <p class="text-sm text-gray-500">Largest Stretch</p>
            </div>
            <div class="card p-4">
                <p class="text-3xl font-bold">${totalTattooHours}<span class="text-xl">h</span> ${totalTattooMinutes}<span class="text-xl">m</span></p>
                <p class="text-sm text-gray-500">Time Under the Needle</p>
            </div>
             <div class="card p-4 col-span-2 md:col-span-3">
                <p class="text-3xl font-bold">${daysSinceFirstLog}</p>
                <p class="text-sm text-gray-500">Days Since First Log</p>
            </div>
        </div>
    `;

    container.innerHTML = statsHtml;
}

function renderAchievements() {
    const container = document.getElementById('achievements-content');
    container.innerHTML = `<h2 class="text-3xl font-bold mb-6 text-center">Your Achievements</h2>`;
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 md:grid-cols-4 gap-4';

    for (const key in allAchievements) {
        const achievement = allAchievements[key];
        const isUnlocked = userSettings.achievements && userSettings.achievements[key];
        const card = document.createElement('div');
        card.className = `card p-4 text-center achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        if (isUnlocked || !achievement.secret) {
            card.innerHTML = `<p class="text-4xl mb-2">${achievement.icon}</p><p class="font-bold">${achievement.title}</p><p class="text-xs" style="color: var(--text-secondary);">${achievement.description}</p>`;
        } else {
            card.innerHTML = `<p class="text-4xl mb-2">❓</p><p class="font-bold">Secret Achievement</p><p class="text-xs" style="color: var(--text-secondary);">Keep logging to unlock!</p>`;
        }
        grid.appendChild(card);
    }
    container.appendChild(grid);
}

function showAchievementModal(achievement) {
    openModal(`
         <div class="text-center">
            <p class="text-6xl mb-4">${achievement.icon}</p>
            <h2 class="text-2xl font-bold mb-2">Achievement Unlocked!</h2>
            <p class="font-semibold">${achievement.title}</p>
            <p style="color: var(--text-secondary);">${achievement.description}</p>
            <div class="mt-6"><button data-action="close" class="btn-primary font-bold py-2 px-6 rounded-md">Awesome!</button></div>
        </div>
    `);
}

function openModal(content) {
    mainModal.innerHTML = `<div class="modal-content card">${content}</div>`;
    mainModal.classList.remove('hidden');
    const closeButton = mainModal.querySelector('[data-action="close"]');
    if (closeButton) closeButton.addEventListener('click', closeModal);
}
const closeModal = () => mainModal.classList.add('hidden');

async function handleLogSubmit(e) {
    e.preventDefault();
    if (!userId) return;
    const btn = document.getElementById('log-mod-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const photoFile = document.getElementById('log-photo').files[0];
        let photoURL = null, storagePath = null;
        if (photoFile) {
            storagePath = `users/${userId}/log_images/${Date.now()}-${photoFile.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(storageRef);
        }

        const modType = document.getElementById('mod-type').value;
        let logData = {
            date: document.getElementById('log-date').value,
            notes: document.getElementById('log-notes').value,
            mod_type: modType,
            photoURL, storagePath,
            createdAt: serverTimestamp(),
        };

        if (modType === 'stretch') {
            logData.stretch_type = document.getElementById('stretch-type').value;
            logData.size = document.getElementById('stretch-size').value;
            logData.irritation = document.getElementById('stretch-irritation').value;
        } else if (modType === 'tattoo') {
            logData.placement = document.getElementById('tattoo-placement').value;
            logData.artist = document.getElementById('tattoo-artist').value;
            logData.studio = document.getElementById('tattoo-studio').value;
            logData.duration = document.getElementById('tattoo-duration').value;
        } else if (modType === 'piercing') {
             logData.piercing_type = document.getElementById('piercing-type').value;
             logData.placement = document.getElementById('piercing-placement').value;
             logData.piercing_log_type = document.getElementById('piercing-log-type').value;
             if (logData.piercing_log_type === 'jewelry_change') {
                logData.jewelry_material = document.getElementById('jewelry-material').value;
                logData.jewelry_description = document.getElementById('jewelry-description').value;
             }
        }
        
        await addDoc(collection(db, `users/${userId}/logs`), logData);
        logForm.reset();
        document.getElementById('log-date').valueAsDate = new Date();
        handleModTypeChange();
    } catch (error) {
        console.error("Error saving log:", error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Log Entry';
    }
}

async function saveSetting(key, value) {
    if (!userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/main`);
    await setDoc(settingsRef, { [key]: value }, { merge: true });
}

function parseSizeToMM(sizeString) {
    if (!sizeString) return 0;
    const s = String(sizeString).toLowerCase();
    if (s.includes('g')) {
        const gauge = parseInt(s.match(/-?\d+/)?.[0] || '0');
        const gaugeMap = { 14: 1.6, 12: 2, 10: 2.5, 8: 3.2, 6: 4, 4: 5, 2: 6, 0: 8, '00': 10 };
        return gaugeMap[gauge] || (gaugeMap[s.replace('g','')] || 0);
    }
    if (s.includes('/')) {
        const parts = s.replace('"', '').split(/[\s+]/).filter(Boolean);
        let mm = 0;
        parts.forEach(part => {
            if (part.includes('/')) {
                const fraction = part.split('/');
                mm += (parseFloat(fraction[0]) / parseFloat(fraction[1])) * 25.4;
            } else {
                mm += parseFloat(part) * 25.4;
            }
        });
        return mm;
    }
    const match = s.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
}

function clearAllData() {
    allLogs = [];
    userSettings = { achievements: {}, usedThemes: [], goals:[] };
    updateDashboard();
    renderStats();
    renderAchievements();
    renderLogs();
    renderGoals();
}

// --- RUN ---
init();
handleModTypeChange();

