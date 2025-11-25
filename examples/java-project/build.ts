/**
 * Multi-project Java build example
 *
 * This example demonstrates:
 * 1. Multi-project setup with dependencies
 * 2. Java compilation with JavacTask
 * 3. JAR packaging with JarTask
 * 4. Running Java applications
 * 5. Classpath management for dependent JARs
 * 6. Modular build files linked from root
 *
 * Structure:
 *   lib/                    - Reusable library module
 *     build.ts              - Library build configuration
 *     src/                  - Library source code
 *   app/                    - Application module
 *     build.ts              - Application build configuration
 *     src/                  - Application source code
 */

// Import build configurations for each module
import "./lib/build.ts";
import "./app/build.ts";
