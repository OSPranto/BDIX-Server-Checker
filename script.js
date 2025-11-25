// পরীক্ষার জন্য Time-out সেটিংস (মিলি-সেকেন্ডে)
const TIMEOUT_MS = 5000; // 5 সেকেন্ড
const CIRCLE_CIRCUMFERENCE = 440; // 2 * PI * 70 (r=70)

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
const circularProgressContainer = document.getElementById('circular-progress-container');
const progressCircle = document.getElementById('progress-circle');
const progressText = document.getElementById('progress-text'); // Text element inside circle

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
    // Ensure text shows 'START' or 0% when lists are cleared
    progressText.textContent = 'START'; 
    progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE; // Reset circle
}

/**
 * প্রোগ্রেস বার (বৃত্ত) আপডেট করে।
 * @param {number} percentage - 0 থেকে 100 এর মধ্যে শতাংশ মান।
 */
function updateProgress(percentage) {
    const p = Math.round(percentage);
    
    // Fill the circle by reducing the dashoffset
    const offset = CIRCLE_CIRCUMFERENCE - (p / 100) * CIRCLE_CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
    
    progressText.textContent = `${p}%`;
    
    // Change text color when nearly complete
    if (p > 90) {
        progressText.style.color = '#fff';
    } else {
        progressText.style.color = '#4CAF50';
    }
}

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
    // 1. UI স্টেট আপডেট: চেক শুরু
    clearLists();
    startButton.style.display = 'none'; // Start Button লুকানো
    circularProgressContainer.classList.add('checking'); // Circle দেখানো
    progressText.textContent = '0%';
    progressText.style.color = '#4CAF50';

    const selectedCategory = categorySelect.value;
    const serversToCheck = await loadServers(selectedCategory);

    if (serversToCheck.length === 0) {
        // ত্রুটি হলে UI স্বাভাবিক করা
        startButton.style.display = 'block';
        circularProgressContainer.classList.remove('checking');
        progressText.textContent = 'START';
        return;
    }

    const totalServers = serversToCheck.length;
    let checkedCount = 0;
    let workingCountValue = 0;
    let notWorkingCountValue = 0;

    // 2. প্রতিটি সার্ভার চেক করা
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

    // 3. ফলাফল ডিসপ্লে করা: চেক শেষ
    circularProgressContainer.classList.remove('checking');
    startButton.style.display = 'block'; // Start Button আবার দেখানো

    // যদি কোনো সার্ভার পাওয়া যায়, তবেই সেকশনগুলি দেখানো
    if (workingList.children.length > 0) {
        workingSection.style.display = 'block';
        workingCount.textContent = workingCountValue;
    }
    if (notWorkingList.children.length > 0) {
        notWorkingSection.style.display = 'block';
        notWorkingCount.textContent = notWorkingCountValue;
    }
}

// "Start Check" বাটনে ইভেন্ট লিসেনার যোগ করা
startButton.addEventListener('click', checkAllServers);

// পেজ লোড হওয়ার সাথে সাথে তালিকাগুলো ফাঁকা রাখা এবং START টেক্সট দেখানো
clearLists();
startButton.style.display = 'block'; // Ensure button is visible initially
