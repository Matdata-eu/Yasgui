# CONSTRUCT Query Validation

## Overview

The CONSTRUCT Query Validation feature helps you verify that your SPARQL CONSTRUCT queries produce the expected RDF triples. This is especially useful when creating inference rules, where typos or logical errors might prevent expected triples from being generated.

## Use Case

When developing SPARQL inference rules, it's common to make mistakes that result in missing triples. For example:

```sparql
# Inference rule with a typo
CONSTRUCT {
  ?person a :Persan .  # Typo: should be :Person
  ?person :hasInferredType :Human .
}
WHERE {
  ?person a :Employee .
}
```

With validation patterns configured, Yasgui will alert you when expected triples are missing from the results, making it easier to catch such errors.

## How to Use

### 1. Define Validation Patterns

1. Click the **Settings** button (⚙) in the tab control bar
2. Navigate to the **Validation** tab
3. Add expected patterns using the form:
   - **Subject**: The expected subject URI (or `*` for any)
   - **Predicate**: The expected predicate URI (or `*` for any)
   - **Object**: The expected object URI (or `*` for any)
   - **Description** (optional): A human-readable description of what the pattern validates

### 2. Pattern Syntax

#### Exact Matching
Specify exact URIs to match:
```
Subject:   http://example.org/john
Predicate: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
Object:    http://example.org/Person
```

#### Wildcards
Use `*` to match any value:
```
Subject:   *
Predicate: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
Object:    http://example.org/Person
```
This pattern matches any triple where the predicate is `rdf:type` and the object is `:Person`.

#### Prefix Matching
Use `*` at the end of a URI to match prefixes:
```
Subject:   *
Predicate: http://example.org/*
Object:    *
```
This pattern matches any triple where the predicate starts with `http://example.org/`.

### 3. View Validation Results

When you run a CONSTRUCT query with validation patterns defined:

1. **Success Indicator**: A green checkmark (✓) appears when all patterns are found
2. **Warning Indicator**: A yellow warning (⚠) appears when patterns are missing
3. **Details Panel**: Click the expand button (▼) to see:
   - Which patterns are missing
   - Which patterns were found
   - How many triples matched each pattern

### 4. Examples

#### Example 1: Validate Type Inference
Ensure all employees are inferred to be persons:

**Pattern:**
- Subject: `*`
- Predicate: `http://www.w3.org/1999/02/22-rdf-syntax-ns#type`
- Object: `http://example.org/Person`
- Description: "All employees should have rdf:type Person"

**Query:**
```sparql
CONSTRUCT {
  ?emp a :Person .
}
WHERE {
  ?emp a :Employee .
}
```

#### Example 2: Validate Property Inference
Ensure inferred properties exist:

**Pattern:**
- Subject: `*`
- Predicate: `http://example.org/hasInferredProperty`
- Object: `*`
- Description: "Inferred property should exist"

**Query:**
```sparql
CONSTRUCT {
  ?person :hasInferredProperty ?value .
}
WHERE {
  ?person :originalProperty ?value .
}
```

#### Example 3: Validate Specific Instance
Check if a specific instance exists in results:

**Pattern:**
- Subject: `http://example.org/john`
- Predicate: `*`
- Object: `*`
- Description: "John should appear in results"

## Pattern Management

### Adding Patterns
1. Open Settings → Validation tab
2. Fill in the pattern fields (at least one field must be specified)
3. Click **+ Add Pattern**

### Deleting Patterns
1. Open Settings → Validation tab
2. Click **Delete** next to the pattern you want to remove

### Viewing Patterns
All defined patterns are listed in the Validation tab, showing:
- The pattern triple (subject, predicate, object)
- The optional description

## Tips

1. **Start Simple**: Begin with broad patterns using wildcards, then refine as needed
2. **Use Descriptions**: Add clear descriptions to make validation results easier to understand
3. **Test Incrementally**: Add patterns one at a time to identify which part of your query needs fixing
4. **Prefix Matching**: Use prefix matching to validate namespace consistency

## Limitations

- Validation only runs for CONSTRUCT queries
- Patterns are stored per-tab (not globally)
- Pattern matching is case-sensitive
- Only supports simple triple patterns (no SPARQL graph patterns)

## Troubleshooting

**Q: The validation display doesn't appear**
- Make sure you're running a CONSTRUCT query (not SELECT, ASK, or DESCRIBE)
- Verify that you have at least one validation pattern defined
- Check that the query executed successfully without errors

**Q: All patterns show as missing even though I see results**
- Verify your pattern URIs exactly match the URIs in the results
- Check for typos in the pattern definition
- Try using wildcards to test if partial patterns match

**Q: Validation results are not persisted**
- Validation patterns are saved per-tab in browser local storage
- Clearing browser data will remove saved patterns
- Export your query tabs to backup validation patterns

## Security Considerations

- Pattern matching is performed client-side in the browser
- Validation patterns are stored in browser local storage
- No sensitive data is sent to external services
- All pattern matching uses safe DOM methods (no eval or innerHTML with user content)
