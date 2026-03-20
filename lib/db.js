import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'users.json');

export function getUsers() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export function saveUsers(users) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

export function getUserBalance(userId) {
  const users = getUsers();
  return users[userId]?.balance || 0;
}

export function updateUserBalance(userId, newBalance) {
  const users = getUsers();
  users[userId] = { ...users[userId], balance: newBalance };
  saveUsers(users);
}

export function createUser(userId, initialBalance = 1000) {
  const users = getUsers();
  users[userId] = { 
    balance: initialBalance, 
    betHistory: [] 
  };
  saveUsers(users);
}

export function addBetToHistory(userId, bet) {
  const users = getUsers();
  if (!users[userId]) {
    createUser(userId);
  }
  
  if (!users[userId].betHistory) {
    users[userId].betHistory = [];
  }
  
  const betWithUser = {
    ...bet,
    userId,
    timestamp: new Date().toISOString()
  };
  
  users[userId].betHistory.push(betWithUser);
  
  // Keep only the last 100 bets to prevent database from growing too large
  if (users[userId].betHistory.length > 100) {
    users[userId].betHistory = users[userId].betHistory.slice(-100);
  }
  
  saveUsers(users);
}

export function getUserBetHistory(userId) {
  const users = getUsers();
  return users[userId]?.betHistory || [];
}
