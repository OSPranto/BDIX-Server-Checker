// পরীক্ষার জন্য Time-out সেটিংস (মিলি-সেকেন্ডে)
const TIMEOUT_MS = 5000; // 5 সেকেন্ড

// DOM উপাদানগুলি নির্বাচন
const startButton = document.getElementById('start-button');
const categorySelect = document.getElementById('server-category');
const workingList = document.getElementById('working-list');
const notWorkingList = document.getElementById('not-working-list');
const workingSection = document.getElementById('working-section');
const notWorkingSection = document.getElementById('not-working-section');
const workingCount = document.getElementById('working-count');
const notWorkingCount = document.getElementById('not-working-count');

// প্রোগ্রেস বার উপাদান
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const loadingMessage = document.getElementById('loading-message');

// সার্ভার ক্যাটাগরি থেকে ফাইল পাথ ম্যাপিং
const serverFileMap = {
    'ftp': 'ftp_servers.json',
    'live_tv': 'live_tv_servers.json'
};


/**
 * সমস্ত তালিকা পরিষ্কার করে দেয় এবং গণনা শূন্য করে।
 */
function clearLists() {
    workingList.innerHTML = '';
    notWorkingList.innerHTML = '';
    workingSection.style.display = 'none';
    notWorkingSection.style.display = 'none';
    workingCount.textContent = '0';
    notWorkingCount.textContent = '0';
}

/**
 * প্রোগ্রেস বার আপডেট করে।
 * @param {number} percentage - 0 থেকে 100 এর মধ্যে শতাংশ মান।
 */
function updateProgress(percentage) {
    const p = Math.round(percentage);
    progressBar.style.width = `${p}%`;
    progressBar.textContent = `${p}%`;
}

/**
 * একটি সার্ভারকে Working হিসেবে ডিসপ্লে করে।
 * @param {object} server - সার্ভার অবজেক্ট { name, url }
 */
function displayWorking(server) {
    const listItem = document.createElement('li');
    listItem.className = 'server-item working';
    listItem.innerHTML = `
        <span>${server.name}</span>
        <a href="${server.url}" target="_blank">${server.url}</a>
        <span class="status-icon">Working</span>
    `;
    workingList.appendChild(listItem);
}

/**
 * একটি সার্ভারকে Not Working হিসেবে ডিসপ্লে করে।
 * @param {object} server - সার্ভার অবজেক্ট { name, url }
 */
function displayNotWorking(server) {
    const listItem = document.createElement('li');
    listItem.className = 'server-item not-working';
    listItem.innerHTML = `
        <span>${server.name}</span>
        <a href="${server.url}" target="_blank">${server.url}</a>
        <span class="status-icon">Not Working</span>
    `;
    notWorkingList.appendChild(listItem);
}

/**
 * সার্ভার স্ট্যাটাস চেক করার মূল ফাংশন। 
 */
async function checkServerStatus(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true; 
    } catch (error) {
        clearTimeout(timeoutId);
        return false;
    }
}

/**
 * নির্বাচিত ক্যাটাগরি অনুসারে JSON ফাইল থেকে সার্ভার ডেটা লোড করে।
 * @param {string} category - নির্বাচিত ক্যাটাগরি ('ftp' বা 'live_tv')।
 * @returns {Promise<Array>} - সার্ভার অবজেক্টের অ্যারে।
 */
async function loadServers(category) {
    const filename = serverFileMap[category];

    if (!filename) {
        console.error("Invalid server category selected.");
        return [];
    }
    
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching ${filename}`);
        }
        // যেহেতু ফাইলটি সরাসরি একটি অ্যারে, তাই আমরা এটি সরাসরি রিটার্ন করতে পারি।
        return response.json();
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        alert(`সার্ভার ফাইল (${filename}) লোড করা যায়নি। ফাইলটি ঠিক আছে কিনা দেখুন।`);
        return [];
    }
}

/**
 * সমস্ত সার্ভার চেক করা এবং ফলাফল ডিসপ্লে করার মূল ফাংশন।
 */
async function checkAllServers() {
    // 1. UI স্টেট আপডেট
    clearLists();
    startButton.disabled = true; 
    startButton.textContent = 'Checking...';
    progressContainer.style.display = 'block';
    loadingMessage.style.display = 'block';
    updateProgress(0);

    const selectedCategory = categorySelect.value;
    
    // 2. সার্ভার ডেটা লোড করা
    const serversToCheck = await loadServers(selectedCategory); // এখানে শুধু নির্বাচিত ফাইল লোড হচ্ছে

    if (serversToCheck.length === 0) {
        // যদি লোড করতে ব্যর্থ হয় বা সার্ভার না থাকে
        startButton.disabled = false;
        startButton.textContent = '🚀 Start Check';
        progressContainer.style.display = 'none';
        loadingMessage.style.display = 'none';
        return;
    }

    const totalServers = serversToCheck.length;
    let checkedCount = 0;
    let workingCountValue = 0;
    let notWorkingCountValue = 0;

    // 3. প্রতিটি সার্ভার চেক করা
    for (const server of serversToCheck) {
        const isWorking = await checkServerStatus(server.url);
        
        if (isWorking) {
            displayWorking(server);
            workingCountValue++;
        } else {
            displayNotWorking(server);
            notWorkingCountValue++;
        }

        // প্রোগ্রেস বার আপডেট
        checkedCount++;
        const progressPercentage = (checkedCount / totalServers) * 100;
        updateProgress(progressPercentage);
    }

    // 4. ফলাফল ডিসপ্লে করা
    loadingMessage.style.display = 'none';
    progressContainer.style.display = 'none';
    startButton.disabled = false; 
    startButton.textContent = '🚀 Start Check';

    // কাজ করছে এমন সার্ভার থাকলে দেখানো
    if (workingList.children.length > 0) {
        workingSection.style.display = 'block';
        workingCount.textContent = workingCountValue;
    }
    // কাজ করছে না এমন সার্ভার থাকলে দেখানো
    if (notWorkingList.children.length > 0) {
        notWorkingSection.style.display = 'block';
        notWorkingCount.textContent = notWorkingCountValue;
    }
}

// "Start Check" বাটনে ইভেন্ট লিসেনার যোগ করা
startButton.addEventListener('click', checkAllServers);

// পেজ লোড হওয়ার সাথে সাথে তালিকাগুলো ফাঁকা রাখা
clearLists();
