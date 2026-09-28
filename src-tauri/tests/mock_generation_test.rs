//! Mock Generation Integration Tests
//!
//! Tests that verify the backend mock generation engine matches frontend capabilities.
//! Run with: cargo test --package flare-desktop-lib --test mock_generation_test

use flare_desktop_lib::{generate_mock_value_public as generate_mock_value, process_mock_template_public as process_mock_template};

/// Test helper to verify a mock value is not empty and matches expected format
fn assert_mock_value_valid(value: &str, rule_name: &str) {
    assert!(!value.is_empty(), "Mock value for {} should not be empty", rule_name);
    // Values should not contain template placeholders
    assert!(
        !value.contains("{{"),
        "Mock value for {} should not contain template placeholders: {}",
        rule_name,
        value
    );
}

/// Test helper to verify mock value matches expected pattern
fn assert_mock_value_matches(value: &str, pattern: &str, rule_name: &str) {
    let re = regex::Regex::new(pattern).expect("Invalid regex pattern");
    assert!(
        re.is_match(value),
        "Mock value for {} does not match pattern. Expected: {}, Got: {}",
        rule_name,
        pattern,
        value
    );
}

#[test]
fn test_mock_auto() {
    // Auto should return a non-empty string (picks from firstName pool)
    let value = generate_mock_value("auto");
    assert_mock_value_valid(&value, "auto");
}

#[test]
fn test_mock_name() {
    // Name should be two words separated by space
    let value = generate_mock_value("name");
    assert_mock_value_valid(&value, "name");
    // Names in our pool are like "James Smith", "Mary Johnson", etc.
    assert!(
        value.split_whitespace().count() >= 2,
        "Name should have at least 2 words: {}",
        value
    );
}

#[test]
fn test_mock_email() {
    // Email should contain @ and a domain
    let value = generate_mock_value("email");
    assert_mock_value_valid(&value, "email");
    assert!(
        value.contains('@'),
        "Email should contain @: {}",
        value
    );
    assert!(
        value.contains(".com") || value.contains(".org") || value.contains(".test") || value.contains(".demo"),
        "Email should have valid domain: {}",
        value
    );
}

#[test]
fn test_mock_phone() {
    // Phone format: +1-XXX-XXX-XXXX
    let value = generate_mock_value("phone");
    assert_mock_value_valid(&value, "phone");
    assert!(
        value.starts_with("+1-"),
        "Phone should start with +1-: {}",
        value
    );
}

#[test]
fn test_mock_city() {
    let value = generate_mock_value("city");
    assert_mock_value_valid(&value, "city");
    // Should be one of the cities in our pool
    let valid_cities = [
        "New York", "Los Angeles", "Chicago", "Houston",
        "Phoenix", "Philadelphia", "San Antonio", "San Diego"
    ];
    assert!(
        valid_cities.iter().any(|c| value == *c),
        "City should be from pool: {}",
        value
    );
}

#[test]
fn test_mock_country() {
    let value = generate_mock_value("country");
    assert_mock_value_valid(&value, "country");
    let valid_countries = [
        "USA", "Canada", "UK", "Germany", "France", "Japan", "Australia", "Brazil"
    ];
    assert!(
        valid_countries.iter().any(|c| value == *c),
        "Country should be from pool: {}",
        value
    );
}

#[test]
fn test_mock_company() {
    let value = generate_mock_value("company");
    assert_mock_value_valid(&value, "company");
}

#[test]
fn test_mock_price() {
    let value = generate_mock_value("price");
    assert_mock_value_valid(&value, "price");
    // Price should be a decimal number with 2 digits
    assert_mock_value_matches(&value, r"^\d+\.\d{2}$", "price");
}

#[test]
fn test_mock_address() {
    let value = generate_mock_value("address");
    assert_mock_value_valid(&value, "address");
    // Address should contain a number and street name
    assert!(
        value.split_whitespace().count() >= 2,
        "Address should have at least 2 parts: {}",
        value
    );
}

#[test]
fn test_mock_avatar() {
    let value = generate_mock_value("avatar");
    assert_mock_value_valid(&value, "avatar");
    assert!(
        value.starts_with("https://i.pravatar.cc/"),
        "Avatar should be a pravatar URL: {}",
        value
    );
}

#[test]
fn test_mock_uuid() {
    let value = generate_mock_value("uuid");
    assert_mock_value_valid(&value, "uuid");
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    assert_mock_value_matches(&value, r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "uuid");
}

#[test]
fn test_mock_url() {
    let value = generate_mock_value("url");
    assert_mock_value_valid(&value, "url");
    assert!(
        value.starts_with("https://"),
        "URL should start with https://: {}",
        value
    );
}

