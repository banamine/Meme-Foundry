// At the top of the file, ADD:
import { EventEmitter } from '@/utils/event-emitter.js';

// CHANGE the class declaration:
// FROM:
class Autosave {
  constructor(state) {
    this.logger = new Logger('Autosave');
    // ...

// TO:
class Autosave extends EventEmitter {
  constructor(state) {
    super(); // MUST call super() first
    this.logger = new Logger('Autosave');
    // ... rest of constructor