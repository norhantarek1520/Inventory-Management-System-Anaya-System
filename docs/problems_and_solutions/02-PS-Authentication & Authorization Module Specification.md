Here is the step-by-step breakdown of why npm i bcrypt failed, what the root cause was, and how the fix resolved it.

1. The Underlying Problem (Root Cause)
   There were two hidden layers causing this error to persist even after running npm i bcrypt:

npm 11 Security Gate (Silent Build Failure):

Docker Anonymous Volume Caching (Stale State):
Your docker-compose.yml mounts node_modules as an anonymous volume. Once created, Docker reuses that old volume on container restarts. Even when local files or images updated, the running container kept mounting the old, broken node_modules directory.

2. What Was Changed (The Solution)
   Instead of adding C++ build tools (Python, make, g++) to Alpine Linux and fighting the npm 11 script approval gate, the dependency was switched to bcryptjs (a pure JavaScript implementation requiring zero native compilation or post-install scripts).

Replaced Dependency: Swapped bcrypt for bcryptjs in package.json and package-lock.json. (bcryptjs includes its own bundled TypeScript types, so @types/bcrypt was uninstalled).

Updated Import: Changed the import in src/modules/user/user.service.ts:

TypeScript
// Before
import \* as bcrypt from 'bcrypt';

// After
import \* as bcrypt from 'bcryptjs';
Flushed Stale Volumes & Rebuilt: Executed docker compose down -v to purge the cached node_modules volume (and reset the environment), followed by docker compose up -d --build to mount a clean, working dependency tree.

3. Exact Execution Steps Taken
   1
   Replaced bcrypt with bcryptjs locally
   Removed bcrypt and installed bcryptjs to update package.json and package-lock.json cleanly.

Bash
npm i bcryptjs
npm un bcrypt @types/bcrypt
2
Updated TypeScript Import
Refactored src/modules/user/user.service.ts line 13 to import bcryptjs.

3
Cleared Stale Docker Volumes
Wiped the persistent volume cache so Docker wouldn't re-use the broken node_modules state.

Bash
docker compose down -v
4
Rebuilt and Re-launched Stack
Triggered a clean Docker build and booted up the containers.

Bash
docker compose up -d --build

Verification
The NestJS application successfully compiled and initialized:

Plaintext
[Nest] LOG [NestApplication] Nest application successfully started +49ms
🚀 Server is running on http://localhost:3000
