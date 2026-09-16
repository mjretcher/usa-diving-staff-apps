/* Server entry for the 2026-structure model. The model itself lives in
   shared/jc/model-2026.js so the in-app report runs the same code. */
import './_boundary-money.js'; // configures the server runtime
export { compute2026BaselineWithNationals } from '../shared/jc/model-2026.js';
