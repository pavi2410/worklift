package com.example.app;

import com.example.utils.StringUtils;
import org.json.JSONObject;

/**
 * Main application demonstrating:
 * - Using the string-utils library module
 * - Using external Maven dependencies (org.json:json)
 * - Maven conventions for application structure
 */
public class Application {

    public static void main(String[] args) {
        System.out.println("=== Java Maven Project Example ===\n");

        // Demonstrate using the string-utils library
        String text = "hello worklift";
        System.out.println("Original text: " + text);
        System.out.println("Capitalized: " + StringUtils.capitalizeWords(text));
        System.out.println("Reversed: " + StringUtils.reverse(text));
        System.out.println("Word count: " + StringUtils.countWords(text));

        // Test palindrome
        String palindrome = "racecar";
        System.out.println("\n'" + palindrome + "' is palindrome: " +
                         StringUtils.isPalindrome(palindrome));

        // Demonstrate using external Maven dependency (org.json)
        System.out.println("\n--- JSON Output (using org.json:json) ---");
        JSONObject json = new JSONObject();
        json.put("text", text);
        json.put("capitalized", StringUtils.capitalizeWords(text));
        json.put("reversed", StringUtils.reverse(text));
        json.put("wordCount", StringUtils.countWords(text));
        json.put("isPalindrome", StringUtils.isPalindrome(text));

        System.out.println(json.toString(2));

        System.out.println("\n✓ Application completed successfully!");
        System.out.println("This demonstrates:");
        System.out.println("  • Multi-module Maven project structure");
        System.out.println("  • Library module dependencies");
        System.out.println("  • External Maven dependencies (org.json)");
        System.out.println("  • Built with Worklift!");
    }
}
