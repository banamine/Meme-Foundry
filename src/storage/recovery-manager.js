// CHANGE THIS (if it exists):
import { EventEmitter } from '@/utils/event-emitter.js';

// ENSURE this import is at the TOP of the file:
import { EventEmitter } from '@/utils/event-emitter.js';

// And at the BOTTOM of the file, ensure mixin is applied:
Object.assign(RecoveryManager.prototype, EventEmitter.prototype);