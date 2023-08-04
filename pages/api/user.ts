import { withIronSessionApiRoute } from 'iron-session/next';
import { sessionOptions } from '../../lib/session';
import { NextApiRequest, NextApiResponse } from 'next';

// ref: https://github.com/vercel/next.js/blob/canary/examples/with-iron-session/lib/session.ts

export type User = {
  id: string;
  isLoggedIn: boolean;
};

async function userRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  if (req.session.user) {
    res.json({
      ...req.session.user,
      isLoggedIn: true,
    });
  } else {
    res.json({
      id: '',
      isLoggedIn: false,
    });
  }
}

export default withIronSessionApiRoute(userRoute, sessionOptions);
