const brain = require('brain.js');

// Create a new neural network
const net = new brain.NeuralNetwork({
  hiddenLayers: [4],
  activation: 'sigmoid',
});

// Generate training data based on attendance patterns
const generateTrainingData = () => {
  return [
    // Critical risk - below 50% attendance (At Risk)
    { input: { attendanceRate: 0.1, punctualityScore: 0.2, streakScore: 0.1 }, output: { risk: 0.99 } },
    { input: { attendanceRate: 0.2, punctualityScore: 0.3, streakScore: 0.2 }, output: { risk: 0.95 } },
    { input: { attendanceRate: 0.3, punctualityScore: 0.2, streakScore: 0.2 }, output: { risk: 0.90 } },
    { input: { attendanceRate: 0.4, punctualityScore: 0.3, streakScore: 0.3 }, output: { risk: 0.85 } },
    { input: { attendanceRate: 0.5, punctualityScore: 0.4, streakScore: 0.4 }, output: { risk: 0.80 } },
    // High risk - 50% to 60% attendance (At Risk)
    { input: { attendanceRate: 0.52, punctualityScore: 0.45, streakScore: 0.42 }, output: { risk: 0.78 } },
    { input: { attendanceRate: 0.55, punctualityScore: 0.5, streakScore: 0.45 }, output: { risk: 0.75 } },
    { input: { attendanceRate: 0.58, punctualityScore: 0.5, streakScore: 0.48 }, output: { risk: 0.72 } },
    { input: { attendanceRate: 0.60, punctualityScore: 0.55, streakScore: 0.5 }, output: { risk: 0.68 } },
    // Warning zone - 60% to 75% attendance
    { input: { attendanceRate: 0.62, punctualityScore: 0.58, streakScore: 0.55 }, output: { risk: 0.62 } },
    { input: { attendanceRate: 0.65, punctualityScore: 0.6, streakScore: 0.58 }, output: { risk: 0.58 } },
    { input: { attendanceRate: 0.68, punctualityScore: 0.62, streakScore: 0.60 }, output: { risk: 0.55 } },
    { input: { attendanceRate: 0.70, punctualityScore: 0.65, streakScore: 0.62 }, output: { risk: 0.52 } },
    { input: { attendanceRate: 0.72, punctualityScore: 0.68, streakScore: 0.65 }, output: { risk: 0.50 } },
    { input: { attendanceRate: 0.74, punctualityScore: 0.70, streakScore: 0.68 }, output: { risk: 0.47 } },
    // Safe zone - 75% and above (On Track)
    { input: { attendanceRate: 0.75, punctualityScore: 0.72, streakScore: 0.70 }, output: { risk: 0.40 } },
    { input: { attendanceRate: 0.78, punctualityScore: 0.75, streakScore: 0.73 }, output: { risk: 0.35 } },
    { input: { attendanceRate: 0.80, punctualityScore: 0.78, streakScore: 0.76 }, output: { risk: 0.28 } },
    { input: { attendanceRate: 0.85, punctualityScore: 0.82, streakScore: 0.80 }, output: { risk: 0.20 } },
    { input: { attendanceRate: 0.88, punctualityScore: 0.85, streakScore: 0.83 }, output: { risk: 0.15 } },
    { input: { attendanceRate: 0.90, punctualityScore: 0.88, streakScore: 0.86 }, output: { risk: 0.10 } },
    { input: { attendanceRate: 0.95, punctualityScore: 0.92, streakScore: 0.90 }, output: { risk: 0.06 } },
    { input: { attendanceRate: 1.0, punctualityScore: 1.0, streakScore: 1.0 }, output: { risk: 0.02 } },
  ];
};

// Train the model
const trainModel = () => {
  const trainingData = generateTrainingData();
  net.train(trainingData, {
    iterations: 2000,
    errorThresh: 0.005,
    log: false,
  });
};

// Calculate risk score for a student
const calculateRiskScore = (attendanceLogs, totalSessions) => {
  if (totalSessions < 4) {
    return null; // Not enough data
  }

  const presentLogs = attendanceLogs.filter(log => log.status === 'present');
  const attendanceRate = presentLogs.length / totalSessions;

  // Calculate punctuality score
  let punctualityScore = 0;
  if (presentLogs.length > 0) {
    const punctualityScores = presentLogs.map(log => {
      if (!log.scanned_at || !log.session_start) return 0.5;
      const scanTime = new Date(log.scanned_at).getTime();
      const sessionStart = new Date(log.session_start).getTime();
      const sessionEnd = new Date(log.session_end).getTime();
      const sessionDuration = sessionEnd - sessionStart;
      const timeIntoSession = scanTime - sessionStart;
      const ratio = timeIntoSession / sessionDuration;
      return Math.max(0, 1 - ratio);
    });
    punctualityScore = punctualityScores.reduce((a, b) => a + b, 0) / punctualityScores.length;
  }

  // Calculate streak score - consistent attendance is better
  let streakScore = 0;
  if (attendanceLogs.length > 1) {
    let maxStreak = 0;
    let currentStreak = 0;
    attendanceLogs.forEach(log => {
      if (log.status === 'present') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    streakScore = maxStreak / totalSessions;
  }

  // Run prediction
  const prediction = net.run({
    attendanceRate,
    punctualityScore,
    streakScore,
  });

  return {
    riskScore: Math.round(prediction.risk * 100) / 100,
    attendanceRate: Math.round(attendanceRate * 100),
    punctualityScore: Math.round(punctualityScore * 100),
    isAtRisk: prediction.risk > 0.65,
  };
};

// Train the model when module loads
trainModel();

module.exports = { calculateRiskScore };