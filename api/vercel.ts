import { handle } from '@hono/node-server/vercel'
import app from './boot'

// Export the Hono app wrapped in Vercel's serverless handler
export default handle(app)