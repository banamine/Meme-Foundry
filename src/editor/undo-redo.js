// At the top of the file, ADD:
import { EventEmitter } from '@/utils/event-emitter.js';

// CHANGE the class declaration:
// FROM:
class UndoRedo {
  constructor(state) {
    this.logger = new Logger('UndoRedo');
    // ...

// TO:
class UndoRedo extends EventEmitter {
  constructor(state) {
    super(); // MUST call super() first
    this.logger = new Logger('UndoRedo');
    // ... rest of constructor