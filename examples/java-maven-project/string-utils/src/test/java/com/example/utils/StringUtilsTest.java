package com.example.utils;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class demonstrating JUnit 5 testing with Maven conventions.
 */
public class StringUtilsTest {

    @Test
    public void testReverse() {
        assertEquals("olleh", StringUtils.reverse("hello"));
        assertEquals("", StringUtils.reverse(""));
        assertNull(StringUtils.reverse(null));
    }

    @Test
    public void testIsPalindrome() {
        assertTrue(StringUtils.isPalindrome("racecar"));
        assertTrue(StringUtils.isPalindrome("A man a plan a canal Panama"));
        assertFalse(StringUtils.isPalindrome("hello"));
        assertFalse(StringUtils.isPalindrome(null));
    }

    @Test
    public void testCapitalizeWords() {
        assertEquals("Hello World", StringUtils.capitalizeWords("hello world"));
        assertEquals("Java Programming", StringUtils.capitalizeWords("JAVA PROGRAMMING"));
        assertEquals("", StringUtils.capitalizeWords(""));
        assertNull(StringUtils.capitalizeWords(null));
    }

    @Test
    public void testCountWords() {
        assertEquals(3, StringUtils.countWords("hello world test"));
        assertEquals(1, StringUtils.countWords("hello"));
        assertEquals(0, StringUtils.countWords(""));
        assertEquals(0, StringUtils.countWords(null));
        assertEquals(3, StringUtils.countWords("  multiple   spaces   here  "));
    }
}
