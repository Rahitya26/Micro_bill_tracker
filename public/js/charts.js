/**
 * Charts Engine using Chart.js
 */

let dailyChartInstance = null;
let categoryChartInstance = null;
let timeSlotChartInstance = null;

// Modern palette for fintech aesthetic
const PALETTE = [
    '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', 
    '#f59e0b', '#3b82f6', '#14b8a6', '#f43f5e', '#64748b'
];

function initDailySpendChart(dailySpendMap = {}) {
    const ctx = document.getElementById('dailySpendChart');
    if (!ctx) return;

    const days = Object.keys(dailySpendMap);
    const values = Object.values(dailySpendMap);

    if (dailyChartInstance) {
        dailyChartInstance.destroy();
    }

    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    dailyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(d => `Day ${d}`),
            datasets: [{
                label: 'Spent (₹)',
                data: values,
                borderColor: '#10b981',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#10b981',
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#151c2e',
                    titleColor: '#f8fafc',
                    bodyColor: '#10b981',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => `Spent: ₹${Math.round(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { 
                        color: '#64748b',
                        font: { family: 'Inter', size: 11 },
                        callback: (v) => `₹${v}`
                    }
                }
            }
        }
    });
}

function initCategoryDonutChart(categoryBreakdown = []) {
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx) return;

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const labels = categoryBreakdown.map(c => c.category);
    const data = categoryBreakdown.map(c => c.total);

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? PALETTE : ['rgba(255, 255, 255, 0.05)'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 11 },
                        padding: 12,
                        boxWidth: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: '#151c2e',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ₹${Math.round(ctx.raw)}`
                    }
                }
            }
        }
    });
}

function initTimeSlotChart(timeSlots = {}) {
    const ctx = document.getElementById('timeSlotChart');
    if (!ctx) return;

    if (timeSlotChartInstance) {
        timeSlotChartInstance.destroy();
    }

    const labels = ['Morning (6-12)', 'Afternoon (12-17)', 'Evening (17-21)', 'Night (21-6)'];
    const data = [
        timeSlots.morning ? timeSlots.morning.total : 0,
        timeSlots.afternoon ? timeSlots.afternoon.total : 0,
        timeSlots.evening ? timeSlots.evening.total : 0,
        timeSlots.night ? timeSlots.night.total : 0
    ];

    timeSlotChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#151c2e',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => `₹${Math.round(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Inter', size: 10 },
                        callback: (v) => `₹${v}`
                    }
                }
            }
        }
    });
}

window.Charts = {
    initDailySpendChart,
    initCategoryDonutChart,
    initTimeSlotChart
};
