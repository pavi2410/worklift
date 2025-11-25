/**
 * Multi-module Java project demonstrating Maven conventions with Worklift
 *
 * This example shows:
 * 1. Maven directory conventions (src/main/java, src/test/java)
 * 2. Multi-module project structure with library and application modules
 * 3. Maven dependency resolution (JUnit 5, org.json)
 * 4. Library module dependencies (app depends on string-utils)
 * 5. Comprehensive testing with JUnit 5
 * 6. Building, packaging, and running
 * 7. Modular build files linked from root
 *
 * Structure:
 *   string-utils/          - Reusable library module
 *     build.ts             - Library build configuration
 *     src/main/java/       - Library source code
 *     src/test/java/       - Library tests
 *   app/                   - Application module
 *     build.ts             - Application build configuration
 *     src/main/java/       - Application source code
 *     src/test/java/       - Application tests
 */

// Import build configurations for each module
import "./string-utils/build.ts";
import "./app/build.ts";
