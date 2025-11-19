package com.example.utils;

/**
 * String utility library demonstrating Maven library module conventions.
 * This module will be used as a dependency by the app module.
 */
public class StringUtils {

    /**
     * Reverses a string.
     * @param input the string to reverse
     * @return the reversed string
     */
    public static String reverse(String input) {
        if (input == null) {
            return null;
        }
        return new StringBuilder(input).reverse().toString();
    }

    /**
     * Checks if a string is a palindrome.
     * @param input the string to check
     * @return true if the string is a palindrome, false otherwise
     */
    public static boolean isPalindrome(String input) {
        if (input == null) {
            return false;
        }
        String cleaned = input.replaceAll("\\s+", "").toLowerCase();
        return cleaned.equals(reverse(cleaned));
    }

    /**
     * Capitalizes the first letter of each word.
     * @param input the string to capitalize
     * @return the capitalized string
     */
    public static String capitalizeWords(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        String[] words = input.split("\\s+");
        StringBuilder result = new StringBuilder();

        for (int i = 0; i < words.length; i++) {
            if (i > 0) {
                result.append(" ");
            }
            String word = words[i];
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    result.append(word.substring(1).toLowerCase());
                }
            }
        }

        return result.toString();
    }

    /**
     * Counts the number of words in a string.
     * @param input the string to count words in
     * @return the number of words
     */
    public static int countWords(String input) {
        if (input == null || input.trim().isEmpty()) {
            return 0;
        }
        return input.trim().split("\\s+").length;
    }
}
