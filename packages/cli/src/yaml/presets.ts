/**
 * Maven coordinate presets for YAML build files.
 * Reference in maven-dep tasks with `preset: junit5` etc.
 */
export const MAVEN_PRESETS: Record<string, string[]> = {
  junit4: [
    "junit:junit:4.13.2",
    "org.hamcrest:hamcrest-core:2.2",
  ],
  junit5: [
    "org.junit.jupiter:junit-jupiter-api:5.10.2",
    "org.junit.jupiter:junit-jupiter-engine:5.10.2",
    "org.junit.platform:junit-platform-launcher:1.10.2",
    "org.junit.platform:junit-platform-console:1.10.2",
    "org.junit.platform:junit-platform-commons:1.10.2",
    "org.junit.platform:junit-platform-engine:1.10.2",
    "org.junit.platform:junit-platform-reporting:1.10.2",
    "org.opentest4j:opentest4j:1.3.0",
    "org.apiguardian:apiguardian-api:1.1.2",
  ],
};

/**
 * Maven repository aliases for YAML build files.
 */
export const MAVEN_REPOS: Record<string, string> = {
  central: "https://repo1.maven.org/maven2",
  google: "https://maven.google.com",
  jcenter: "https://jcenter.bintray.com",
  gradle: "https://plugins.gradle.org/m2",
  spring: "https://repo.spring.io/release",
  jboss: "https://repository.jboss.org/nexus/content/groups/public",
};
