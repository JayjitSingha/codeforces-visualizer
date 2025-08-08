let ratingChartInstance = null;

async function fetchAndDrawHeatmap() {
  const handle = document.getElementById('handle').value;
  if (!handle) {
    alert('Please enter a Codeforces handle.');
    return;
  }

  try {
    const res = await fetch(`/api/user-submissions/${handle}`);
    const submissions = await res.json();

    // ✅ Now all use the correct handle
    fetchAndDrawRatingChart(handle);
    drawHeatmap(submissions);
    drawTagChart(submissions);
    calculateStreaks(submissions);
    calculateConsistency(submissions);
    plotDifficultyChart(submissions);
    showProblemSummary(submissions);
    await fetchAndShowUserInfo(handle);
    
  } catch (err) {
    console.error('Error fetching submissions:', err);
  }
}


function drawHeatmap(submissions) {
  const heatmapData = {};

  submissions.forEach((submission) => {
    if (submission.verdict === 'OK') {
      const date = new Date(submission.creationTimeSeconds * 1000);
      const dayStr = date.toISOString().split('T')[0];
      heatmapData[dayStr] = (heatmapData[dayStr] || 0) + 1;
    }
  });

  const container = document.getElementById('heatmap');
  container.innerHTML = ''; // clear previous

  const days = Object.keys(heatmapData).sort();

  days.forEach(day => {
    const count = heatmapData[day];
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.backgroundColor = getHeatColor(count);
    cell.title = `${day}: ${count} problems`;
    container.appendChild(cell);
  });
}

function getHeatColor(count) {
  if (count === 0) return '#eee';
  if (count < 2) return '#a0e7e5';
  if (count < 4) return '#70d6ff';
  if (count < 6) return '#4ea8de';
  return '#0077b6';
}
async function fetchAndDrawRatingChart(handle) {
  if (!handle) {
    alert('Please enter a Codeforces handle.');
    return;
  }

  try {
    const res = await fetch(`/api/user-rating/${handle}`);
    const ratingData = await res.json();
    drawRatingChart(ratingData);
  } catch (err) {
    console.error('Error fetching rating data:', err);
  }
}


function drawRatingChart(ratingData) {
  const labels = ratingData.map(entry => {
    const date = new Date(entry.ratingUpdateTimeSeconds * 1000);
    return date.toISOString().split('T')[0];
  });

  const ratings = ratingData.map(entry => entry.newRating);

  const ctx = document.getElementById('ratingChart').getContext('2d');

  // ✅ Destroy previous chart if it exists
  if (ratingChartInstance) {
    ratingChartInstance.destroy();
  }

  // ✅ Create new chart and save reference
  ratingChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Rating Over Time',
        data: ratings,
        borderColor: '#00f7ff',
        backgroundColor: 'rgba(0, 247, 255, 0.2)',
        tension: 0.2,
        pointRadius: 3,
        pointBackgroundColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { display: true, title: { display: true, text: 'Date' } },
        y: { display: true, title: { display: true, text: 'Rating' } }
      }
    }
  });
}

let tagChartInstance = null; // 👈 Declare this globally at the top of your script.js

