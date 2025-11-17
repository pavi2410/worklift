package com.example.app;

import com.example.lib.StringUtils;

/**
 * Main application that demonstrates using the StringUtils library.
 * This shows how one project can depend on another in Worklift.
 */
public class Main {

    public static void main(String[] args) {
        System.out.println("=== String Utils Library Demo ===\n");

        // Test reverse
        String text = "Hello, Worklift!";
        System.out.println("Original text: " + text);
        System.out.println("Reversed: " + StringUtils.reverse(text));
        System.out.println();

        // Test capitalize words
        String sentence = "hello world from worklift";
        System.out.println("Original: " + sentence);
        System.out.println("Capitalized: " + StringUtils.capitalizeWords(sentence));
        System.out.println();

        // Test vowel counting
        String phrase = "Worklift is a modern build system";
        System.out.println("Text: " + phrase);
        System.out.println("Vowel count: " + StringUtils.countVowels(phrase));
        System.out.println();

        // Test palindrome
        String palindrome = "A man a plan a canal Panama";
        System.out.println("Text: " + palindrome);
        System.out.println("Is palindrome: " + StringUtils.isPalindrome(palindrome));
        System.out.println();

        String notPalindrome = "Worklift";
        System.out.println("Text: " + notPalindrome);
        System.out.println("Is palindrome: " + StringUtils.isPalindrome(notPalindrome));
    }
}
