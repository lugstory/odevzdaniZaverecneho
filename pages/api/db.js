import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'users.json');

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      const { userId, action } = req.query;
      
      if (action === 'balance') {
        try {
          const data = fs.readFileSync(DB_FILE, 'utf8');
          const users = JSON.parse(data);
          const balance = users[userId]?.balance || 0;
          res.status(200).json({ balance });
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      } else if (action === 'history') {
        try {
          const data = fs.readFileSync(DB_FILE, 'utf8');
          const users = JSON.parse(data);
          const history = users[userId]?.betHistory || [];
          res.status(200).json({ history });
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      } else if (action === 'all') {
        try {
          const data = fs.readFileSync(DB_FILE, 'utf8');
          const users = JSON.parse(data);
          // Convert users object to array and sort by balance
          const usersArray = Object.entries(users).map(([userId, userData]) => ({
            userId,
            balance: userData.balance || 0
          })).sort((a, b) => b.balance - a.balance);
          
          res.status(200).json({ users: usersArray });
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
      break;

    case 'POST':
      const { userId: postUserId, action: postAction, ...data } = req.body;
      
      try {
        const fileData = fs.readFileSync(DB_FILE, 'utf8');
        const users = JSON.parse(fileData);
        
        if (!users[postUserId]) {
          users[postUserId] = { balance: 1000, betHistory: [] };
        }
        
        if (postAction === 'balance') {
          const amount = parseFloat(data.amount);
          const currentBalance = users[postUserId].balance || 0;
          const newBalance = currentBalance + amount;
          users[postUserId].balance = newBalance;
        } else if (postAction === 'bet') {
          if (!users[postUserId].betHistory) {
            users[postUserId].betHistory = [];
          }
          users[postUserId].betHistory.push({
            ...data.bet,
            userId: postUserId,
            timestamp: new Date().toISOString()
          });
          
          // Keep only the last 100 bets
          if (users[postUserId].betHistory.length > 100) {
            users[postUserId].betHistory = users[postUserId].betHistory.slice(-100);
          }
        }
        
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating database:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
