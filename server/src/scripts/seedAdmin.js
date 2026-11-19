// Creates (or promotes) an active admin account.
// Usage: npm run seed:admin -- <email> <password> [name]
import mongoose from 'mongoose';
import { config } from '../config.js';
import { ROLE, STATUS } from '../constants.js';
import { User } from '../models/User.js';

const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run seed:admin -- <email> <password (min 8 chars)> [name]');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
let user = await User.findOne({ email: email.toLowerCase() });
if (user) {
  user.role = ROLE.ADMIN;
  user.status = STATUS.ACTIVE;
  user.password = password;
} else {
  user = new User({ name, email, password, role: ROLE.ADMIN, status: STATUS.ACTIVE });
}
await user.save();
console.log(`Admin ready: ${user.email}`);
await mongoose.disconnect();
