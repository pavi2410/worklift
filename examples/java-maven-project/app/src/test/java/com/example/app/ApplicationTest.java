package com.example.app;

import com.example.utils.StringUtils;
import org.junit.jupiter.api.Test;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class demonstrating:
 * - Testing with JUnit 5
 * - Using library module in tests
 * - Using Maven dependencies in tests
 */
public class ApplicationTest {

    @Test
    public void testStringUtilsIntegration() {
        String text = "hello world";
        String capitalized = StringUtils.capitalizeWords(text);

        assertEquals("Hello World", capitalized);
        assertNotNull(StringUtils.reverse(text));
        assertTrue(StringUtils.countWords(text) > 0);
    }

    @Test
    public void testJSONIntegration() {
        // Test that we can use org.json in tests too
        JSONObject json = new JSONObject();
        json.put("message", "test");
        json.put("count", 42);

        assertEquals("test", json.getString("message"));
        assertEquals(42, json.getInt("count"));
        assertTrue(json.has("message"));
    }

    @Test
    public void testCombinedFunctionality() {
        String input = "test string";
        String reversed = StringUtils.reverse(input);

        JSONObject result = new JSONObject();
        result.put("original", input);
        result.put("reversed", reversed);
        result.put("wordCount", StringUtils.countWords(input));

        assertEquals(input, result.getString("original"));
        assertEquals(reversed, result.getString("reversed"));
        assertEquals(2, result.getInt("wordCount"));
    }
}
