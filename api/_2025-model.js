/* Server entry for the 2025-structure model. The model itself lives in
   shared/jc/model-2025.js so the in-app report runs the same code. */
import './_boundary-money.js'; // configures the server runtime
export { compute2025Model } from '../shared/jc/model-2025.js';
