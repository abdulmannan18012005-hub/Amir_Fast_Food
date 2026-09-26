import { createServerAdapter } from '@whatwg-node/server';
import handler from '../dist/server/server.js';

export default createServerAdapter(async (request) => {
  return handler.fetch(request);
});
