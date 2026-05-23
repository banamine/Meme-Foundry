// At the top of the file, ADD:
import { EventEmitter } from '@/utils/event-emitter.js';

// CHANGE the class declaration:
// FROM:
class DragSystem {
  constructor() {
    this.logger = new Logger('DragSystem');
    // ...

// TO:
class DragSystem extends EventEmitter {
  constructor() {
    super(); // MUST call super() first
    this.logger = new Logger('DragSystem');
    // ... rest of constructor