#[test]
fn test_mock_ipv4() {
    let value = generate_mock_value("ipv4");
    assert_mock_value_valid(&value, "ipv4");
    // IPv4 format: 4 octets separated by dots
    assert_mock_value_matches(&value, r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", "ipv4");
}

#[test]
fn test_mock_ipv6() {
    let value = generate_mock_value("ipv6");
    assert_mock_value_valid(&value, "ipv6");
    // IPv6 should contain colons
    assert!(
        value.contains(':'),
        "IPv6 should contain colons: {}",
        value
    );
}

#[test]
fn test_mock_lat() {
    let value = generate_mock_value("lat");
    assert_mock_value_valid(&value, "lat");
    // Latitude should be a decimal between -90 and 90
    assert_mock_value_matches(&value, r"^-?\d+\.\d{6}$", "lat");
    let lat: f64 = value.parse().expect("Latitude should be a number");
    assert!(
        lat >= -90.0 && lat <= 90.0,
        "Latitude should be between -90 and 90: {}",
        lat
    );
}

#[test]
fn test_mock_lng() {
    let value = generate_mock_value("lng");
    assert_mock_value_valid(&value, "lng");
    // Longitude should be a decimal between -180 and 180
    assert_mock_value_matches(&value, r"^-?\d+\.\d{6}$", "lng");
    let lng: f64 = value.parse().expect("Longitude should be a number");
    assert!(
        lng >= -180.0 && lng <= 180.0,
        "Longitude should be between -180 and 180: {}",
        lng
    );
}

#[test]
fn test_mock_zip() {
    let value = generate_mock_value("zip");
    assert_mock_value_valid(&value, "zip");
    // ZIP codes in pool: 10001, 90210, 60601, 77001, 85001, 19101
    let valid_zips = ["10001", "90210", "60601", "77001", "85001", "19101"];
    assert!(
        valid_zips.iter().any(|z| value == *z),
        "Zip should be from pool: {}",
        value
    );
}

#[test]
fn test_mock_color() {
    let value = generate_mock_value("color");
    assert_mock_value_valid(&value, "color");
    // Color should be a hex code like #FF5733
    assert_mock_value_matches(&value, r"^#[0-9A-F]{6}$", "color");
}

#[test]
fn test_mock_rating() {
    let value = generate_mock_value("rating");
    assert_mock_value_valid(&value, "rating");
    // Rating should be between 1.0 and 5.0 with 1 decimal
    assert_mock_value_matches(&value, r"^[1-5]\.\d$", "rating");
    let rating: f64 = value.parse().expect("Rating should be a number");
    assert!(
        rating >= 1.0 && rating <= 5.0,
        "Rating should be between 1.0 and 5.0: {}",
        rating
    );
}

#[test]
fn test_mock_age() {
    let value = generate_mock_value("age");
    assert_mock_value_valid(&value, "age");
    // Age should be a reasonable number (18-78 based on our formula)
    let age: i64 = value.parse().expect("Age should be a number");
    assert!(
        age >= 18 && age <= 78,
        "Age should be between 18 and 78: {}",
        age
    );
}

#[test]
fn test_mock_date() {
    let value = generate_mock_value("date");
    assert_mock_value_valid(&value, "date");
    // Date format: YYYY-MM-DD
    assert_mock_value_matches(&value, r"^\d{4}-\d{2}-\d{2}$", "date");
}

#[test]
fn test_mock_boolean() {
    let value = generate_mock_value("boolean");
    assert_mock_value_valid(&value, "boolean");
    assert!(
        value == "true" || value == "false",
        "Boolean should be 'true' or 'false': {}",
        value
    );
}

#[test]
fn test_mock_number() {
    let value = generate_mock_value("number");
    assert_mock_value_valid(&value, "number");
    // Number should be an integer
    let _: i64 = value.parse().expect("Number should be an integer");
}

#[test]
fn test_mock_sequence() {
    let value = generate_mock_value("sequence");
    assert_mock_value_valid(&value, "sequence");
    // Sequence returns "1" by default
    assert_eq!(value, "1", "Sequence should return '1': {}", value);
}

#[test]
fn test_mock_random() {
    let value = generate_mock_value("random");
    assert_mock_value_valid(&value, "random");
    // Random should be alphanumeric
    assert!(
        value.chars().all(|c| c.is_alphanumeric()),
        "Random should be alphanumeric: {}",
        value
    );
}

#[test]
fn test_mock_nullify() {
    let value = generate_mock_value("nullify");
    // Nullify returns empty string
    assert_eq!(value, "", "Nullify should return empty string");
}

#[test]
fn test_mock_timestamp() {
    let value = generate_mock_value("$timestamp");
    assert_mock_value_valid(&value, "timestamp");
    // Timestamp should be a large number (Unix milliseconds)
    let ts: i64 = value.parse().expect("Timestamp should be a number");
    assert!(
        ts > 1000000000000, // After year 2001
        "Timestamp should be Unix milliseconds: {}",
        ts
    );
}

#[test]
fn test_mock_datetime() {
    let value = generate_mock_value("$datetime");
    assert_mock_value_valid(&value, "datetime");
    // DateTime should be ISO 8601 format
    assert!(
        value.contains('T'),
        "DateTime should be ISO 8601 format: {}",
        value
    );
}

#[test]
fn test_mock_date_current() {
    let value = generate_mock_value("$date");
    assert_mock_value_valid(&value, "date");
    // Date format: YYYY-MM-DD
    assert_mock_value_matches(&value, r"^\d{4}-\d{2}-\d{2}$", "date");
}

#[test]
fn test_mock_time_current() {
    let value = generate_mock_value("$time");
    assert_mock_value_valid(&value, "time");
    // Time format: HH:MM:SS
    assert_mock_value_matches(&value, r"^\d{2}:\d{2}:\d{2}$", "time");
}

#[test]
fn test_mock_random_int() {
    let value = generate_mock_value("$randomInt");
    assert_mock_value_valid(&value, "randomInt");
    let num: i64 = value.parse().expect("RandomInt should be a number");
    assert!(
        num >= 0 && num <= 10000,
        "RandomInt should be between 0 and 10000: {}",
        num
    );
}

#[test]
fn test_mock_random_float() {
    let value = generate_mock_value("$randomFloat");
    assert_mock_value_valid(&value, "randomFloat");
    // Random float should have 2 decimal places
    assert_mock_value_matches(&value, r"^\d+\.\d{2}$", "randomFloat");
}

#[test]
fn test_mock_seq() {
    let value = generate_mock_value("$seq");
    assert_mock_value_valid(&value, "seq");
    // Seq returns "1" by default
    assert_eq!(value, "1", "Seq should return '1': {}", value);
}

// =============================================================================
// Template Processing Tests
// =============================================================================

#[test]
fn test_process_simple_template() {
    let template = "Hello {{name}}";
    let result = process_mock_template(template);
    assert!(
        result.contains("Hello"),
        "Template should preserve static text"
    );
    // The name part should be replaced with a generated name
    assert!(
        !result.contains("{{name}}"),
        "Template should replace {{name}}"
    );
}

#[test]
fn test_process_template_with_multiple_variables() {
    let template = "User: {{name}}, Email: {{email}}";
    let result = process_mock_template(template);
    assert!(
        !result.contains("{{name}}") && !result.contains("{{email}}"),
        "All variables should be replaced"
    );
}

#[test]
fn test_process_template_with_unknown_variable() {
    // Unknown variable should be kept as-is
    let template = "Hello {{unknown_var}}";
    let result = process_mock_template(template);
    assert!(
        result.contains("{{unknown_var}}"),
        "Unknown variables should be preserved"
    );
}

#[test]
fn test_process_template_with_builtin_rules() {
    let template = "{{email}} - {{phone}} - {{city}}";
    let result = process_mock_template(template);
    // All should be replaced
    assert!(
        !result.contains("{{email}}") &&
        !result.contains("{{phone}}") &&
        !result.contains("{{city}}"),
        "All builtin rules should be replaced"
    );
}

// =============================================================================
// Case Insensitivity Tests
// =============================================================================

#[test]
fn test_mock_value_case_insensitive() {
    // Test that rule names are case-insensitive
    let upper = generate_mock_value("EMAIL");
    let lower = generate_mock_value("email");
    let mixed = generate_mock_value("Email");

    assert_mock_value_valid(&upper, "EMAIL");
    assert_mock_value_valid(&lower, "email");
    assert_mock_value_valid(&mixed, "Email");

    // All should produce valid emails (containing @)
    assert!(
        upper.contains('@') && lower.contains('@') && mixed.contains('@'),
        "All case variants should produce valid emails"
    );
}

#[test]
fn test_process_mock_template_case_insensitive() {
    let template_upper = "{{EMAIL}}";
    let template_lower = "{{email}}";

    let result_upper = process_mock_template(template_upper);
    let result_lower = process_mock_template(template_lower);

    // Both should replace the variable (case insensitive)
    assert!(
        !result_upper.contains("{{EMAIL}}") && !result_lower.contains("{{email}}"),
        "Template processing should be case insensitive"
    );
}

// =============================================================================
// All Rule Types Coverage Test
// =============================================================================

#[test]
fn test_all_rule_types_produce_output() {
    let rule_types = [
        "auto", "name", "email", "phone", "city", "country", "company",
        "price", "address", "avatar", "uuid", "url", "ipv4", "ipv6",
        "lat", "lng", "zip", "color", "rating", "age", "date",
        "boolean", "number", "sequence", "random", "nullify",
        "$timestamp", "$date", "$time", "$datetime", "$randomInt", "$randomFloat", "$seq"
    ];

    for rule in rule_types {
        let value = generate_mock_value(rule);
        // Only nullify should return empty string
        if rule != "nullify" {
            assert!(
                !value.is_empty(),
                "Rule {} should produce non-empty value",
                rule
            );
        }
        // No rule should return template placeholder
        assert!(
            !value.contains("{{"),
            "Rule {} produced template placeholder: {}",
            rule,
            value
        );
    }
}