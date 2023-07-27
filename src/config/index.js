import { parseIntOrDefault } from "../helpers/numbers";

console.debug("process.env", process.env);
console.log("process.env", process.env);

export const PAGE_URL = `${window.location.protocol}//${window.location.hostname}`;
export const API_URL = process.env.REACT_APP_API_URL || `${PAGE_URL}:8000/`;
// export const NODE_API_URL =
//   process.env.REACT_APP_NODE_API_URL === 'http://nodejs-backend:5000/'
//     ? `${PAGE_URL}:5000/`
//     : process.env.REACT_APP_NODE_API_URL;
export const LOGIN_URL = "/login";
export const NETWORK_ID = parseIntOrDefault(
  process.env.REACT_APP_NETWORK_ID,
  51
);

// export const CURRENCY_URL = process.env.REACT_APP_CURRENCY_URL || 'https://free.currconv.com/';
// export const CURRENCY_API_KEY = process.env.REACT_APP_CURRENCY_API_KEY || '9acf77ffbce518787200';
// export const USE_TIME_IN_DAYS = process.env.REACT_APP_USE_TIME_IN_DAYS === 'true';
export { default as NETWORKS } from "./networks";
