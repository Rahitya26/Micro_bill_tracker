/**
 * Financial Analytics, Habit Tracking, Predictive Projections, and Smart Tips
 */

function calculateAnalytics(transactions = [], monthlyBudget = 25000, userSettings = {}) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();
    
    // Days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay);

    // Filter current month transactions
    const thisMonthTransactions = transactions.filter(t => {
        const d = new Date(t.transaction_time);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const debits = thisMonthTransactions.filter(t => t.type === 'DEBIT');
    const credits = thisMonthTransactions.filter(t => t.type === 'CREDIT');

    const totalSpentMonth = debits.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
    const totalReceivedMonth = credits.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
    const netSpent = totalSpentMonth - totalReceivedMonth;

    // Run-rate and Projected Month-End Spend
    const dailyAverage = currentDay > 0 ? (totalSpentMonth / currentDay) : 0;
    const projectedSpend = dailyAverage * totalDaysInMonth;
    const budgetVariance = projectedSpend - monthlyBudget;
    const budgetBurnPercent = monthlyBudget > 0 ? ((totalSpentMonth / monthlyBudget) * 100) : 0;
    const projectedBurnPercent = monthlyBudget > 0 ? ((projectedSpend / monthlyBudget) * 100) : 0;

    // Safe daily target for remaining days to hit exact budget
    const remainingBudget = monthlyBudget - totalSpentMonth;
    const recommendedDailyBudget = remainingBudget > 0 ? (remainingBudget / daysRemaining) : 0;

    let projectionStatus = 'ON_TRACK';
    if (projectedBurnPercent > 120) {
        projectionStatus = 'CRITICAL_OVERSPEND';
    } else if (projectedBurnPercent > 100) {
        projectionStatus = 'PROJECTED_OVERSPEND';
    } else if (projectedBurnPercent > 85) {
        projectionStatus = 'NEAR_LIMIT';
    } else {
        projectionStatus = 'ON_TRACK';
    }

    // Category Breakdown
    const categoryMap = {};
    debits.forEach(t => {
        const cat = t.category || 'Others & General';
        if (!categoryMap[cat]) {
            categoryMap[cat] = { category: cat, total: 0, count: 0 };
        }
        categoryMap[cat].total += parseFloat(t.amount || 0);
        categoryMap[cat].count += 1;
    });

    const categoryBreakdown = Object.values(categoryMap).map(c => ({
        category: c.category,
        total: Math.round(c.total * 100) / 100,
        count: c.count,
        percentage: totalSpentMonth > 0 ? Math.round((c.total / totalSpentMonth) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // Top Merchants
    const merchantMap = {};
    debits.forEach(t => {
        const m = t.merchant_name || 'UPI Merchant';
        if (!merchantMap[m]) {
            merchantMap[m] = { merchant: m, total: 0, count: 0, category: t.category };
        }
        merchantMap[m].total += parseFloat(t.amount || 0);
        merchantMap[m].count += 1;
    });
    const topMerchants = Object.values(merchantMap)
        .map(m => ({
            merchant: m.merchant,
            merchant_name: m.merchant,
            total: Math.round(m.total * 100) / 100,
            count: m.count,
            category: m.category
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 7);

    // Time of Day Analysis
    const timeSlots = {
        morning: { label: 'Morning (6 AM - 12 PM)', total: 0, count: 0 },
        afternoon: { label: 'Afternoon (12 PM - 5 PM)', total: 0, count: 0 },
        evening: { label: 'Evening (5 PM - 9 PM)', total: 0, count: 0 },
        night: { label: 'Night (9 PM - 6 AM)', total: 0, count: 0 }
    };

    debits.forEach(t => {
        const hour = new Date(t.transaction_time).getHours();
        const amt = parseFloat(t.amount || 0);
        if (hour >= 6 && hour < 12) {
            timeSlots.morning.total += amt;
            timeSlots.morning.count++;
        } else if (hour >= 12 && hour < 17) {
            timeSlots.afternoon.total += amt;
            timeSlots.afternoon.count++;
        } else if (hour >= 17 && hour < 21) {
            timeSlots.evening.total += amt;
            timeSlots.evening.count++;
        } else {
            timeSlots.night.total += amt;
            timeSlots.night.count++;
        }
    });

    // Weekday vs Weekend Analysis & Day-of-Week Breakdown
    let weekdayTotal = 0;
    let weekdayDaysCount = 0;
    let weekendTotal = 0;
    let weekendDaysCount = 0;

    for (let day = 1; day <= currentDay; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
        if (isWeekend) weekendDaysCount++;
        else weekdayDaysCount++;
    }

    const dayOfWeekMap = {
        1: { day: 'Mon', total: 0, count: 0 },
        2: { day: 'Tue', total: 0, count: 0 },
        3: { day: 'Wed', total: 0, count: 0 },
        4: { day: 'Thu', total: 0, count: 0 },
        5: { day: 'Fri', total: 0, count: 0 },
        6: { day: 'Sat', total: 0, count: 0 },
        0: { day: 'Sun', total: 0, count: 0 }
    };

    debits.forEach(t => {
        const d = new Date(t.transaction_time);
        const dayOfWeek = d.getDay();
        const amt = parseFloat(t.amount || 0);
        
        if (dayOfWeekMap[dayOfWeek]) {
            dayOfWeekMap[dayOfWeek].total += amt;
            dayOfWeekMap[dayOfWeek].count++;
        }

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendTotal += amt;
        } else {
            weekdayTotal += amt;
        }
    });

    const weekdayAvg = weekdayDaysCount > 0 ? (weekdayTotal / weekdayDaysCount) : 0;
    const weekendAvg = weekendDaysCount > 0 ? (weekendTotal / weekendDaysCount) : 0;
    const weekendMultiplier = weekdayAvg > 0 ? (weekendAvg / weekdayAvg) : 1;

    // Day of Week array ordered Mon -> Sun
    const dayOfWeekBreakdown = [1, 2, 3, 4, 5, 6, 0].map(dayIdx => ({
        day: dayOfWeekMap[dayIdx].day,
        total: Math.round(dayOfWeekMap[dayIdx].total),
        count: dayOfWeekMap[dayIdx].count
    }));

    let peakDay = dayOfWeekBreakdown[0];
    dayOfWeekBreakdown.forEach(d => {
        if (d.total > peakDay.total) peakDay = d;
    });

    // Micro-transactions (< ₹100 small UPI scans)
    const microTransactions = debits.filter(t => parseFloat(t.amount) <= 100);
    const microTotal = microTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // Micro-Spend Split: Commute vs Impulse Snacks
    const commuteRegex = /metro|hyderabad metro|hmrl|dmrc|mmts|railway|irctc|uber|ola|rapido|auto|rickshaw|driver|yulu|bounce|fastag|toll|parking|fuel|petrol|hpcl|bpcl|iocl/i;
    const isCommute = (t) => {
        if (t.category === 'Travel & Commute') return true;
        const m = ((t.merchant_name || '') + ' ' + (t.description || ''));
        return commuteRegex.test(m);
    };

    const microCommute = [];
    const microSnacks = [];

    microTransactions.forEach(t => {
        if (isCommute(t)) {
            microCommute.push(t);
        } else {
            microSnacks.push(t);
        }
    });

    const commuteTotal = microCommute.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
    const snacksTotal = microSnacks.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

    // Today's Pocket Money Envelope (Default ₹150/day limit for non-commute snacks)
    const todayStart = new Date(currentYear, currentMonth, currentDay, 0, 0, 0);
    const todaySnacks = microSnacks.filter(t => new Date(t.transaction_time) >= todayStart);
    const todaySnacksSpent = todaySnacks.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

    const pocketDailyLimit = 150;
    const pocketRemainingToday = Math.max(0, pocketDailyLimit - todaySnacksSpent);
    const pocketSpentPercent = Math.min(100, Math.round((todaySnacksSpent / pocketDailyLimit) * 100));
    const pocketStatus = todaySnacksSpent > pocketDailyLimit ? 'EXCEEDED' : todaySnacksSpent > (pocketDailyLimit * 0.8) ? 'NEAR_LIMIT' : 'HEALTHY';

    // Compounding SIP & Wishlist Reality Check
    const projectedMonthlySnacks = currentDay > 0 ? (snacksTotal / currentDay) * totalDaysInMonth : snacksTotal;
    const monthlyRate = 0.01; // 12% p.a. / 12 months
    const months3Yr = 36;
    const sipFutureValue3Yr = projectedMonthlySnacks > 0
        ? projectedMonthlySnacks * ((Math.pow(1 + monthlyRate, months3Yr) - 1) / monthlyRate) * (1 + monthlyRate)
        : 0;

    const wishlistGoalName = (userSettings && userSettings.wishlist_name) ? userSettings.wishlist_name : "Goa Flight / Weekend Trip";
    const wishlistGoalTarget = (userSettings && userSettings.wishlist_target) ? parseFloat(userSettings.wishlist_target) : 6000;
    const wishlistPercentFunded = wishlistGoalTarget > 0 ? Math.min(100, Math.round((snacksTotal / wishlistGoalTarget) * 100)) : 0;

    // Daily Spend Timeline for Charts
    const dailySpendMap = {};
    for (let i = 1; i <= totalDaysInMonth; i++) {
        dailySpendMap[i] = 0;
    }
    debits.forEach(t => {
        const d = new Date(t.transaction_time);
        const dayNum = d.getDate();
        dailySpendMap[dayNum] = (dailySpendMap[dayNum] || 0) + parseFloat(t.amount || 0);
    });

    // Month-over-Month (MoM) Cumulative Spend Trajectory
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const totalDaysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    const prevMonthTransactions = transactions.filter(t => {
        const d = new Date(t.transaction_time);
        return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });
    const prevDebits = prevMonthTransactions.filter(t => t.type === 'DEBIT');

    const prevDailySpendMap = {};
    for (let i = 1; i <= totalDaysInPrevMonth; i++) {
        prevDailySpendMap[i] = 0;
    }
    prevDebits.forEach(t => {
        const day = new Date(t.transaction_time).getDate();
        prevDailySpendMap[day] = (prevDailySpendMap[day] || 0) + parseFloat(t.amount || 0);
    });

    const currentMonthCumulative = [];
    let currCum = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
        if (day <= currentDay) {
            currCum += (dailySpendMap[day] || 0);
            currentMonthCumulative.push(Math.round(currCum));
        } else {
            currentMonthCumulative.push(null);
        }
    }

    const prevMonthCumulative = [];
    let prevCum = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
        if (day <= totalDaysInPrevMonth) {
            prevCum += (prevDailySpendMap[day] || 0);
            prevMonthCumulative.push(Math.round(prevCum));
        } else {
            prevMonthCumulative.push(Math.round(prevCum));
        }
    }

    const currSpentSoFar = currentMonthCumulative[currentDay - 1] || 0;
    const prevSpentAtSameDay = prevMonthCumulative[currentDay - 1] || 0;
    const momDiff = currSpentSoFar - prevSpentAtSameDay;
    const momPercentDiff = prevSpentAtSameDay > 0
        ? Math.round((momDiff / prevSpentAtSameDay) * 100)
        : 0;

    // Recurring / Subscription candidates
    const merchantCounts = {};
    transactions.forEach(t => {
        if (t.type === 'DEBIT') {
            const m = t.merchant_name || 'UPI Merchant';
            merchantCounts[m] = (merchantCounts[m] || 0) + 1;
        }
    });
    const recurringCandidates = topMerchants.filter(m => 
        m.count >= 2 && /netflix|spotify|prime|gym|cult|broadband|wifi|bescom|jio|airtel|rent/i.test(m.merchant)
    );

    // Generate Smart Tips & Insights
    const tips = [];

    // Tip 1: Run-rate & Projection Tip
    if (projectedSpend > monthlyBudget) {
        tips.push({
            type: 'warning',
            icon: 'trending-up',
            title: 'Budget Overrun Warning',
            message: `At your current rate of ₹${Math.round(dailyAverage)}/day, you will spend ~₹${Math.round(projectedSpend)} this month (₹${Math.round(budgetVariance)} above your ₹${monthlyBudget} budget).`,
            action: `You have ₹${Math.max(0, Math.round(remainingBudget))} remaining of your monthly budget for the next ${daysRemaining} days. Consider slowing down discretionary spends.`
        });
    } else {
        tips.push({
            type: 'success',
            icon: 'shield-check',
            title: 'Pacing Under Budget',
            message: `Great job! Your projected spend is ₹${Math.round(projectedSpend)}, comfortably under your ₹${monthlyBudget} budget with ₹${Math.round(Math.abs(budgetVariance))} estimated surplus.`,
            action: `You have ₹${Math.round(remainingBudget)} unspent budget remaining for the next ${daysRemaining} days.`
        });
    }

    // Tip 2: Micro-Spend Snack Reality
    if (microSnacks.length >= 5) {
        tips.push({
            type: 'info',
            icon: 'coffee',
            title: 'Snack & Coffee Leak',
            message: `You spent ₹${Math.round(snacksTotal)} on ${microSnacks.length} discretionary micro-taps (< ₹100), excluding your essential commute.`,
            action: `Investing this into a 12% SIP would yield ~₹${Math.round(sipFutureValue3Yr).toLocaleString('en-IN')} in 3 years!`
        });
    }

    // Tip 3: Weekend surge
    if (weekendMultiplier > 1.35) {
        tips.push({
            type: 'warning',
            icon: 'calendar',
            title: 'Weekend Surge Alert',
            message: `You spend ${Math.round((weekendMultiplier - 1) * 100)}% more per day on weekends (₹${Math.round(weekendAvg)}/day) compared to weekdays (₹${Math.round(weekdayAvg)}/day). Peak day: ${peakDay.day}.`,
            action: `Pre-allocating a weekend pocket budget before Friday evening helps keep discretionary surges controlled.`
        });
    }

    // Tip 4: Top Category Domination
    if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentage > 35) {
        const topCat = categoryBreakdown[0];
        tips.push({
            type: 'info',
            icon: 'pie-chart',
            title: `${topCat.category} Dominates Expenses`,
            message: `${topCat.category} makes up ${topCat.percentage}% (₹${Math.round(topCat.total)}) of your total spending this month.`,
            action: `Trimming just 15% from this single category would pocket you ~₹${Math.round(topCat.total * 0.15)} in savings.`
        });
    }

    // Tip 5: Night-time impulse spend
    if (timeSlots.night.total > (totalSpentMonth * 0.2) && timeSlots.night.count >= 3) {
        tips.push({
            type: 'warning',
            icon: 'moon',
            title: 'Night-Time Spending Spike',
            message: `₹${Math.round(timeSlots.night.total)} was spent late at night (9 PM - 6 AM), largely on food deliveries or impulse orders.`,
            action: `Sleep on purchases after 10 PM. Keeping ready snacks at home helps avoid late-night delivery surges.`
        });
    }

    return {
        summary: {
            totalSpentMonth: Math.round(totalSpentMonth * 100) / 100,
            totalReceivedMonth: Math.round(totalReceivedMonth * 100) / 100,
            netSpent: Math.round(netSpent * 100) / 100,
            monthlyBudget: monthlyBudget,
            dailyAverage: Math.round(dailyAverage * 100) / 100,
            projectedSpend: Math.round(projectedSpend * 100) / 100,
            budgetVariance: Math.round(budgetVariance * 100) / 100,
            budgetBurnPercent: Math.round(budgetBurnPercent),
            projectedBurnPercent: Math.round(projectedBurnPercent),
            projectionStatus: projectionStatus,
            remainingBudget: Math.round(remainingBudget * 100) / 100,
            recommendedDailyBudget: Math.round(recommendedDailyBudget * 100) / 100,
            daysRemaining: daysRemaining,
            currentDay: currentDay,
            totalDaysInMonth: totalDaysInMonth,
            transactionCount: thisMonthTransactions.length,
            debitCount: debits.length,
            creditCount: credits.length
        },
        categoryBreakdown,
        topMerchants,
        timeSlots,
        habits: {
            weekdayAvg: Math.round(weekdayAvg),
            weekendAvg: Math.round(weekendAvg),
            weekendMultiplier: Math.round(weekendMultiplier * 10) / 10,
            dayOfWeekBreakdown,
            peakDay,
            microCount: microTransactions.length,
            microTotal: Math.round(microTotal),
            microSpends: {
                count: microTransactions.length,
                total: Math.round(microTotal),
                commute: {
                    count: microCommute.length,
                    total: Math.round(commuteTotal)
                },
                snacks: {
                    count: microSnacks.length,
                    total: Math.round(snacksTotal)
                },
                pocketMoney: {
                    dailyLimit: pocketDailyLimit,
                    todaySpent: Math.round(todaySnacksSpent),
                    todayRemaining: Math.round(pocketRemainingToday),
                    spentPercent: pocketSpentPercent,
                    status: pocketStatus
                },
                sipSwap: {
                    projectedMonthly: Math.round(projectedMonthlySnacks),
                    futureValue3Yr: Math.round(sipFutureValue3Yr),
                    wishlistName: wishlistGoalName,
                    wishlistTarget: wishlistGoalTarget,
                    wishlistPercent: wishlistPercentFunded
                }
            },
            momTrajectory: {
                currentMonthCumulative,
                prevMonthCumulative,
                currSpentSoFar,
                prevSpentAtSameDay,
                momDiff: Math.round(momDiff),
                momPercentDiff,
                currentDay,
                monthNames: {
                    current: now.toLocaleString('en-IN', { month: 'short' }),
                    prev: prevMonthDate.toLocaleString('en-IN', { month: 'short' })
                }
            },
            recurring: recurringCandidates
        },
        dailySpendMap,
        tips
    };
}

module.exports = {
    calculateAnalytics
};
