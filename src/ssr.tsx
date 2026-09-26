/// <reference types="@tanstack/start/server" />
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { createRouter } from './router';

import { getRouter } from "./router";
export default createStartHandler({
  createRouter: getRouter,
  getRouterManifest: () => ({}),
})(defaultStreamHandler);
