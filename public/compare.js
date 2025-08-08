async function compareHandles() {
  const handle1 = document.getElementById('handle1').value.trim();
  const handle2 = document.getElementById('handle2').value.trim();

  if (!handle1 || !handle2) {
    alert("Please enter both handles.");
    return;
  }

  try {
    const [user1, user2] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${handle1}`).then(res => res.json()),
      fetch(`https://codeforces.com/api/user.info?handles=${handle2}`).then(res => res.json())
    ]);

    if (user1.status !== 'OK' || user2.status !== 'OK') {
      throw new Error("Invalid handle(s).");
    }

    const u1 = user1.result[0];
    const u2 = user2.result[0];

    document.getElementById('user1-name').textContent = u1.handle;
    document.getElementById('user1-rating').textContent = u1.rating || 'Unrated';
    document.getElementById('user1-max-rating').textContent = u1.maxRating || 'N/A';
    document.getElementById('user1-rank').textContent = u1.rank || 'N/A';

    document.getElementById('user2-name').textContent = u2.handle;
    document.getElementById('user2-rating').textContent = u2.rating || 'Unrated';
    document.getElementById('user2-max-rating').textContent = u2.maxRating || 'N/A';
    document.getElementById('user2-rank').textContent = u2.rank || 'N/A';

    const user1Stats = await fetchUserStats(handle1);
    const user2Stats = await fetchUserStats(handle2);
    const [norm1, norm2] = normalizeStats([user1Stats, user2Stats]);
    drawRadarChart(norm1, norm2, handle1, handle2);
    drawBarChart(user1Stats, user2Stats, handle1, handle2);

  } catch (error) {
    console.error(error);
    alert("Something went wrong! Check the console for details.");
  }
}
const resultsContainer = document.getElementById('results-container');

async function fetchUserStats(handle) {
  const submissionsRes = await fetch(`/api/user-submissions/${handle}`);
  const submissions = await submissionsRes.json();

  const totalContests = new Set(submissions.map(s => s.contestId)).size;
  const solved = new Set(submissions.filter(s => s.verdict === 'OK').map(s => s.problem.name)).size;
  const upsolved = submissions.filter(s => s.verdict === 'OK' && s.author.participantType !== 'CONTESTANT').length;
  const attempted = new Set(submissions.map(s => s.problem.name)).size;
  const avgDifficulty = (
    submissions
      .filter(s => s.verdict === 'OK' && s.problem.rating)
      .reduce((sum, s) => sum + s.problem.rating, 0) / 
    (submissions.filter(s => s.verdict === 'OK' && s.problem.rating).length || 1)
  ).toFixed(1);

  const upsolveRatio = (upsolved / (solved || 1)).toFixed(2);

  return {
    contests: totalContests,
    solved,
    upsolveRatio: parseFloat(upsolveRatio),
    avgDifficulty: parseFloat(avgDifficulty)
  };
}
function normalizeStats(statsArray) {
  const keys = ['contests', 'solved', 'upsolveRatio', 'avgDifficulty'];
  const mins = {}, maxs = {};
  
  keys.forEach(key => {
    mins[key] = Math.min(...statsArray.map(stat => stat[key]));
    maxs[key] = Math.max(...statsArray.map(stat => stat[key]));
  });

  return statsArray.map(stat => {
    const normalized = {};
    keys.forEach(key => {
      if (maxs[key] === mins[key]) {
        normalized[key] = 5; // avoid division by 0 – give mid score
      } else {
        normalized[key] = ((stat[key] - mins[key]) / (maxs[key] - mins[key])) * 10;
      }
    });
    return normalized;
  });
}
async function drawRadarChart(handle1Stats, handle2Stats, handle1, handle2) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  if (window.radarChartInstance) {
    window.radarChartInstance.destroy();
  }

  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Contests', 'Solved', 'Upsolve Ratio', 'Avg Difficulty'],
      datasets: [
        {
          label: handle1,
          data: [
            handle1Stats.contests,
            handle1Stats.solved,
            handle1Stats.upsolveRatio,
            handle1Stats.avgDifficulty
          ],
          fill: true,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgb(255, 99, 132)'
        },
        {
          label: handle2,
          data: [
            handle2Stats.contests,
            handle2Stats.solved,
            handle2Stats.upsolveRatio,
            handle2Stats.avgDifficulty
          ],
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          angleLines: { color: '#444' },
          grid: { color: '#333' },
          pointLabels: { color: '#ccc' },
          ticks: {
            backdropColor: 'transparent',
            color: '#aaa'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#fff'
          }
        }
      }
    }
  });
}
function drawBarChart(stats1, stats2, handle1, handle2) {
  const chartConfigs = [
    {
      id: 'barChart-solved',
      label: 'Solved Problems',
      data1: stats1.solved,
      data2: stats2.solved,
      yLabel: 'Problems Solved'
    },
    {
      id: 'barChart-contests',
      label: 'Contests Participated',
      data1: stats1.contests,  // <-- fixed here
      data2: stats2.contests,  // <-- and here
      yLabel: 'Contests'
    },
    {
      id: 'barChart-avgDifficulty',
      label: 'Average Difficulty',
      data1: stats1.avgDifficulty,
      data2: stats2.avgDifficulty,
      yLabel: 'Difficulty'
    },
    {
      id: 'barChart-upsolveRatio',
      label: 'Upsolve Ratio',
      data1: stats1.upsolveRatio,
      data2: stats2.upsolveRatio,
      yLabel: 'Ratio'
    }
  ];

  if (!window.barChartInstances) window.barChartInstances = {};
  for (let chart of chartConfigs) {
    if (window.barChartInstances[chart.id]) {
      window.barChartInstances[chart.id].destroy();
    }
  }

  chartConfigs.forEach(chart => {
    const ctx = document.getElementById(chart.id).getContext('2d');
    const chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [handle1, handle2],
        datasets: [{
          label: chart.label,
          data: [chart.data1, chart.data2],
          backgroundColor: ['rgba(0, 200, 255, 0.7)', 'rgba(255, 100, 100, 0.7)']
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: chart.yLabel,
              color: '#fff'
            },
            ticks: { color: '#fff' }
          },
          x: {
            ticks: { color: '#fff' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    window.barChartInstances[chart.id] = chartInstance;
  });
}





