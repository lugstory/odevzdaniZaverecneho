import { getUserBalance, updateUserBalance, createUser } from '../../lib/db';

export default function handler(req, res) {
  // Disable caching for this API endpoint
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const { method } = req;

  switch (method) {
    case 'GET':
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      let balance = getUserBalance(userId);
      if (balance === 0 && userId !== '0') { // Don't create user '0'
        createUser(userId);
        balance = 1000;
      }
      res.status(200).json({ balance, userId });

      break;

    case 'POST':
      const { userId: postUserId, amount } = req.body;
      if (!postUserId || amount === undefined) {
        return res.status(400).json({ error: 'userId and amount are required' });
      }

      let currentBalance = getUserBalance(postUserId);
      if (currentBalance === 0 && postUserId !== '0') { // Don't create user '0'
        createUser(postUserId);
        currentBalance = 1000;
      }

      const newBalance = currentBalance + parseFloat(amount);
      updateUserBalance(postUserId, newBalance);

      res.status(200).json({ balance: newBalance, userId: postUserId });
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
