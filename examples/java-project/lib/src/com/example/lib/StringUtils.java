package com.example.lib;

/**
 * A simple utility library for string manipulation.
 * This demonstrates a reusable library that can be packaged as a JAR.
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
     * Capitalizes the first letter of each word in a string.
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
            if (words[i].length() > 0) {
                result.append(Character.toUpperCase(words[i].charAt(0)));
                if (words[i].length() > 1) {
                    result.append(words[i].substring(1).toLowerCase());
                }
            }
            if (i < words.length - 1) {
                result.append(" ");
            }
        }

        return result.toString();
    }

    /**
     * Counts the number of vowels in a string.
     * @param input the string to analyze
     * @return the number of vowels
     */
    public static int countVowels(String input) {
        if (input == null) {
            return 0;
        }

        int count = 0;
        String vowels = "aeiouAEIOU";

        for (char c : input.toCharArray()) {
            if (vowels.indexOf(c) != -1) {
                count++;
            }
        }

        return count;
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
}