function drawTagChart(submissions) {
  const tagCount = {};
  const solvedProblems = new Set();

  submissions.forEach(sub => {
    if (sub.verdict === 'OK') {
      const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
      if (!solvedProblems.has(problemId)) {
        solvedProblems.add(problemId);
        const tags = sub.problem.tags || [];
        tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    }
  });

  const labels = Object.keys(tagCount);
  const data = Object.values(tagCount);

  const ctx = document.getElementById('tagChart').getContext('2d');

  // ✅ Destroy old chart if it exists
  if (tagChartInstance) {
    tagChartInstance.destroy();
  }

  // ✅ Create and store new instance
  tagChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Solved Problems by Tag',
        data: data,
        backgroundColor: labels.map(() =>
          `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { title: { display: true, text: 'Tags' } },
        y: { title: { display: true, text: 'Problems Solved' } }
      }
    }
  });
}

function calculateStreaks(submissions) {
  console.log('🔥 Calculating streaks');

  const solvedDays = new Set();

  submissions.forEach(sub => {
    if (sub.verdict === 'OK') {
      const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0];
      solvedDays.add(date);
    }
  });

  const sortedDates = Array.from(solvedDays).sort();

  let longest = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr - prev) / (1000 * 3600 * 24);

    if (diff === 1) {
      tempStreak++;
    } else if (diff > 1) {
      longest = Math.max(longest, tempStreak);
      tempStreak = 1;
    }
  }

  longest = Math.max(longest, tempStreak);

  // Calculate current streak
  const today = new Date();
  let currentStreak = 0;
  let dayPointer = new Date(today);

  while (solvedDays.has(dayPointer.toISOString().split('T')[0])) {
    currentStreak++;
    dayPointer.setDate(dayPointer.getDate() - 1);
  }

  // ✅ Make sure the DOM elements exist
  const currentStreakEl = document.getElementById('currentStreak');
  const longestStreakEl = document.getElementById('longestStreak');

  if (currentStreakEl && longestStreakEl) {
    currentStreakEl.textContent = currentStreak;
    longestStreakEl.textContent = longest;
  } else {
    console.warn("❌ Streak elements not found in the DOM");
  }
}

function calculateConsistency(submissions) {
  const solved = submissions.filter(sub => sub.verdict === 'OK');

  if (solved.length === 0) {
    document.getElementById('consistencyScore').textContent = "0";
    return;
  }

  // 🔧 Fix: Sort by creation time
  solved.sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

  const firstDate = new Date(solved[0].creationTimeSeconds * 1000);
  const lastDate = new Date(solved[solved.length - 1].creationTimeSeconds * 1000);

  const weeks = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 3600 * 24 * 7)));

  const consistency = (solved.length / weeks).toFixed(2);

  document.getElementById('consistencyScore').textContent = consistency;
}

let difficultyChartInstance; // keep reference to destroy old chart

function plotDifficultyChart(submissions) {
  console.log('📶 Plotting difficulty chart');

  const counts = {};
  const solvedSet = new Set();

  submissions.forEach(sub => {
    if (sub.verdict === "OK" && sub.problem.rating && !solvedSet.has(sub.problem.contestId + sub.problem.index)) {
      const rating = sub.problem.rating;
      counts[rating] = (counts[rating] || 0) + 1;
      solvedSet.add(sub.problem.contestId + sub.problem.index);
    }
  });

  const sortedRatings = Object.keys(counts).sort((a, b) => a - b);
  const values = sortedRatings.map(rating => counts[rating]);

  const chartEl = document.getElementById('difficultyChart');
  if (!chartEl) {
    console.warn("❌ Element #difficultyChart not found.");
    return;
  }

  const ctx = chartEl.getContext('2d');

  // Destroy existing chart if exists
  if (difficultyChartInstance) {
    difficultyChartInstance.destroy();
  }

  difficultyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedRatings,
      datasets: [{
        label: 'Problems Solved',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function showProblemSummary(submissions) {
  console.log('📋 Showing problem summary');

  const solvedSet = new Set();
  const solvedByDay = {};

  submissions.forEach(sub => {
    if (sub.verdict === 'OK') {
      const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
      solvedSet.add(problemId);

      const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0];
      if (!solvedByDay[date]) solvedByDay[date] = 0;
      solvedByDay[date]++;
    }
  });

  const total = submissions.filter(sub => sub.verdict === 'OK').length;
  const unique = solvedSet.size;
  const maxDay = Math.max(...Object.values(solvedByDay), 0);

  const totalEl = document.getElementById('total-problems');
  const uniqueEl = document.getElementById('unique-problems');
  const maxEl = document.getElementById('max-solved-day');

  if (totalEl && uniqueEl && maxEl) {
    totalEl.textContent = total;
    uniqueEl.textContent = unique;
    maxEl.textContent = maxDay;
  } else {
    console.warn("❌ One or more summary elements not found in the DOM");
  }
}
async function fetchAndShowUserInfo(handle) {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const data = await res.json();
    if (data.status !== 'OK') throw new Error('Invalid handle');

    const user = data.result[0];
    document.getElementById('user-handle').textContent = user.handle;
    document.getElementById('user-rating').textContent = user.rating || 'Unrated';
    document.getElementById('user-max-rating').textContent = user.maxRating || 'N/A';
    document.getElementById('user-rank').textContent = user.rank || 'N/A';
  } catch (err) {
    console.error('Error fetching user info:', err);
  }
}


